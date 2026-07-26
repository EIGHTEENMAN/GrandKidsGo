// 孩子感受画像聚合 helper（v1.5）
// 每次写入 ChildRating 后调用，把结构化标签聚合到 ChildFeelingProfile。
//
// 聚合维度（详见 项目建设方案/走天下实施方案-v1.5.md 第三节）：
//   spotTypePreferences              — 景点类型 → 到访次数
//   averageActiveStayMinutes         — 平均活跃停留时长（分钟）
//   cryingTriggers                   — 哭闹触发标签 → 次数
//   energyCurveByTimeOfDay           — 时段 → 体力状态分布
//   averageEmotionalPeakDistribution — 情绪高点 → 次数
//   totalDataPoints                  — 数据点总数
//
// 数据来源：ChildRating 的 physicalState/emotionalPeak/stayDurationMinutes/
// cryEpisodes/spotId/recordedAt 字段。

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
      recordedAt: true,
    },
  });

  if (ratings.length === 0) {
    await prisma.childFeelingProfile.update({
      where: { childId },
      data: { totalDataPoints: 0, lastUpdatedAt: new Date() },
    }).catch(() => { /* 空壳可能不存在，忽略 */ });
    return;
  }

  // 1. spotTypePreferences: 景点类型 → 到访次数
  const spotIds = Array.from(new Set(
    ratings.map(r => r.spotId).filter((x): x is string => x != null),
  ));
  const spots = spotIds.length > 0
    ? await prisma.spot.findMany({ where: { id: { in: spotIds } }, select: { id: true, spotType: true } })
    : [];
  const spotTypeMap = new Map(spots.map(s => [s.id, s.spotType]));
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

  // 3. cryingTriggers: 哭闹触发标签 → 次数
  // cryEpisodes 是 Json 数组，每项可能有 { trigger: string, ... }
  const cryingTriggers: Record<string, number> = {};
  for (const r of ratings) {
    if (!Array.isArray(r.cryEpisodes)) continue;
    for (const ep of r.cryEpisodes) {
      if (!ep || typeof ep !== 'object') continue;
      const trigger = (ep as Record<string, unknown>).trigger;
      if (typeof trigger !== 'string') continue;
      cryingTriggers[trigger] = (cryingTriggers[trigger] ?? 0) + 1;
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
    },
    update: {
      spotTypePreferences: json(spotTypePreferences),
      averageActiveStayMinutes,
      cryingTriggers: json(cryingTriggers),
      energyCurveByTimeOfDay: json(energyCurveByTimeOfDay),
      averageEmotionalPeakDistribution: json(averageEmotionalPeakDistribution),
      totalDataPoints: ratings.length,
      lastUpdatedAt: new Date(),
    },
  });
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
