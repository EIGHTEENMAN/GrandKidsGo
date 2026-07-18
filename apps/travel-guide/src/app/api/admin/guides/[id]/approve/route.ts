// POST /api/admin/guides/:id/approve — 审核通过（→ published）

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

  const updated = await prisma.guide.update({
    where: { id: params.id },
    data: {
      status: "published",
      publishedAt: new Date(),
    },
    select: { id: true, status: true, userId: true },
  });
  await recordOperation({
    actorId: req.headers.get("x-admin-token") ? `admin` : "system",
    actorRole: "admin",
    action: "guide_approve",
    targetType: "guide",
    targetId: updated.id,
    after: { status: updated.status },
  });
  return NextResponse.json(updated);
}
