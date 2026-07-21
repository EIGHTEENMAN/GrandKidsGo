// GET /api/leaderboard/badge-hot?period=week|month|all
// 详见 项目建设方案/走天下实施方案-v3.4.md 排行榜联动方案
//
// 热门勋章榜（基于 TravelBadge 本期获得数量）
// 数据来源：用户在四个触发时机（plan_saved / guide_published / social_milestone）解锁的勋章
// 排序：本期获得数量降序
//
// 这是激励维度的榜单 — 让用户看到"大家都拿到什么勋章"，引导行为

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function periodStart(period: string): Date {
  const now = new Date();
  if (period === "week") {
    return new Date(now.getTime() - 7 * 86400000);
  } else if (period === "month") {
    return new Date(now.getTime() - 30 * 86400000);
  }
  return new Date(0);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "all";
  const cutoff = periodStart(period);

  // 按 badgeDefId 分组统计获得数量
  const grouped = await prisma.travelBadge.groupBy({
    by: ["badgeDefId"],
    where: { obtainedAt: { gte: cutoff } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });

  if (grouped.length === 0) {
    return NextResponse.json({
      scope: "badge-hot",
      period,
      items: [],
      capturedAt: new Date().toISOString(),
    });
  }

  // 拉勋章定义
  const defIds = grouped.map((g) => g.badgeDefId);
  const defs = await prisma.travelBadgeDef.findMany({
    where: { id: { in: defIds } },
    select: { id: true, name: true, icon: true, rarity: true, category: true, description: true, hiddenFlag: true },
  });
  const defMap = new Map(defs.map((d) => [d.id, d]));

  const items = grouped
    .map((g, i) => {
      const def = defMap.get(g.badgeDefId);
      // 隐藏勋章不显示在公开榜
      if (def?.hiddenFlag) return null;
      return {
        rank: i + 1,
        badgeDefId: g.badgeDefId,
        name: def?.name ?? "未知勋章",
        icon: def?.icon ?? "🏅",
        rarity: def?.rarity ?? "bronze",
        category: def?.category ?? "",
        description: def?.description ?? "",
        unlockCount: g._count.id,
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  return NextResponse.json({
    scope: "badge-hot",
    period,
    items,
    capturedAt: new Date().toISOString(),
  });
}
