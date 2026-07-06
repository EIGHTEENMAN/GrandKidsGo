---
name: session-2026-06-19-xueshici-deploy
description: 2026-06-19 xueshici 三个核心 bug 真根因排查 + 全量音频清理 + 部署流程
metadata:
  type: project
  originSessionId: 2026-06-19
---

# Session 2026-06-19 xueshici 修复与音频全量清理

## 用户反馈链
1. "网站都没更新" → 用户看到的是缓存或旧版
2. "刷新跳关雎" → 第一次归因为 restoreFromHash 兜底，**实际根因是 section.id 全是 1**
3. "三个按钮没停止功能" → 第一次归因为部署或代码，**实际根因是 audio.onerror 异步触发清空 playingTarget**
4. "原文朗诵乱码（x y breaktime 斜杠）" → SSML `<break>` 标签在某些 voice/style 组合下被字面朗读
5. 用户最终关键反馈：**先生成新的之前先把有问题的删掉，不要残留**

## 三个核心 bug 的真根因（重点）

### Bug 1: 刷新跳关雎的真根因
- **数据问题**：所有 2026 首诗的 `sections[0].id` 都是 `1`（诗数据生成时的 bug）
- **代码问题**：`saveHash()` 写 `#reader/${section.id}`，但 section.id 不唯一
- **后果**：刷新时 `restoreFromHash` 找 `id=1` → 永远匹配第一首（关雎）
- **修复**：`#reader/${poem.id}-${section.id}` 组合 hash
- 文件：`apps/xueshici/src/App.vue` line 184-260

### Bug 2: 第二个按钮不变 ⏹ 停止朗读的真根因
- **用户场景**：点 ▶ 朗读译文（按钮变 ⏹，正常）→ 再点 ▶ 朗读赏析（按钮不变 ⏹）
- **根因**：`stopAll()` 遍历旧 audio 设 `a.src = ''`，**异步触发** 旧 audio 的 `onerror` 事件
- onerror handler 调用 `opts.onEnd()` → 清空刚设的 `playingTarget.value = 'interpretation'`
- **修复**：stopAll/stopBgm **先置 null** `a.onended` 和 `a.onerror`，再 pause 和 src=''
- 文件：`apps/xueshici/src/lib/audio.ts` line 70-115

### Bug 3: 原文朗诵乱码（x y breaktime 斜杠）
- **根因**：原文朗诵用 SSML `<break time="600ms"/>` 标签间插诗行，但 Edge TTS 在某些 voice/style 组合下解析失败，把 `<break time="..."/>` 字面朗读
- **修复**：原文改纯文本 + `\n\n` 双换行（edge-tts 对纯文本 \n 自然停顿）
- **简化**：去掉 buildSsml 的 rawSsml 分支
- 文件：`scripts/generate-poem-audio/tts.mjs` line 196-220

## 部署流程（正确版）
- 部署目录：`/haodaer/nginx/html/xueshici/` (bind mount 到 docker nginx)
- assets/ 配置 `expires 1y, immutable` → 每次源码改动必须产生新 hash
- build 完必须 rsync 到 nginx html：`rsync -avz --delete dist/ root@47.114.77.124:/haodaer/nginx/html/xueshici/`

## 音频清理（2026-06-19）
- **原文 mp3**：本地 0 个 + 服务器 0 个（用户要求"先删后生成"）→ 待 #4 全量重生成
- **译文 mp3**：本地 1797 + 服务器 1797 ✅（三处一致）
- **赏析 mp3**：本地 1797 + 服务器 1797 ✅（三处一致）
- **缺口**：ID 1997-2225 共 229 首诗**没有译文/赏析**（推迟到 #8）

## 今日修复清单

### ✅ Bug 1: 刷新跳关雎
- 文件：`apps/xueshici/src/App.vue` saveHash/restoreFromHash
- 关键：`#reader/${poemId}-${sectionId}` 组合

### ✅ Bug 2: 第二个按钮不变停止
- 文件：`apps/xueshici/src/lib/audio.ts` stopAll/stopBgm
- 关键：先 `onended = null` + `onerror = null`

### ✅ Bug 3: 原文朗诵乱码
- 文件：`scripts/generate-poem-audio/tts.mjs` buildSsml + play 函数
- 关键：纯文本 + `\n\n` 代替 SSML `<break>`

### ✅ 部署 + commit + push
- commit `5353b77`：fix(xueshici): 三个核心 bug 修复 + TTS 原文改纯文本方案
- 已 push 到 origin/main

## 待办
- **#4**：全量重生成 2026 段原文 MP3 + 部署（预计 3-4 小时）
- **#8**：补齐译文/赏析缺失的 229 段（458 段，预计 1.5 小时）

## 关键教训
1. **用户报"网站没更新"时，先验证用户跑的 bundle hash**——在 main.ts 加 `[VERSION]` console.log 让用户验证
2. **代码"看起来对" ≠ 跑起来对**——要找具体行号 + minified 后的实际函数体
3. **数据问题伪装成代码 bug**——section.id 全是 1 这种数据 bug 不会自动发现
4. **异步事件可能在表达式求值之后触发**——audio.onerror 异步导致 playingTarget 被清
5. **用户说"先生成新的之前先删旧的"——必须先清干净再生成**，避免新旧混存
6. **永远 ssh 验证服务器 bundle hash**——grep "朗读原文/停止朗读" 字符串 + onClick:fn 模式

## 链接
- [[xueshici-deploy-paths]] — 服务器实际部署路径
- [[feedback-deploy-immediately]] — 部署必须真的同步到线上
- [[feedback-confirm-project-first]] — 接到简短指令先确认部署架构
- [[session-2026-06-18-evening-bugfixes]] — 昨晚"假修复"的 session 记录
- [[session-2026-06-18-multi-mood-tts]] — Edge TTS 多情绪矩阵升级