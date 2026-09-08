// GET /api/footprints — 足迹列表（按用户/孩子/状态筛选）
// POST /api/footprints — 创建足迹（手动打卡 / from-plan 自动触发）
// 来源：manual | from_plan | from_guide
// 状态：visited | wishlist | child_wishlist
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";

export const dynamic = "force-dynamic";

const VALID_STATES = new Set(["visited", "wishlist", "child_wishlist"]);
const VALID_SOURCES = new Set(["manual", "from_plan", "from_guide"]);

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  const userId = auth.id;

  const url = new URL(req.url);
  const childId = url.searchParams.get("childId");
  const state = url.searchParams.get("state");
  const cityId = url.searchParams.get("cityId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  const where: Record<string, unknown> = { userId };
  if (childId) where.childId = childId;
  if (state && VALID_STATES.has(state)) where.state = state;
  if (cityId) where.cityId = cityId;

  const items = await prisma.footprint.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      childId: true,
      cityId: true,
      spotId: true,
      placeName: true,
      lat: true,
      lng: true,
      state: true,
      source: true,
      sourceId: true,
      checkinAt: true,
      note: true,
      visibility: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ code: "OK", data: { items, count: items.length } });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  const userId = auth.id;

  const body = await req.json();
  const {
    childId = null,
    cityId = null,
    spotId = null,
    placeName = null,
    lat = null,
    lng = null,
    state = "visited",
    source = "manual",
    sourceId = null,
    checkinAt = null,
    note = null,
    visibility = "private",
  } = body ?? {};

  // 验证必需字段
  if (!cityId && !spotId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "cityId / spotId 至少需要一个" },
      { status: 400 },
    );
  }
  if (!VALID_STATES.has(state)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: `state 必须是 ${[...VALID_STATES].join("|")}` },
      { status: 400 },
    );
  }
  if (!VALID_SOURCES.has(source)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: `source 必须是 ${[...VALID_SOURCES].join("|")}` },
      { status: 400 },
    );
  }

  // 自动补 placeName/lat/lng：从 city/spot 表里查
  let resolvedName = placeName;
  let resolvedLat = lat;
  let resolvedLng = lng;
  if (spotId && (!resolvedName || resolvedLat == null || resolvedLng == null)) {
    const spot = await prisma.spot.findUnique({
      where: { id: spotId },
      select: { name: true, lat: true, lng: true },
    });
    if (spot) {
      resolvedName = resolvedName ?? spot.name;
      resolvedLat = resolvedLat ?? spot.lat;
      resolvedLng = resolvedLng ?? spot.lng;
    }
  }
  if (cityId && !resolvedName) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: { name: true },
    });
    if (city) resolvedName = city.name;
  }

  // 幂等：先查重，再决定 create / update
  // 注：Prisma 5.22 对 nullable unique 字段不接受 null 索引 → 不能直接用 upsert
  // 改成"先查后写"两步
  let result: { id: string; state: string };
  try {
    const existing = await prisma.footprint.findFirst({
      where: {
        userId,
        childId,
        cityId,
        spotId,
        state,
      },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.footprint.update({
        where: { id: existing.id },
        data: {
          checkinAt: checkinAt ? new Date(checkinAt) : new Date(),
          note,
          sourceId,
          updatedAt: new Date(),
        },
        select: { id: true, state: true },
      });
      result = updated;
    } else {
      const created = await prisma.footprint.create({
        data: {
          userId,
          childId,
          cityId,
          spotId,
          placeName: resolvedName,
          lat: resolvedLat,
          lng: resolvedLng,
          state,
          source,
          sourceId,
          checkinAt: checkinAt ? new Date(checkinAt) : null,
          note,
          visibility,
        },
        select: { id: true, state: true },
      });
      result = created;
    }
  } catch (err: any) {
    console.error(`[footprints] POST error:`, err?.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "足迹入库失败" },
      { status: 500 },
    );
  }

  console.log(
    `[footprints] ${userId.slice(0, 8)} create state=${state} cityId=${cityId} spotId=${spotId} source=${source}`,
  );
  return NextResponse.json({ code: "OK", data: { id: result.id, state: result.state } });
}
