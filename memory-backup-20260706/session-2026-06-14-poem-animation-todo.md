---
name: session-2026-06-14-poem-animation-todo
description: 互动性方案讨论 — 诗配动画是核心待办 + 学习报告可视化搁置
metadata:
  type: project
  originSessionId: 2026-06-14-poem-animation-todo
---

# Session 2026-06-14 — 互动性方案梳理 + 诗配动画启动

## 📋 互动性方案现状盘点（2026-06-14）

### ✅ 已完成的互动性功能（不要重复做）
- 走天下互动（投票/挑战/足迹/画廊） — Phase 3B
- 论坛互动（评论/点赞/收藏/消息） — Phase 5
- tiaozhan 问答挑战 + 神兽方块 — Phase 4
- 商城 SKU/支付/仿闲鱼聊天 — Phase 5
- 超管后台多 Tab 管理 — 2026-06-11
- 诗配画引擎 — 2026-06-13/14 ✅ 已 100% 完成（905 张真实图）
- 点词释义互动阅读 — commit 0ae66b8（**用户决定不做**，跳过）
- 读完来挑战 — 用户确认已完成 ✅

### 📌 核心待办：诗配动画（今天启动）
**来源**：session-2026-06-13-poem-illustration.md 的"待办"部分

**前置条件已满足**：
- ✅ 905 张真实 AI 图齐了
- ✅ MiniMax API 已通

**实施步骤**：
1. `apt install ffmpeg -y`（服务器）
2. 写 `image-to-video.mjs`：Ken Burns 推拉效果 + 水墨粒子 + 诗词标题
3. 每张图自动转 6 秒 .mp4（H.264，~200-400KB）
4. 前端 `<img>` → `<video autoplay muted loop playsinline poster>`
5. 回退链：`.mp4` → `.jpg` → `.svg`

**技术考虑**：
- 服务器批量转码（905 个视频，预计 30-60 分钟）
- 需要 CPU 资源评估（FFmpeg 单核 vs 多进程并发）
- 视频大小：1024x1024 → 6 秒 H.264，~200-400KB
- 前端兼容性：Safari/Chrome 都支持 autoplay muted loop

### 🗓 搁置待办：学习报告可视化
**来源**：项目建设方案/学习应用改进思路.md 阶段 6

GitHub 贡献图风格展示学习足迹 + 成就墙

**状态**：用户决定"做，但不是现在"，加入待办不立即启动。

### 💡 其它互动性方案（暂无明确文档）
- 诗朗读 / 跟读 / 古风 BGM — 暂无方案文档
- 在线组队 WebSocket 联机 — 仅 apps/english/docs 有方案
- 学英语闯关弹幕重设计 — 方案阶段

## 🎯 今天的工作重点

启动诗配动画实施：
- 步骤 1：服务器安装 FFmpeg ✅（FFmpeg 8.0.1-3ubuntu2 已装在 /usr/bin/ffmpeg）
- 步骤 2：写 image-to-video.mjs 脚本 ⏳（明天继续）
- 步骤 3：PoC 通过后批量转 905 张
- 步骤 4：前端 PoemIllustration.vue 支持 video
- 步骤 5：部署 + 验证

**明天从这里继续**：先写 image-to-video.mjs，推荐用 ID=1004（过松源晨炊漆公店）做第一张 PoC 验证 Ken Burns + 标题效果。

## 📦 待提交

诗配动画相关文件将分多个 commit：
- scripts/generate-poem-images/image-to-video.mjs（新）
- apps/xueshici/src/components/PoemIllustration.vue（改造支持 video）
- apps/xueshici/public/images/poems/*.mp4（新生成）