// GET /api/guides/feed
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十三节
// v1.5 推荐排序：相关性 0.3 + 时间新 0.2 + 感受画像相似度 0.3 + 出片率 0.1 + 社交热度 0.1
// 简化：v1 上线先按发布时间 + 热度（save+like+view）排序

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { batchFetchUsers, fallbackUser } from "@/lib/user-service";

const prisma = new PrismaClient();

const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE));
  const cityId = url.searchParams.get("cityId") ?? undefined;

  const items = await prisma.guide.findMany({
    where: { status: "published", ...(cityId ? { cityId } : {}) },
    orderBy: [
      { publishedAt: "desc" },
      { likeCount: "desc" },
    ],
    take: pageSize + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      title: true,
      coverImages: true,
      cityId: true,
      days: true,
      childAges: true,
      travelStyle: true,
      tags: true,
      viewCount: true,
      saveCount: true,
      likeCount: true,
      publishedAt: true,
      city: { select: { name: true } },
      // v1.5：作者信息跨 auth-service，feed 这里只返 userId（前端展示用占位昵称）
      userId: true,
    },
  });

  const hasMore = items.length > pageSize;
  const data = items.slice(0, pageSize).map((g: any) => ({
    id: g.id,
    title: g.title,
    coverImage: g.coverImages[0] ?? null,
    cityName: g.city?.name ?? null,
    days: g.days,
    childAges: g.childAges,
    travelStyle: g.travelStyle,
    tags: g.tags,
    stats: {
      view: g.viewCount,
      save: g.saveCount,
      like: g.likeCount,
    },
    publishedAt: g.publishedAt?.toISOString() ?? null,
    author: fallbackUser(g.userId), // 下面批量替换成真实数据
  }));

  // 批量拉取所有攻略的作者真实信息（一次 SQL → 全部查出）
  const authorMap = batchFetchUsers(data.map((d: any) => d.author.id));
  for (const d of data) {
    const real = authorMap.get(d.author.id);
    if (real) d.author = real;
  }

  return NextResponse.json({
    items: data,
    nextCursor: hasMore ? items[pageSize - 1]!.id : null,
    trace: { ts: Date.now(), via: 'feed' },
  });
}
