// POST /api/badges/[badgeId]/exchange — 兑换勋章为积分
// GET  /api/badges/available-exchanges — 列出可兑换的勋章
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 D

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RARITY_EXCHANGE_POINTS } from "@/lib/badge-defs";
import { addPoints } from "@/lib/service-client";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set(["badge_exchange", "weekly_bonus", "monthly_bonus", "annual_bonus"]);

export async function POST(
  req: NextRequest,
  { params }: { params: { badgeId: string } },
) {
  const me = req.headers.get("x-debug-user-id");
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }

  // params.badgeId 是 travel_badge.id（用户实际持有的那枚）
  const myBadge = await prisma.travelBadge.findUnique({
    where: { id: params.badgeId },
    include: { badgeDef: { select: { rarity: true, name: true } } },
  });
  if (!myBadge) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "勋章不存在" } }, { status: 404 });
  }
  if (myBadge.userId !== me) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "不是你的勋章" } }, { status: 403 });
  }
  if (myBadge.exchanged) {
    return NextResponse.json({ error: { code: "ALREADY_EXCHANGED", message: "已兑换过" } }, { status: 400 });
  }

  const rarity = myBadge.badgeDef.rarity as keyof typeof RARITY_EXCHANGE_POINTS;
  const points = RARITY_EXCHANGE_POINTS[rarity] ?? 0;
  if (points <= 0) {
    return NextResponse.json({ error: { code: "INVALID_RARITY", message: "稀有度无法兑换" } }, { status: 400 });
  }

  // 1) 写 exchange 记录
  const exchange = await prisma.travelBadgeExchange.create({
    data: {
      userId: me,
      badgeDefName: myBadge.badgeDef.name,
      pointsAwarded: points,
      status: "pending",
      source: "badge_exchange",
    },
  });

  // 2) 调 auth-service 加积分
  const result = await addPoints({
    userId: me,
    points,
    source: "badge_exchange",
    refId: myBadge.id,
    description: `兑换勋章「${myBadge.badgeDef.name}」`,
  });

  if (!result.ok) {
    await prisma.travelBadgeExchange.update({
      where: { id: exchange.id },
      data: { status: "reverted" },
    });
    return NextResponse.json(
      { error: { code: "POINTS_FAILED", message: result.message ?? "积分发放失败" } },
      { status: 502 },
    );
  }

  // 3) 更新勋章的 exchanged 标记
  await prisma.travelBadge.update({
    where: { id: myBadge.id },
    data: { exchanged: true, exchangedAt: new Date() },
  });

  await prisma.travelBadgeExchange.update({
    where: { id: exchange.id },
    data: { status: "completed" },
  });

  return NextResponse.json({
    ok: true,
    exchangeId: exchange.id,
    badgeName: myBadge.badgeDef.name,
    pointsAwarded: points,
    pointsBalance: result.balance,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { badgeId: string } },
) {
  // GET 列出可兑换的（用 me 自己的未兑换勋章）
  const me = _req.headers.get("x-debug-user-id");
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  const badges = await prisma.travelBadge.findMany({
    where: { userId: me, exchanged: false },
    include: { badgeDef: { select: { name: true, icon: true, rarity: true, category: true } } },
  });
  const items = badges.map((b: any) => {
    const rarity = b.badgeDef.rarity as keyof typeof RARITY_EXCHANGE_POINTS;
    return {
      id: b.id,
      name: b.badgeDef.name,
      icon: b.badgeDef.icon,
      category: b.badgeDef.category,
      rarity: b.badgeDef.rarity,
      points: RARITY_EXCHANGE_POINTS[rarity] ?? 0,
      obtainedAt: b.obtainedAt.toISOString(),
    };
  });
  const total = items.reduce((s, it) => s + it.points, 0);
  return NextResponse.json({ items, total });
}
