// DELETE /api/footprints/[id] — 删除足迹（手动删）
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
  const userId = auth.id;
  const { id } = ctx.params;

  const existing = await prisma.footprint.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  if (existing.userId !== userId) {
    return NextResponse.json({ code: "FORBIDDEN", message: "无权操作他人足迹" }, { status: 403 });
  }

  await prisma.footprint.delete({ where: { id } });
  return NextResponse.json({ code: "OK" });
}
