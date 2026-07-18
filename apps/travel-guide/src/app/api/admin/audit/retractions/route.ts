// GET /api/admin/audit/retractions — 列出所有撤回链路状态
// 详见 v1.4 第十五节 B 第六点（撤回的级联清除留痕）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  const items = await prisma.retractionLog.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      initiatedBy: r.initiatedBy,
      initiatedByUserId: r.initiatedByUserId,
      guideId: r.guideId,
      planId: r.planId,
      mediaIds: r.mediaIds,
      status: r.status,
      cascadeActions: r.cascadeActions,
      publicNote: r.publicNote,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    })),
  });
}
