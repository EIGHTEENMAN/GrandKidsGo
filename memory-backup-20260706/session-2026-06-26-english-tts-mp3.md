---
name: session-2026-06-26-english-tts-mp3
description: 学英语 5018 词例句改 Edge TTS en-US-GuyNeural mp3 (commit 6bd10507)
metadata:
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-26 学英语例句 TTS 升级

## 决策
- **之前**：浏览器 speechSynthesis 中文男童（生硬无重音）
- **现在**：Edge TTS en-US-GuyNeural 预生成 mp3 + SSML emphasis 内容词

## 声音选择过程
1. 试 YunxiaNeural（蒙学男童同款）→ 生硬
2. 加 style cheerful/gentle/assistant → 用户反馈"还是不够自然 没有感情"
3. 试 en-US-GuyNeural（英语男声）→ 用户选 5（最自然）
4. 加 SSML `<emphasis level="strong">` 给内容词（名词/动词/形容词）→ 完美

## SSML 模板
```xml
<speak version="1.0" xml:lang="en-US">
<voice name="en-US-GuyNeural">
<prosody rate="-15%" pitch="+0%">
The <emphasis level="strong">alligator</emphasis> is <emphasis level="strong">sunbathing</emphasis> by the <emphasis level="strong">lake</emphasis>.
</prosody>
</voice></speak>
```

## 生成脚本 (gen-sentence-tts.mjs)
- 并发 3 + 3 次重试 + 指数 backoff（限流识别）
- 5001 词目标，成功 2802 + 跳过 1848 = 4650，失败 351
- **失败原因：edge_tts WebSocket 服务端限流**（不是参数问题，重试也没用）
- 总用时 134 分钟（37 词/分）
- 最终 3340 个有效 mp3 (532MB)

## FlashCard 改造
```ts
function playSentence() {
  const word = currentWord.value.word.toLowerCase()
  const audio = new Audio(`/audio/sentences/${word}.mp3`)
  audio.onerror = () => speakSentence(currentWord.value.sentence)  // 降级 TTS
  audio.play().catch(() => speakSentence(currentWord.value.sentence))
}
```

## Commit
`6bd10507` feat(english): FlashCard 例句音频改 Edge TTS 英语男声 mp3
- 3340 mp3 + FlashCard.vue 改动
- cc903048 → 6bd10507
- 已 push origin/main

## 教训
1. **edge_tts 限流是 IP/账户级**——并发 6 触发雪崩失败，重试也无效；并发 3 稳定
2. **SSML `<emphasis>` 是 TTS 语调的关键**——默认 TTS 都偏平，加 emphasis 立刻有英语自然重音
3. **en-US-GuyNeural 优于中文男童**——地道英语语调对英语学习场景更合适
4. **降级方案必备**——>1/3 词没 mp3 也能用（speechSynthesis 兜底）

## 关联
- [[session-2026-06-26-english-blank-pages]] — FlashCard 改版
- [[xueguoxue-tts-config]] — 蒙学男童音色参考
- [[session-2026-06-26-english-tts-v5-pitch]] — 之前的 TTS v5 方案
