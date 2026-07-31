/**
 * 「孩子最怕」预警计算引擎
 *
 * 根据 child_feeling_profiles 的 monthlyFeedback 数据，
 * 计算特定 spotType 的同类孩子哭闹/烦躁率。
 * cryRate > 30% 时触发预警。
 *
 * 使用种子数据或真实数据，无数据时优雅降级。
 */

import prisma from "@/lib/prisma";

// spotType typecode → 中文名称
const SPOT_TYPE_LABELS: Record<string, string> = {
  "110100": "游乐场",
  "110101": "动物园",
  "140300": "海洋馆",
  "140200": "科技馆",
  "140100": "博物馆",
  "140400": "水族馆",
  "060400": "商场",
  "060100": "购物中心",
  "110200": "主题公园",
  "110201": "水上乐园",
};

function spotTypeLabel(code: string): string {
  return SPOT_TYPE_LABELS[code] ?? code;
}

export interface ChildWarning {
  /** 是否应展示预警 */
  warning: boolean;
  /** spotType 中文名 */
  spotTypeLabel: string;
  /** spotType 编码 */
  spotType: string;
  /** 哭闹/烦躁率 (0-1) */
  cryRate: number;
  /** 有数据的档案总数 */
  totalProfiles: number;
  /** 哭闹/烦躁的档案数 */
  unhappyProfiles: number;
  /** 最常见的哭闹触发器（top 3） */
  commonTriggers: string[];
  /** 人类可读的预警文案 */
  message: string;
  /** 详细文案 */
  detail: string;
}

/**
 * 按 spotType 计算孩子哭闹预警
 * @param spotType - 高德 typecode（如 "110100"）
 * @param childAgeMonths - 可选：当前孩子的月龄，用于精准匹配月龄桶
 */
export async function computeChildWarning(
  spotType: string,
  childAgeMonths?: number,
): Promise<ChildWarning> {
  const empty: ChildWarning = {
    warning: false,
    spotTypeLabel: spotTypeLabel(spotType),
    spotType,
    cryRate: 0,
    totalProfiles: 0,
    unhappyProfiles: 0,
    commonTriggers: [],
    message: "",
    detail: "",
  };

  if (!spotType) return empty;

  // 查询所有有数据的档案
  const profiles = await prisma.childFeelingProfile.findMany({
    where: { totalDataPoints: { gt: 0 } },
    select: {
      childId: true,
      monthlyFeedback: true,
      cryingTriggers: true,
    },
  });

  if (profiles.length === 0) return empty;

  // 统计每个档案对该 spotType 的情绪
  let unhappyCount = 0;
  let dataPoints = 0;
  const triggerCounts: Record<string, number> = {};

  const targetBucket = childAgeMonths
    ? bucketAgeMonths(childAgeMonths)
    : null;

  for (const p of profiles) {
    const mf = (p.monthlyFeedback as Record<string, any>) ?? {};
    let found = false;

    // 如果指定了孩子的月龄桶，优先查该桶
    if (targetBucket && mf[targetBucket]?.[spotType]) {
      found = true;
      const entry = mf[targetBucket][spotType];
      if (entry.topEmotion === "哭闹" || entry.topEmotion === "烦躁") {
        unhappyCount++;
      }
      dataPoints++;
    } else {
      // 否则遍历所有月龄桶找该 spotType
      for (const bucket of Object.values(mf)) {
        const b = bucket as Record<string, any>;
        if (b[spotType]) {
          found = true;
          if (b[spotType].topEmotion === "哭闹" || b[spotType].topEmotion === "烦躁") {
            unhappyCount++;
          }
          dataPoints++;
          break; // 每个档案只计一次
        }
      }
    }

    if (found && p.cryingTriggers) {
      const triggers = p.cryingTriggers as Record<string, number>;
      for (const [trigger, count] of Object.entries(triggers)) {
        const n = Number(count);
        if (n > 0) {
          triggerCounts[trigger] = (triggerCounts[trigger] ?? 0) + n;
        }
      }
    }
  }

  if (dataPoints === 0) return empty;

  const cryRate = unhappyCount / dataPoints;
  const label = spotTypeLabel(spotType);

  // 排序触发器
  const sortedTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  if (cryRate < 0.3) {
    return {
      ...empty,
      totalProfiles: dataPoints,
      cryRate: Math.round(cryRate * 100) / 100,
    };
  }

  const ratePct = Math.round(cryRate * 100);
  const triggerText = sortedTriggers.length
    ? `常见触发器：${sortedTriggers.join("、")}`
    : "";

  return {
    warning: true,
    spotTypeLabel: label,
    spotType,
    cryRate: Math.round(cryRate * 100) / 100,
    totalProfiles: dataPoints,
    unhappyProfiles: unhappyCount,
    commonTriggers: sortedTriggers,
    message: `⚠️ 注意：${ratePct}% 的同类孩子在${label}出现过哭闹或烦躁`,
    detail: targetBucket
      ? `基于 ${dataPoints} 位同龄孩子在该类型景点的真实反馈。${triggerText}。建议提前做心理预期管理。`
      : `基于 ${dataPoints} 位孩子在${label}类景点的真实反馈。${triggerText}。建议提前做心理预期管理。`,
  };
}

/** 月龄 → 桶标签 */
function bucketAgeMonths(months: number): string {
  if (months < 6) return "0-6m";
  if (months < 12) return "6-12m";
  if (months < 24) return "12-24m";
  if (months < 36) return "24-36m";
  if (months < 48) return "36-48m";
  if (months < 60) return "48-60m";
  return "60m+";
}

/** 暴露 spotType → 中文映射 */
export { spotTypeLabel, SPOT_TYPE_LABELS };
