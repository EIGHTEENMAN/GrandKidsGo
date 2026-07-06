---
name: session-2026-07-06-xueshici-manual-fix-batch4
description: 手工修复诗词 id 201-300（100 首），含 7 首现代诗手工断句
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次4（id 201-300）

## 已完成
100 首诗原文分行 + 标点：id 201-300（清/近现代），全部反引号 + 真换行 + 句号：
- 重要诗：湖上寓居杂咏/夜坐/天山/长白山/八阵图/登岳阳楼/春江花月夜/凉州词/出塞/芙蓉楼/次北固山下/黄鹤楼送孟浩然/闻王昌龄/春望/望岳/蜀相/兵车行/茅屋为秋风所破/闻官军/登高/春夜喜雨/枫桥夜泊/题都城南庄/赋得古原草送别/相思/长恨歌/琵琶行/无题/锦瑟/咏柳/回乡偶书/咏鹅/静夜思/悯农/江雪/游子吟/寻隐者不遇/登幽州台歌/黄鹤楼/送友人/早发白帝/望庐山瀑布/将进酒/蜀道难/行路难/月下独酌 等

## 修复方法
复制 `convert-chunk1.cjs` 为 `convert-chunk2.cjs`，改 2 处：
- FILE 路径：`chunk-1.ts` → `chunk-2.ts`
- MANUAL_FIX 表：3 首古诗 → 7 首现代诗（id 218/223/224/225/230/232/233）

**关键差异**：批次4 含 7 首近现代诗，断句节奏不同于古诗的 5/7 字：
- 218 教我如何不想她（刘半农）：4 句 7 字
- 223 清贫（方志敏）：1 句到底
- 224 囚歌（叶挺）：含 `：` `！` `——` 现代标点
- 225 我的自白书（陈然）：4 句
- 230 你是人间四月天（林徽因）：5 句含 `；`
- 232 雨巷（戴望舒）：长节选，9 句
- 233 红烛（闻一多）：6 句含 `？`

## 验证
- 本地 build chunk-2 hash → `C2aBxnc6`
- 服务器 `/grandkidsgo/nginx/html/xueshici/assets/chunk-2-C2aBxnc6.js` 验证 id 224 囚歌 7 行手工断句全部正确
- 100 个 original 字段全成功
- commit `edbec69` 已 push + deploy

## 关键踩坑
1. **现代诗断句不能用古诗规则**：5/7 字固定切段会破坏原诗节奏，要按 `：` `！` `？` `；` `——` 等现代标点 + 语义切
2. **CHUNK_SIZE=100**：chunk-0=1-100 / chunk-1=101-200 / chunk-2=201-300 / ... / chunk-20=2001-2028（共 21 个 chunk）

## 剩余 728 首分类

### 批次5（id 301-400）：~100 首，双引号+有标点
直接复用 convert-chunk2.cjs 模式改 chunk-3.ts

### 批次6-22（id 401-2028）：~628 首
同上

### 75 首反引号+无标点（需手工加标点+换行）
含将进酒/水调歌头/赤壁怀古 等超经典（这些在 chunk-2 之前或之后？需查）

### 45 首双引号+无标点（最难）

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — 依赖的 chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch1]] — 批次1（id 23-53）
- [[session-2026-07-06-xueshici-manual-fix-batch2]] — 批次2（id 54-100）
- [[session-2026-07-06-xueshici-manual-fix-batch3]] — 批次3（id 101-200）
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
- [[session-2026-07-06-xueshici-vue-attr-n]] — Vue attribute 转义
