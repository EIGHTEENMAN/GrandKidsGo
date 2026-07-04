# 童慧行项目 (Haodaer)

儿童益智乐园 & 亲子旅行攻略平台

## 项目说明

童慧行包含两大站点：
- **童慧行主站** (grandand.com)：儿童学习资源 + 益智挑战
- **童慧行走天下** (travel.grandand.com)：真实亲子旅行攻略

核心理念：孩子说好才是真的好。儿童体验第一、隐私保护、非商业化优先。

## 快速信息

- **童慧行服务器**：47.114.77.124 (阿里云 ECS, root/Hde@2026)
- **seedme 服务器**：121.196.230.54 (旧童慧行服务器，seedme-api 端口 3000)
- 童慧行路径：`/grandkidsgo/apps/`
- GitHub 组织：github.com/EIGHTEENMAN (12个仓库)
- 完整方案：`项目建设方案/童慧行项目建设方案（v3.2 终极版）.txt`

## TTS 音频系统

学诗词站（xueshici）使用 Edge TTS 免费服务 + 6 情绪 × 2 性别 = 12 音色组合，详见 `scripts/generate-poem-audio/moodClassifier.mjs`：

- **mood** 复刻前端 `apps/xueshici/src/lib/audio.ts::detectMood()` 1:1 同步
- **translation**（译文+赏析）强制 plain voice（保持讲解中性）
- **original**（原文朗诵）应用 mood×gender → voice/style/rate 矩阵
- hero/male=Yunyang+assertive、graceful/male=Yunxi+gentle、frontier/male=Yunjian+serious 等

生成：`node scripts/generate-poem-audio/tts.mjs [--poc ID | --ids a,b,c | --type original|translation] [--regen-all]`，详细用法见脚本头部注释。

## 当前进度

总进度约 65%（自主运营阶段 137h 已完成约 89h）

**已完成：**
- Phase 1 基础设施 ✅ (服务器/Nginx/DNS/GitHub/SSL)
- Phase 2 认证体系 ✅ (auth-service SQLite+JWT+OAuth)
- Phase 3A 走天下攻略核心 ✅ (Next.js+Prisma+PostgreSQL)
- Phase 3B 儿童互动玩法 ✅ (投票/挑战/足迹/画廊)
- Phase 3D AI 审核引擎 ✅ (DFA敏感词+自动处罚+举报申诉)
- Phase 3E 管理监控看板 ✅ (admin Express+AntD)
- Phase 3F PostHog 埋点 ✅
- Phase 3C 前端壳子 🟡 (学习应用已部署但缺内容数据)
- Phase 4 童慧行来挑战 ✅ (问答挑战+神兽方块, tiaozhan.grandand.com)
- Phase 5 论坛 ✅ (forum.grandand.com, 完整社区功能)
- Phase 5 商城 ✅ (store.grandand.com, 积分兑换系统)
- Phase 3G FAQ/法律页面 ✅ (grandand.com/faq, /legal)

**未完成：**
- Phase 4 学习内容数据 ✅ (2026诗词/923经典/2164通识/5018单词, 全部超额)

## 权限系统

项目已有自动授权配置 (`settings.json` + `settings.local.json`)，覆盖 SSH、Git、npm、GitHub API、curl、dig 等常见操作。如遇到未授权的命令会提示，同意后告诉我即可。日常开发工作应无需手动逐一批准。

## 进度记忆

进度检查点存储在记忆系统中 (`memory/project-progress.md`)，每次完成任务后自动同步更新。会话启动时自动读取并恢复进度，无需手动汇报。

## 新机器开发环境搭建

```bash
# 1. 克隆仓库
git clone git@github.com:EIGHTEENMAN/GrandKidsGo.git
cd GrandKidsGo

# 2. 安装依赖（每个 app 各自安装）
cd apps/auth-service && npm install && cd ../..
cd apps/main-site && npm install && cd ../..
cd apps/tiaozhan && npm install && cd ../..
cd apps/forum && npm install && cd ../..
cd apps/store && npm install && cd ../..
cd apps/english && npm install && cd ../..
cd apps/shici && npm install && cd ../..
cd apps/xueguoxue && npm install && cd ../..
cd apps/xuetongshi && npm install && cd ../..
cd apps/admin && npm install && cd ../..
cd apps/travel-guide && npm install && cd ../..

# 3. 启动开发模式（auth-service 必须最先启动）
cd apps/auth-service && npm run dev

# 新开终端，启动主站或其他应用
cd apps/main-site && npm run dev

# ⚠️ tiaozhan（来挑战）需要同时启动前后端：
cd apps/tiaozhan && npm run server-dev   # 终端1：Express 后端 (端口 3001)
cd apps/tiaozhan && npm run dev          # 终端2：Vite 前端 (端口 3011，API代理到3001)
```

**要求：** Node.js >= 18。数据库用 SQLite，无需额外安装。环境变量（微信/Aliyun key等）默认空值即可本地开发。
## 运行中服务

| 服务 | 端口 | 状态 |
|------|------|------|
| main-site | 3000 | ✅ |
| auth-service | 3007 | ✅ |
| travel-guide | 3010 | ✅ |
| admin | 3099 | ✅ |
| xueshici | 3008 | ✅ (壳子) |
| xueguoxue | 3003 | ✅ (壳子) |
| xuetongshi | 3004 | ✅ (壳子) |
| ultraman-english | 3002 | ✅ (壳子) |
| tiaozhan | 3001 / 3011 | ✅ tiaozhan.grandand.com (后端3001, 前端dev端口3011) |
| forum | 3005 | ✅ forum.grandand.com |
| store | 3006 | ✅ store.grandand.com |
| moderation | 3020 | ✅ 内部审核服务 |
