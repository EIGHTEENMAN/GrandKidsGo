// GET /api/places/[type]/[id] — 地点详情 + 真实评价 + 周边 POI
// POST /api/places/[type]/[id]/review — 提交评价（双维度）

import { NextRequest, NextResponse } from "next/server";
import { PlaceNearbyCategory } from "@prisma/client";
import prisma from "@/lib/prisma";

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

  // 记录浏览
  const userId = req.headers.get("x-debug-user-id");
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
      },
      // 周边 POI（按 category group 返回）
      nearby: await fetchNearby(type, id),
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
async function fetchNearby(type: string, id: string) {
  const rows = await prisma.placeNearby.findMany({
    where: { placeId: id, placeType: type },
    orderBy: [{ distanceMeters: "asc" }],
    take: 100,
  });
  // 按 category group（保持 enum 顺序）
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
  // 按 enum 顺序输出
  const ordered: Record<string, unknown> = {};
  for (const cat of Object.values(PlaceNearbyCategory)) {
    if (groups[cat]) ordered[cat] = groups[cat];
  }
  return ordered;
}
