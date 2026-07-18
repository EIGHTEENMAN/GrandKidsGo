// GET /api/leaderboard/[scope]?period=week|month|all
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 B
//
// scope: mom | child | city | guide
// period: week | month | all  (默认 all)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_SCOPES = ["mom", "child", "city", "guide"] as const;
const VALID_PERIODS = ["week", "month", "all"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { scope: string } },
) {
  const scope = params.scope;
  if (!VALID_SCOPES.includes(scope as any)) {
    return NextResponse.json(
      { error: { code: "INVALID_SCOPE", message: `scope 必须是 ${VALID_SCOPES.join("/")}` } },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "all") as "week" | "month" | "all";
  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json(
      { error: { code: "INVALID_PERIOD", message: `period 必须是 ${VALID_PERIODS.join("/")}` } },
      { status: 400 },
    );
  }

  // 拉取最近一次该 scope+period 的快照
  const snapshot = await prisma.travelLeaderboardSnapshot.findFirst({
    where: { scope, period },
    orderBy: { capturedAt: "desc" },
  });

  if (!snapshot) {
    return NextResponse.json({
      scope,
      period,
      items: [],
      capturedAt: null,
      message: "暂无榜单，请等待每日 02:00 跑批后查看",
    });
  }

  // 隐私：未授权的用户，过滤出榜
  const userId = req.headers.get("x-debug-user-id");
  let items = (snapshot.payloadJson as any[]) ?? [];
  if (userId && scope !== "city") {
    // 用户自己永远可看（即使配置不允许）
    const userPrivacy = await prisma.travelPrivacySetting.findUnique({
      where: { userId },
    }).catch(() => null);
    if (userPrivacy && !userPrivacy.allowLeaderboardPublic) {
      // 仅保留自己 + 脱敏其他用户
      items = items.map((it: any) => {
        if (it.userId === userId) return it;
        return { ...it, nickname: "某位妈妈", avatar: null, userId: "hidden" };
      });
    }
  }

  return NextResponse.json({
    scope,
    period,
    items,
    capturedAt: snapshot.capturedAt.toISOString(),
    weekKey: snapshot.weekKey,
    total: items.length,
  });
}
