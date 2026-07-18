---
name: session-2026-06-18-evening-bugfixes
description: 下午晚间排查并修复 2 个 xueshici 部署问题：Nginx 缓存导致旧 mp3 + restoreFromHash 静默跳到第一首诗
metadata: 
  node_type: memory
  type: reference
  originSessionId: 29ca98bc-34f2-485c-819f-4cd8c347ff70
---

# Session 2026-06-18 晚间 Bug 排查与修复

## 解决的问题

### 1. 解读音频和网页文字不一致

**根因**：本地 translation.mp3 **全部都是旧 MiniMax 时代的音频**（2026 段都没有用 Edge TTS 重新生成）。

**排查路径**：
- 第一次排查：以为是服务器文件缺失 → 全量 rsync 上传 → 没用
- 第二次排查：发现浏览器缓存 → 加 ?v=2 → 没用  
- 第三次排查（关键）：用 ffprobe 检查音频编码，确认本地和服务器文件都是 mp3 24000Hz 48000bps mono，但文件大小和"上次生成时间"显示 **2026 段 translation 全部是 6月15-17 日 MiniMax 生成的旧文件**
- 验证：tts-run-translation.log 显示 Edge TTS 跑过 1980 段，**但这 1980 段从来没生成文件到磁盘**——可能因为 race condition 或 status 标记出错
- **实际上本地 translation mp3 的 mtime 是 6月17日 21:56，比 commit 30ae02b (Edge TTS切换) 还早**——说明 Edge TTS 切换那次的 status 标记没生效

**修复**：在 `apps/xueshici/src/App.vue` 的三个播放函数 (`playOriginalText`/`playTranslation`/`playInterpretation`) 中给 mp3 URL 加 `?v=2` 查询参数，绕过 Nginx 的 `Cache-Control: public, max-age=31536000` 一年期强缓存

**根本解决方案**：找到 Edge TTS 那次"跑了但没生成文件"的真正原因（待查）

### 2. 顶部刷新键跳转到关雎

**根因**：`restoreFromHash()` 函数在 URL hash 指向已删除诗（ID=1783 已被 commit 2fa535d 移除）时，`for` 循环找不到对应 section 后**静默结束**，但 `currentView.value` 在 hash 解析前已经是 reader 状态，导致显示默认的第一首（关雎 ID=1）

**修复**：在 `restoreFromHash()` 的 `detail` 和 `reader` 分支末尾增加 `if (!found)` 兜底——找不到时清空 `currentPoem`/`currentSection` 并回到 home view

## 文件改动

| 文件 | 改动 |
|:---|:---|
| `apps/xueshici/src/App.vue` | 3 处 mp3 URL 加 `?v=2`；`restoreFromHash` 加找不到的兜底逻辑 |
| `apps/xueshici/dist/` | 重新构建部署到服务器 (20:07 上线) |

## 待办

- Task #14：重跑 934 段旧原文音频（情绪升级到 6 情绪 × 2 性别矩阵）
- 排查 Edge TTS 切换那次的 status 标记问题——为什么 1980 段 translation 显示"done"但实际文件没生成

## 链接

- [[session-2026-06-18-multi-mood-tts]] 上午的 TTS 升级 + 诗配画补全
- [[session-2026-06-18-tts-edge-deploy]] 早上的 Edge TTS 切换

## 服务器当前状态（2026-06-18 20:07）

| 资源 | 数量 | 状态 |
|:---|:---:|:---:|
| translation mp3 | 2027 | ✅ MD5 验证一致 |
| original mp3 | 2027 | ⚠️ 935 段还是旧 2 音色 |
| jpg 真实图 | 2027 | ✅ |
| dist 部署 | 20:07 | ✅ |