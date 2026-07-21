// GET /api/guides/by-tag?tag=玩水&cityId=xxx
// 按标签筛选攻略（v3.6）
//
// 标签横切属性：用户选标签（如"玩水"），看到所有带此标签的攻略

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

  const guides = await prisma.guide.findMany({
    where: {
      status: "published",
      tags: { has: tag },
      ...(cityId ? { cityId } : {}),
    },
    include: { city: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    tag,
    code: "OK",
    data: {
      items: guides.map((g: any) => ({
        id: g.id,
        title: g.title,
        cityId: g.cityId,
        cityName: g.city?.name ?? null,
        days: g.days,
        childAges: g.childAges,
        tags: g.tags,
        coverImage: g.coverImages?.[0] ?? null,
        stats: { view: g.viewCount, save: g.saveCount, like: g.likeCount },
        publishedAt: g.publishedAt?.toISOString() ?? null,
      })),
      total: guides.length,
    },
  });
}
