// POST/DELETE /api/follow/[userId] — 关注 / 取关
// GET /api/follow/followers /following — 列表
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 C 第四节

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getMyUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get("x-debug-user-id");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const me = await getMyUserId(_req);
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  if (me === params.userId) {
    return NextResponse.json({ error: { code: "SELF_FOLLOW", message: "不能关注自己" } }, { status: 400 });
  }

  // upsert（v2.0 关系表）
  const rel = await prisma.travelFollowRelation.upsert({
    where: { followerId_followeeId: { followerId: me, followeeId: params.userId } },
    update: { muted: false },
    create: { followerId: me, followeeId: params.userId },
  });

  return NextResponse.json({ ok: true, id: rel.id, createdAt: rel.createdAt.toISOString() });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const me = await getMyUserId(_req);
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  try {
    await prisma.travelFollowRelation.delete({
      where: { followerId_followeeId: { followerId: me, followeeId: params.userId } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, message: "未关注" });
  }
}

export async function GET(
  req: NextRequest,
  { params: _ }: { params: { userId: string } },
) {
  const me = await getMyUserId(req);
  if (!me) {
    return NextResponse.json({ error: { code: "USER_REQUIRED", message: "需要登录" } }, { status: 401 });
  }
  // GET /api/follow/:userId → 我是否关注了 ta
  const rel = await prisma.travelFollowRelation.findUnique({
    where: { followerId_followeeId: { followerId: me, followeeId: _.userId } },
  });
  return NextResponse.json({ isFollowed: !!rel, muted: rel?.muted ?? false });
}
