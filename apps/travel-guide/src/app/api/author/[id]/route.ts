// GET /api/author/[id] — 作者主页
// 返回昵称/头像/攻略数/攻略列表
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guides = await prisma.guide.findMany({
    where: { userId: params.id, status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      id: true, title: true, coverImages: true, viewCount: true, likeCount: true,
      days: true, travelStyle: true, createdAt: true,
      city: { select: { name: true } },
    },
  });

  const totalStats = guides.reduce((acc, g) => ({
    guideCount: acc.guideCount + 1,
    totalViews: acc.totalViews + g.viewCount,
    totalLikes: acc.totalLikes + g.likeCount,
  }), { guideCount: 0, totalViews: 0, totalLikes: 0 });

  return NextResponse.json({
    code: "OK",
    data: {
      author: {
        id: params.id,
        nickname: "童慧行用户",
        ...totalStats,
      },
      guides: guides.map(g => ({
        id: g.id,
        title: g.title,
        coverImage: g.coverImages?.[0] ?? null,
        viewCount: g.viewCount,
        likeCount: g.likeCount,
        days: g.days,
        travelStyle: g.travelStyle,
        cityName: g.city?.name ?? null,
        publishedAt: g.createdAt?.toISOString() ?? null,
      })),
    },
  });
}