// POST /api/guides/:id/save — 收藏 / 取消收藏
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 C

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "LOGIN_REQUIRED", message: "需要登录" } },
      { status: 401 },
    );
  }
  const userId = auth.id;
  const existing = await prisma.guideSave.findUnique({
    where: { userId_guideId: { userId, guideId: params.id } },
  });
  if (existing) {
    await prisma.guideSave.delete({
      where: { userId_guideId: { userId, guideId: params.id } },
    });
    await prisma.guide.update({
      where: { id: params.id },
      data: { saveCount: { decrement: 1 } },
    });
    return NextResponse.json({ isSaved: false });
  }
  await prisma.guideSave.create({
    data: { userId, guideId: params.id },
  });
  await prisma.guide.update({
    where: { id: params.id },
    data: { saveCount: { increment: 1 } },
  });
  return NextResponse.json({ isSaved: true });
}
