---
name: session-2026-07-06-xueshici-manual-fix-batch7
description: 手工修复诗词 id 501-700（200 首），含 13 首无标点（5 元曲+8 古诗）
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次7（id 501-700）

## 已完成
200 首诗原文分行 + 标点：chunk-5 (id 561-669) + chunk-6 (id 670-769)，全部反引号 + 真换行 + 句号

## 修复方法
**新模式：合并脚本** `convert-chunk5-6.cjs` 一次处理两个 chunk
- 用 `CHUNKS = ['chunk-5', 'chunk-6']` 数组参数化
- `for (const chunkName of CHUNKS)` 循环处理
- 13 首无标点诗 MANUAL_FIX 表（含元曲领字节奏 + 词领字 + 汉乐府长短句）

**13 首手工断句关键点**：
- 561 张养浩水仙子·咏江南：元曲 7 句，"看"为领字
- 633 刘克庄贺新郎·九日：长词 8 句，"更那堪""看""尽"为领字
- 650/651/701：元曲小令短句节奏
- 663 古歌（汉乐府）："出亦愁入亦愁" 3 字短句
- 675 饮马长城窟行：12 句含对话"慎莫稽留太原卒！"
- 676 曹植箜篌引：注意末尾"先 5 后 4"古诗格式
- 679 酒德颂：刘伶骈文节奏
- 694 敕勒歌：北朝民歌短句
- 737 孤儿行：对话+叙述
- 753 华山畿：南朝民歌 4 句

## 验证
- 本地 build：chunk-5 → `BqchoJpk`，chunk-6 → `CaoavXAr`
- 服务器部署：/grandkidsgo/nginx/html/xueshici/assets/ 两个新 hash 已生效
- 200 个 original 字段全成功
- commit `fc12dc4` 已 push + deploy

## 关键改进
1. **合并脚本处理多个 chunk**：减少脚本数量，MANUAL_FIX 表合并维护
2. **新模式参数化**：CHUNKS 数组 + 循环 + 共享 MANUAL_FIX

## 累计进度
- 已修复 738 首（id 23-769）
- 5 个 fix commit
- 6 个新 chunk 已部署（chunk-1 ~ chunk-6）

## 剩余约 418 首

### 批次8+（id 701-2028）：~418 首
- 14 个 chunk（chunk-7 ~ chunk-20）
- 大部分可复用脚本

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch3]] — 批次3
- [[session-2026-07-06-xueshici-manual-fix-batch4]] — 批次4
- [[session-2026-07-06-xueshici-manual-fix-batch5]] — 批次5
- [[session-2026-07-06-xueshici-manual-fix-batch6]] — 批次6
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
