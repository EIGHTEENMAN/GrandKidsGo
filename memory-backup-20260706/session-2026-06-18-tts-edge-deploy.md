---
name: session-2026-06-18-tts-edge-deploy
description: TTS 从 MiniMax 切换到 Edge TTS + 全量翻译音频生成 + 删除"播放全文"按钮 + 部署
metadata:
  type: reference
  originSessionId: current
---

# Session 2026-06-18 TTS 重跑 + 功能清理 + 部署

## 完成工作

### 1. TTS 引擎切换：MiniMax → Edge TTS
- `scripts/generate-poem-audio/tts.mjs` 从 MiniMax API 切换为 `python3 -m edge_tts`
- 免费、零成本、无需 API Key，中文神经语音质量好
- 修复长文本 shell 参数溢出问题（`--text` 改为 `--file` 传文本）
- 音色策略：男声 `zh-CN-YunxiNeural`（阳光叙事），女声 `zh-CN-XiaoxiaoNeural`（温暖柔和）
- 语速设置 `-10%` 慢速朗诵

### 2. 全量翻译翻译生成（2026/2026 完成）
- 历时约 3.5 小时，0 失败（仅 1069 一次瞬断重跑成功）
- 进程 PID 79194，保持全程正常运行

### 3. 二进制资产 Git 策略调整
- `apps/xueshici/.gitignore` 新增 `*.mp3` / `*.mp4` 规则
- 撤回原本含 3000+ mp3/mp4 的大提交，改为仅提交代码文件

### 4. 移除"播放全文（原文+译文）"功能
- 删除 `playFull()` 函数和 `stopBgmInline()` 死代码
- 删除页面按钮渲染和关联 CSS 样式
- `playingTarget` 类型移除 `'full'` 选项
- 保留原文 `playOriginalText()` 和解读 `playTranslation()` 朗读功能

### 5. 部署
- 本地构建后 rsync dist/ 到服务器（仅 index.html + assets，共 6 文件，4MB）
- `xueshici.grandand.com` HTTP 200 正常

## 待办
- [[session-2026-06-16-poem-supplement]] 补 TTS 原文朗诵 original 剩余 1091 段（task #1）
