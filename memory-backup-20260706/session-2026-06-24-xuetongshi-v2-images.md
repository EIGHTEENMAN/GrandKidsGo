---
name: session-2026-06-24-xuetongshi-v2-images
description: 学通识图片方案 v2 — wiki 真实图 + AI 友好科普风，1237 张覆盖 38%（commit b4564a4f）
metadata:
  node_type: memory
  type: project
  status: in-progress
  originSessionId: 2026-06-24
---

# Session 2026-06-24 学通识图片方案 v2

## 一句话总结

学通识图片从水彩 AI 图改为 **wiki 真实图 + AI 友好科普插图** 双轨方案（commit b4564a4f 已部署）。1237 张覆盖（115 topic + 1122 section，38%），剩余 1500+ 张 retry 待补。

## 决策背景

用户反馈："学通识是比较现代的，按照方案，应该是搜索+AI生图的组合方式，其中AI生图不要这种水彩风格了，要写实的"。

但后续又强调："人体的奥秘用生图就好 别太真实 我怕吓到孩子 友好的科普插图风（不是写实照片）"。

**最终方案**：双轨制
- **真实可搜索的**：wiki 真实图（DK / National Geographic 风格）
- **抽象/人体/敏感主题**：AI 友好科普插图（Usborne See Inside 风格，水彩边缘、柔和色、避免血红）

## 三阶段流程

### Phase 1: 删除水彩（commit 1a07e5a1）
- 删除 970 张水彩 jpg（knowledge 239 + sections 731）
- 437 个 git tracked deleted，commit chore

### Phase 2: 改造 search-images.mjs
- **v2 prompt**：写实摄影 → 弃用（水彩→真实照片也试过，但太吓人）
- **v3 prompt**：Friendly children's science illustration, soft pastel, gentle cartoon-realistic, NOT scary, NOT blood-red
- 改用 wiki thumbnail API（800px）跳过 20MB 原图 sharp resize
- 5 worker 并发（之前 3 worker）
- searchWiki 加 `simplifyZhTitle()` 剥"奥秘/王国"等学术化后缀
- 全类目都搜 wiki（之前限制 ['历史人物','地理','自然']）

### Phase 3: 全量跑（commit b4564a4f）
- 2660 张任务（243 topic + 2417 section —— 实际是 198 个被引用，但 data 里有 2417）
- 跑了 25.4 分钟（5 worker）
- 1237 张完成部署（115 + 1122），wiki 命中率约 50%
- fail 1641 个因 MiniMax OSS URL 限速
- retry 3 worker 跑了 13.9 分钟，恢复 410 个，剩余 ~1100 fail 待 retry

## 关键经验

### MiniMax image-01 API 限速规律
- **5 worker**：fail rate 7-15%（OSS URL 拉取超时）
- **3 worker**：fail rate < 3%（稳定）
- **失败重试**：retry 模式比从头跑更高效

### Wiki 命中率
- 中文 wiki zh.wikipedia.org：~75% 命中率（实测 20 topic）
- 英文 wiki en.wikipedia.org：~95%（通过 langlinks API）
- 关键：**title 简化**。"人体奥秘"剥后缀为"人体"才能 HIT

### 工程细节
- **sharp 跳过**：wiki thumbnail 800px 不再 sharp resize（避免 20MB 原图 90% 时间浪费）
- **5 worker 并发**：wiki 命中率 50%，AI 兜底 30s/张 → 整体 12 张/分钟

## 数量统计

| 项 | 数量 | 大小 |
|---|---|---|
| knowledge jpg | 115 | 10MB |
| sections jpg | 1122 | 102MB |
| **总 v2 图** | **1237** | **112MB** |
| 覆盖率（vs 2660） | 46.5% | — |
| wiki 命中 | 445 | — |
| AI 兜底 | 206 | — |
| 待 retry | ~1100 | — |

## 成本估算

- 之前水彩全量：~¥80
- v2 wiki 0 元 + AI 兜底 ¥0.15/张 × 206 张 = **~¥31**
- 节省 60%

## 关键文件

```
scripts/generate-xuetongshi-images/
  search-images.mjs           # 主脚本（v3 prompt + 并发）
  all-topics.json             # 243 topic 任务清单
  all-sections.json           # 2417 section 任务清单（实际站点只用 ~198）
  extract-sections-v2.mjs     # 从 knowledge.ts 提取 section 数据
  deploy-all.sh               # rsync 到服务器

apps/xuetongshi/public/images/
  knowledge/*.jpg             # 115 张
  sections/*.jpg              # 1122 张
```

## 下一步（候选）

- **retry 1100 个失败 section**：3 worker，预计 1.5-2 小时可补到 90%+ 覆盖
- **失败分类**：section 标题太抽象（如 "g2", "m6"）需要更智能的关键词提取
- **质量抽检**：user review 部分图是否满意
- **服务器 CDN**：1237 张 112MB，是否要 WebP 压缩省带宽

**Why**: 学通识要达到 DK / National Geographic Kids 调性，真实图片是差异化核心——
写实搜索 + 友好科普插图双轨兼顾真实性与儿童接受度。
**How to apply**: 后续新增 topic 复用 search-images.mjs：先 wiki 搜图（剥后缀 + zh→en fallback），AI 兜底用 v3 友好 prompt。retry 失败的用 3 worker（5 worker 易触发 OSS 限速）。