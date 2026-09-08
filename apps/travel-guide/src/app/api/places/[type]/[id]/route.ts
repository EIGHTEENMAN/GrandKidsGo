// GET /api/places/[type]/[id] — 地点详情 + 真实评价 + 周边 POI
// POST /api/places/[type]/[id]/review — 提交评价（双维度）

import { NextRequest, NextResponse } from "next/server";
import { PlaceNearbyCategory } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";
import { computeChildWarning } from "@/lib/compute-child-warnings";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  sight: "景点",
  restaurant: "餐厅",
  hotel: "酒店",
  park: "公园",
  playground: "游乐场",
  mall: "商场",
  medical: "医疗",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  const { type, id } = params;
  const label = TYPE_LABELS[type] ?? type;

  // 查地点
  let place: any = null;
  if (type === "sight") {
    place = await prisma.spot.findUnique({
      where: { id },
      include: { city: true },
    });
  } else if (type === "restaurant") {
    place = await prisma.restaurant.findUnique({
      where: { id },
      include: { city: true },
    });
  } else if (type === "hotel") {
    place = await prisma.hotel.findUnique({
      where: { id },
      include: { city: true },
    });
  } else if (type === "park") {
    place = await prisma.park.findUnique({
      where: { id },
      include: { city: true },
    });
  } else if (type === "playground") {
    place = await prisma.playground.findUnique({
      where: { id },
      include: { city: true },
    });
  } else if (type === "mall") {
    place = await prisma.mall.findUnique({
      where: { id },
      include: { city: true },
    });
  } else if (type === "medical") {
    place = await prisma.hospital.findUnique({
      where: { id },
      include: { city: true },
    });
  }

  if (!place) {
    return NextResponse.json(
      { error: { code: "PLACE_NOT_FOUND", message: "地点不存在" } },
      { status: 404 },
    );
  }

  // 评价列表
  const reviews = await prisma.placeReview.findMany({
    where: { placeId: id, placeType: type, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // 统计
  const adultAvg = reviews.length
    ? reviews.reduce((s, r) => s + r.adultRating, 0) / reviews.length
    : null;
  const childReviews = reviews.filter((r) => r.childRating != null);
  const childAvg = childReviews.length
    ? childReviews.reduce((s, r) => s + (r.childRating ?? 0), 0) / childReviews.length
    : null;

  // 评价分布（1-5 星各占多少）
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) distribution[r.adultRating as 1 | 2 | 3 | 4 | 5]++;

  // 2026-07-24 v1.0：拉 PlaceAggregate（三视角 + 便利聚合）
  const aggregate = await prisma.placeAggregate.findUnique({
    where: { placeId_placeType: { placeId: id, placeType: type } },
  });

  // 记录浏览
  const auth = await verifyAuth(req);
  const userId = auth?.id ?? null;
  if (userId) {
    await prisma.placeViewLog.create({
      data: {
        placeId: id,
        placeType: type,
        userId,
        action: "view",
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    code: "OK",
    data: {
      type,
      typeLabel: label,
      place,
      stats: {
        adultAvg: adultAvg ? Math.round(adultAvg * 10) / 10 : null,
        childAvg: childAvg ? Math.round(childAvg * 10) / 10 : null,
        withChildRating: childReviews.length,
        reviewCount: reviews.length,
        distribution,
      },
      // 2026-07-24 v1.0：聚合数据（三视角 + 便利设施）
      aggregate: aggregate
        ? {
            adultAvgScore: aggregate.adultAvgScore,
            kidAvgScore: aggregate.kidAvgScore,
            reviewCount: aggregate.reviewCount,
            withChildRatingCount: aggregate.withChildRatingCount,
            parkingRate: aggregate.parkingRate,
            highChairRate: aggregate.highChairRate,
            napRoomRate: aggregate.napRoomRate,
            strollerOkRate: aggregate.strollerOkRate,
            kidFriendlyAvg: aggregate.kidFriendlyAvg,
            lastReviewedAt: aggregate.lastReviewedAt,
          }
        : null,
      // 周边 POI（按 category group 返回）
      nearby: await fetchNearby(type, id),
      // 榜单（热门景点榜本周排名）
      leaderboard: await fetchLeaderboard(type, id),
      // 关联古诗词（"古诗在此"板块 — 走天下×学诗词）
      poems: await fetchPoems(type, id, place.city?.id),
      // 孩子说（按 spotId 过滤已公开的）
      childSayings: await fetchChildSayingsForPlace(type, id),
      // 2026-07-31「孩子最怕」预警 — 基于 child_feeling_profiles 计算的哭闹率
      childWarning: place.spotType
        ? await computeChildWarning(place.spotType)
        : null,
      reviews: reviews.map((r) => ({
        id: r.id,
        adultRating: r.adultRating,
        childRating: r.childRating,
        childAgeMonths: r.childAgeMonths,
        text: r.text,
        tags: r.tags,
        hasParking: r.hasParking,
        hasHighChair: r.hasHighChair,
        hasNapRoom: r.hasNapRoom,
        strollerOk: r.strollerOk,
        kidFriendly: r.kidFriendly,
        visitDate: r.visitDate,
        createdAt: r.createdAt,
      })),
    },
  });
}

// 周边 POI：按 category 分组返回
// 优先读 place_nearby 表（已审核的人工/AI 录入数据），
// fallback 读 spots.nearby_facilities JSONB（13-collect-nearby 高德 around 自动采集的数据）
async function fetchNearby(type: string, id: string) {
  const rows = await prisma.placeNearby.findMany({
    where: { placeId: id, placeType: type },
    orderBy: [{ distanceMeters: "asc" }],
    take: 100,
  });
  const groups: Record<string, Array<{
    name: string;
    distanceMeters: number | null;
    extra: Record<string, unknown>;
    isVerified: boolean;
  }>> = {};
  for (const r of rows) {
    const k = r.category as string;
    if (!groups[k]) groups[k] = [];
    groups[k].push({
      name: r.name,
      distanceMeters: r.distanceMeters,
      extra: (r.extra ?? {}) as Record<string, unknown>,
      isVerified: r.isVerified,
    });
  }

  // Fallback: 若 place_nearby 表为空，读 spot.nearby_facilities JSONB
  // JSONB 形态: { 母婴室:[{name,distance,address}], 儿童餐:[...], 医院:[{...,isPediatrics}], 便利店:[...], 停车场:[...], 推车可达:bool, 无障碍通道:bool }
  // 映射到 enum: NURSING_ROOM / KID_RESTAURANT / KIDS_HOSPITAL / CONVENIENCE / STROLLER_FRIENDLY
  if (Object.keys(groups).length === 0 && type === "sight") {
    const spot = await prisma.spot.findUnique({
      where: { id },
      select: { nearbyFacilities: true },
    });
    const jb = spot?.nearbyFacilities as Record<string, unknown> | null;
    if (jb && typeof jb === "object") {
      const MAP: Record<string, string> = {
        母婴室: "NURSING_ROOM",
        儿童餐: "KID_RESTAURANT",
        医院: "KIDS_HOSPITAL",
        便利店: "CONVENIENCE",
        停车场: "STROLLER_FRIENDLY",
      };
      for (const [zhKey, enumKey] of Object.entries(MAP)) {
        const list = jb[zhKey] as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(list) || list.length === 0) continue;
        groups[enumKey] = list.slice(0, 5).map((p) => ({
          name: String(p.name ?? ""),
          distanceMeters: typeof p.distance === "number" ? p.distance : null,
          extra: (() => {
            const e: Record<string, unknown> = {};
            if (typeof p.address === "string" && p.address) e.address = p.address;
            if (typeof p.isPediatrics === "boolean") e.isPediatrics = p.isPediatrics;
            return e;
          })(),
          isVerified: false,
        }));
      }
    }
  }

  const ordered: Record<string, unknown> = {};
  for (const cat of Object.values(PlaceNearbyCategory)) {
    if (groups[cat]) ordered[cat] = groups[cat];
  }
  return ordered;
}

// 榜单：本地点在"热门景点榜（本周）"的排名（实时查 place-hot）
async function fetchLeaderboard(type: string, id: string) {
  if (type !== "sight") return null; // 仅景点有 place-hot
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const reviews = await prisma.placeReview.findMany({
    where: { placeType: "sight", status: "published", createdAt: { gte: cutoff } },
    select: { placeId: true, adultRating: true, childRating: true },
  });
  const byPlace = new Map<string, { count: number; adultSum: number; childSum: number; childCount: number }>();
  for (const r of reviews) {
    const v = byPlace.get(r.placeId) ?? { count: 0, adultSum: 0, childSum: 0, childCount: 0 };
    v.count += 1;
    v.adultSum += r.adultRating;
    if (r.childRating != null) { v.childSum += r.childRating; v.childCount += 1; }
    byPlace.set(r.placeId, v);
  }
  const ranked = Array.from(byPlace.entries()).map(([pid, v]) => {
    const adultAvg = v.adultSum / v.count;
    const childAvg = v.childCount > 0 ? v.childSum / v.childCount : null;
    const composite = childAvg != null ? adultAvg * 0.4 + childAvg * 0.6 : adultAvg * 0.8;
    return { placeId: pid, score: composite };
  }).sort((a, b) => b.score - a.score);
  const idx = ranked.findIndex((r) => r.placeId === id);
  return {
    scope: "place-hot",
    period: "week",
    rank: idx === -1 ? null : idx + 1,
    total: ranked.length,
  };
}

// 关联古诗词：基于 PoemLocation 表
async function fetchPoems(type: string, id: string, cityId: string | null | undefined) {
  const where: Record<string, unknown> = { OR: [{ placeType: type, placeId: id }] };
  if (cityId) (where.OR as unknown[]).push({ cityId });
  const rows = await prisma.poemLocation.findMany({ where: where as any, orderBy: { confidence: "desc" }, take: 8 });
  return rows.map((r) => ({
    poemId: r.poemId, poemTitle: r.poemTitle, poemAuthor: r.poemAuthor,
    linkType: r.linkType, verseLine: r.verseLine, confidence: r.confidence,
    url: `https://xueshici.grandand.com/#reader/${r.poemId}-1`,
  }));
}

// 孩子说：按 placeId 过滤公开记录（取最近 5 条）
async function fetchChildSayingsForPlace(type: string, id: string) {
  if (type !== "sight") return [];
  const rows = await prisma.childSaying.findMany({
    where: { spotId: id, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, text: true, mood: true, childId: true, createdAt: true },
  });
  return rows;
}
