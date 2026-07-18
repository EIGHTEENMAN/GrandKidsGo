---
name: session-2026-07-06-xueshici-manual-fix-batch2
description: 手工修复诗词 id 54-100（47 首），原文加真换行、句号、反引号
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次2（id 54-100）

## 已完成
47 首诗原文分行 + 标点：id 54-100（汉乐府/魏晋南北朝/唐），全部反引号 + 真换行 + 句号：
- 重要诗：东门行/桃花源记/归园田居/饮酒/木兰诗/七哀诗/咏荆轲/五柳先生传/燕歌行/七步诗/白马篇/行路难/梦游天姥/古朗月行/登金陵凤凰台/宣州谢朓楼/从军行（李白+王昌龄）/望岳/蜀相/兵车行/长恨歌/无题/燕歌行（高适）/白雪歌/送杜少府/滕王阁等
- 部分诗（如东门行/木兰诗/五柳先生传/丁督护歌/阁夜/燕歌行高适/白雪歌/送杜少府）原文原本被4字切碎错位，需要按正确原文重写

## 验证
- 本地 build chunk-0 = 1.5MB，dist hash BFG462Rw
- 服务器验证 chunk-0-BFG462Rw.js 内 `original:` 后是真换行 + 句号 + 反引号
- commit 20221ea8 已 push + deploy

## 剩余 866 首分类（待后续 batch）

### 批次3（id 101-200）：中，~100 首，双引号+有标点
同上，但包含隋唐诗赋，原文较长。

### 无标点诗（单独处理）
- 75 首反引号+无标点（需手工加标点+换行，含将进酒/水调歌头/赤壁怀古 等超经典）
- 45 首双引号+无标点（同上最麻烦）

## 踩坑
1. grep 验证服务器 chunk 时 `summary` 字段和 `original` 字段都包含诗名字符串，要用 `original:` 前缀定位
2. python `re.search` 默认不匹配换行符，需 `re.DOTALL`
3. vite build minify 时反引号里真换行保留为字面 \n，未被转义成 \\n

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — 依赖的 chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch1]] — 批次1（id 23-53）
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
- [[session-2026-07-06-xueshici-vue-attr-n]] — Vue attribute 转义