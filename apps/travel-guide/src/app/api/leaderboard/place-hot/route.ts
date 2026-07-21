// GET /api/leaderboard/place-hot?period=week|month|all
// 详见 项目建设方案/走天下实施方案-v3.4.md 排行榜联动方案
//
// 热门景点榜（基于 PlaceReview 双维度评分）
// 数据来源：用户在宝典给景点的评价（adultRating + childRating）
// 排序逻辑：
//   1. 综合评分 = adultAvg * 0.4 + childAvg * 0.6（孩子优先，因为这是 v1.5 钉死的承诺）
//   2. 评价数 ≥ 1
//   3. 时间窗（period）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function periodStart(period: string): Date {
  const now = new Date();
  if (period === "week") {
    return new Date(now.getTime() - 7 * 86400000);
  } else if (period === "month") {
    return new Date(now.getTime() - 30 * 86400000);
  }
  return new Date(0); // all
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "all";
  const cutoff = periodStart(period);

  // 拉所有景点的评价（按地点分组）
  const reviews = await prisma.placeReview.findMany({
    where: {
      placeType: "sight",
      status: "published",
      createdAt: { gte: cutoff },
    },
    select: {
      placeId: true,
      placeName: true,
      adultRating: true,
      childRating: true,
      createdAt: true,
    },
  });

  // 按 placeId 分组计算
  const byPlace = new Map<string, {
    placeId: string;
    placeName: string;
    reviewCount: number;
    childReviewed: number;
    adultSum: number;
    childSum: number;
    lastAt: Date;
  }>();

  for (const r of reviews) {
    const existing = byPlace.get(r.placeId);
    if (existing) {
      existing.reviewCount++;
      existing.adultSum += r.adultRating;
      if (r.childRating != null) {
        existing.childReviewed++;
        existing.childSum += r.childRating;
      }
      if (r.createdAt > existing.lastAt) existing.lastAt = r.createdAt;
    } else {
      byPlace.set(r.placeId, {
        placeId: r.placeId,
        placeName: r.placeName ?? "未知景点",
        reviewCount: 1,
        childReviewed: r.childRating != null ? 1 : 0,
        adultSum: r.adultRating,
        childSum: r.childRating ?? 0,
        lastAt: r.createdAt,
      });
    }
  }

  // 算综合分（孩子优先 + 评价数加权）
  const ranked = Array.from(byPlace.values())
    .filter((p) => p.reviewCount >= 1)
    .map((p) => {
      const adultAvg = p.adultSum / p.reviewCount;
      const childAvg = p.childReviewed > 0 ? p.childSum / p.childReviewed : null;
      const composite = childAvg != null
        ? adultAvg * 0.4 + childAvg * 0.6
        : adultAvg * 0.8; // 没孩子评分就降低权重
      // 评价数奖励（log）
      const score = composite * (1 + Math.log10(p.reviewCount));
      return {
        rank: 0,
        placeId: p.placeId,
        placeName: p.placeName,
        adultAvg: Math.round(adultAvg * 10) / 10,
        childAvg: childAvg != null ? Math.round(childAvg * 10) / 10 : null,
        reviewCount: p.reviewCount,
        childReviewed: p.childReviewed,
        score: Math.round(score * 100) / 100,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // 补 rank
  ranked.forEach((p, i) => (p.rank = i + 1));

  return NextResponse.json({
    scope: "place-hot",
    period,
    items: ranked,
    capturedAt: new Date().toISOString(),
  });
}
