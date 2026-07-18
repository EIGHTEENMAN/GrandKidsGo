---
name: session-2026-07-06-xueshici-manual-fix-batch6
description: 手工修复诗词 id 401-500（100 首），含 6 首无标点（3 现代诗 + 3 古诗）
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次6（id 401-500）

## 已完成
100 首诗原文分行 + 标点：id 433-560（chunk-4 实际范围），全部反引号 + 真换行 + 句号：
- 重要诗：故园三径/古意/山中/北山/鹿柴/鸟鸣涧/竹里馆/山居秋暝/渭城曲/独坐敬亭山/望洞庭/忆江南/饮湖上初晴/江南春/泊船瓜洲/元日/梅花/夏日绝句/示儿/秋夜将晓/游园不值/雪梅/四时田园杂兴/小池/晓出净慈寺/春日/题临安邸/观书有感/问刘十九/池上/小儿垂钓/江上渔者/陶者/蚕妇/泊秦淮/赤壁/山行/秋词/竹枝词/乌衣巷/望月怀远/春怨/回乡偶书 等

## 修复方法
**用 Write 整体重写** `convert-chunk4.cjs`（避免 batch5 的 Edit 残留问题）：
- FILE 路径：`chunk-3.ts` → `chunk-4.ts`
- MANUAL_FIX 表：3 首 → 6 首

**6 首手工断句**：
- 475 闻一多一句话：4 段，爆一声："咱们的中国！"
- 476 闻一多太阳吟：1 段长句
- 487 李延年北方有佳人：5 句五言古诗
- 488 战城南：六言古诗 8 句，含 "且为客豪！"
- 528 温庭筠更漏子：2 段，每段 6 句 3 字 + 3 句
- 544 秦观行香子·树绕村庄：上下阕，含 1 字逗号节奏

## 验证
- 本地 build chunk-4 hash → `R-mAP-Il`
- 服务器 `/grandkidsgo/nginx/html/xueshici/assets/chunk-4-R-mAP-Il.js`
- 100 个 original 字段全成功
- commit `41885c1` 已 push + deploy

## 关键改进
1. **改用 Write 整体重写脚本**而非 Edit 替换——彻底避免 batch5 的"Edit 替换不完整导致脚本残留"bug
2. **古代六言诗节奏**（id 488 战城南）要用 `战城南，死郭北。` 短句对仗

## 累计进度
- 已修复 478 首（id 23-560，但 id 1-22 未修 + chunk 边界有偏移）
- 实际：5 个 commit，6 个 chunk（chunk-0~4 全部更新 + 部分后续）
- 部署 4 个新 chunk：chunk-1 / chunk-2 / chunk-3 / chunk-4

## 剩余约 570 首

### 批次7+（id 501-2028）：~570 首
- 16 个 chunk（chunk-5 ~ chunk-20）
- 大部分双引号+有标点可复用脚本
- 75 首反引号+无标点 + 45 首双引号+无标点 散落各 chunk

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch3]] — 批次3
- [[session-2026-07-06-xueshici-manual-fix-batch4]] — 批次4
- [[session-2026-07-06-xueshici-manual-fix-batch5]] — 批次5（Edit 残留踩坑）
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
