// POST /api/places/[type]/[id]/review — 提交评价（双维度：大人 + 孩子）
// 详见 项目建设方案/走天下实施方案-v3.0.md 第十节（宝典）
//
// 请求体:
// {
//   adultRating: 1-5,
//   childRating: 1-5 | null,    // 可选，孩子没去过或没表达就 null
//   childAgeMonths: number | null,
//   text: string | null,
//   tags: string[],
//   hasParking, hasHighChair, hasNapRoom, strollerOk, kidFriendly
// }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recomputePlaceAggregate } from "@/lib/place-aggregate";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "请先登录" } },
      { status: 401 },
    );
  }

  const { type, id } = params;
  const body = await req.json().catch(() => ({}));

  if (!body.adultRating || body.adultRating < 1 || body.adultRating > 5) {
    return NextResponse.json(
      { error: { code: "INVALID_RATING", message: "大人评分需 1-5" } },
      { status: 400 },
    );
  }
  if (body.childRating != null && (body.childRating < 1 || body.childRating > 5)) {
    return NextResponse.json(
      { error: { code: "INVALID_CHILD_RATING", message: "孩子评分需 1-5" } },
      { status: 400 },
    );
  }

  // 查地点
  let placeName: string | null = null;
  let cityId: string | null = null;
  if (type === "sight") {
    const s = await prisma.spot.findUnique({ where: { id }, select: { name: true, cityId: true } });
    placeName = s?.name ?? null;
    cityId = s?.cityId ?? null;
  } else if (type === "restaurant") {
    const r = await prisma.restaurant.findUnique({ where: { id }, select: { name: true, cityId: true } });
    placeName = r?.name ?? null;
    cityId = r?.cityId ?? null;
  } else if (type === "hotel") {
    const h = await prisma.hotel.findUnique({ where: { id }, select: { name: true, cityId: true } });
    placeName = h?.name ?? null;
    cityId = h?.cityId ?? null;
  } else if (type === "park") {
    const p = await prisma.park.findUnique({ where: { id }, select: { name: true, cityId: true } });
    placeName = p?.name ?? null;
    cityId = p?.cityId ?? null;
  } else if (type === "playground") {
    const p = await prisma.playground.findUnique({ where: { id }, select: { name: true, cityId: true } });
    placeName = p?.name ?? null;
    cityId = p?.cityId ?? null;
  }

  if (!placeName) {
    return NextResponse.json(
      { error: { code: "PLACE_NOT_FOUND", message: "地点不存在" } },
      { status: 404 },
    );
  }

  // upsert（二维：大人 + 孩子）
  const review = await prisma.placeReview.upsert({
    where: { placeId_placeType_userId: { placeId: id, placeType: type, userId } },
    create: {
      placeId: id, placeType: type, placeName, cityId, userId,
      adultRating: body.adultRating,
      childRating: body.childRating ?? null,
      childAgeMonths: body.childAgeMonths ?? null,
      text: body.text ?? null,
      tags: body.tags ?? [],
      hasParking: !!body.hasParking,
      hasHighChair: !!body.hasHighChair,
      hasNapRoom: !!body.hasNapRoom,
      strollerOk: !!body.strollerOk,
      kidFriendly: body.kidFriendly ?? null,
      visitDate: body.visitDate ? new Date(body.visitDate) : null,
    },
    update: {
      placeName, cityId,
      adultRating: body.adultRating,
      childRating: body.childRating ?? null,
      childAgeMonths: body.childAgeMonths ?? null,
      text: body.text ?? null,
      tags: body.tags ?? [],
      hasParking: !!body.hasParking,
      hasHighChair: !!body.hasHighChair,
      hasNapRoom: !!body.hasNapRoom,
      strollerOk: !!body.strollerOk,
      kidFriendly: body.kidFriendly ?? null,
      visitDate: body.visitDate ? new Date(body.visitDate) : null,
    },
  });

  // 同步重算聚合
  try { await recomputePlaceAggregate(id, type); }
  catch (e) { console.error('[place-review] recompute failed', e); }

  return NextResponse.json({
    code: "OK",
    data: { id: review.id, aggregateRecomputed: true },
  });
}
