// GET /api/leaderboard/my-rank?scope=mom|child
// 详见 v2.0 第九节 B 第五节（隐私：用户可查看自己排名）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "需要登录" } },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "mom";
  const period = url.searchParams.get("period") ?? "all";

  const snapshot = await prisma.travelLeaderboardSnapshot.findFirst({
    where: { scope, period },
    orderBy: { capturedAt: "desc" },
  });
  if (!snapshot) {
    return NextResponse.json({ rank: null, score: null, message: "暂无榜单" });
  }

  const items = (snapshot.payloadJson as any[]) ?? [];
  const found = items.find((it: any) => it.userId === userId);
  if (!found) {
    return NextResponse.json({ rank: null, score: null, message: "未上榜" });
  }

  return NextResponse.json({
    rank: found.rank,
    score: found.score,
    total: items.length,
    outOf: items.length,
  });
}
