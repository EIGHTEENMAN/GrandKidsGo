// 引擎 A 冒烟测试：纯算法 + 合成数据
// 跑：npx tsx src/lib/assembler/__smoke__.ts
// 不连 Prisma，纯函数验证打分+输出结构。

import { scoreAll, WEIGHTS } from "./scorer";
import type { TimelineBlock } from "./types";

// ---------------------------------------------------------------------------
// 1. 权重总和 = 100%
// ---------------------------------------------------------------------------
const totalW = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
console.log(`[smoke] 权重总和=${totalW.toFixed(2)}（应为 1.00）`);

// ---------------------------------------------------------------------------
// 2. 各要素打分边界
// ---------------------------------------------------------------------------
const perfect = scoreAll({
  spotScore: 5,
  sameDayBlocks: [],
  transitMinutesFromPrev: 5,
  photoWorthiness: 1,
  priceCents: 0,
  budgetLevel: "economy",
  ageFit: 1,
  likesMatch: 1,
  timeFit: 1,
  feelingMatch: 1,
  hasFeelingProfile: true,
  rhythm: "relaxed",
  style: "comfort",
});
console.log(`[smoke] 完美候选 composite=${perfect.composite.toFixed(3)}（≥ 0.8 优秀）`);

const worst = scoreAll({
  spotScore: 0,
  sameDayBlocks: Array(5).fill({} as TimelineBlock),
  transitMinutesFromPrev: 60,
  photoWorthiness: 0,
  priceCents: 100000,
  budgetLevel: "economy",
  ageFit: 0,
  likesMatch: 0,
  timeFit: 0,
  feelingMatch: 0,
  hasFeelingProfile: false,
  rhythm: "compact",
  style: "money_saver",
});
console.log(`[smoke] 糟糕候选 composite=${worst.composite.toFixed(3)}（≤ 0.3）`);

// ---------------------------------------------------------------------------
// 3. 验证：没画像时感受维度整体让出权重
// ---------------------------------------------------------------------------
const noFeelInputs = {
  spotScore: 4,
  sameDayBlocks: [] as TimelineBlock[],
  transitMinutesFromPrev: 15,
  photoWorthiness: 0.7,
  priceCents: 5000,
  budgetLevel: "balanced" as const,
  ageFit: 0.8,
  likesMatch: 0.7,
  timeFit: 0.85,
  feelingMatch: 0,
  hasFeelingProfile: false,
  rhythm: "balanced" as const,
  style: "time_saver" as const,
};
const noFeel = scoreAll(noFeelInputs);
const withFeel = scoreAll({ ...noFeelInputs, feelingMatch: 0.8, hasFeelingProfile: true });
console.log(`[smoke] 无画像=${noFeel.composite.toFixed(3)} / 有画像=${withFeel.composite.toFixed(3)}（有画像应高于无画像）`);

// ---------------------------------------------------------------------------
// 4. 验证：所有 composite ∈ [0, 1]
// ---------------------------------------------------------------------------
const probes = Array.from({ length: 50 }, (_, i) => {
  const t = i / 49;
  return scoreAll({
    spotScore: t * 5,
    sameDayBlocks: [],
    transitMinutesFromPrev: t * 60,
    photoWorthiness: t,
    priceCents: t * 100000,
    budgetLevel: "economy",
    ageFit: t,
    likesMatch: t,
    timeFit: t,
    feelingMatch: t,
    hasFeelingProfile: true,
    rhythm: "balanced",
    style: "comfort",
  });
});
const min = Math.min(...probes.map((p) => p.composite));
const max = Math.max(...probes.map((p) => p.composite));
const inRange = probes.every((p) => p.composite >= 0 && p.composite <= 1);
console.log(`[smoke] 50 个样本 composite 范围 [${min.toFixed(3)}, ${max.toFixed(3)}]，全部 ∈ [0,1]：${inRange}`);
