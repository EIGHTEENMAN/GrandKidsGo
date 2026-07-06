---
name: session-2026-06-15-poem-animation
description: 诗配动画引擎上线 — image-to-video.mjs 静态视频壳 + CSS Ken Burns
metadata:
  type: project
  originSessionId: 2026-06-15-poem-animation
---

# Session 2026-06-15 — 诗配动画引擎（核心待办完成）

## 🎉 重大进展：诗配动画上线！

### 架构决策（关键）
**不要在 ffmpeg 里做动画** —— 改用「静态视频壳 + CSS 动画」架构：
- **FFmpeg**：1024x1024 JPG → 6秒 720x720 H.264 MP4 静态壳（~3-5秒/张，~70KB/张）
- **CSS @keyframes**：Ken Burns 推拉 + 标题水墨淡入（GPU加速，零额外开销）
- **好处**：效果可改不改、重编码 905 个视频、可调节动画曲线

**教训**：最初在 ffmpeg 用 zoompan + drawtext，13+ 分钟才转 1 张 → 必须重做。

### 文件清单
- `scripts/generate-poem-images/image-to-video.mjs`（新增，226 行）
- `apps/xueshici/src/components/PoemIllustration.vue`（改造支持 video 标签）
- `scripts/sync-poem-images.sh`（已加 *.mp4 同步）

### 关键路径（部署时容易踩坑）
- **Nginx 实际服务路径**：`/haodaer/nginx/html/xueshici/`（不是 `/haodaer/apps/xueshici/dist/`）
- 老的 conf.d 配置 `haodaer.conf` 写的是 apps 路径，但实际挂载的是 nginx/html
- **真相在 mount**：`docker inspect haodaer-nginx` 看 Mounts 才是真路径
- **真实部署流程**：
  1. `npx vite build` 本地
  2. `rsync` 到 `/haodaer/nginx/html/xueshici/`
  3. 视频壳用 sync-poem-images.sh 每 60s 同步 public/ → nginx/html/

### 媒体回退链（PoemIllustration.vue）
```
.mp4 (动画) → .jpg (静态图) → .svg (Mock占位) → 文字占位
```

### 部署完成
- 新 dist 已同步到 nginx 路径
- PoC ID=1004（过松源晨炊漆公店）已验证：标题淡入、Ken Burns 推拉正常
- 批量跑到 35.8% (324/905) 还在进行中
- 提交: e949045
- 服务在 https://xueshici.grandand.com/（Caddy 在前面终止 TLS）

### 当前状态
- 批量转码后台运行中（~24 分钟剩余）
- 视频壳生成后 60 秒内由 sync 脚本自动同步到 nginx
- 用户可立即访问看到部分动画效果（已生成的 356+ 个视频）

## 📋 待跟进

- [ ] 批量完成后验证：随机抽 10 个视频在浏览器看效果
- [ ] 性能监控：905 个 mp4 总大小、首页加载是否变慢
- [ ] 移动端 Safari/Chrome 的 autoplay muted loop 兼容性
- [ ] 未来：可以根据诗词情绪/季节切换不同 Ken Burns 曲线
