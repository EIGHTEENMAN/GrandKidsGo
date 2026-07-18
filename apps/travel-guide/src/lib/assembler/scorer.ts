// 六要素打分器
// v1.5 第 564-585 行：
//   评价 20 / 行程 20 / 成本 10 / 时间 20 / 出片率 10 / 感受画像匹配 20
//
// 引擎 A 不存任何"用户偏好"，仅基于上下文（孩子画像 + 当前候选列表）打分。
// 每个打分是 [0, 1] 浮点数，组合权重后为 composite ∈ [0, 1]。

import type {
  CandidateRhythm,
  CandidateStyle,
  ChildProfile,
  TimelineBlock,
} from "./types";

interface ScoreInputs {
  /** 候选点位本身的属性 */
  spotScore: number;                          // Spot.kidScore|momScore|dadScore
  /** 当天已确定的其他时间块（用于行程/时间维度） */
  sameDayBlocks: TimelineBlock[];
  /** 候选点位距离上一个时间块的步行/驾车分钟数 */
  transitMinutesFromPrev: number;
  /** 候选点位的"出片率"系数 0-1（kidHook/momHook 是否突出） */
  photoWorthiness: number;
  /** 候选点位的票价 (cents) */
  priceCents: number;
  budgetLevel: "economy" | "balanced" | "premium";
  /** 候选点位的年龄合适度 0-1（0=完全不合适，1=完美匹配） */
  ageFit: number;
  /** 候选点位在孩子喜好集合里的命中度 0-1 */
  likesMatch: number;
  /** 候选点位的开放时段与孩子合适时段契合度 0-1 */
  timeFit: number;
  /** 感受画像匹配度 0-1，引擎外部注入 */
  feelingMatch: number;
  hasFeelingProfile: boolean;
  /** 当前候选节奏 */
  rhythm: CandidateRhythm;
  /** 当前候选维度 */
  style: CandidateStyle;
}

/** 各要素权重 */
export const WEIGHTS = {
  evaluation: 0.20,
  route: 0.20,
  cost: 0.10,
  time: 0.20,
  photoWorthy: 0.10,
  feelingMatch: 0.20,
} as const;

export interface ElementScores {
  evaluation: number;
  route: number;
  cost: number;
  time: number;
  photoWorthy: number;
  feelingMatch: number;
  composite: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function scoreEvaluation(inp: ScoreInputs): number {
  // 0.4 * spotScore + 0.4 * likesMatch + 0.2 * ageFit
  return clamp01(0.4 * inp.spotScore + 0.4 * inp.likesMatch + 0.2 * inp.ageFit);
}

export function scoreRoute(inp: ScoreInputs): number {
  // 接驳分钟数越低分越高；>30 分钟直接给低分
  if (inp.transitMinutesFromPrev <= 5) return 1;
  if (inp.transitMinutesFromPrev >= 30) return 0;
  return clamp01(1 - (inp.transitMinutesFromPrev - 5) / 25);
}

export function scoreCost(inp: ScoreInputs): number {
  // 不同 style 的成本敏感性不同：
  //   money_saver: 免费/低价高分
  //   time_saver:  不敏感（接受溢价）
  //   comfort:     中等敏感
  const ratio = inp.priceCents / 30000;       // 把 300 元当作基准
  let base: number;
  if (inp.budgetLevel === "economy") base = clamp01(1 - ratio);
  else if (inp.budgetLevel === "premium") base = 0.7 + 0.3 * ratio; // 高预算反向
  else base = clamp01(1 - 0.5 * ratio);

  if (inp.style === "money_saver") {
    return clamp01(1 - ratio);                // 省钱档无条件倾斜于免费
  }
  return clamp01(base * 0.7 + 0.3 * (inp.style === "time_saver" ? ratio : 0.5));
}

export function scoreTime(inp: ScoreInputs): number {
  // 时间维度：开放时段契合 0.6 + 节奏契合 0.4
  const openFit = clamp01(inp.timeFit);
  let rhythmFit: number;
  if (inp.rhythm === "compact") {
    // 紧凑：每块时长 60-90 分钟超高分；>120 给低分
    rhythmFit = (inp.sameDayBlocks.length >= 3 ? 0.5 : 1);
  } else if (inp.rhythm === "balanced") {
    rhythmFit = (inp.sameDayBlocks.length === 2 || inp.sameDayBlocks.length === 3) ? 1 : 0.6;
  } else {
    // relaxed：每块 ≤ 2 块/天
    rhythmFit = inp.sameDayBlocks.length <= 2 ? 1 : 0.4;
  }
  return clamp01(0.6 * openFit + 0.4 * rhythmFit);
}

export function scorePhotoWorthy(inp: ScoreInputs): number {
  // 直接用 POI 的出片率，style / rhythm 不影响
  return clamp01(inp.photoWorthiness);
}

export function scoreFeelingMatch(inp: ScoreInputs): number {
  // 没画像时降权为 0
  if (!inp.hasFeelingProfile) return 0;
  return clamp01(inp.feelingMatch);
}

export function compositeScore(s: Omit<ElementScores, "composite">): number {
  const w = WEIGHTS;
  // 无画像时感受维度完全跳过，权重归一化
  const feelingActive = s.feelingMatch > 0;
  if (!feelingActive) {
    const total = w.evaluation + w.route + w.cost + w.time + w.photoWorthy;
    return clamp01(
      (w.evaluation * s.evaluation +
        w.route * s.route +
        w.cost * s.cost +
        w.time * s.time +
        w.photoWorthy * s.photoWorthy) /
        total,
    );
  }
  // 有画像时六维度正常加权
  return clamp01(
    w.evaluation * s.evaluation +
      w.route * s.route +
      w.cost * s.cost +
      w.time * s.time +
      w.photoWorthy * s.photoWorthy +
      w.feelingMatch * s.feelingMatch,
  );
}

export function scoreAll(inp: ScoreInputs): ElementScores {
  const s = {
    evaluation: scoreEvaluation(inp),
    route: scoreRoute(inp),
    cost: scoreCost(inp),
    time: scoreTime(inp),
    photoWorthy: scorePhotoWorthy(inp),
    feelingMatch: scoreFeelingMatch(inp),
  };
  return { ...s, composite: compositeScore(s) };
}
