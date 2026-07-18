// GET /api/user/travel-badges
// 详见 项目建设方案/走天下实施方案-v2.0.md 第八节 + 附录 C
// v2.0: 返回稀有度 + 兑换信息 + 分类聚合 + 隐藏勋章延迟弹

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RARITY_WEIGHT, RARITY_EXCHANGE_POINTS } from "@/lib/badge-defs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "需要登录" } },
      { status: 401 },
    );
  }

  const awarded = await prisma.travelBadge.findMany({
    where: { userId },
    orderBy: { obtainedAt: "desc" },
    include: {
      badgeDef: {
        select: {
          name: true,
          description: true,
          icon: true,
          category: true,
          rarity: true,
          tier: true,
          seasonalTag: true,
          hiddenFlag: true,
        },
      },
    },
  });

  const items = awarded
    .filter((b: any) => {
      // 隐藏勋章：未解锁前不展示
      // （已 award 出来的都视为已揭晓，所以这里都显示）
      return true;
    })
    .map((b: any) => ({
      badgeId: b.id,   // v2.0 兑换用
      name: b.badgeDef.name,
      description: b.badgeDef.description,
      icon: b.badgeDef.icon,
      category: b.badgeDef.category,
      rarity: b.badgeDef.rarity,
      tier: b.badgeDef.tier,
      seasonalTag: b.badgeDef.seasonalTag,
      hiddenFlag: b.badgeDef.hiddenFlag ?? false,
      obtainedAt: b.obtainedAt.toISOString(),
      // v2.0 兑换信息
      shareScope: b.shareScope,
      exchanged: b.exchanged,
      exchangedAt: b.exchangedAt?.toISOString() ?? null,
      exchangeablePoints: b.exchanged ? 0 : (RARITY_EXCHANGE_POINTS[b.badgeDef.rarity as keyof typeof RARITY_EXCHANGE_POINTS] ?? 0),
    }));

  // 按稀有度（钻石→金→银→铜）+ tier 排序，再按时间
  const rarityOrder: Record<string, number> = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
  items.sort((a, b) => {
    const r = (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99);
    if (r !== 0) return r;
    const t = (a.tier ?? 99) - (b.tier ?? 99);
    if (t !== 0) return t;
    return a.obtainedAt < b.obtainedAt ? 1 : -1;
  });

  // 聚合统计
  const byRarity: Record<string, number> = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  const byCategory: Record<string, number> = {};
  let totalExchangeablePoints = 0;
  for (const it of items) {
    byRarity[it.rarity] = (byRarity[it.rarity] ?? 0) + 1;
    byCategory[it.category] = (byCategory[it.category] ?? 0) + 1;
    if (!it.exchanged) totalExchangeablePoints += it.exchangeablePoints;
  }

  // 等级计算（按稀有度加权）
  const totalScore = items.reduce(
    (s, it) => s + (RARITY_WEIGHT[it.rarity as keyof typeof RARITY_WEIGHT] ?? 1),
    0,
  );

  return NextResponse.json({
    items,
    summary: {
      total: items.length,
      byRarity,
      byCategory,
      totalScore,
      totalExchangeablePoints,
    },
  });
}
