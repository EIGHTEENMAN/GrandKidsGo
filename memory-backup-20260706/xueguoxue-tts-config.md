---
name: xueguoxue-tts-config
description: 学国学TTS音频系统方案——YunyangNeural + -35%语速 + 中文文件名 + BGM循环
metadata: 
  node_type: memory
  type: project
  originSessionId: 480d7750-b045-4da7-80ea-09ddf4a5b51d
---

# 学国学 TTS 音频系统方案

## ⚠️ 蒙学与非蒙学分两套音频方案

### 蒙学方案（童声齐读风）
- 每条书籍固定一种童声音色（不分男女混合），10本书女童:男童=5:5
- 语速：`-30%`
- 纯文本输入（不加SSML，标点自动停顿）

**女童音色（XiaoyiNeural, -30%, +10Hz）：**
- 三字经、弟子规、神童诗、千家诗、小学诗

**男童音色（YunxiaNeural, -30%, +0Hz）：**
- 笠翁对韵、童蒙须知、名贤集、童蒙训、性理字训

### 经部/子部/史部/医部方案（中年沉稳风）
- 音色：`zh-CN-YunyangNeural`（磁性中年男声，沉稳厚重）
- 原文：加 `narration` 情感标签
- 译文/解读：中性讲解（无 style）
- 语速：`-35%`（慢速）

## 最终确认配置（2026-06-21）

**音色策略：**
- 所有段落：`zh-CN-YunyangNeural`（磁性中年男声，沉稳厚重）
- 原文：加 `narration` 情感标签（沉稳叙事腔调）
- 译文/解读：中性讲解（无 style）
- 语速：`-35%`（慢速，适合儿童跟读）

**文件命名：**
- `{书名}_{节名}_{类型}.mp3`
- 类型映射：`original → 原文`、`translation → 译文`、`interpretation → 解读`
- 示例：`论语_学而第一_原文.mp3`

**目录：**
- 生成：`public/audio/books/`
- 部署：`dist/audio/bgm/`（BGM）+ `dist/audio/books/`（MP3）

**BGM 复用学诗词 6 曲：**
- 经部经典 → narrative
- 兵家法家 → heroic
- 道家 → pastoral
- 医书 → graceful
- 蒙学 → pastoral
- 默认 → graceful

**BGM 来源：** `scripts/generate-poem-audio/bgm.mjs`（MiniMax 生成，6首古风器乐）

**脚本：** `apps/xueguoxue/scripts/tts-guoxue.mjs`
- `node scripts/tts-guoxue.mjs --poc` — 每本书只取1节测试
- `node scripts/tts-guoxue.mjs --book jing-1` — 指定某本书
- `node scripts/tts-guoxue.mjs` — 全部书籍全部生成

## 前端 audio.ts
- `apps/xueguoxue/src/lib/audio.ts`：playSectionAudioWithFallback（先HEAD检测mp3存在，不存在则降级Web Speech）
- `apps/xueguoxue/src/App.vue`：播放按钮调用 playOriginal/playTranslation/playInterpretation

## 相关工作
- [[session-2026-06-20-meng-full-text]] — 蒙学扩充100→166节的前置工作
- [[xueshici-deploy-paths]] — 学诗词部署路径参考
