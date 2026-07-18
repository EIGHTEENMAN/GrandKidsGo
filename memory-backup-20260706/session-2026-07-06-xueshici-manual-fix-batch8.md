---
name: session-2026-07-06-xueshici-manual-fix-batch8
description: 手工修复诗词 id 770-1069（300 首），含 11 首无标点（4 元曲+1 现代诗+6 古诗）
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次8（id 770-1069）

## 已完成
300 首诗原文分行 + 标点：chunk-7 (id 770-869) + chunk-8 (id 870-969) + chunk-9 (id 970-1069+)

注：chunk-9 实际含 100 首诗，不是之前以为的 33 首（之前 Python 统计用了错误的正则——只统计"双引号+有标点"诗，反引号新格式诗没被算入）。修正后 chunk-9 = 100 首全转换。

## 修复方法
`convert-chunk7-9.cjs` 3-chunk 合并脚本

**11 首手工断句关键点**：
- 782 张可久金字经·春晚：元曲 7 句，含"？"领字
- 783 薛昂夫庆东原：元曲 6 句
- 799 黄昏：现代诗 4 句（"哪怕胸口对着带血的刺刀"）
- 842 李清照如梦令：7 句"知否知否"叠字
- 866 陈子昂登幽州台歌：经典 4 句
- 875 杜甫茅屋为秋风所破歌：11 句"呜呼"感叹
- 899 郑燮道情：5 句
- 911 白居易池上：数据异常——26 字含 2 首诗拼写，按合理分段处理
- 953/954：南朝民歌短句
- 955 雨花台（明诗）：4 句

## 验证
- 本地 build：chunk-7 → `C4XpV_0l`，chunk-8 → `w6RLRMy1`，chunk-9 → `BqsZnjCM`
- 服务器部署：3 个新 hash 已生效
- 300 个 original 字段全成功
- commit `7a791a2` 已 push + deploy

## 关键改进
1. **3-chunk 合并脚本**：进一步减少脚本数量
2. **id 911 数据异常处理**：保留原文拼写（2 首诗合并），不擅自拆分

## 累计进度
- 已修复 1047 首（id 23-1069）
- 6 个 fix commit
- 9 个新 chunk 已部署（chunk-1 ~ chunk-9）

## 剩余约 959 首

### 批次9+（id 1070-2028）：~959 首
- 12 个 chunk（chunk-10 ~ chunk-21）
- 大部分可复用脚本

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch3]] — 批次3
- [[session-2026-07-06-xueshici-manual-fix-batch4]] — 批次4
- [[session-2026-07-06-xueshici-manual-fix-batch5]] — 批次5
- [[session-2026-07-06-xueshici-manual-fix-batch6]] — 批次6
- [[session-2026-07-06-xueshici-manual-fix-batch7]] — 批次7
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
