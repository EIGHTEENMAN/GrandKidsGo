// GET /api/follow/followers?userId=... — ta 的粉丝
// GET /api/follow/following?userId=... — ta 关注的人
// 详见 v2.0 第九节 C

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { batchFetchUsers, fallbackUser } from "@/lib/user-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = req.headers.get("x-debug-user-id");
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  const url = new URL(req.url);
  const path = url.pathname;
  const targetUserId = url.searchParams.get("userId") ?? me;

  const isFollowers = path.endsWith("/followers");
  const rels = await prisma.travelFollowRelation.findMany({
    where: isFollowers
      ? { followeeId: targetUserId }
      : { followerId: targetUserId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const userIds = rels.map((r) => (isFollowers ? r.followerId : r.followeeId));
  const map = batchFetchUsers(userIds);
  const items = userIds.map((id) => map.get(id) ?? fallbackUser(id));

  // 标记我是否关注了列表里的人
  const myRels = await prisma.travelFollowRelation.findMany({
    where: { followerId: me, followeeId: { in: userIds } },
    select: { followeeId: true },
  });
  const myFollowingSet = new Set(myRels.map((r) => r.followeeId));
  const enriched = items.map((u) => ({ ...u, isFollowed: myFollowingSet.has(u.id) }));

  return NextResponse.json({ items: enriched, total: enriched.length });
}
