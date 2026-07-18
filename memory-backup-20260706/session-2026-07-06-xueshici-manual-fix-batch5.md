---
name: session-2026-07-06-xueshici-manual-fix-batch5
description: 手工修复诗词 id 301-400（100 首），含 3 首无标点（苏轼定风波/罗隐霰/关汉卿大德歌）
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次5（id 301-400）

## 已完成
100 首诗原文分行 + 标点：id 301-400，全部反引号 + 真换行 + 句号：
- 重要诗：打起黄莺儿/蜀道难/将进酒/行路难/月下独酌/宣州谢朓/登金陵凤凰台/送孟浩然/玉门关/凉州词王翰/出塞王昌龄/从军行/芙蓉楼/次北固山下/鹿柴/鸟鸣涧/竹里馆/山居秋暝/九月九日忆山东兄弟/渭城曲/独坐敬亭山/望洞庭/忆江南/饮湖上初晴/江南春/泊船瓜洲/元日/梅花/六月二十七日望湖楼/题西林壁/饮湖上初晴后雨/惠崇春江晚景/夏日绝句/示儿/秋夜将晓/游园不值/雪梅/四时田园杂兴/小池/晓出净慈寺/春日/题临安邸/观书有感/冬夜读书/问刘十九/池上/小儿垂钓/江上渔者/陶者/蚕妇/元日改写/泊秦淮/赤壁/泊秦淮/山行/秋词/竹枝词/乌衣巷/望月怀远/春怨/回乡偶书/咏蝉/风/咏雪/咏霜/咏云/咏虹/问刘十九/池上/小儿垂钓/江上渔者/陶者/蚕妇/等

## 修复方法
复制 `convert-chunk2.cjs` 为 `convert-chunk3.cjs`，改 2 处：
- FILE 路径：`chunk-2.ts` → `chunk-3.ts`
- MANUAL_FIX 表：7 首现代诗 → 3 首无标点古诗（id 373/397/429）

**3 首手工断句**：
- 373 苏轼定风波·南海归赠：12 句含小序节奏（`风起。` `雪飞炎海变清凉。` 单字句）
- 397 罗隐霰：5 律格式，颔联/颈联对仗
- 429 关汉卿大德歌·春：元曲小令 5 句

## 验证
- 本地 build chunk-3 hash → `g2lXI0Ha`
- 服务器 `/grandkidsgo/nginx/html/xueshici/assets/chunk-3-g2lXI0Ha.js` 验证 id 373 定风波 12 句手工断句全部正确
- 100 个 original 字段全成功
- commit `3e7207b` 已 push + deploy

## 关键踩坑
1. **Edit 替换不完整导致脚本残留**：复制 convert-chunk2.cjs → convert-chunk3.cjs 后 Edit 只替换了头 49 行，但原脚本 233 红烛的尾巴（line 49-52）没被覆盖，导致语法错误。**修复方式**：在 Edit 之前先 Read 文件确认结构，或用 `replace_all` 整块替换。

## 累计进度
- 已修复 400 首（id 23-400）
- 4 个 commit：batch3 `8d7e775` / batch4 `edbec69` / batch5 `3e7207b`
- 部署 3 个新 chunk：chunk-1 / chunk-2 / chunk-3

## 剩余 628 首

### 批次6-22（id 401-2028）：~628 首
- 16 个 chunk（chunk-4 ~ chunk-19）
- 大部分是双引号+有标点，可复用脚本
- 75 首反引号+无标点 + 45 首双引号+无标点 散落各 chunk，需逐步处理

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — 依赖的 chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch3]] — 批次3（id 101-200）
- [[session-2026-07-06-xueshici-manual-fix-batch4]] — 批次4（id 201-300）
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
- [[session-2026-07-06-xueshici-vue-attr-n]] — Vue attribute 转义
