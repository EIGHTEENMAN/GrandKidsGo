// GET /api/feed/activities?scope=follow|all&cursor=&limit=
// 详见 v2.0 第九节 C 第二节
//
// scope=follow  → 当前用户关注的人的最新动态
// scope=all     → 全部公开动态
// cursor 游标分页

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { batchFetchUsers, fallbackUser } from "@/lib/user-service";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const me = req.headers.get("x-debug-user-id");
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)));

  // 决定查哪些 userId 的动态
  let userIds: string[] | null = null;
  if (scope === "follow") {
    const rels = await prisma.travelFollowRelation.findMany({
      where: { followerId: me },
      select: { followeeId: true },
    });
    userIds = rels.map((r) => r.followeeId);
    if (userIds.length === 0) {
      // 没关注任何人，返回空
      return NextResponse.json({ items: [], nextCursor: null });
    }
  }

  const activities = await prisma.travelActivity.findMany({
    where: {
      isPublic: true,
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = activities.length > limit;
  const data = activities.slice(0, limit);
  const userMap = batchFetchUsers(data.map((a) => a.userId));

  const items = data.map((a) => {
    const author = userMap.get(a.userId) ?? fallbackUser(a.userId);
    return {
      id: a.id,
      type: a.type,
      userId: a.userId,
      author: {
        id: author.id,
        nickname: author.nickname,
        avatar: author.avatar,
      },
      targetId: a.targetId,
      content: a.contentJson,
      createdAt: a.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    scope,
    items,
    nextCursor: hasMore ? data[limit - 1]?.id ?? null : null,
  });
}
