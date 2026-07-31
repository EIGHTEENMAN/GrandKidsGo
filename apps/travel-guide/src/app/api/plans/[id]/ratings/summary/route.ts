// GET /api/plans/[id]/ratings/summary — plan 下所有 ChildRating 聚合
// PR2：攻略详情页要展示"用户实际玩过的感受"汇总（v1.5 数据资产闭环）
//
// 维度（v1.5）：
// - physicalState        (string enum: active/tired/sleepy/etc)
// - emotionalPeak        (string enum: excited/happy/calm/etc)
// - stayDurationMinutes  (int)
// - willingnessToReturn  (string enum: eager/willing/neutral/unwilling)
// - cryEpisodes          (json: [{atMinutes, durationSeconds}])
//
// 2026-07-31 v1.0 Phase B：加 4 字段 + 4 维聚合
// - favoriteMoment / wishToReturn / parentJoy / cryTriggers
// - monthlyFeedback / crossSpotPattern / topEmotionTriggers / parentJoyByActivity

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const planId = params.id;
  const ratings = await prisma.childRating.findMany({
    where: { planRecordId: planId },
    select: {
      physicalState: true,
      emotionalPeak: true,
      stayDurationMinutes: true,
      willingnessToReturn: true,
      cryEpisodes: true,
      cryTriggers: true,
      favoriteMoment: true,
      wishToReturn: true,
      parentJoy: true,
      childAgeAtVisit: true,
      spotId: true,
    },
  });

  const total = ratings.length;

  function distribution<T extends string | null>(key: "physicalState" | "emotionalPeak" | "willingnessToReturn") {
    const map = new Map<string, number>();
    for (const r of ratings) {
      const v = r[key] as string | null;
      if (!v) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }

  const stayDurations = ratings
    .map((r) => r.stayDurationMinutes)
    .filter((n): n is number => typeof n === "number");
  const avgStay = stayDurations.length
    ? Math.round(stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length)
    : null;
  const medianStay = stayDurations.length
    ? (() => {
        const sorted = [...stayDurations].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      })()
    : null;

  // cryEpisodes（兼容旧数据）
  let cryCount = 0;
  let cryTotal = 0;
  for (const r of ratings) {
    const arr = Array.isArray(r.cryEpisodes) ? (r.cryEpisodes as unknown[]) : [];
    if (arr.length > 0) cryCount++;
    cryTotal += arr.length;
  }

  // 2026-07-31 v1.0 Phase B：cryTriggers 分布（优先新字段）
  const cryTriggerDist: Record<string, number> = {};
  for (const r of ratings) {
    if (Array.isArray(r.cryTriggers)) {
      for (const t of r.cryTriggers) {
        const trig = (t as any)?.trigger;
        if (typeof trig === 'string') cryTriggerDist[trig] = (cryTriggerDist[trig] ?? 0) + 1;
      }
    }
  }

  // 2026-07-31 v1.0 Phase B：favoriteMoment 列表（top 5）
  const favoriteMoments = ratings
    .filter(r => r.favoriteMoment && r.favoriteMoment.trim())
    .slice(0, 5)
    .map(r => ({
      spotId: r.spotId,
      text: r.favoriteMoment!.trim(),
    }));

  // 2026-07-31 v1.0 Phase B：wishToReturn 分布
  const wishToReturnDist: Record<string, number> = {};
  for (const r of ratings) {
    if (r.wishToReturn) wishToReturnDist[r.wishToReturn] = (wishToReturnDist[r.wishToReturn] ?? 0) + 1;
  }

  // 2026-07-31 v1.0 Phase B：parentJoy 分布
  const parentJoyDist: Record<string, number> = {};
  for (const r of ratings) {
    if (r.parentJoy) parentJoyDist[r.parentJoy] = (parentJoyDist[r.parentJoy] ?? 0) + 1;
  }

  // childAgeAtVisit 分布
  const ageMap = new Map<number, number>();
  for (const r of ratings) {
    const a = r.childAgeAtVisit;
    if (typeof a !== "number") continue;
    ageMap.set(a, (ageMap.get(a) ?? 0) + 1);
  }
  const ageDistribution = Array.from(ageMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ageMonths, count]) => ({ ageMonths, count }));

  return NextResponse.json({
    code: "OK",
    data: {
      planId,
      total,
      physicalState: distribution("physicalState"),
      emotionalPeak: distribution("emotionalPeak"),
      willingnessToReturn: distribution("willingnessToReturn"),
      stayDuration: { avgMinutes: avgStay, medianMinutes: medianStay, sample: stayDurations.length },
      cry: { recordsWithCry: cryCount, totalEpisodes: cryTotal, rate: total ? Math.round((cryCount / total) * 100) : 0 },
      childAgeDistribution: ageDistribution,
      // 2026-07-31 v1.0 Phase B
      cryTriggerDistribution: cryTriggerDist,
      favoriteMoments,
      wishToReturnDistribution: wishToReturnDist,
      parentJoyDistribution: parentJoyDist,
    },
  });
}