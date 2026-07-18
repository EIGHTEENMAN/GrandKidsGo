// GET /api/badges/available-exchanges — 当前用户可兑换勋章列表
// 复用 [badgeId]/exchange 的 GET 逻辑

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RARITY_EXCHANGE_POINTS } from "@/lib/badge-defs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = req.headers.get("x-debug-user-id");
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  const badges = await prisma.travelBadge.findMany({
    where: { userId: me, exchanged: false },
    include: { badgeDef: { select: { name: true, icon: true, rarity: true, category: true } } },
    orderBy: { obtainedAt: "desc" },
  });
  const items = badges.map((b: any) => {
    const rarity = b.badgeDef.rarity as keyof typeof RARITY_EXCHANGE_POINTS;
    return {
      badgeId: b.id,
      name: b.badgeDef.name,
      icon: b.badgeDef.icon,
      category: b.badgeDef.category,
      rarity: b.badgeDef.rarity,
      points: RARITY_EXCHANGE_POINTS[rarity] ?? 0,
      obtainedAt: b.obtainedAt.toISOString(),
    };
  });
  const total = items.reduce((s, it) => s + it.points, 0);
  return NextResponse.json({ items, total, count: items.length });
}
