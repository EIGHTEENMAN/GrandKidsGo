---
name: session-2026-07-02-mengxue-bug-skipped
description: 蒙学10部166节 mp3 失童声 bug — 用户选择不修
metadata: 
  node_type: memory
  type: session
  status: known-bug-deferred
  originSessionId: 8549f5bf-715c-419e-9e78-1aa8c6a007c5
---

# 2026-07-02 蒙学 mp3 失童声 bug

## 现状
xueguoxue.grandand.com 蒙学 10 部 166 节原文 mp3 从 6月28日起是 **Yunyang 成人男声**（应为 Xiaoyi/Yunxia 童声 + -30% rate）。

## 根因
6月28日 session 跑 tts-guoxue.mjs 补译文/解读音频，蒙学排除 filter 失效或被旁路，覆盖了 6-22 部署的儿童声 mp3。本地 public/、dist/、服务器三处 mp3 时长/大小一致，无任何儿童声备份。

## 验证
- 三字经_人之初_原文.mp3 时长 36.264s（正常语速）
- 期望 ~50s（-30% rate 童声）

## 用户决定
**不修**。接受当前成人男声状态。

## 教训
1. tts-guoxue.mjs 蒙学 filter `!b.id.startsWith('meng-')` 实际不可靠 —— 6-28 漏跑了
2. 部署前必须对比 mp3 时长（蒙学童声应比非蒙学慢 30%）
3. 蒙学 498 段 mp3 没有 .gitignore 外的备份（.gitignore 屏蔽了 public/audio/，6-22 部署时也没单独备份到 dist/ 之外的目录）
