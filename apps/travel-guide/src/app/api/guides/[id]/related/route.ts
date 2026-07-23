// GET /api/guides/[id]/related — 相关攻略（同作者 3 + 同城市 3）
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guide = await prisma.guide.findUnique({
    where: { id: params.id },
    select: { userId: true, cityId: true },
  });
  if (!guide) {
    return NextResponse.json({ code: "NOT_FOUND", data: { sameAuthor: [], sameCity: [] } });
  }

  const [sameAuthor, sameCity] = await Promise.all([
    prisma.guide.findMany({
      where: { userId: guide.userId, status: "published", id: { not: params.id } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, title: true, coverImages: true, viewCount: true, likeCount: true, createdAt: true },
    }),
    guide.cityId
      ? prisma.guide.findMany({
          where: { cityId: guide.cityId, status: "published", id: { not: params.id } },
          orderBy: { viewCount: "desc" },
          take: 3,
          select: { id: true, title: true, coverImages: true, viewCount: true, likeCount: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    code: "OK",
    data: {
      sameAuthor: sameAuthor.map(g => ({ ...g, coverImage: g.coverImages[0] ?? null })),
      sameCity: sameCity.map(g => ({ ...g, coverImage: g.coverImages[0] ?? null })),
    },
  });
}