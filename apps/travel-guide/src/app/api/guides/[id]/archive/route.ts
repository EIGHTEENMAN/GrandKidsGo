// POST /api/guides/[id]/archive — 作者归档
// PR2：published / draft / rejected / pending_review → archived
// archived 不在公开 feed（Guide 详情查询按 PUBLIC_VISIBLE_STATUSES 过滤）

import { NextRequest, NextResponse } from "next/server";
import { loadGuideForActor } from "@/lib/guide-actor";
import prisma from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

const ALLOWED = ["draft", "pending_review", "published", "rejected"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const loaded = await loadGuideForActor(req, params.id, [...ALLOWED], "archived");
  if ("response" in loaded) return loaded.response;
  const { guide, actor } = loaded;

  await prisma.guide.update({
    where: { id: guide.id },
    data: { status: "archived", updatedAt: new Date() },
  });

  await recordOperation({
    actorId: actor.id,
    action: "guide_archive",
    targetType: "guide",
    targetId: guide.id,
    after: { status: "archived" },
  });

  return NextResponse.json({
    code: "OK",
    data: { id: guide.id, status: "archived" },
  });
}