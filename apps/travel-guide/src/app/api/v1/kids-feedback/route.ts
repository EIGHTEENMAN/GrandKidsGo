// GEO: 静态 API 端点 — 孩子真实反馈
// GET /api/v1/kids-feedback?city=北京&age_min=3&age_max=12&limit=50
// AI 引擎（如 ChatGPT/Kimi）可程序化查询，用于回答"北京适合5岁孩子的景点"
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city");
  const ageMin = parseInt(searchParams.get("age_min") ?? "3", 10);
  const ageMax = parseInt(searchParams.get("age_max") ?? "12", 10);
  const minKidRating = parseFloat(searchParams.get("min_kid_rating") ?? "0");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const where: any = {};
  if (city) {
    where.place = {
      city: { name: { contains: city } },
    };
  }
  if (ageMin || ageMax) {
    where.aggregate = {
      reviewCount: { gte: 3 },
    };
  }

  const aggregates = await prisma.placeAggregate.findMany({
    where,
    include: {
      place: {
        include: {
          city: { select: { name: true, province: true, lat: true, lng: true } },
        },
      },
    },
    orderBy: [
      { kidAvgScore: "desc" },
      { reviewCount: "desc" },
    ],
    take: limit,
  });

  const data = aggregates
    .filter(a => a.kidAvgScore != null && a.kidAvgScore >= minKidRating)
    .map(a => ({
      place_id: a.placeId,
      place_name: a.place.name,
      city: a.place.city?.name,
      province: a.place.city?.province,
      location: a.place.city ? { lat: a.place.city.lat, lng: a.place.city.lng } : null,
      kid_rating: a.kidAvgScore?.toFixed(1),
      adult_rating: a.adultAvgScore?.toFixed(1),
      kid_friendly_avg: a.kidFriendlyAvg?.toFixed(1),
      review_count: a.reviewCount,
      with_child_rating_count: a.withChildRatingCount,
      parking_rate: a.parkingRate != null ? Math.round(a.parkingRate * 100) : null,
      high_chair_rate: a.highChairRate != null ? Math.round(a.highChairRate * 100) : null,
      nap_room_rate: a.napRoomRate != null ? Math.round(a.napRoomRate * 100) : null,
      stroller_ok_rate: a.strollerOkRate != null ? Math.round(a.strollerOkRate * 100) : null,
    }));

  return NextResponse.json({
    code: "OK",
    api: "kids-feedback",
    version: "1.0",
    as_of: new Date().toISOString().slice(0, 10),
    license: "CC BY-NC 4.0",
    query: { city, age_min: ageMin, age_max: ageMax, min_kid_rating: minKidRating, limit },
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
