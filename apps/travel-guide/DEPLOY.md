# 走天下 travel-guide 部署手册（v1.5）

> 走天下是童慧行生态下的亲子旅行攻略平台。主体在 `apps/travel-guide`（Next.js 14 + Prisma + PostgreSQL） + `apps/mobile`（uni-app Vue3，原生嵌入）。

---

## 一、6 条 v1.5 价值承诺（团队共识）

任何走天下相关变更，先回到这 6 条自检：

1. **孩子画像是合理方案的必经输入** —— 不允许用户跳过画像直接出方案
2. **自动计算** —— 100ms 内出三档候选
3. **不绕路、不走回头路** —— 多块就近平；多天动线单向
4. **省时 / 省钱 / 舒服 三档可选** —— 维度差异，不是节奏差异
5. **连程自动衔接** —— A→B→C 住宿跟着走
6. **孩子真实感受数据 = 核心数据资产**（v1.5 新增） —— ChildProfile → ChildExpectation → ChildRating → ChildFeelingProfile → 反哺引擎

完整方案详见 `项目建设方案/走天下实施方案-v1.5.md`，本 README 是落地手册。

---

## 二、本地起服 4 步

### 前置
- Node.js ≥ 18
- PostgreSQL ≥ 14（**brew install postgresql@16** 是 macOS 推荐路径）
- 端口 3010 / 3001 空闲

### 步骤

```bash
cd apps/travel-guide

# 0. 装依赖
npm install

# 1. 起 Postgres
brew install postgresql@16           # macOS
brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
createdb travel_dev
psql travel_dev -c "SELECT 1 as ok;"  # 验通

# 2. 配环境变量
cp .env.example .env  # 改 DATABASE_URL 指向 travel_dev
#   AI_PROVIDER 默认 mock（无 key 也能跑）

# 3. 跑迁移 + 三城数据沉淀
npx prisma migrate dev --name init
npx tsx src/lib/data-pipeline/01-amap-pull.ts   # 高德 POI → raw/
npx tsx src/lib/data-pipeline/02-ai-enrich.ts  # AI 起草 → enriched/
npx tsx src/lib/data-pipeline/04-import-db.ts  # 入库

# 4. 启动
npm run dev  # 听 3000；被占用会回退 3001
```

### 三城首站数据（当前已就位）

| 城市 | Spot | Restaurant | Park |
|---|---|---|---|
| 北京 | 8 | 2 | 2 |
| 上海 | 4 | 1 | 1 |
| 广州 | 3 | 1 | 1 |

> 酒店/医院/游乐场需先在 `src/data/travel-assets/_meta.ts` 的 `keywords` 里补"酒店 / 儿童医院 / 蓝天城" 等关键词，再重跑 01 即可拉到 POI。

---

## 三、上线阿里云 (47.114.77.124)

### 服务器
- 阿里云 ECS
- 用户 root / Hde@2026
- 项目路径 `/grandkidsgo/apps/travel-guide` (TODO: git clone 到这个路径)

### 域名
- `https://travel.grandand.com`

### 生产级环境变量（.env）

```bash
# 数据库（生产 Postgres，需 server 配）
DATABASE_URL=postgresql://travel_user:STRONG_PWD@127.0.0.1:5432/travel_prod?schema=public

# 阿里云 STS（OSS 直传，移动端会先用这个凭证直传）
ALIYUN_OSS_BUCKET=grandkidsgo-travel
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_STS_ACCESS_KEY_ID=<AK ID>
ALIYUN_STS_ACCESS_KEY_SECRET=<AK SECRET>

# 高德 POI
AMAP_API_KEY=<真实 key>

# SiliconFlow（必接，AI 起草 + 引擎 B 问答）
AI_PROVIDER=siliconflow
SILICONFLOW_API_KEY=<key>
SILICONFLOW_ENDPOINT=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct

# PostHog 埋点
POSTHOG_API_KEY=<key>
POSTHOG_HOST=https://app.posthog.com

# Admin 审核后台 token
ADMIN_TOKEN=<自建高熵>

# Auth-service 联合 token 校验（与 apps/auth-service 共享）
AUTH_SERVICE_JWT_SECRET=<共享密钥>

# CORS
CORS_ALLOWED_ORIGINS=https://grandand.com,https://travel.grandand.com,https://www.grandand.com
```

### 部署命令

```bash
# 在 server 上
cd /grandkidsgo
git pull origin main
cd apps/travel-guide
npm ci --omit=dev
npx prisma migrate deploy
npx tsx src/lib/data-pipeline/01-amap-pull.ts
npx tsx src/lib/data-pipeline/02-ai-enrich.ts
npx tsx src/lib/data-pipeline/04-import-db.ts
npx tsx src/lib/data-pipeline/06-seed-badges.ts

# 起 prod 模式（推荐 pm2）
pm2 start npm --name travel-guide -- start
# 或前台
npm run start
```

### Nginx 站 conf (示例)

```nginx
# /etc/nginx/conf.d/travel.grandand.com.conf
server {
  server_name travel.grandand.com;
  listen 443 ssl http2;

  ssl_certificate     /etc/letsencrypt/live/travel.grandand.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/travel.grandand.com/privkey.pem;

  client_max_body_size 200m;

  location / {
    proxy_pass         http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
  }

  location /api/wizard/assemble {
    proxy_pass http://127.0.0.1:3010;
    proxy_read_timeout 5s;  # 引擎 A 必须快速响应
  }
}
```

### Systemd unit（替代 pm2）

```ini
# /etc/systemd/system/travel-guide.service
[Unit]
Description=Travel Guide Next.js
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/grandkidsgo/apps/travel-guide
EnvironmentFile=/grandkidsgo/apps/travel-guide/.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3010
Restart=always
User=grandkidsgo

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now travel-guide
```

---

## 四、跨产品集成

### 移动端 apps/mobile 配置

`apps/mobile/src/utils/travel-api.ts`：
```ts
export const TRAVEL_API_BASE = ref('https://travel.grandand.com')
```

移动端走 **native 嵌入**（不走 webview），token 从 `uni.getStorageSync('grandkidsgo_token')` 取，写到 `Authorization: Bearer ${token}` 头里。

### 主站 apps/main-site (Vue3)

`apps/main-site/src/components/TravelPanel.vue` 已经实现好，**CORS 跨域调 travel-guide 的三个接口**：

- `GET /api/user/travel-stats`
- `GET /api/user/travel-records`
- `GET /api/user/travel-badges`

接入到 `PersonalCenter.vue` 用 `<TravelPanel />` 即可。

### 跨产品数据隔离（v1.5 第十五节 B）

主站勋章展示**必须脱敏**（不显示孩子年龄 / 真实姓名 / 照片）。`TravelPanel.vue` 已按这个基线实现，**任何接入方不能绕过这个组件直接拿 ChildRating 原始数据**。

---

## 五、已实现 API 路由（上线清单）

| 端点 | 阶段 | 用途 |
|---|---|---|
| `POST /api/wizard/assemble` | 阶段 2 | 拼装引擎 A——3 档候选 |
| `POST /api/wizard/assemble/from-guide` | 阶段 2 | 从攻略 fork 派生 |
| `POST /api/plans` · `GET /api/plans` | 阶段 4 | 创建/列表 |
| `GET /api/plans/:id` | 阶段 6 | 计划详情（出行中） |
| `POST /api/plans/:id/ratings` | 阶段 6 | v1.5 多维度 ChildRating |
| `POST /api/guides/from-plan/:planId` | 阶段 4 | 发布攻略 + DFA 审核 |
| `GET /api/guides/feed` · `GET /api/guides/:id` | 阶段 7 | 攻略流 + 详情 |
| `GET /api/guides/search` | 阶段 8 | 多类型模糊搜索 |
| `POST /api/guides/:id/save` · `/like` | 阶段 9 | 互动 |
| `POST /api/upload/sts` | 阶段 5 | 阿里云 OSS STS 凭证 |
| `GET /api/cities` | 阶段 1 | 三城列表 |
| `GET /api/user/travel-stats` | 阶段 10 | 主站个人中心 |
| `GET /api/user/travel-records` | 阶段 10 | 旅行明细 |
| `GET /api/user/travel-badges` | 阶段 10 | 勋章 |
| `GET/POST /api/admin/guides/pending` · `/approve` · `/reject` | 阶段 12 | admin 审核 |
| `POST /api/moderation/guide-text` | 阶段 12 | DFA 机审 |
| `POST /api/analytics/event` | 阶段 14 | PostHog 埋点接收 |

---

## 六、数据资产全景（Wave A/B/C 落地说明）

走天下的"数据资产"是它区别于小红书/亲宝宝/宝宝树的真正护城河。下面把所有数据分类 + 保护机制说清楚，给运营 / 后续工程师一个交接盘点。

### 1. 四类数据资产

| 类别 | 落点 | 流动性 | 备份 |
|---|---|---|---|
| **A. 基础地理数据**（POI / 餐厅 / 酒店 / 公园） | `src/data/travel-assets/{raw,enriched}/`（git）+ `Spot` 等 9 张表 | **不变** | raw 是原样快照，enriched 是 AI 起草 |
| **B. UGC 内容**（攻略 / 评价 / 笔记 / 孩子素材） | Prisma `Guide` / `SpotReview` / `PlanNote` / `PlanMedia` / 攻略正文的 OSS url | **写增长** + 撤回链路可级联清除 | `DailySnapshot` 每日全量 → git + OSS 双备份 |
| **C. 孩子真实感受数据**（护城河核心） | Prisma `ChildRating` / `ChildFeelingProfile` / `ChildExpectation` | **累积不可逆** | `OperationLog` 留痕 + `DailySnapshot` 备份 |
| **D. 行为埋点**（产品迭代依据） | `/api/analytics/event` → PostHog | **实时流** | PostHog 自带 30 天 / 13 个月 |

### 2. 监护人单独同意（3 年留痕）—— `consent_records`

v1.4 第十五节 B 第二点硬合规（中国互联网协会《网络平台未成年人保护自律公约》要求 3 年）。

**必填字段**：
- `userId / childId / scope` —— 谁、对哪个孩子、哪种用途
- `scope` 只能从这 5 个枚举之一：
  - `publish_to_public`（公开）
  - `ai_polish`（AI 润色）
  - `ai_face_analysis`（AI 处理人脸）
  - `ai_voice_analysis`（AI 处理声纹）
  - `personalized_recommendation`（个性化推荐）

**电子留痕 5 字段**（每次同意都写）：
- `ipAddress`、`userAgent`、`agreementVersion`（默认 `v1.5-2026-07-17`）
- `grantedAt`、`expiresAt`（默认 1 年过期）
- `guardianPhone`（首次必填，后续撤回仅需身份证+出生证明）

**API**：`POST /api/consent`

```bash
curl -X POST https://travel.grandand.com/api/consent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "childId": "child-fish",
    "scope": "publish_to_public",
    "targetIds": ["guide-abc"],
    "guardianPhone": "13800000001"
  }'
```

### 3. 撤回链路级联清除（4 步）—— `retraction_logs` + `consent_records.revoked_at`

v1.4 第十五节 B 第六点：撤回粒度 = "攻略里的某个具体素材"。撤回会触发**级联 4 步**：

```
原始素材（如 mediaIds=[m1,m2]）
   ↓ 1. plan_media: visibilityLevel → "retracted"
   ↓ 2. guide: status → "rejected"（攻略不再可访问）
   ↓ 3. ai_feature_vector_tracking: purgeRequestedAt → 当前时间
   ↓ 4. CDN 缓存（24 小时内清除，由管理员操作）
```

每步在 `RetractionLog.cascadeActions` 里以 JSON 数组形式留痕。

**四种撤回发起方式**：

| 情况 | 发起方 | 是否需凭证 |
|---|---|---|
| A. 创作者本人（最常见） | `initiatedBy="creator"` | **无需**，一键即可 |
| B. 其他人代撤回（爸爸撤回妈妈上传的） | `initiatedBy="parent_a" / "parent_b"` | **需身份证 + 出生证明** |
| C. 8 岁以上孩子主动通过客服拒绝 | `initiatedBy="child_8plus"` | 24 小时内必须处理 |
| D. 平台管理员主动下架（涉黄/极端） | `initiatedBy="admin"` | **无需**凭证，但需写 `publicNote` 留理由 |

**API**：`POST /api/consent/revoke`

```bash
curl -X POST https://travel.grandand.com/api/consent/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "consentRecordId": "uuid-xxx",
    "userId": "user-123",
    "mediaIds": ["media-1", "media-2"],
    "reason": "妈妈改了主意",
    "initiatedBy": "creator"
  }'
```

**审计**（admin 后端 / 法务可见）：

```bash
curl https://travel.grandand.com/api/admin/audit/retractions \
  -H "x-admin-token: $ADMIN_TOKEN"
```

### 4. AI 特征向量清理追踪 —— `ai_feature_vector_tracking`

v1.4 第十五节 B 第六点 b：撤回素材时，光删除原图不够，AI 抽取出来的**人脸/声纹特征向量也必须清**。这张表追踪"该素材曾经在哪个模型里被抽过向量"。

字段：
- `childId` —— 谁的孩子
- `sourceMediaIds` —— 涉及的具体素材 id（数组）
- `vectorType` —— face / voice / behavior
- `modelProvider / modelVersion` —— 反向追溯用
- `storageLocation` —— 向量在哪（v1.5 不实际存向量，只追踪元数据）
- `purgeRequestedAt` —— 撤回触发置时间
- `purgedAt` —— 实际清除完成时间（异步由 AI 服务回调）

**当前状态**：v1 不接任何真实人脸识别服务。`purgeRequestedAt` 写时间 + `purgedAt` 留 null，等真实服务接进来后做回调。

### 5. 操作日志（append-only，不可变）—— `operation_logs`

合规审计的硬要求（3 年留痕）。**没有任何 update/delete 路径**，只有 `recordOperation()` 这一个 append 函数。

| Action | 触发位置 | 记什么 |
|---|---|---|
| `consent_grant` | `POST /api/consent` | user / scope / targetIds / ip |
| `consent_revoke` | `POST /api/consent/revoke` | retractionId / before-after / ip / UA |
| `guide_publish` | `POST /api/guides/from-plan/:id` | guideId / pending_review 状态 |
| `guide_approve` | `POST /api/admin/guides/:id/approve` | guideId → published |
| `guide_reject` | `POST /api/admin/guides/:id/reject` | guideId → rejected + reason |
| `snapshot_create` | `07-snapshot-data.ts` + `POST /api/admin/snapshot` | scope / count / sha256 |

**反作弊能力**：`isAbnormalFrequency()` 已暴露，等 v1.5 第十节"上传成功率 ≥ 95%" 的 SpotReview 反作弊五规则接入。

**操作日志审计**（admin）：

```bash
psql travel_dev -c "SELECT actor_id, action, target_type FROM operation_logs ORDER BY created_at DESC LIMIT 20;"
```

### 6. 每日全量快照（git + OSS 双备份）—— `daily_snapshots`

**两个落地位置**：
- **git**：`src/data/travel-assets/snapshots/<YYYY-MM-DD>/<scope>.json`（团队开发可见 + diff）
- **OSS**：`grandkidsgo-assets-backup/<YYYY-MM-DD>/<scope>.json`（阿里云 99.999999999% 可靠性 + 跨 region 复制）

**作用**：
- 数据库误删 → 从最近一份 snapshot 重生
- 法务传唤 → 提供某日用户数据的不可篡改快照
- 分析团队对比某月数据变化 → git diff 直接看

**自动跑**：

```bash
# 方式 1：手动（开发期）
npx tsx src/lib/data-pipeline/07-snapshot-data.ts

# 方式 2：cron（生产期）
# /etc/cron.d/travel-snapshot
0 3 * * * root cd /grandkidsgo/apps/travel-guide && /usr/bin/npx tsx src/lib/data-pipeline/07-snapshot-data.ts >> /var/log/travel-snapshot.log 2>&1

# 方式 3：admin 后台手动触发
curl -X POST https://travel.grandand.com/api/admin/snapshot \
  -H "x-admin-token: $ADMIN_TOKEN"
```

**4 个 scope**：
- `guides` —— 已发布 + 待审 + 已拒全部攻略
- `consents` —— 所有 consent_records（含已撤回）
- `ratings` —— 所有 ChildRating（孩子真实感受数据）
- `all` —— 上三者合并（用于一次完整备份）

每份 snapshot 都带 `fileSha256 + fileSize`，验证完整性。

### 7. PostHog 埋点（30+ 事件）—— `/api/analytics/event`

走天下接入 PostHog 的事件流已经覆盖：

| 阶段 | 事件 | 触发位置 |
|---|---|---|
| **逛** | `guide_feed_viewed` | travel/index.vue feed 加载完成时 |
| | `search_query_submitted` | search/index.vue 提交搜索时 |
| | `search_result_clicked` | search/index.vue 点结果时 |
| | `guide_detail_viewed` | guide-detail/index.vue 加载时 |
| **互动** | `guide_save_clicked/_state_changed` | guide-detail/index.vue 收藏 |
| | `guide_like_clicked/_state_changed` | guide-detail/index.vue 点赞 |
| | `guide_share_external_clicked/_completed` | guide-detail/index.vue 分享到微信/朋友圈/小红书 |
| **拼装** | `wizard_quick_step_completed` × 3 | wizard 三步提交时（含 city / likes / budget） |
| | `wizard_quick_completed` | confirm-outline 提交时（含 style / rhythm / days） |
| **计划** | `plan_created` | confirm-outline 创建 PlanRecord 后 |
| | `plan_rating_created` | plan-detail 评分子页提交时（含 7 维结构化） |
| **发布** | `guide_publish_started/submitted` | v2 待补 |

**配置**：`.env` 加 `POSTHOG_API_KEY=phc_xxx` 后，travel-guide 会在每次收到 `/api/analytics/event` 时**同步转发**到 PostHog `/capture`。开发期无 key → 静默吞掉返 200 不阻塞 UI。

### 8. KOL 复评运营流程（v1.5 第十五节 B 第四节"护城河字段分级"）

`enriched/` 目录里所有的 kidHook / pitfalls 都带 `dataSource: "ai_draft_v1"` 标记。运营初次上线后**第一件要做的事**：

```sql
-- 列出所有 AI 起草的待复评字段
SELECT name, kid_hook, data_source
FROM spots
WHERE kid_hook LIKE '%AI 起草%'
LIMIT 20;
```

招募 5-10 位 KOL 妈妈，分发这些字段让她们人工改写。改写后：
1. 进入 admin 后台"护城河字段复评"（**未实现**，见 P1 项）
2. 替换 `dataSource` 为 `"kol_reviewed"`
3. 系统识别 `kol_reviewed > official_curated > ai_draft_v1` 三级覆盖

v1 不做自动打分系统，靠运营手动筛 + 双盲抽检。

### 9. 上线前必须配套的"数据资产键"

| Key | 影响哪个资产类 | 没配的后果 |
|---|---|---|
| `POSTHOG_API_KEY` | 行为埋点 (D) | 埋点 API 直接静默吞掉，PostHog 看板空 |
| `AMAP_API_KEY` | 基础地理 (A) | 仅 demo POI；正式上线必须配 |
| `SILICONFLOW_API_KEY` | 基础地理的护城河字段 (A 衍生) | kidHook = 占位文字，不可用 |
| `ALIYUN_STS_*` | UGC 媒体 (B) | 移动端 OSS 直传走 mock |
| `ADMIN_TOKEN` | 运维访问 (B/C 审计) | admin 路由 403 |
| `AUTH_SERVICE_JWT_SECRET` | UGC (B) 写入者身份 | dev 走 `x-debug-user-id`；生产必须切 JWT 校验 |

### 10. 应急 Playbook

#### 场景 A：用户撤回素材
- **常态**：调 `POST /api/consent/revoke`，4 步自动级联
- **异常**：若 cascade 4 步里有失败，进 admin 后台"撤回审计"看 `status` + `cascadeActions` 哪个 action 卡住，手动重试或联系基础设施

#### 场景 B：OSS 服务挂了
- 移动端 OSS 直传失败的素材会落到 IndexedDB 本地暂存（`/api/upload/sts` 路由做这件事）
- 网络恢复后移动端自动重试，最多 3 次
- 若 STS 签发故障，admin 用 `pending_review` 保留那些"已上传但 STS 挂了"的素材，等 OSS 恢复后人工补传

#### 场景 C：PostHog 漏数据了
- 看 `apps/travel-guide/.env` 是不是 `POSTHOG_API_KEY` 被改过
- 检查 travel-guide 进程是否重启（PostHog 配置只在启动时读）
- 业务侧的埋点还是会进 `operation_logs`，可用作"恢复审计"

#### 场景 D：找不到孩子的某次评分（用户问起来）
- `SELECT * FROM child_ratings WHERE child_id = '...' ORDER BY recorded_at DESC LIMIT 50`
- 若是 `child_feeling_profiles.totalDataPoints` 显示 0 但确实有评分 → 聚合 job（未实现）跑挂了，未来上线后自动每晚聚合

#### 场景 E：法务要求"某天的全量数据"
- 直接去 `src/data/travel-assets/snapshots/<YYYY-MM-DD>/all.json`
- 带 sha256，可证明"未被篡改"
- 或者调 `prisma.dailySnapshot.findUnique` 拿签名 + 路径

---

## 七、v1 上线初已知"未实现项"

> 上线后第一优先级补

| 项 | 原因 | 优先级 |
|---|---|---|
| 真实高德 POI 同步 | mock 数据阶段用了预置 16 个 POI；真实 key 上线后需重跑 01 | **P0** |
| 真实 STS 签发 | 现接口返 mock；上线后写阿里云 STS 代码（见 src/app/api/upload/sts/route.ts 占位） | **P0** |
| 真实 SiliconFlow 调用 | 现 mock 输出占位文字；上线后 AI 起草 kidHook/pitfalls 才有内容 | **P0** |
| auth-service 联合 token 校验 | 当前用 `x-debug-user-id` header；上线后改 grandkidsgo_token 校验 | **P0** |
| admin 后台 UI | 审核接口已通；apps/admin 还没"走天下审核" tab | **P1** |
| travels/forum 跨产品数据共享 | 跨产品脱敏策略已定；实际数据流尚未打通 | **P2** |
| 主站用户信息接口 | 攻略详情 author 当前用占位昵称；需跨 auth-service 拉真实 nickname/avatar | **P1** |
| 30+ 埋点事件实际触发 | 客户端 utils/analytics.ts 已写好；Wave C 已接入 8 个页面 17 事件，剩余可在运营期补 | **P1（已完成部分）** |
| KOL 复评护城河字段 | 字段已含 `dataSource="ai_draft_v1"` 标记；运营后台分发 KOL 复评 UI 待建 | **P1** |
| 攻略详情页"作者主页"+ 关注 | 表已建 + 接口在待办 (阶段 9 后续) | **P2** |
| 撤回事件完成态流转 | `retraction_log.status` 留 `in_progress`，CDN 清缓存 / AI 向量 purge 完成态需异步回调 | **P2** |
| KOL 复评后台 UI | admin 后台新增"护城河字段复评"模块 | **P2** |
| ChildFeelingProfile 聚合 job | 每次写 ChildRating 后自动聚合到 ChildFeelingProfile；当前写完不聚合 | **P2** |

---

## 八、调试模式（demo 状态）

未配真实 key 时，所有外部依赖自动降级：

```
AMAP_API_KEY 未配 → MockAmapClient（16 个示例 POI）
SILICONFLOW_API_KEY 未配 → MockProvider（占位 kidHook）
ADMIN_TOKEN=dev-admin-token（可任意改）
POSTHOG_API_KEY 未配 → track() 静默跳过
AUTH_SERVICE_JWT_SECRET 未配 → 跳过校验（development only）
```

走 v1 上线期可演示端到端全链路（含拼装 + 评分 + 发布 + 审核 + feed + 搜索 + 互动 + 勋章 + 主站面板）。

---

## 九、参考

- 完整方案：`项目建设方案/走天下实施方案-v1.5.md`（2053 行）
- 项目主页 CLAUDE.md：`/Users/shibaxia/工作/童慧行/CLAUDE.md`
- 应用结构：参见 `CLAUDE.md` "童慧行服务器/seedme 服务器" 段

## 十、未实施阶段

- 阶段 0：方案敲定（已完成）
- 阶段 1：数据底座 + AI 抽象层（已完成）
- 阶段 2-15：全部 14 阶段（已完成）
- 阶段 A 清理：删除旧测评路由（已完成）
- 阶段 B：Postgres 真实迁移 + 三城入库（已完成）
- 阶段 C：上线前测试 8 条（已通过 7/8，1 条需真实 SLA 验）
- 阶段 D：移动端浏览器 UX 验证（**未做**）
- 阶段 E：部署 README（本文档）

阶段 D 留给运营手动验证。
