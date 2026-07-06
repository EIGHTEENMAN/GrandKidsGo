---
name: session-2026-06-23-eod
description: 2026-06-23 EOD - 学通识 42 个 ct 扩充 + 难度分级 + 配图上线
metadata:
  node_type: memory
  type: project
  status: completed
  originSessionId: 2026-06-23
---

# Session 2026-06-23 EOD 总结

## 三大任务

### 1. 修学通识/学国学服务器故障 ✅
- 来挑战 (tiaozhan) 502 → `node server/index.js` 重启
- 走天下 (travel) 502 → `npx next start -p 3010` 重启
- xuetongshi 跳到 xueguoxue → rsync --delete 重新部署 xuetongshi dist
- 三个站 502 → 200

### 2. 学通识 42 个中国传统文化 topic 扩到 10 节 + 难度筛选 UI ✅
- 原本 243 topic 中 44 个 ct-* 薄弱（2-5 节）
- 调研 DK/NG/Usborne 等儿童百科系列对标（jinyiwei）
- 写 `scripts/expand-ct-topics.py` + `scripts/update-meta-counts.py`
- 用 daxueshi 子代理生成 244 节新内容（3 批次）
- App.vue 加难度筛选 Tab + 卡片彩色角标
- commit `0d5dccb`

### 3. 难度按类目重新分级（修复 P1/P3 全空）✅
- 健康生活 → P1 入门
- 逻辑思维/经济社会 → P3 深度
- 科技工程/自然 内部分 P2/P3
- 243 topic 重新分布：P1 46 / P2 143 / P3 54
- commit `a7015fa`

### 4. 学通识详情页 + reader 视图配图 ✅
- KnowledgeIllustration.vue 组件（jpg→svg 回退链 + 全屏查看）
- 239 张 topic SVG（gen-knowledge-svg.cjs，按类目配色）
- 2407 张 section SVG（gen-section-svg.cjs，{topicId}-{sectionId}.svg）
- 详情页：左文字 + 右 240x180 图片
- reader 视图：左文字+▶键 + 右 200x150 图片
- 路由改进：reader/{topicId}/{sectionId} 兼容旧 reader/{sectionId}
- commit `19b2ec2`（详情页）、`80b49ef`（reader）

## 涉及文件
- `apps/xuetongshi/src/App.vue`（多处改动：难度 Tab、详情分栏、reader 分栏、路由）
- `apps/xuetongshi/src/components/KnowledgeIllustration.vue`（新建）
- `apps/xuetongshi/src/data/knowledge-meta.ts`（sectionCount 重算）
- `apps/xuetongshi/scripts/expand-ct-topics.py`（新建）
- `apps/xuetongshi/scripts/update-meta-counts.py`（新建）
- `apps/xuetongshi/scripts/gen-knowledge-svg.cjs`（新建）
- `apps/xuetongshi/scripts/gen-section-svg.cjs`（新建）
- `apps/xuetongshi/public/images/knowledge/*.svg`（239 张）
- `apps/xuetongshi/public/images/sections/*.svg`（2407 张）

## 服务器部署
- tiaozhan 后端 3001 启动
- travel-guide 3010 启动
- xuetongshi dist + images/knowledge + images/sections 全部同步

## 今日提交链
```
19b2ec2 详情页左右分栏+239 topic SVG
80b49ef reader 配图+2407 section SVG
a7015fa 难度按类目重新分级
0d5dccb 42 ct-* 扩到 10 节+难度 Tab
```
（前面 6-22 已 ff6f859 学通识 4 部音频完成）

## 关键经验
- **静态资源 deploy 路径**：学通识 `/haodaer/nginx/html/xuetongshi/` 不是 `/haodaer/apps/xuetongshi/dist/`，rsync 时务必明确
- **headless Chrome 截图** SPA 需要 `--virtual-time-budget 10000+` 等 JS 跑完
- **难度分级要按主题深度**，不能按 sectionCount
- **section id 不唯一**是潜在 bug，多 topic 共用 s1/s2；用 `{topicId}-{sectionId}.svg` 文件名规避
