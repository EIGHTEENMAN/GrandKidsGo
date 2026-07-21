// GET /api/places/by-tag?tag=玩水&cityId=xxx
// 按标签筛选地点（v3.6）
// 详见 项目建设方案/走天下实施方案-v3.6.md 标签系统
//
// 标签 = 横切属性，可以贴在任何类型的地点上
// 返回带该标签的所有景点（未来扩展到餐厅/酒店）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");
  const cityId = url.searchParams.get("cityId");
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  if (!tag) {
    return NextResponse.json(
      { error: { code: "TAG_REQUIRED", message: "需要 tag 参数" } },
      { status: 400 },
    );
  }

  const spots = await prisma.spot.findMany({
    where: {
      ...(cityId ? { cityId } : {}),
      tags: { has: tag },
    },
    include: { city: { select: { name: true, id: true } } },
    take: limit,
  });

  // 拉双维度评分
  const placeIds = spots.map((s) => s.id);
  const reviews = await prisma.placeReview.findMany({
    where: { placeId: { in: placeIds }, placeType: "sight", status: "published" },
    select: { placeId: true, adultRating: true, childRating: true },
  });
  const statsByPlace = new Map<string, { adultSum: number; childSum: number; childCnt: number; cnt: number }>();
  for (const r of reviews) {
    const s = statsByPlace.get(r.placeId) ?? { adultSum: 0, childSum: 0, childCnt: 0, cnt: 0 };
    s.adultSum += r.adultRating;
    s.cnt++;
    if (r.childRating != null) {
      s.childSum += r.childRating;
      s.childCnt++;
    }
    statsByPlace.set(r.placeId, s);
  }

  const items = spots.map((s: any) => {
    const stat = statsByPlace.get(s.id);
    return {
      id: s.id,
      type: "sight",
      name: s.name,
      cityId: s.cityId,
      cityName: s.city?.name ?? null,
      coverImage: s.images?.[0] ?? null,
      tags: s.tags ?? [],
      experienceTags: s.experienceTags ?? [],
      kidHighlights: s.kidHighlights,
      momHighlights: s.momHighlights,
      durationMinutes: s.durationMinutes,
      kidScore: s.kidScore,
      momScore: s.momScore,
      reviewCount: stat?.cnt ?? 0,
      adultAvg: stat && stat.cnt > 0 ? Math.round((stat.adultSum / stat.cnt) * 10) / 10 : null,
      childAvg: stat && stat.childCnt > 0 ? Math.round((stat.childSum / stat.childCnt) * 10) / 10 : null,
    };
  });

  return NextResponse.json({
    tag,
    code: "OK",
    data: { items, total: items.length },
  });
}
