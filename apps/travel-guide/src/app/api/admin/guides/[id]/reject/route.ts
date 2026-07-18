// POST /api/admin/guides/:id/reject — 审核拒绝（→ rejected + 原因）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { reason?: string } | null;
  if (!body?.reason) {
    return NextResponse.json(
      { error: { code: "REASON_REQUIRED", message: "需 reason" } },
      { status: 400 },
    );
  }

  const updated = await prisma.guide.update({
    where: { id: params.id },
    data: { status: "rejected" },
    select: { id: true, status: true, userId: true },
  });
  await recordOperation({
    actorId: "admin",
    actorRole: "admin",
    action: "guide_reject",
    targetType: "guide",
    targetId: updated.id,
    after: { status: "rejected", reason: body.reason },
  });
  return NextResponse.json({ ...updated, reason: body.reason });
}
