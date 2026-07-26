// GET /api/author/[id] — 作者主页
// 返回昵称/头像/攻略数/攻略列表
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchUser, fallbackUser } from "@/lib/user-service";

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

  // 跨服务拉取真实昵称/头像（DB 不可用时降级为占位）
  const authorUser = fetchUser(params.id) ?? fallbackUser(params.id);

  return NextResponse.json({
    code: "OK",
    data: {
      author: {
        id: params.id,
        nickname: authorUser.nickname,
        avatar: authorUser.avatar,
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