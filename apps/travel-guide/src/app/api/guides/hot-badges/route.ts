// GET /api/guides/hot-badges — 今日热门勋章（本周获得最多的 3 枚）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第十三节 v2.0 增量
//
// 返回本周获得最多的勋章列表，用于 feed 顶端展示

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // 计算本周开始时间
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // 统计本周获得最多的勋章 defId
  const topBadges = await prisma.travelBadge.groupBy({
    by: ["badgeDefId"],
    where: { obtainedAt: { gte: weekStart } },
    _count: { badgeDefId: true },
    orderBy: { _count: { badgeDefId: "desc" } },
    take: 3,
  });

  if (topBadges.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // 拉取勋章定义
  const defIds = topBadges.map((b) => b.badgeDefId);
  const defs = await prisma.travelBadgeDef.findMany({
    where: { id: { in: defIds } },
    select: { id: true, name: true, icon: true, rarity: true, category: true, description: true },
  });
  const defMap = new Map(defs.map((d) => [d.id, d]));

  const items = topBadges.map((b, i) => {
    const def = defMap.get(b.badgeDefId);
    return {
      rank: i + 1,
      badgeDefId: b.badgeDefId,
      name: def?.name ?? "未知",
      icon: def?.icon ?? "🏅",
      rarity: def?.rarity ?? "bronze",
      category: def?.category ?? "",
      description: def?.description ?? "",
      unlockCount: b._count.badgeDefId,
    };
  });

  return NextResponse.json({ items, weekStart: weekStart.toISOString() });
}
