---
name: session-2026-06-13-poem-illustration
description: 诗配画引擎部署上线 + MiniMax文生图集成 + Nginx架构清理
metadata:
  type: project
  originSessionId: 2026-06-13-poem-illustration
---

# Session 2026-06-13 — 诗配画引擎上线 + MiniMax 集成

## ✅ 完成内容

### 1. 诗配画引擎上线（xueshici.grandand.com）
- 构建部署最新版 xueshici（含 PoemIllustration.vue 组件）
- 修复 Nginx 缓存策略：`index.html` 不缓存（no-cache），`/assets/` 保留 1 年不可变缓存
- 修复 Caddy 路由到 haodaer-nginx 的链路（之前误部署到 dkd-nginx）
- 修复 HTTP→HTTPS 重定向循环（Caddy 已做 SSL 终结，Nginx 内不该再 301）
- Mock 模式生成 934 首 SVG 水墨占位图（彩色山水风格）
- PoemIllustration 组件增加 `.webp` → `.svg` 回退逻辑

### 2. MiniMax 文生图集成
- `config.mjs` — 新增 MiniMax 配置（api.minimaxi.com 端点、image-01 模型）
- `generate.mjs` — 新增 `generateMiniMaxImage()` 函数，中文 prompt 原生调用
- `generate.mjs` — 新增 `dynastyStyleCn()` 中文朝代风格映射（唐→盛唐气象，宋→宋画清雅等）
- `generate.mjs` — 跳过逻辑优化：真实 API 生成可覆盖旧的 Mock `.webp` 占位图
- `PoemIllustration.vue` — 支持 `.webp` → `.jpg` → `.svg` 三级自动回退
- 验证：API 成功返回 1024×1024 JPEG 配图（225KB 左右）

### 3. 服务器后台生成
- 上传脚本到服务器 `/haodaer/scripts/generate-poem-images/`
- 后台运行全量生成（PID 1129987），Plus 套餐每天 50 张
- `sync-poem-images.sh` 同步脚本每分钟自动复制新图片到 Nginx 目录
- 已生成 16+ 张真实配图，网站实时可见

### 4. Nginx 架构清理
- 发现 dkd-nginx 容器残留好大儿配置和文件
- 删除 `/DKD/nginx/conf.d/haodaer.conf` + 5 个站点的 html 文件
- 最终架构：
  ```
  Caddy → haodaer-nginx（grandand.com 系）
  Caddy → dkd-nginx（dongkadi.cn 系）
  Caddy → aiceooffice-nginx（aiceooffice.com 系）
  ```
- 全站点验证通过（xueshici/grandand/dongkadi/aiceooffice 均 200）

## 📊 Git统计
- 2 个新 commit
- 核心文件变更：config.mjs, generate.mjs, PoemIllustration.vue, haodaer.conf
- 全部已 push 到 origin/main

## ⚠️ 遗留
- MiniMax Plus 套餐每天 50 张，934 首全量需约 19 天
- 服务器后台在跑，明天查进度：`ssh root@47.114.77.124 "tail -5 /tmp/minimax-gen.log"`

## 📌 待办：诗配动画（图片存量够多后再搞）
- 安装 FFmpeg：`apt install ffmpeg -y`
- 写 `image-to-video.mjs`：Ken Burns 推拉效果 + 水墨粒子 + 诗词标题
- 每张新图片自动 FFmpeg 转 6秒 .mp4（H.264，~200-400KB）
- 前端 `<img>` → `<video autoplay muted loop playsinline poster>`
- 回退链：`.mp4` → `.jpg` → `.svg`
