---
name: session-2026-07-06-xueshici-manual-fix-batch1
description: 手工修复诗词 id 23-53（31 首诗经汉乐府），原文加真换行和标点
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次1（id 23-53）

## 已完成（本批次）
31 首诗经→汉乐府经典诗原文分行 + 标点：
id=23-53（采葛→白头吟）

## 剩余的 866 首分类（待后续 batch）

### 批次2（id 54-100）：易，70+ 首，双引号+有标点
最快："双引号 strings → 反引号 template literals + 真换行"
不需要加标点（已有），只需改引号和分行。
关键诗：东门行/桃花源记/归园田居/饮酒/木兰诗/敕勒歌/凉州词/登鹳雀楼/春晓/出塞/静夜思/悯农/江雪 等

### 批次3-4（id 101-200）：中，~100 首，双引号+有标点
同上，但包含隋唐诗赋，原文较长。

### 无标点诗（单独处理）
- 75 首反引号+无标点（需手工加标点+换行，含将进酒/水调歌头/赤壁怀古 等超经典）
- 45 首双引号+无标点（同上最麻烦）

## 踩坑记录
1. **Edit 前必须 Read 至少 15-20 行**确认完整 section 边界（涉江采芙蓉差点搞坏）
2. **每改 30-50 首必须 build + verify**，不能拖太久
3. **build-poem-chunks.cjs 现在读 poems-full.ts 不是 poems.ts**，需保持同步
4. 涉江采芙蓉原诗只有 1 个 section，不要误以为有多 section

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — 依赖的 chunk 架构
- [[session-2026-07-04-5-original-text-fix]] — 原始 22 首 fix 背景
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
- [[session-2026-07-06-xueshici-vue-attr-n]] — Vue attribute 转义
