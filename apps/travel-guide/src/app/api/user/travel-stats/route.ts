// GET /api/user/travel-stats — 主站个人中心"走天下记录"模块的数据来源
// v1.5: summary + plans
// v2.0: + 稀有度分布 + 等级分 + 排行榜个人名次 + 最近 3 条动态

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RARITY_WEIGHT } from "@/lib/badge-defs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "需要登录" } },
      { status: 401 },
    );
  }

  const [plans, guides, badges, recentActivities, momSnapshot] = await Promise.all([
    prisma.planRecord.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        cityId: true,
        city: { select: { name: true } },
        childAges: true,
      },
    }),
    prisma.guide.count({ where: { userId, status: "published" } }),
    prisma.travelBadge.findMany({
      where: { userId },
      include: { badgeDef: { select: { rarity: true, name: true, icon: true } } },
    }),
    prisma.travelActivity.findMany({
      where: { userId, isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    // 本周人气榜快照，拿到个人排名
    prisma.travelLeaderboardSnapshot.findFirst({
      where: { scope: "mom", period: "week" },
      orderBy: { capturedAt: "desc" },
    }),
  ]);

  const completedPlans = plans.filter((p: any) =>
    ["completed", "published"].includes(p.status),
  );

  // 勋章聚合
  const byRarity: Record<string, number> = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  let totalScore = 0;
  const recentBadges: Array<{ name: string; icon: string; rarity: string; obtainedAt: string }> = [];
  for (const b of badges) {
    const r = b.badgeDef.rarity;
    byRarity[r] = (byRarity[r] ?? 0) + 1;
    totalScore += RARITY_WEIGHT[r as keyof typeof RARITY_WEIGHT] ?? 1;
    recentBadges.push({
      name: b.badgeDef.name,
      icon: b.badgeDef.icon ?? "🏅",
      rarity: r,
      obtainedAt: b.obtainedAt.toISOString(),
    });
  }
  recentBadges.sort((a, b) => (a.obtainedAt < b.obtainedAt ? 1 : -1));

  // 个人本周排名
  let myRank: number | null = null;
  if (momSnapshot) {
    const items = (momSnapshot.payloadJson as any[]) ?? [];
    const me = items.find((it) => it.userId === userId);
    if (me) myRank = me.rank;
  }

  return NextResponse.json({
    summary: {
      cities: new Set(completedPlans.map((p: any) => p.cityId).filter(Boolean)).size,
      plans: plans.length,
      publishedGuides: guides,
      badges: badges.length,
      // v2.0 新增
      byRarity,
      totalScore,
      myRank,
    },
    plans: plans.map((p: any) => ({
      id: p.id,
      title: `${p.city?.name ?? "未选"} · ${p.startDate.toISOString().slice(0, 10)}`,
      status: p.status,
      childAges: p.childAges,
    })),
    recentBadges: recentBadges.slice(0, 5),  // 最近 5 枚勋章
    recentActivities: recentActivities.map((a: any) => ({
      id: a.id,
      type: a.type,
      text: (a.contentJson as any)?.text ?? "",
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
