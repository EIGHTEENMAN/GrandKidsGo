---
name: session-2026-06-20-mp4-status
description: 2026-06-20 修正：诗配动画 mp4 实际并未丢失，本地 public/images 2027 个 + dist/images 4054 个 mp4 都在；服务器 3837 个 mp4 / 4.3GB
metadata:
  type: project
  originSessionId: 2026-06-20
---

# Session 2026-06-20 mp4 状态修正

## 修正 session-2026-06-16-deploy-sites 的"本地丢失"误判

那条 memory 写的"本地 dist/images/poems 只有 141 jpg + 934 webp，无 mp4"是 4 天前的状态，**现在已经完全恢复**。

## 当前 mp4 资产分布（2026-06-20）

| 位置 | 数量 | 大小 | git 跟踪 |
|------|------|------|---------|
| 本地 `apps/xueshici/public/images/poems/*.mp4` | 2027 | ~4GB | ✅ 是 |
| 本地 `apps/xueshici/dist/images/poems/*.mp4` | 4054（包含 jpg+mp4）| 4.3GB | ❌ 否（构建产物）|
| 服务器 `/haodaer/nginx/html/xueshici/images/poems/*.mp4` | 3837 | 4.3GB | - |

## 关键洞察

- **mp4 没有 git 跟踪的部分** 是 dist/，可以随时 `npm run build` 重建
- **public/ 里的 mp4 在 git 里**，是真正的源码
- 服务器 3837 < 本地 2027 + dist 4054 是正常的：dist 是完整副本（mp4+jpg+webp），服务器不需要 webp

## 不需要重跑

- ✅ 无需 `rsync` 拉服务器
- ✅ 无需重跑 `image-to-video.mjs`
- ✅ 诗配动画功能完整可用

## 关联
- [[session-2026-06-16-deploy-sites]] — 旧记忆（"本地丢失"已过时）
- [[session-2026-06-15-poem-animation]] — 诗配动画上线记录