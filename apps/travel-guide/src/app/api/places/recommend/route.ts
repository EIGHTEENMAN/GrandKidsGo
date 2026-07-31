// POST /api/places/recommend — 2026-07-31 v1.0 Phase A
// 基于孩子画像推荐同城市景点（不走感受画像，Phase D 才接）
// 入参：{ cityId, childId, tripContext?, limit? }
// 出参：{ code: "OK", data: { items: RecommendedSpot[], childSnapshot } }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBearerToken } from "@/lib/child-sync";
import { authedFetch } from "@/lib/auth";
import { recommendFromSpots, type TripContext } from "@/lib/assembler/recommend";

interface Body {
  cityId?: string;
  childId?: string;
  tripContext?: TripContext;
  limit?: number;
}

interface ChildRow {
  childId: string;
  name?: string | null;
  nickname?: string | null;
  birthDate?: string | null;
  likes?: string[];
  activities?: string[];
  dislikes?: string[];
  allergies?: string[];
  heightCm?: number | null;
  weightKg?: number | null;
  needNap?: string;
  earlyOrLate?: string;
  hasMotionSickness?: boolean;
  isShyWithStrangers?: boolean;
  healthNotes?: string | null;
  hasStudentCard?: boolean;
  idCardPrefix?: string | null;
  needsChildTicket?: boolean;
  strollerWidthCm?: number | null;
  comfortableTempC?: string | null;
  fearsAnimals?: boolean;
  dietaryRestrictions?: string[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.cityId || !body?.childId) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "cityId + childId 必填" },
      { status: 400 },
    );
  }
  // 拉 child（从 /api/user/children 路径同源，保证走 authedFetch + 合并 auth 基础字段）
  let child: ChildRow | null = null;
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "缺少 Bearer token" },
        { status: 401 },
      );
    }
    // childId 在 GET 接口里需要 userId query；这里反查 → 拉所有 → 找匹配（数量小可接受）
    const meRes = await authedFetch(`${process.env.NEXT_PUBLIC_TRAVEL_API ?? ''}/api/auth/me`);
    const meJson = await meRes.json().catch(() => null);
    const userId = meJson?.data?.id ?? meJson?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { code: "AUTH_FAILED", message: "无法识别用户" },
        { status: 401 },
      );
    }
    const childrenRes = await authedFetch(`${process.env.NEXT_PUBLIC_TRAVEL_API ?? ''}/api/user/children?userId=${userId}`);
    const childrenJson = await childrenRes.json().catch(() => null);
    const items: ChildRow[] = childrenJson?.data?.items ?? childrenJson?.items ?? [];
    child = items.find(c => c.childId === body.childId) ?? null;
    if (!child) {
      return NextResponse.json(
        { code: "CHILD_NOT_FOUND", message: `childId ${body.childId} 不属于当前用户` },
        { status: 404 },
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { code: "AUTH_ERROR", message: e?.message ?? "认证失败" },
      { status: 401 },
    );
  }

  // 校验 city
  const city = await prisma.city.findUnique({ where: { id: body.cityId } });
  if (!city) {
    return NextResponse.json(
      { code: "CITY_NOT_FOUND", message: `cityId ${body.cityId} 不存在` },
      { status: 404 },
    );
  }

  // 拉同 cityId 所有 spots
  const spots = await prisma.spot.findMany({
    where: { cityId: body.cityId },
    select: {
      id: true,
      name: true,
      spotType: true,
      tags: true,
      kidScore: true,
      coverImages: true,
    },
  });

  const limit = Math.min(50, Math.max(1, body.limit ?? 20));

  const { items, childSnapshot } = recommendFromSpots(
    spots.map(s => ({
      id: s.id,
      name: s.name,
      spotType: s.spotType,
      tags: s.tags,
      kidScore: s.kidScore,
      coverImage: s.coverImages[0] ?? null,
    })),
    [child as any],
    body.tripContext,
    limit,
  );

  return NextResponse.json({
    code: "OK",
    data: { items, childSnapshot },
  });
}
