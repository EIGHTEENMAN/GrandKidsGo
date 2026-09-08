// GET /api/footprints/stats — 足迹统计（按城市分组 + 状态 + 孩子）
// 用于勋章 criteria 改造后的回算 + 个人中心 dashboard
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  const userId = auth.id;

  const url = new URL(req.url);
  const childId = url.searchParams.get("childId");

  const where: Record<string, unknown> = { userId, state: "visited" };
  if (childId) where.childId = childId;

  // 按 cityId group
  const footprints = await prisma.footprint.findMany({
    where,
    select: { cityId: true, spotId: true, state: true, createdAt: true },
  });

  // 手动 group
  const cityMap = new Map<string, { cityId: string; visitedCount: number; wishlistCount: number }>();
  for (const fp of footprints) {
    const cid = fp.cityId ?? "_orphan";
    if (!cityMap.has(cid)) cityMap.set(cid, { cityId: cid, visitedCount: 0, wishlistCount: 0 });
    const entry = cityMap.get(cid)!;
    if (fp.state === "visited") entry.visitedCount += 1;
  }

  // wishlist（与 visited 互斥，state 不同 + 同样有 cityId）
  const wishlist = await prisma.footprint.findMany({
    where: { userId, state: "wishlist", ...(childId ? { childId } : {}) },
    select: { cityId: true },
  });
  for (const w of wishlist) {
    const cid = w.cityId ?? "_orphan";
    if (!cityMap.has(cid)) cityMap.set(cid, { cityId: cid, visitedCount: 0, wishlistCount: 0 });
    cityMap.get(cid)!.wishlistCount += 1;
  }

  const citiesVisited = [...cityMap.values()]
    .filter((c) => c.visitedCount > 0)
    .map((c) => c.cityId);

  return NextResponse.json({
    code: "OK",
    data: {
      totalVisited: footprints.length,
      totalWishlist: wishlist.length,
      citiesVisited, // 用于勋章 criteria：例如 首都足迹 检查这个数组是否包含全部 4 个一线城市
      citiesBreakdown: [...cityMap.values()],
    },
  });
}
