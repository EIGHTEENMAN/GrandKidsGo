// 孩子感受画像聚合 helper（v1.5 → v1.0 Phase B）
// 每次写入 ChildRating 后调用，把结构化标签聚合到 ChildFeelingProfile。
//
// 聚合维度：
//   v1.5 已有：
//     spotTypePreferences              — 景点类型 → 到访次数
//     averageActiveStayMinutes         — 平均活跃停留时长（分钟）
//     cryingTriggers                   — 哭闹触发标签 → 次数
//     energyCurveByTimeOfDay           — 时段 → 体力状态分布
//     averageEmotionalPeakDistribution — 情绪高点 → 次数
//     totalDataPoints                  — 数据点总数
//   2026-07-31 v1.0 Phase B 新增：
//     monthlyFeedback                  — 按月龄桶（6 月） → spotType → 平均分
//     crossSpotPattern                 — 同 plan 4h 时间窗配对 → 转场疲劳
//     topEmotionTriggers               — 触发标签 → 情绪分布
//     parentJoyByActivity              — 父母满足度 → 按活动/spotType
//
// 数据来源：ChildRating 的 9 字段 + spotId/recordedAt/planRecordId。

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/** 单孩子重算 */
export async function recomputeChildFeelingProfile(childId: string): Promise<void> {
  const ratings = await prisma.childRating.findMany({
    where: { childId },
    select: {
      spotId: true,
      physicalState: true,
      emotionalPeak: true,
      stayDurationMinutes: true,
      cryEpisodes: true,
      cryTriggers: true,
      favoriteMoment: true,
      wishToReturn: true,
      parentJoy: true,
      childAgeAtVisit: true,
      planRecordId: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: 'asc' },
  });

  if (ratings.length === 0) {
    await prisma.childFeelingProfile.update({
      where: { childId },
      data: {
        totalDataPoints: 0,
        lastUpdatedAt: new Date(),
        monthlyFeedback: undefined,
        crossSpotPattern: undefined,
        topEmotionTriggers: undefined,
        parentJoyByActivity: undefined,
      },
    }).catch(() => { /* 空壳可能不存在，忽略 */ });
    return;
  }

  // 1. spotTypePreferences: 景点类型 → 到访次数
  const spotIds = Array.from(new Set(
    ratings.map(r => r.spotId).filter((x): x is string => x != null),
  ));
  const spots = spotIds.length > 0
    ? await prisma.spot.findMany({ where: { id: { in: spotIds } }, select: { id: true, spotType: true, name: true } })
    : [];
  const spotTypeMap = new Map(spots.map(s => [s.id, s.spotType]));
  const spotNameMap = new Map(spots.map(s => [s.id, s.name]));
  const spotTypePreferences: Record<string, number> = {};
  for (const r of ratings) {
    if (!r.spotId) continue;
    const st = spotTypeMap.get(r.spotId) ?? '其他';
    spotTypePreferences[st] = (spotTypePreferences[st] ?? 0) + 1;
  }

  // 2. averageActiveStayMinutes
  const stays = ratings
    .map(r => r.stayDurationMinutes)
    .filter((x): x is number => x != null);
  const averageActiveStayMinutes = stays.length > 0
    ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length)
    : null;

  // 3. cryingTriggers: 兼容旧 cryEpisodes（无 trigger）+ 新 cryTriggers 字段
  //    cryTriggers 优先；旧数据回退读 cryEpisodes[].trigger
  const cryingTriggers: Record<string, number> = {};
  for (const r of ratings) {
    // 新字段优先
    if (Array.isArray(r.cryTriggers)) {
      for (const t of r.cryTriggers) {
        const trig = (t as any)?.trigger;
        if (typeof trig === 'string') cryingTriggers[trig] = (cryingTriggers[trig] ?? 0) + 1;
      }
    }
    // 旧字段 fallback
    if (Array.isArray(r.cryEpisodes)) {
      for (const ep of r.cryEpisodes) {
        if (!ep || typeof ep !== 'object') continue;
        const trig = (ep as Record<string, unknown>).trigger;
        if (typeof trig !== 'string') continue;
        cryingTriggers[trig] = (cryingTriggers[trig] ?? 0) + 1;
      }
    }
  }

  // 4. energyCurveByTimeOfDay: 时段 → 体力状态分布
  // 时段划分：上午(6-10) / 中午(11-13) / 下午(14-17) / 晚间(18-5)
  const energyCurveByTimeOfDay: Record<string, Record<string, number>> = {};
  for (const r of ratings) {
    if (!r.physicalState) continue;
    const h = new Date(r.recordedAt).getHours();
    const slot = h >= 6 && h < 11 ? '上午' : h >= 11 && h < 14 ? '中午' : h >= 14 && h < 18 ? '下午' : '晚间';
    if (!energyCurveByTimeOfDay[slot]) energyCurveByTimeOfDay[slot] = {};
    energyCurveByTimeOfDay[slot][r.physicalState] = (energyCurveByTimeOfDay[slot][r.physicalState] ?? 0) + 1;
  }

  // 5. averageEmotionalPeakDistribution: 情绪高点 → 次数
  const averageEmotionalPeakDistribution: Record<string, number> = {};
  for (const r of ratings) {
    if (!r.emotionalPeak) continue;
    averageEmotionalPeakDistribution[r.emotionalPeak] = (averageEmotionalPeakDistribution[r.emotionalPeak] ?? 0) + 1;
  }

  // 6. monthlyFeedback: 按月龄桶（6 月分桶）+ spotType → { avgScore, count, topEmotion }
  const monthlyFeedback = computeMonthlyFeedback(ratings, spotTypeMap);

  // 7. crossSpotPattern: 同 plan 4h 时间窗配对 → { avgDrop, sampleCount, confidence }
  const crossSpotPattern = computeCrossSpotPattern(ratings, spotNameMap);

  // 8. topEmotionTriggers: trigger → { 情绪: count }（哪个 trigger 易引发哪个情绪）
  const topEmotionTriggers = computeTopEmotionTriggers(ratings);

  // 9. parentJoyByActivity: parentJoy → spotType 分布
  const parentJoyByActivity = computeParentJoyByActivity(ratings, spotTypeMap);

  const json = <T>(v: T) => v as unknown as Prisma.InputJsonValue;

  await prisma.childFeelingProfile.upsert({
    where: { childId },
    create: {
      childId,
      spotTypePreferences: json(spotTypePreferences),
      averageActiveStayMinutes,
      cryingTriggers: json(cryingTriggers),
      energyCurveByTimeOfDay: json(energyCurveByTimeOfDay),
      averageEmotionalPeakDistribution: json(averageEmotionalPeakDistribution),
      totalDataPoints: ratings.length,
      lastUpdatedAt: new Date(),
      privacyLevel: 'anonymized',
      monthlyFeedback: json(monthlyFeedback),
      crossSpotPattern: json(crossSpotPattern),
      topEmotionTriggers: json(topEmotionTriggers),
      parentJoyByActivity: json(parentJoyByActivity),
    },
    update: {
      spotTypePreferences: json(spotTypePreferences),
      averageActiveStayMinutes,
      cryingTriggers: json(cryingTriggers),
      energyCurveByTimeOfDay: json(energyCurveByTimeOfDay),
      averageEmotionalPeakDistribution: json(averageEmotionalPeakDistribution),
      totalDataPoints: ratings.length,
      lastUpdatedAt: new Date(),
      monthlyFeedback: json(monthlyFeedback),
      crossSpotPattern: json(crossSpotPattern),
      topEmotionTriggers: json(topEmotionTriggers),
      parentJoyByActivity: json(parentJoyByActivity),
    },
  });
}

// =============================================================================
// 2026-07-31 v1.0 Phase B：4 维新聚合函数
// =============================================================================

const EMOTION_SCORE: Record<string, number> = {
  兴奋: 5,
  平静: 4,
  无聊: 3,
  烦躁: 2,
  哭闹: 1,
};

function bucketOfAgeMonths(months: number | null | undefined): string {
  if (months == null) return 'unknown';
  if (months <= 6) return '0-6m';
  if (months <= 12) return '7-12m';
  if (months <= 24) return '13-24m';
  if (months <= 36) return '25-36m';
  if (months <= 60) return '37-60m';
  if (months <= 84) return '61-84m';
  if (months <= 120) return '85-120m';
  return '121m+';
}

/**
 * monthlyFeedback: 按月龄桶 + spotType 聚合
 * 结构：{ [ageBucket]: { [spotType]: { avgScore, count, topEmotion } } }
 */
function computeMonthlyFeedback(
  ratings: Array<{
    spotId: string | null;
    childAgeAtVisit: number | null;
    emotionalPeak: string | null;
  }>,
  spotTypeMap: Map<string, string | null>,
): Record<string, Record<string, { avgScore: number; count: number; topEmotion: string }>> {
  const buckets: Record<string, Record<string, { scores: number[]; emotions: string[] }>> = {};
  for (const r of ratings) {
    if (!r.spotId || !r.emotionalPeak) continue;
    const bucket = bucketOfAgeMonths(r.childAgeAtVisit);
    const spotType = spotTypeMap.get(r.spotId) ?? '其他';
    const score = EMOTION_SCORE[r.emotionalPeak] ?? 3;
    if (!buckets[bucket]) buckets[bucket] = {};
    if (!buckets[bucket][spotType]) buckets[bucket][spotType] = { scores: [], emotions: [] };
    buckets[bucket][spotType]!.scores.push(score);
    buckets[bucket][spotType]!.emotions.push(r.emotionalPeak);
  }
  // 折叠为最终结构
  const result: Record<string, Record<string, { avgScore: number; count: number; topEmotion: string }>> = {};
  for (const [age, types] of Object.entries(buckets)) {
    result[age] = {};
    for (const [type, data] of Object.entries(types)) {
      const avgScore = data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
        : 0;
      // topEmotion: 众数
      const counts: Record<string, number> = {};
      for (const e of data.emotions) counts[e] = (counts[e] ?? 0) + 1;
      const topEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '平静';
      result[age][type] = { avgScore, count: data.scores.length, topEmotion };
    }
  }
  return result;
}

/**
 * crossSpotPattern: 同 plan 4h 时间窗配对
 * 结构：{ '动物园→科技馆': { avgDrop, sampleCount, confidence } }
 */
function computeCrossSpotPattern(
  ratings: Array<{
    spotId: string | null;
    planRecordId: string;
    recordedAt: Date;
    emotionalPeak: string | null;
  }>,
  spotNameMap: Map<string, string>,
): Record<string, { avgDrop: number; sampleCount: number; confidence: 'low' | 'medium' | 'high' }> {
  const FOUR_HOURS_MS = 4 * 3600 * 1000;
  // 按 planRecordId 分组
  const byPlan = new Map<string, typeof ratings>();
  for (const r of ratings) {
    if (!r.spotId || !r.emotionalPeak) continue;
    const arr = byPlan.get(r.planRecordId) ?? [];
    arr.push(r);
    byPlan.set(r.planRecordId, arr);
  }
  const patterns: Record<string, { drops: number[]; sampleCount: number }> = {};
  for (const arr of Array.from(byPlan.values())) {
    arr.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const gap = arr[j]!.recordedAt.getTime() - arr[i]!.recordedAt.getTime();
        if (gap > FOUR_HOURS_MS) break;
        const fromName = spotNameMap.get(arr[i]!.spotId!) ?? arr[i]!.spotId!;
        const toName = spotNameMap.get(arr[j]!.spotId!) ?? arr[j]!.spotId!;
        const key = `${fromName}→${toName}`;
        const drop = (EMOTION_SCORE[arr[j]!.emotionalPeak!] ?? 3) - (EMOTION_SCORE[arr[i]!.emotionalPeak!] ?? 3);
        if (!patterns[key]) patterns[key] = { drops: [], sampleCount: 0 };
        patterns[key].drops.push(drop);
        patterns[key].sampleCount++;
      }
    }
  }
  const result: Record<string, { avgDrop: number; sampleCount: number; confidence: 'low' | 'medium' | 'high' }> = {};
  for (const [key, p] of Object.entries(patterns)) {
    const avgDrop = p.drops.length > 0
      ? Math.round((p.drops.reduce((a, b) => a + b, 0) / p.drops.length) * 10) / 10
      : 0;
    const confidence = p.sampleCount >= 8 ? 'high' : p.sampleCount >= 3 ? 'medium' : 'low';
    result[key] = { avgDrop, sampleCount: p.sampleCount, confidence };
  }
  return result;
}

/**
 * topEmotionTriggers: 触发标签 → 情绪分布
 * 结构：{ '人太多': { '烦躁': 0.6, '哭闹': 0.4 }, ... }
 */
function computeTopEmotionTriggers(
  ratings: Array<{
    emotionalPeak: string | null;
    cryTriggers: unknown;
    cryEpisodes: unknown;
  }>,
): Record<string, Record<string, number>> {
  const triggerToEmotions: Record<string, Record<string, number>> = {};
  for (const r of ratings) {
    if (!r.emotionalPeak) continue;
    const triggers = new Set<string>();
    if (Array.isArray(r.cryTriggers)) {
      for (const t of r.cryTriggers) {
        const trig = (t as any)?.trigger;
        if (typeof trig === 'string') triggers.add(trig);
      }
    }
    if (Array.isArray(r.cryEpisodes)) {
      for (const ep of r.cryEpisodes) {
        const trig = (ep as any)?.trigger;
        if (typeof trig === 'string') triggers.add(trig);
      }
    }
    for (const trig of Array.from(triggers)) {
      if (!triggerToEmotions[trig]) triggerToEmotions[trig] = {};
      triggerToEmotions[trig][r.emotionalPeak] = (triggerToEmotions[trig][r.emotionalPeak] ?? 0) + 1;
    }
  }
  // 归一化为比例
  const result: Record<string, Record<string, number>> = {};
  for (const [trig, emos] of Object.entries(triggerToEmotions)) {
    const total = Object.values(emos).reduce((a, b) => a + b, 0);
    result[trig] = {};
    for (const [emo, count] of Object.entries(emos)) {
      result[trig][emo] = Math.round((count / total) * 100) / 100;
    }
  }
  return result;
}

/**
 * parentJoyByActivity: parentJoy → spotType 分布
 * 结构：{ '动物园': { '满足': 5, '轻松': 3, ... }, ... }
 */
function computeParentJoyByActivity(
  ratings: Array<{
    spotId: string | null;
    parentJoy: string | null;
  }>,
  spotTypeMap: Map<string, string | null>,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const r of ratings) {
    if (!r.spotId || !r.parentJoy) continue;
    const spotType = spotTypeMap.get(r.spotId) ?? '其他';
    if (!result[spotType]) result[spotType] = {};
    result[spotType][r.parentJoy] = (result[spotType][r.parentJoy] ?? 0) + 1;
  }
  return result;
}

/** 全量对账（定时任务 / 手动触发） */
export async function recomputeAllChildProfiles(): Promise<{ updated: number; errors: number }> {
  const groups = await prisma.childRating.groupBy({
    by: ['childId'],
    _count: { _all: true },
  });
  let updated = 0, errors = 0;
  for (const g of groups) {
    try { await recomputeChildFeelingProfile(g.childId); updated++; }
    catch (e) { console.error('[child-profile] recompute failed', g.childId, e); errors++; }
  }
  return { updated, errors };
}
