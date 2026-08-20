// GEO: 静态 API 端点 — 母婴设施
// GET /api/v1/baby-facilities?city=北京&category=NURSING_ROOM
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city");
  const category = searchParams.get("category");
  const minParkRate = parseFloat(searchParams.get("min_parking_rate") ?? "0");
  const minNapRate = parseFloat(searchParams.get("min_nap_room_rate") ?? "0");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

  const placeWhere: any = {};
  if (city) placeWhere.city = { name: { contains: city } };

  const places = await prisma.place.findMany({
    where: placeWhere,
    include: {
      city: { select: { name: true } },
      aggregate: true,
      nearby: { take: 20 },
    },
    take: 200,
  });

  const filtered = places.filter(p => {
    const agg = p.aggregate;
    if (!agg) return false;
    if (agg.parkingRate != null && agg.parkingRate * 100 < minParkRate) return false;
    if (agg.napRoomRate != null && agg.napRoomRate * 100 < minNapRate) return false;
    return true;
  }).slice(0, limit);

  const data = filtered.map(p => ({
    place_id: p.id,
    place_name: p.name,
    city: p.city?.name,
    spot_type: p.spotType,
    parking_rate: p.aggregate?.parkingRate != null ? Math.round(p.aggregate.parkingRate * 100) + '%' : null,
    high_chair_rate: p.aggregate?.highChairRate != null ? Math.round(p.aggregate.highChairRate * 100) + '%' : null,
    nap_room_rate: p.aggregate?.napRoomRate != null ? Math.round(p.aggregate.napRoomRate * 100) + '%' : null,
    stroller_ok_rate: p.aggregate?.strollerOkRate != null ? Math.round(p.aggregate.strollerOkRate * 100) + '%' : null,
    kid_friendly_avg: p.aggregate?.kidFriendlyAvg?.toFixed(1),
    review_count: p.aggregate?.reviewCount ?? 0,
    nearby_facilities: p.nearby
      .filter(n => !category || n.category === category)
      .slice(0, 5)
      .map(n => ({
        category: n.category,
        name: n.name,
        distance_meters: n.distanceMeters,
        is_verified: n.isVerified,
      })),
  }));

  return NextResponse.json({
    code: "OK",
    api: "baby-facilities",
    version: "1.0",
    as_of: new Date().toISOString().slice(0, 10),
    license: "CC BY-NC 4.0",
    query: { city, category, min_parking_rate: minParkRate, min_nap_room_rate: minNapRate, limit },
    total: data.length,
    data,
    documentation: "https://travel.grandand.com/about#api-docs",
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
