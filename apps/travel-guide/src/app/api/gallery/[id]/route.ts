// DELETE /api/gallery/[id] — 撤回照片
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.planMedia.delete({ where: { id: params.id } }).catch(() => {});
  return NextResponse.json({ code: "OK", message: "已删除" });
}