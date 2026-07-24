// 地点评分聚合 helper（v1.0）
// 数据流：POST /api/places/[type]/[id]/review → 写 PlaceReview → 同步触发 recomputePlaceAggregate
//
// 详见 项目建设方案/走天下地点打分系统v1.0方案.md 第六节
//
// 聚合策略（v1.0 简化版）：
//   - kidAvgScore：所有 childRating 非空的评价的平均值
//   - momAvgScore / dadAvgScore：v1.0 留空（v1.5 接 user.role 后再拆）
//     原因：当前 auth-service users 表没有 self-declared 的 mom/dad 角色字段
//   - 便利聚合：最近 90 天评价中各 bool 字段的 true 占比（0-1）
//   - 评价数门槛：< 3 条评价时不计算便利聚合（避免噪声）
//
// 同步 vs 异步：
//   v1.0 选同步（POST 后等 ~50ms 让用户立刻看到新分）。

import prisma from '@/lib/prisma';

/** 单地点重算 */
export async function recomputePlaceAggregate(placeId: string, placeType: string): Promise<void> {
  // 1. 拉所有 published 评价
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
    // 0 条评价时删除聚合行（保留 Place 表的种子编辑分兜底）
    await prisma.placeAggregate.deleteMany({ where: { placeId, placeType } });
    return;
  }

  // 2. 孩子评分聚合
  const childRatings = reviews.map(r => r.childRating).filter((x): x is number => x != null);
  const kidAvgScore = childRatings.length > 0
    ? Number((childRatings.reduce((a, b) => a + b, 0) / childRatings.length).toFixed(2))
    : null;
  const withChildRatingCount = childRatings.length;

  // 3. 便利聚合：≥ 3 条且都在 90 天内才计算
  const RECENT_DAYS = 90;
  const recentCutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const recent = reviews.filter(r => r.createdAt >= recentCutoff);
  const shouldComputeConvenience = recent.length >= 3;
  const rateOf = (bools: boolean[]): number | null => {
    if (!shouldComputeConvenience) return null;
    if (bools.length === 0) return null;
    return Number((bools.filter(Boolean).length / bools.length).toFixed(2));
  };
  const parkingRate = rateOf(recent.map(r => r.hasParking));
  const highChairRate = rateOf(recent.map(r => r.hasHighChair));
  const napRoomRate = rateOf(recent.map(r => r.hasNapRoom));
  const strollerOkRate = rateOf(recent.map(r => r.strollerOk));

  // 4. kidFriendly 聚合
  const friendlyScores = reviews.map(r => r.kidFriendly).filter((x): x is number => x != null);
  const kidFriendlyAvg = friendlyScores.length > 0
    ? Number((friendlyScores.reduce((a, b) => a + b, 0) / friendlyScores.length).toFixed(2))
    : null;

  // 5. 最近评价时间
  const lastReviewedAt = reviews.reduce(
    (max, r) => (r.createdAt > max ? r.createdAt : max),
    reviews[0].createdAt,
  );

  // 6. upsert
  await prisma.placeAggregate.upsert({
    where: { placeId_placeType: { placeId, placeType } },
    create: {
      placeId,
      placeType,
      kidAvgScore,
      momAvgScore: null,  // v1.5 启用
      dadAvgScore: null,  // v1.5 启用
      reviewCount: reviews.length,
      withChildRatingCount,
      parkingRate,
      highChairRate,
      napRoomRate,
      strollerOkRate,
      kidFriendlyAvg,
      lastReviewedAt,
    },
    update: {
      kidAvgScore,
      momAvgScore: null,
      dadAvgScore: null,
      reviewCount: reviews.length,
      withChildRatingCount,
      parkingRate,
      highChairRate,
      napRoomRate,
      strollerOkRate,
      kidFriendlyAvg,
      lastReviewedAt,
      recomputedAt: new Date(),
    },
  });
}

/** 全量对账（cron 兜底，每 6 小时一次，防止异步任务丢失） */
export async function recomputeAllAggregates(): Promise<{ updated: number; errors: number }> {
  const groups = await prisma.placeReview.groupBy({
    by: ['placeId', 'placeType'],
    where: { status: 'published' },
    _count: { _all: true },
  });

  let updated = 0;
  let errors = 0;
  for (const g of groups) {
    try {
      await recomputePlaceAggregate(g.placeId, g.placeType);
      updated++;
    } catch (e) {
      console.error('[place-aggregate] recompute failed', g, e);
      errors++;
    }
  }
  return { updated, errors };
}