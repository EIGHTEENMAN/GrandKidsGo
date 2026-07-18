// POST /api/guides/:id/like — 点赞 / 取消点赞

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get("x-debug-user-id") ?? `anon-${req.headers.get("x-forwarded-for") ?? "local"}`;
  if (userId.startsWith("anon-")) {
    return NextResponse.json(
      { error: { code: "LOGIN_REQUIRED", message: "需要登录" } },
      { status: 401 },
    );
  }
  const existing = await prisma.guideLike.findUnique({
    where: { userId_guideId: { userId, guideId: params.id } },
  });
  if (existing) {
    await prisma.guideLike.delete({
      where: { userId_guideId: { userId, guideId: params.id } },
    });
    await prisma.guide.update({
      where: { id: params.id },
      data: { likeCount: { decrement: 1 } },
    });
    return NextResponse.json({ isLiked: false });
  }
  await prisma.guideLike.create({
    data: { userId, guideId: params.id },
  });
  await prisma.guide.update({
    where: { id: params.id },
      data: { likeCount: { increment: 1 } },
  });
  return NextResponse.json({ isLiked: true });
}
