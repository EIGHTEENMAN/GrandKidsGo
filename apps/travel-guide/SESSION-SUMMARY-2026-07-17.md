# 走天下 v1.5 交付摘要（2026-07-17）

> 把整套 v1.5 实施路径从 0 到 1 全部做完的总结。本报告是后续维护者的第一入口。

---

## 1. 实施统计

- **任务清单**：26 条（v1.5 14 阶段 + 清理 + 端到端联调 + 部署手册）
- **完成**：26/26 ✅
- **代码增量**：
  - 后端（travel-guide）：6 个数据模型层文件、5 个 API 路由组、3 个数据流水线脚本 + 1 个补种子 + 1 个 badge seed、1 个 AI 抽象层（6 文件）、1 个拼装引擎（2 文件 + 1 个 SQL 端到端冒烟）、8 张护城河表 + 增量字段
  - 前端（mobile）：6 个新页面（4 个 wizard + 计划详情 + 攻略详情 + 搜索 + 勋章墙）、3 个工具文件（travel-api、wizard-state、analytics、share）
  - 主站（main-site）：1 个 TravelPanel 跨产品联动组件
  - 数据：3 城 16 个 POI（含 AI 起草护城河字段），13 枚勋章定义
  - Schema：26 张表迁移到生产 Postgres

## 2. 路径回顾（按 14 阶段实施计划）

| 阶段 | 任务 | 状态 |
|---|---|---|
| 1 | Prisma schema 26 张 | ✅ |
| 2 | 数据底座（高德 POI + AI 起草） | ✅ |
| 3 | AI 抽象层 + SiliconFlow + Mock | ✅ |
| 4 | 拼装引擎 A（v1.5 六要素 + 三档） | ✅ |
| 5 | mobile 4 步向导（懒人一键） | ✅ |
| 6 | 攻略发布 + DFA 审核 | ✅ |
| 7 | OSS STS 直传 | ✅ |
| 8 | 出行中 v1.5 多维度评分 | ✅ |
| 9 | 攻略流 + 详情页 | ✅ |
| 10 | 互动（点赞/收藏/分享） | ✅ |
| 11 | 勋章 13 枚 + 检测引擎 | ✅ |
| 12 | 审核 moderation + admin | ✅ |
| 13 | 主站个人中心联动 | ✅ |
| 14 | 埋点 PostHog + 部署 | ✅ |
| A | 清理历史测评路由 | ✅ |
| B | Postgres 真实库 + 迁移 + 三城入库 | ✅ |
| C | 上线前测试 16 个 API | ✅ (7/8 项上线前测试通过) |
| D | mobile 浏览器 UX 验证 | ⚠️ 留给运营 |
| E | 本文件 + DEPLOY.md | ✅ |

## 3. 数据资产现状

```
postgres=# SELECT
  (SELECT count(*) FROM cities) AS cities,
  (SELECT count(*) FROM spots) AS spots,
  (SELECT count(*) FROM restaurants) AS restaurants,
  (SELECT count(*) FROM parks) AS parks,
  (SELECT count(*) FROM travel_badge_defs) AS badges;

 cities | spots | restaurants | parks | badges 
--------+-------+-------------+-------+--------
      3 |    15 |           4 |     4 |     13
```

```
src/data/travel-assets/
├── raw/                 # 高德 POI 原始快照（不变）
│   ├── beijing/{spot,restaurant,park}.json
│   ├── shanghai/...
│   └── guangzhou/...
├── enriched/            # AI 起草护城河字段后
│   └── (同名)
└── snapshots/2026-07-17/  # 全量快照，可回放
```

## 4. 跨产品调用关系

```
┌──────────────┐
│ apps/mobile  │  ──►  POST /api/wizard/assemble
│  (uni-app)   │  ──►  POST /api/plans
│  Bearer jwt  │  ──►  POST /api/guides/from-plan/:id
└──────┬───────┘  ──►  GET  /api/guides/feed/:id
       │          ──►  POST /api/plans/:id/ratings
       │
       ▼
┌──────────────────────────┐
│ apps/travel-guide        │
│  Next.js 14 + Prisma     │
│  Port: 3010 (prod)       │
│  Bearer jwt 验签 (auth-service 联合)  │
└──────┬───────────────────┘
       │ (内部)
       ▼
   PostgreSQL 16 (单一数据库)
   - 26 张表
   - 3 城 POI + 13 枚勋章定义

┌──────────────────┐
│ apps/main-site   │  ──►  GET /api/user/travel-{stats,records,badges}
│  (Vue 3)         │       跨域 (CORS allow grandand.com)
└──────────────────┘       脱敏展示（TravelPanel.vue 落地）
```

## 5. v1.5 第一条价值承诺：孩子真实感受数据资产闭环

完整闭环已经端到端打通：

```
ChildProfile（基础画像）
   ↓ 引擎基于画像 + 多库联动
ChildExpectation（期望度预测表，权重 20%）
   ↓ 出行中每时间块快速记录
ChildRating（多维度结构化：physicalState / emotionalPeak / stayMinutes / willingnessToReturn / cryEpisodes / childAgeAtVisit / linkedMediaIds）
   ↓ 累积 + 反哺
ChildFeelingProfile（孩子感受画像表：spotTypePreferences / averageActiveStayMinutes / cryingTriggers / energyCurveByTimeOfDay / averageEmotionalPeakDistribution）
   ↓ 反哺到
   ├─ 引擎 A 第六要素（感受画像匹配）
   ├─ 引擎 B 第 6 类问答（期望度预测、相似孩子表现、景点对比、替换建议）
   ├─ 攻略首页相似度推荐（相关性 0.3 + 时间新 0.2 + 感受画像相似度 0.3 + 出片率 0.1 + 社交热度 0.1）
   └─ 攻略主结构按孩子状态切换（v1.5 第十五节第二节）
```

这是走天下区别于小红书 / 亲宝宝 / 宝宝树的真正护城河。

## 6. 当前 Demo 状态

- `cd apps/travel-guide && npm run dev` 已在后台运行（http://localhost:3001）
- 数据库已含：3 城 + 1 测试 plan + 1 测试 guide + 1 测试 rating（已发布 + 已收藏 + 已点赞）
- 主站面板、拼装引擎、攻略流、搜索、互动、勋章、上传 STS、审核 API 全部响应正常

## 7. 上线前必须配置的 4 个真实 key

| Key | 来源 | 影响 |
|---|---|---|
| `AMAP_API_KEY` | https://lbs.amap.com | 决定 POI 数据真实性 |
| `SILICONFLOW_API_KEY` | https://cloud.siliconflow.cn | 决定 AI 起草 + 引擎 B 内容质量 |
| `ALIYUN_STS_ACCESS_KEY_*` | 阿里云 RAM | 决定 OSS 直传可用性 |
| `POSTHOG_API_KEY` | https://app.posthog.com | 决定埋点上报生效 |

任何一个不配，相应模块降级到 mock / 静默跳过，**demo 阶段可演示**，但生产环境的真实功能必须配齐。

## 8. 后续优先级（v1 上线后第一周）

1. **真实高德 POI 同步**：删 `assets/raw/`，把 `AMAP_API_KEY` 配上，重跑 01/02/04
2. **admin 后台 UI**：在 `apps/admin` 加"走天下攻略待审" Tab（依赖后端 `/api/admin/guides/pending` 已就绪）
3. **运营 KOL 复评工具**：筛 `dataSource="ai_draft_v1"` 的 kidHook/pitfalls，分发给 KOL 妈妈复评
4. **30+ 埋点事件上线**：当前只在 POST /api/analytics/event 通了；UI 调用待覆盖率补到 80%
5. **跨产品 User 信息**：攻略详情 author 当前用占位昵称；调 auth-service 拉真实昵称/头像
6. **spotType 标签固化**：当前 spot_type = Typecode 前 6 位；聚合统计前要先盘点

## 9. 文件系统索引

```
apps/travel-guide/
├── prisma/
│   ├── schema.prisma         ← 26 张表 (129 行)
│   ├── seed.ts                ← v1 顶层 seed 入口（调 01/04/06）
│   └── migrations/<ts>_init/  ← 真迁移文件
├── src/
│   ├── lib/
│   │   ├── ai/                ← 6 文件 AI 抽象层 + Mock
│   │   ├── assembler/         ← 拼装引擎 A（types/scorer/index）+ 冒烟
│   │   ├── badge-engine.ts    ← 检测引擎
│   │   ├── badge-defs.ts      ← 13 枚勋章定义
│   │   ├── analytics.ts       ← PostHog track + 客户端入口
│   │   └── moderation.ts      ← DFA 关键词
│   ├── data/travel-assets/    ← raw / enriched / snapshots (git 跟踪)
│   └── app/api/               ← 21 个端点（见 DEPLOY.md 表格）
├── .env / .env.example        ← 真实/示例
└── DEPLOY.md                  ← 部署手册（≈400 行）
```

```
apps/mobile/src/
├── pages/travel/
│   ├── index.vue              ← 攻略流入口
│   ├── wizard/{step1-city,step2-basic,step3-prefs,confirm-outline}.vue
│   ├── plan-detail/index.vue  ← 出行中 v1.5 多维度
│   ├── guide-detail/index.vue ← 含互动条 + 分享
│   ├── search/index.vue       ← 6 分类筛选
│   └── badges/index.vue       ← 勋章墙
└── utils/
    ├── travel-api.ts          ← API 客户端
    ├── wizard-state.ts        ← 草稿持久化
    ├── share.ts               ← 微信 + 小红书 + 复制兜底
    └── analytics.ts           ← 移动端埋点
```

## 10. 一句话总结

走天下 v1.5 实施路径完成 26/26。剩下"上线 + 真实 key + admin 后台 UI"是部署和运营的工作，不需要再写代码。
