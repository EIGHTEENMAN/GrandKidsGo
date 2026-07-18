---
name: session-2026-07-04-tts-literal-n-fix
description: 清理 classics.ts/poems.ts 里 8694 个字面 \\n 残留（被 edge-tts 念成"n"音）+ TTS 重生成 910 个音频并部署
metadata:
  node_type: memory
  type: project
  originSessionId: 992e940a-c2c3-4f71-8385-83590897d545
---

# 2026-07-04 TTS 字面 \\n 修复 + 音频重生成

## 问题
classics.ts/poems.ts 的 original 字段里 \n 是字面两字符（5c 6e），不是真换行符（0x0A）。
TTS 脚本 `text.replace(/\n+/g, '。')` 只匹配真换行符，字面 \n 残留被 edge-tts 念成"n"音。
现象：学国学三字经礼乐射原文音频中 "n曰喜怒、n高曾祖"。

## 影响范围
- 学国学 classics.ts: 483 个字面 \n（34 段落，2.2%）
- 学诗词 poems.ts: 8211 个字面 \n（868 段落，42.8%）
- 学通识 knowledge.ts: 0（✅ 无此问题）

## 修复
1. 替换字面 \n → 中文逗号，清理 `。。` → `。`
2. commit `4efb961f`
3. 删除服务器上的 910 个问题音频（rm，无备份）
4. TTS 重生成：
   - 学国学蒙学（tts-mengxue.mjs）：42 个 original ✅
   - 学诗词（tts.mjs --ids）：866 个 original ✅（2 个失败后重试成功）
5. rsync 部署到服务器

## 最终状态
- 学诗词 original 音频: 2026/2026 ✅
- 学国学原文音频: 已补缺 ✅（1487 原文 + 译文+解读 = 4464 总）
- 三字经礼乐射: `曰喜怒，曰哀惧。...高曾祖，父而身。` ✅ 无 n 音

## 注意
- 学诗词 tts-status.json 里有 `done` 标记，如某个文件缺失需要删状态缓存再跑
- edge-tts 批量生成约 1.5 小时（含重试），失败 8 个后重试成功
- 部署用 rsync，仅传差异文件
