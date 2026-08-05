---
name: session-2026-08-05-pr2-a
description: PR2-A 多城天数 heuristic 升级 — 孩子画像驱动 + 缓冲日
metadata:
  type: project
  originSessionId: 2026-08-05
---

# Session 2026-08-05 · PR2-A 多城天数 heuristic 升级

## 背景
攻略体系 v1.0 backlog 第 142 行 PR2-A 剩余项。原标题"LLM 自动算天数"——v1 不调 LLM（避免 token 成本 + 延迟），本次是把现有纯 spots 密度的 heuristic 升级为**孩子画像驱动**。

## 改动（commit 65ea53b）

### 算法升级
- **新增 `computeCityChildBias(cityId, child, spotsByCity)`**：单城契合度 [-0.5, +0.5]
  - likes 命中 tags/kidHighlights 加权（每 like 上限 +0.3）
  - `fearsAnimals` + ≥2 个动物园/海洋 spot → -0.4
  - `isShyWithStrangers` + ≥2 个主题乐园/海洋公园/游乐园 → -0.25
- **`computeCityAllocation` 签名升级**：加 `child?` 和 `spotsByCity?` 可选参数（向后兼容）
  - spots 权重压缩到 [1, 4] 让 child bias 浮出水面（之前 5:3 spots 比会让 ±0.5 bias 完全无效）
  - bias 直接 ×1.5 应用
- **`autoSuggestTotalDays` 签名升级**：加 `child?` 和 `travelers?` 可选参数（向后兼容）
  - `activeHoursPerDay` 修正：≤4h ×1.15，≥10h ×0.95
  - `needNap=required` ×1.10
  - `earlyOrLate=night_owl` ×1.05
  - `children ≥2` ×1.10
  - 超过 5 天总天数 +1 缓冲日（**v1.5 §5 规则五**：total行程超过 5 天必须预留 1 缓冲日）

### Wire-up
- `assemble()` 入口自动 `mergeChildProfiles(params.childProfiles)` 传给两个 heuristic
- `wizard/page.tsx` 客户端 useMemo `autoRecommendedDays` 镜像升级（避免前端 UI 与后端算法漂移）
- UI 文案：「每城按景点密度启发」→「按孩子画像 + 景点密度启发，含 ≥6 天缓冲日」

### Smoke 测试
`__smoke_db__.ts` 加 7 个 PR2-A 用例（含 baseline 回归对照）

## 验证

```
[1] baseline (no child):    A:3d, B:3d
[2] animalLover (likes 动物): A:4d, B:2d   ← A 加权 +1
[3] fearAnimals (no likes):  A:2d, B:4d   ← A 减权 -1
[4] isShyWithStrangers:      A:5d, B:1d   ← B 减权 -2
[5a] baseline totalDays: 4
[5b] 4h child: 5              ← activeHours 修正
[5c] napRequired: 5           ← needNap 修正
[5d] night_owl: 4             ← earlyOrLate 修正
[5e] 2 kids: 5                ← 多孩修正
[5f] stacked (4h+nap+night+2kids): 7
[5g] buffer day (high spots): 10   ← v1.5 规则五
```

TypeScript 零错误。

## 关键决策

| 决策 | 理由 |
|------|------|
| spots 权重压缩到 [1, 4] | 5:3 spots 比让 ±0.5 bias 算不出整数差异；压缩后 bias 才有实际影响 |
| bias × 1.5 放大（不是 × relativeSize） | spots 已饱和，bias 直接放大更稳定；multi-city 下 bias 影响力不被小spots 城稀释 |
| 客户端 useMemo 同步镜像 | wizard 之前用 client-side duplicate 算法；不升级会导致前后端漂移 |
| buffer day 仅加到 totalDays，不动 city allocation | v1.5 规则五只规定总行程天数；city 间分配无缓冲日概念 |
| bias 值限 [-0.5, +0.5] | 防止极端 child profile 让某城权重归零或翻倍，保持稳定 |

## 边界 / 已知 follow-up

- **场景：孩子 likes 含"动物" + fearsAnimals=true**：bias 抵消（+0.2 likes - 0.4 fear = -0.2），效果就是轻减权。算法视为"又爱又怕"中性偏好。Smoke test 用 pure fear（likes=[]）才看清效果。
- **未知孩子的画像字段都为默认值**：`activeHoursPerDay=6` / `needNap=optional` / `earlyOrLate=early_bird` / `fearsAnimals=false` 等 → childMultiplier=1，行为完全等同旧版
- **总天数推荐的范围 [2, 21]**：clamp 仍生效；stacked 修正后最大可到 ~7 天（base 4 × 1.5 ≈ 6 + buffer 1）

## 关联
- [[session-2026-08-05-hotel-pipeline]] — 同一会话前段，PR2-C 落地（Hotel pipeline）
- [[session-2026-07-30-complete]] — 攻略体系 PR1-4 起源，PR2-A backlog 定位
- 项目建设方案/走天下实施方案-v1.5.md §5 二.(六) 规则五 — 缓冲日规则的来源