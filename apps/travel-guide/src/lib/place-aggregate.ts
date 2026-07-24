// 地点评分聚合 helper（v1.0）
// 二维：大人评分（adultRating）+ 孩子评分（childRating）+ 便利设施聚合
//
// 归一化原则（2026-07-24 用户确认）：
//   一个家庭一般就登录一个大人账号，不区分妈妈/爸爸。
//   评分体系 = 大人味道 + 孩子感受，两维。
//
// 详见 项目建设方案/走天下地点打分系统v1.0方案.md

import prisma from '@/lib/prisma';

/** 单地点重算 */
export async function recomputePlaceAggregate(placeId: string, placeType: string): Promise<void> {
  const reviews = await prisma.placeReview.findMany({
    where: { placeId, placeType, status: 'published' },
    select: {
      adultRating: true,
      childRating: true,
      hasParking: true,
      hasHighChair: true,
      hasNapRoom: true,
      strollerOk: true,
      kidFriendly: true,
      createdAt: true,
    },
  });

  if (reviews.length === 0) {
    await prisma.placeAggregate.deleteMany({ where: { placeId, placeType } });
    return;
  }

  // 2. 二维评分
  const adultAvgScore = Number(
    (reviews.reduce((s, r) => s + r.adultRating, 0) / reviews.length).toFixed(2)
  );
  const childRatings = reviews.map(r => r.childRating).filter((x): x is number => x != null);
  const kidAvgScore = childRatings.length > 0
    ? Number((childRatings.reduce((a, b) => a + b, 0) / childRatings.length).toFixed(2))
    : null;

  // 3. 便利聚合（最近 90 天，≥3 条才计算）
  const RECENT_DAYS = 90;
  const recentCutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const recent = reviews.filter(r => r.createdAt >= recentCutoff);
  const shouldCompute = recent.length >= 3;
  const rateOf = (bools: boolean[]): number | null =>
    shouldCompute && bools.length > 0
      ? Number((bools.filter(Boolean).length / bools.length).toFixed(2))
      : null;
  const parkingRate = rateOf(recent.map(r => r.hasParking));
  const highChairRate = rateOf(recent.map(r => r.hasHighChair));
  const napRoomRate = rateOf(recent.map(r => r.hasNapRoom));
  const strollerOkRate = rateOf(recent.map(r => r.strollerOk));
  const friendlyScores = reviews.map(r => r.kidFriendly).filter((x): x is number => x != null);
  const kidFriendlyAvg = friendlyScores.length > 0
    ? Number((friendlyScores.reduce((a, b) => a + b, 0) / friendlyScores.length).toFixed(2))
    : null;

  const lastReviewedAt = reviews.reduce(
    (max, r) => (r.createdAt > max ? r.createdAt : max),
    reviews[0].createdAt,
  );

  await prisma.placeAggregate.upsert({
    where: { placeId_placeType: { placeId, placeType } },
    create: {
      placeId, placeType,
      adultAvgScore, kidAvgScore,
      reviewCount: reviews.length,
      withChildRatingCount: childRatings.length,
      parkingRate, highChairRate, napRoomRate, strollerOkRate, kidFriendlyAvg,
      lastReviewedAt,
    },
    update: {
      adultAvgScore, kidAvgScore,
      reviewCount: reviews.length,
      withChildRatingCount: childRatings.length,
      parkingRate, highChairRate, napRoomRate, strollerOkRate, kidFriendlyAvg,
      lastReviewedAt,
      recomputedAt: new Date(),
    },
  });
}

/** 全量对账 */
export async function recomputeAllAggregates(): Promise<{ updated: number; errors: number }> {
  const groups = await prisma.placeReview.groupBy({
    by: ['placeId', 'placeType'],
    where: { status: 'published' },
    _count: { _all: true },
  });
  let updated = 0, errors = 0;
  for (const g of groups) {
    try { await recomputePlaceAggregate(g.placeId, g.placeType); updated++; }
    catch (e) { console.error('[place-aggregate] recompute failed', g, e); errors++; }
  }
  return { updated, errors };
}