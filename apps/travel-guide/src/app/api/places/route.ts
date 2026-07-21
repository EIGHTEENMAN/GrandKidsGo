// GET /api/places — 宝典地点库（13 类亲子地点）
// 详见 项目建设方案/走天下实施方案-v3.0.md 第十节（v3.0 宝典）
//
// 13 类地点：景点 / 餐厅 / 酒店 / 交通 / 医疗 / 便利店 / 公园 / 商场 / 游乐场 / 科技馆 / 图书馆 / 博物馆 / 海洋馆
//
// query params:
//   ?cityId=xxx      按城市过滤
//   ?category=sight  按类别过滤
//   ?q=水族馆        按名称模糊搜索
//   ?sort=rating     rating | newest | popular (default: popular)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PlaceSummary {
  id: string;
  type: string;
  typeLabel: string;
  name: string;
  cityId: string | null;
  cityName: string | null;
  coverImage: string | null;
  kidHighlights: string | null;
  momHighlights: string | null;
  rating: number;
  reviewCount: number;
  tags: string[];
  // 大人/孩子维度评分
  adultAvg: number | null;
  childAvg: number | null;
}

const TYPE_LABELS: Record<string, string> = {
  sight: "景点",
  restaurant: "餐厅",
  hotel: "酒店",
  transport: "交通",
  medical: "医疗",
  convenience: "便利店",
  park: "公园",
  mall: "商场",
  playground: "游乐场",
  science: "科技馆",
  library: "图书馆",
  museum: "博物馆",
  aquarium: "海洋馆",
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cityId = url.searchParams.get("cityId");
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q")?.trim();
  const sort = url.searchParams.get("sort") ?? "popular";

  const places: PlaceSummary[] = [];

  // 1. 景点 (Sight = Spot)
  if (!category || category === "sight") {
    const spots = await prisma.spot.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 50,
    });
    for (const s of spots) {
      const reviews = await prisma.placeReview.findMany({
        where: { placeId: s.id, placeType: "sight" },
        select: { adultRating: true, childRating: true },
      });
      const adultAvg = reviews.length
        ? reviews.reduce((sum, r) => sum + r.adultRating, 0) / reviews.length
        : null;
      const childAvg = reviews.length && reviews.some((r) => r.childRating)
        ? reviews.filter((r) => r.childRating).reduce((sum, r) => sum + (r.childRating ?? 0), 0) /
          reviews.filter((r) => r.childRating).length
        : null;
      const rating = ((s.kidScore ?? 0) + (s.momScore ?? 0)) / 2 || null;
      places.push({
        id: s.id,
        type: "sight",
        typeLabel: TYPE_LABELS.sight,
        name: s.name,
        cityId: s.cityId,
        cityName: s.city?.name ?? null,
        coverImage: s.images?.[0] ?? null,
        kidHighlights: s.kidHighlights,
        momHighlights: s.momHighlights,
        rating: rating || 0,
        reviewCount: reviews.length,
        tags: s.tags ?? [],
        adultAvg,
        childAvg,
      });
    }
  }

  // 2. 餐厅 (Restaurant)
  if (!category || category === "restaurant") {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 30,
    });
    for (const r of restaurants) {
      const reviews = await prisma.placeReview.findMany({
        where: { placeId: r.id, placeType: "restaurant" },
        select: { adultRating: true, childRating: true, hasHighChair: true },
      });
      const adultAvg = reviews.length
        ? reviews.reduce((sum, rev) => sum + rev.adultRating, 0) / reviews.length
        : null;
      const childAvg = reviews.length && reviews.some((rev) => rev.childRating)
        ? reviews.filter((rev) => rev.childRating).reduce((sum, rev) => sum + (rev.childRating ?? 0), 0) /
          reviews.filter((rev) => rev.childRating).length
        : null;
      places.push({
        id: r.id,
        type: "restaurant",
        typeLabel: TYPE_LABELS.restaurant,
        name: r.name,
        cityId: r.cityId,
        cityName: r.city?.name ?? null,
        coverImage: null,
        kidHighlights: r.hasKidsMenu ? "有儿童菜单" : r.isKidTolerant ? "孩子友好" : null,
        momHighlights: r.hasHighChair ? "有宝宝椅" : null,
        rating: 0,
        reviewCount: reviews.length,
        tags: r.tags ?? [],
        adultAvg,
        childAvg,
      });
    }
  }

  // 3. 酒店 (Hotel)
  if (!category || category === "hotel") {
    const hotels = await prisma.hotel.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 30,
    });
    for (const h of hotels) {
      const reviews = await prisma.placeReview.findMany({
        where: { placeId: h.id, placeType: "hotel" },
        select: { adultRating: true, childRating: true },
      });
      const adultAvg = reviews.length
        ? reviews.reduce((sum, rev) => sum + rev.adultRating, 0) / reviews.length
        : null;
      const childAvg = reviews.length && reviews.some((rev) => rev.childRating)
        ? reviews.filter((rev) => rev.childRating).reduce((sum, rev) => sum + (rev.childRating ?? 0), 0) /
          reviews.filter((rev) => rev.childRating).length
        : null;
      places.push({
        id: h.id,
        type: "hotel",
        typeLabel: TYPE_LABELS.hotel,
        name: h.name,
        cityId: h.cityId,
        cityName: h.city?.name ?? null,
        coverImage: null,
        kidHighlights: h.hasKidsPool ? "有儿童泳池" : null,
        momHighlights: h.hasFamilyRoom ? "家庭房" : null,
        rating: 0,
        reviewCount: reviews.length,
        tags: h.tags ?? [],
        adultAvg,
        childAvg,
      });
    }
  }

  // 4. 公园 (Park)
  if (!category || category === "park") {
    const parks = await prisma.park.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 30,
    });
    for (const p of parks) {
      places.push({
        id: p.id,
        type: "park",
        typeLabel: TYPE_LABELS.park,
        name: p.name,
        cityId: p.cityId,
        cityName: p.city?.name ?? null,
        coverImage: null,
        kidHighlights: p.hasKidsPlayArea ? "有儿童游乐区" : null,
        momHighlights: null,
        rating: 0,
        reviewCount: 0,
        tags: p.tags ?? [],
        adultAvg: null,
        childAvg: null,
      });
    }
  }

  // 5. 游乐场 (Playground)
  if (!category || category === "playground") {
    const playgrounds = await prisma.playground.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 30,
    });
    for (const p of playgrounds) {
      const ageRange = p.ageMinMonths != null && p.ageMaxMonths != null
        ? `${Math.floor(p.ageMinMonths / 12)}-${Math.floor(p.ageMaxMonths / 12)} 岁`
        : null;
      places.push({
        id: p.id,
        type: "playground",
        typeLabel: TYPE_LABELS.playground,
        name: p.name,
        cityId: p.cityId,
        cityName: p.city?.name ?? null,
        coverImage: null,
        kidHighlights: ageRange ? `适合 ${ageRange}` : null,
        momHighlights: null,
        rating: 0,
        reviewCount: 0,
        tags: p.tags ?? [],
        adultAvg: null,
        childAvg: null,
      });
    }
  }

  // 6. 商场 (Mall)
  if (!category || category === "mall") {
    const malls = await prisma.mall.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 30,
    });
    for (const m of malls) {
      places.push({
        id: m.id,
        type: "mall",
        typeLabel: TYPE_LABELS.mall,
        name: m.name,
        cityId: m.cityId,
        cityName: m.city?.name ?? null,
        coverImage: null,
        kidHighlights: m.hasKidsPlayArea ? "有儿童区" : null,
        momHighlights: null,
        rating: 0,
        reviewCount: 0,
        tags: m.tags ?? [],
        adultAvg: null,
        childAvg: null,
      });
    }
  }

  // 7. 医院 (Hospital) — 重要：医疗
  if (!category || category === "medical") {
    const hospitals = await prisma.hospital.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { city: { select: { name: true } } },
      take: 30,
    });
    for (const h of hospitals) {
      places.push({
        id: h.id,
        type: "medical",
        typeLabel: TYPE_LABELS.medical,
        name: h.name,
        cityId: h.cityId,
        cityName: h.city?.name ?? null,
        coverImage: null,
        kidHighlights: h.hasPediatrics ? "有儿科" : null,
        momHighlights: null,
        rating: 0,
        reviewCount: 0,
        tags: [],
        adultAvg: null,
        childAvg: null,
      });
    }
  }

  // 排序
  if (sort === "rating") {
    places.sort((a, b) => (b.adultAvg ?? 0) - (a.adultAvg ?? 0));
  } else if (sort === "newest") {
    // 暂无 createdAt，留空
  } else {
    // popular: 综合 reviewCount + rating
    places.sort((a, b) => (b.reviewCount * 10 + (b.adultAvg ?? 0)) - (a.reviewCount * 10 + (a.adultAvg ?? 0)));
  }

  return NextResponse.json({
    code: "OK",
    data: {
      items: places,
      total: places.length,
      categories: Object.entries(TYPE_LABELS).map(([k, v]) => ({ key: k, label: v })),
    },
  });
}
