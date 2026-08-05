// GET /api/hotels — 独立酒店列表 API（PR2-C 2026-08-05 新增）
// 详见 项目建设方案/走天下待办清单-2026-07-30.md 第 142 行 PR2-C
//
// 与现有 /api/places?category=hotel 的差异：
// - 本端点字段更精炼（HotelSummary），不带 PlaceReview 聚合（写评价时聚合才需要）
// - 支持亲子设施筛选（hasFamilyRoom / hasKidsPool）和价格上限
// - kidScore 派生（0-5）便于排序与展示
//
// query params:
//   ?cityId=xxx        按城市过滤
//   ?q=xxx             按名称模糊搜索
//   ?hasFamilyRoom=true 只要家庭房
//   ?hasKidsPool=true   只要儿童泳池
//   ?maxPrice=1500     价格上限（元/晚）
//   ?sort=kidScore     kidScore | price | price_desc（默认 kidScore）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface HotelSummary {
  id: string;
  name: string;
  cityId: string;
  cityName: string | null;
  address: string | null;
  hasFamilyRoom: boolean;
  hasKidsPool: boolean;
  hasKidsBreakfast: boolean;
  avgPricePerNight: number | null;
  tags: string[];
  // 派生：家庭房 2 分 + 儿童泳池 2 分 + 儿童早餐 1 分 → 归一化到 0-5
  kidScore: number;
}

/** 派生 kidScore（0-5），家庭房 + 儿童泳池 + 儿童早餐 */
function computeKidScore(h: {
  hasFamilyRoom: boolean;
  hasKidsPool: boolean;
  hasKidsBreakfast: boolean;
}): number {
  const raw =
    (h.hasFamilyRoom ? 2 : 0) +
    (h.hasKidsPool ? 2 : 0) +
    (h.hasKidsBreakfast ? 1 : 0);
  // raw ∈ [0, 5]，无需归一化
  return raw;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cityId = url.searchParams.get("cityId");
  const q = url.searchParams.get("q")?.trim();
  const hasFamilyRoom = url.searchParams.get("hasFamilyRoom") === "true";
  const hasKidsPool = url.searchParams.get("hasKidsPool") === "true";
  const maxPriceRaw = url.searchParams.get("maxPrice");
  const sort = url.searchParams.get("sort") ?? "kidScore";

  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;

  const hotels = await prisma.hotel.findMany({
    where: {
      ...(cityId ? { cityId } : {}),
      ...(q ? { name: { contains: q } } : {}),
      ...(hasFamilyRoom ? { hasFamilyRoom: true } : {}),
      ...(hasKidsPool ? { hasKidsPool: true } : {}),
      ...(maxPrice != null && !Number.isNaN(maxPrice)
        ? { avgPricePerNight: { lte: maxPrice } }
        : {}),
    },
    include: { city: { select: { name: true } } },
    take: 100,
  });

  const items: HotelSummary[] = hotels.map((h) => ({
    id: h.id,
    name: h.name,
    cityId: h.cityId,
    cityName: h.city?.name ?? null,
    address: h.address,
    hasFamilyRoom: h.hasFamilyRoom,
    hasKidsPool: h.hasKidsPool,
    hasKidsBreakfast: h.hasKidsBreakfast,
    avgPricePerNight: h.avgPricePerNight,
    tags: h.tags ?? [],
    kidScore: computeKidScore(h),
  }));

  // 排序
  if (sort === "price") {
    items.sort((a, b) => (a.avgPricePerNight ?? Infinity) - (b.avgPricePerNight ?? Infinity));
  } else if (sort === "price_desc") {
    items.sort((a, b) => (b.avgPricePerNight ?? 0) - (a.avgPricePerNight ?? 0));
  } else {
    // 默认 kidScore：先按亲子评分，再按价格升序
    items.sort((a, b) => {
      const ks = b.kidScore - a.kidScore;
      if (ks !== 0) return ks;
      return (a.avgPricePerNight ?? Infinity) - (b.avgPricePerNight ?? Infinity);
    });
  }

  return NextResponse.json({
    code: "OK",
    data: {
      items,
      total: items.length,
      filters: { cityId, q, hasFamilyRoom, hasKidsPool, maxPrice, sort },
    },
  });
}