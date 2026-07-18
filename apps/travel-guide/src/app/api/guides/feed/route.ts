// GET /api/guides/feed — 攻略推荐流
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十三节
// v2.0 增强：加入勋章/排行榜权重
// v2.0 权重：时间新 0.2 + 勋章权重 0.2 + 社交热度 0.3 + 多样性 0.3

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

  // 查所有已发布攻略（带统计用于排序）
  const allItems = await prisma.guide.findMany({
    where: { status: "published", ...(cityId ? { cityId } : {}) },
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
      userId: true,
      city: { select: { name: true } },
      sourcePlanRecordId: true,
    },
  });

  // 批量拉取作者信息
  const userIds = Array.from(new Set(allItems.map((g) => g.userId)));
  const authorMap = batchFetchUsers(userIds);

  // 批量拉取作者勋章数
  const badgeCounts = await prisma.travelBadge.groupBy({
    by: ["userId"],
    _count: { id: true },
    where: { userId: { in: userIds } },
  });
  const badgeCountMap = new Map(badgeCounts.map((b) => [b.userId, b._count.id]));

  // 批量拉取作者孩子感受分均值（转化为数值评分）
  const childRatings = await prisma.childRating.findMany({
    where: { planRecord: { userId: { in: userIds } } },
    select: { planRecord: { select: { userId: true } }, willingnessToReturn: true },
  });
  const WILLINGNESS_SCORE: Record<string, number> = {
    definitely: 5, 要求再来: 5,
    likely: 4, 可能再来: 4,
    unsure: 3, 一般: 3,
    unlikely: 2, 不太可能: 2,
    never: 1, 不会再来: 1,
  };
  const userScores: Record<string, number[]> = {};
  for (const r of childRatings) {
    const uid = r.planRecord.userId;
    if (!userScores[uid]) userScores[uid] = [];
    userScores[uid].push(WILLINGNESS_SCORE[r.willingnessToReturn ?? ""] ?? 0);
  }
  const feelingAvgMap = new Map<string, number>();
  for (const [uid, scores] of Object.entries(userScores)) {
    feelingAvgMap.set(uid, scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
  }

  // 计算排序分数（v2.0 权重）
  const now = Date.now();
  const scored: Array<{ g: typeof allItems[0]; score: number }> = allItems.map((g) => {
    const publishedMs = g.publishedAt?.getTime() ?? now;
    const daysOld = Math.max(0, (now - publishedMs) / 86400000);
    const timeScore = Math.max(0, 1 - daysOld / 90); // 90 天内线性衰减

    const socialScore = (g.saveCount * 2 + g.likeCount * 3 + g.viewCount * 0.5) / 100;

    const badgeCount = badgeCountMap.get(g.userId) ?? 0;
    const badgeScore = Math.min(1, badgeCount / 10);

    const feelingAvg = feelingAvgMap.get(g.userId) ?? 0;
    const feelingScore = Math.min(1, feelingAvg / 5);

    // 总评分
    const score = (
      0.2 * timeScore
      + 0.2 * feelingScore
      + 0.2 * badgeScore
      + 0.3 * Math.min(1, socialScore)
      + 0.1 * Math.random() // 多样性因子
    );

    return { g, score };
  });

  // 按得分排序
  scored.sort((a, b) => b.score - a.score);

  // 游标分页
  let startIdx = 0;
  if (cursor) {
    const cursorIdx = scored.findIndex((s) => s.g.id === cursor);
    if (cursorIdx >= 0) startIdx = cursorIdx + 1;
  }
  const page = scored.slice(startIdx, startIdx + pageSize);
  const hasMore = startIdx + pageSize < scored.length;

  const data = page.map((s) => {
    const g = s.g;
    const author = authorMap.get(g.userId) ?? fallbackUser(g.userId);
    return {
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
      score: Math.round(s.score * 100) / 100,
      author: {
        id: author.id,
        nickname: author.nickname,
        avatar: author.avatar,
      },
    };
  });

  return NextResponse.json({
    items: data,
    nextCursor: hasMore ? page[page.length - 1]!.g.id : null,
    trace: { ts: Date.now(), via: 'feed' },
  });
}
