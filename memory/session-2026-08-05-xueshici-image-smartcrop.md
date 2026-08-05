---
name: session-2026-08-05-xueshici-image-smartcrop
description: 诗词详情页 PoemIllustration 智能裁切 — 人像/山水/通用三档 object-position
metadata:
  type: project
  originSessionId: 2026-08-05
---

# Session 2026-08-05 · xueshici 诗词详情页图片智能裁切

## 背景
诗词详情页 `PoemIllustration` 组件加载 1024×1024 AI 生成图，用 `object-fit: cover` 压成长条 banner 时：
- 人像诗 → 头部/脸部被裁出画面
- 山水诗 → 主峰/月亮被裁到边缘外
- 用户体验差，且没有 AI 重新生成的合适理由（98% 图本质是对的，只是被错位裁切）

## 改动（commit 37d43f0）

### 仅前端 CSS + props 透传（不改图、不调 LLM）
- `PoemIllustration.vue` 加 `poemTags?: string` prop（从 App.vue 透传）
- 新增 `subjectKind` computed（人像/山水/通用 三档）：
  - **优先级：山水 > 人像 > 通用**
  - 山水关键词：山/水/江/河/湖/海/月/云/松/石/雪/风/花/鸟/寺/塔/楼/桥/春/晓/夜/登
  - 人像关键词：送/忆/别/思/乡/酒/宴/故人/翁/妇/将/臣（去掉了游/王/女等高歧义单字）
- 新增 `objectPosition` computed：
  - portrait → `center 30%`（脸上移到画面上部，避免被顶部角标挡住）
  - landscape → `center 45%`（主景稍偏上，避免底部被压）
  - generic → `center center`
- `.pi-image` height 固定 320px（移动端 220px），让 object-position 真正生效
- 全屏预览图（`.pi-fullscreen-img`）也用同一 objectPosition

## 验证

测试样例：
```
#1 《关雎》       (诗经,爱情)         → generic
#5 《静夜思》     (思乡,月亮)         → landscape（人像词被「月」优先）
#11 《登鹳雀楼》  (山水,登高)         → landscape（之前被「王」误判 portrait 已修）
#27 《赠汪伦》    (送别,友情)         → portrait ✓
#32 《九月九日忆山东兄弟》(思乡,重阳) → landscape（月优先）
#130 《咏鹅》     (咏物,鹅)           → generic ✓
#141 《出塞》     (边塞,将军)         → portrait ✓
#180 《春望》     (感时,花)           → landscape（花触发）
```

TypeScript 零错误。

## 关键决策

| 决策 | 理由 |
|------|------|
| 山水优先级 > 人像 | 山水词（月/山/江/水）比人像词（送/忆）更明确；surname 王/李/赵 易误触人像 |
| 人像词去单字「王/游/女」 | surname 和动词「游」歧义大；改用组合词「送别/思乡/故人」更稳 |
| height 固定 320px | `object-fit: cover` + `height: auto` 时 object-position 不生效；必须有容器高度 |
| 仅前端、不改图 | 2027 张图 95% 本质对，只是被错位裁；改图成本高且破坏已生成缓存 |

## 边界 / 已知 follow-up

- **tags 缺失的诗** → fallback to title + author；title 是必有的所以至少 title 命中
- **作者 tags 未提供** → poemTags 通过新 prop 透传；App.vue line 738 已传
- **完全无信号的诗**（如 #130《咏鹅》） → generic，居中显示（与旧版 cover 表现类似）
- **后续若加"月份主题"字段**（春/夏/秋/冬） → 现有 LANDSCAPE_KEYWORDS 已含「春」，可直接复用

## 关联
- [[session-2026-08-05-hotel-pipeline]] — 同日 PR2-C
- [[session-2026-08-05-pr2-a]] — 同日 PR2-A
- 2026-08-05 当日三连：PR2-C → PR2-A → 图片裁切优化