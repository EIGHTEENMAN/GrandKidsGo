---
name: session-2026-06-16-deploy-sites
description: 2026-06-16 学习三站点部署 + 诗配动画资产审计
metadata:
  node_type: memory
  type: reference
  originSessionId: d57a3a48-94aa-48e5-8168-40a31639d3d8
---

# Session 2026-06-16 站点部署

## 完成工作

### 1. 学习三站点重新部署 ✅
- **xueguoxue** (国学): 936K, 92 经典, HTTP 200
- **xuetongshi** (通识): 2.0M, 243 主题, HTTP 200
- **xueshici** (诗词): 1.1G, 999 诗词, 1075 图, 1846 音频, HTTP 200

### 2. 发现并纠正的误判
- 本地 `curl` 返回 000 是 **DNS 劫持**（198.18.0.252），不是站点不可用
- 服务器内部 curl 全部 HTTP 200，部署本身没问题
- audio 文件命名是 `{id}_original.mp3` + `{id}_translation.mp3`（不是 1.mp3）

## 诗配动画资产状态

**关键发现**：记忆中 905 mp4 在 **服务器存在**（3 副本：nginx html + apps/public + apps/dist），但**本地 Mac 工作区丢失**。

- 服务器: 905 个 .mp4 × 3 处 = 2715 个文件
- 本地 dist/images/poems: 只有 141 jpg + 934 webp，无 mp4
- 前端 PoemIllustration.vue 已实现 .mp4 优先回退逻辑
- 修复方法：从服务器 `rsync` 拉取 或 重跑 `scripts/generate-poem-images/image-to-video.mjs`

## 共享包警告

`shared/src/data/chardict.ts` 有重复键警告（书/画/卷/篇/行/须/色/词/诗 等），不影响构建但需要后续清理。

## 当前内容数据

- 诗词: 997/2000 (49.9%)
- 国学: 86/20 (✅ 超额)
- 通识: 243/500 (48.6%)
- 英语: 5018/5000 (✅ 超额)

## 下一阶段建议

- B 选项: 英语板块去游戏化改造 (Task #1, 最大工作量)
- C 选项: 内容扩充 (诗词 1003 缺口 + 通识 257 缺口)
- D 选项: 同步诗配动画 mp4 资产到本地
