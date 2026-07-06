---
name: session-2026-06-18-multi-mood-tts
description: TTS 多情绪矩阵升级 + 补齐 1092 段原文朗诵 + 部署 xueshici.grandand.com
metadata: 
  node_type: memory
  type: reference
  originSessionId: 29ca98bc-34f2-485c-819f-4cd8c347ff70
---

# Session 2026-06-18 TTS 多情绪矩阵升级 + 补全 + 部署

## 完成工作

### 1. TTS 从 2 音色升级到 6 情绪 × 2 性别 = 12 音色矩阵

**之前**：`tts.mjs` 只按作者性别分男声 `zh-CN-YunxiNeural` / 女声 `zh-CN-XiaoxiaoNeural`，所有诗用同一音色。

**之后**：6 种情绪 (heroic/graceful/pastoral/frontier/lyric/narrative) × 2 性别 = 12 种 voice/style/rate 组合，灵感来自 `bgm.mjs` 已有的 6 情绪体系 + 前端 `audio.ts::detectMood()` 已有的分类器。

| mood | male voice | male style | female voice | female style | rate |
|------|-----------|-----------|-------------|-------------|------|
| heroic | zh-CN-YunyangNeural | assertive | zh-CN-XiaoxiaoNeural | cheerful | -5% |
| graceful | zh-CN-YunxiNeural | gentle | zh-CN-XiaoxiaoNeural | gentle | -15% |
| pastoral | zh-CN-YunxiNeural | calm | zh-CN-XiaoxiaoNeural | gentle | -20% |
| frontier | zh-CN-YunjianNeural | serious | zh-CN-XiaoxiaoNeural | serious | -5% |
| lyric | zh-CN-YunxiNeural | calm | zh-CN-XiaoxiaoNeural | affectionate | -15% |
| narrative | zh-CN-YunxiNeural | narration | zh-CN-XiaoxiaoNeural | calm | -10% |

**关键实现：**
- 新建 `scripts/generate-poem-audio/moodClassifier.mjs`，从 `apps/xueshici/src/lib/audio.ts::detectMood()` 1:1 移植（18 行 regex 链）
- 不共享 TS 源码——避免引入构建步骤。优先级完全一致：frontier → pastoral(楚辞) → heroic → lyric → pastoral(王维) → narrative → graceful
- `tts.mjs` 升级：
  - `callEdgeTTS` 签名扩展为 `(text, profile, outputPath)`，profile 含 `voice/style/styleDegree/rate`
  - 有 style 时写 SSML（`mstts:express-as` + `prosody`），无 style 时维持原 plain text 路径
  - `translation` 强制 `style = null`（保持赏析讲解中性，不上朗诵腔）
  - 新增 `escapeXml()` 处理 5 个 XML 实体
  - 新增 `--regen-all` flag：把 done 备份到 `done.bak-{ts}` 后重做

### 2. 修 execSync stderr 捕获问题

Node 26 上 `execSync(cmd, { stdio: 'pipe' })` 失败时 `err.stderr` 为空，导致重试日志看不到真实错误。改用 `spawnSync` 显式 `encoding: 'utf-8'` 收集 stdout/stderr，错误信息完整呈现。

### 3. 区分瞬断 vs 永久错误

- 瞬断特征：`ConnectionResetError` / `ConnectError` / `ServerDisconnected` / `TimeoutError` / `429`
- 永久错误：style 不被支持 → 自动降级为 `style = null` + plain rate
- 瞬断 backoff：`2000ms × attempt × 3`（429 时 ×5），3 次重试

### 4. 全量补齐 1092 段原文朗诵

- 起点：935/2026 original 已生成（旧 2 音色）
- 第一轮：10056s (2h47min) 生成 986 段 + 100 段永久失败（瞬断 3 次都失败）→ 实际 1921 段
- 第二轮重试 100 段：564s (9min) **100/100 成功**，0 失败，速度 10.6 段/分钟
- 最终：**4053/4053 段完成，0 失败**，original mp3 2027 个（PoC 多 1 个副本）

### 5. 部署

- `npm run build` 成功（dist 1.6GB，含 audio + images）
- rsync dist 到服务器：剔除 `audio/poems/*.mp3` 和 `images/poems/*.mp4`（已 .gitignore 也走 rsync 单独）
- rsync 1093 个缺失的 original mp3 到 `/haodaer/apps/xueshici/dist/audio/poems/`
- 服务器最终：2027 个 original mp3 / dist 完整 / SSL Let's Encrypt 正常
- git commit `fc968c4` + push 到 main
- 更新 `CLAUDE.md` 加 TTS 矩阵段落

## 踩坑

1. **rsync `--files-from` 路径**：源路径写 `apps/xueshici/public/audio/poems/X.mp3` + 目标 `/haodaer/apps/xueshici/dist/` 会拼成 `/haodaer/apps/xueshici/dist/apps/xueshici/public/audio/poems/X.mp3`（路径重复）。正确做法：源写相对路径 `audio/poems/X.mp3`，基目录是 `apps/xueshici/public/`。
2. **execSync stderr 空**：改 spawnSync。
3. **curl 本地 SSL exit 35**：本机 curl/SSL 配置问题，线上 SSL 正常（openssl s_client 验证 Verify=0 ok）。
4. **edge-tts 服务端瞬断**：高峰期跨太平洋链路不稳定，瞬断高发。退避策略 `2000ms × attempt × 3` 有效但慢；网络好时可达 10.6 段/分钟，差时 5.9 段/分钟。

## 待办

- Task #2 诗配画/动画补齐新诗（ID 1005-1200+） — session-2026-06-16-poem-supplement 遗留
- Task 备份 verification：抽检线上 https://xueshici.grandand.com 实际播放确认
- 多情绪听感人工验收：6 段 PoC 音频（ID 1009/1015/1016/1026/1040/1066）用户亲耳确认差异是否明显

## 链接
- [[session-2026-06-18-tts-edge-deploy]] 上一轮 TTS 部署
- [[session-2026-06-16-poem-supplement]] 2026 首诗词补全
- [[feedback-deploy-immediately]] 部署规则
- [[auto-push-after-commit]] 自动推送
