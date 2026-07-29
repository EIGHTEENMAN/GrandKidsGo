// POST /api/guides/[id]/unarchive — 作者恢复
// PR2：archived → published（保留原 publishedAt）

import { NextRequest, NextResponse } from "next/server";
import { loadGuideForActor } from "@/lib/guide-actor";
import prisma from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const loaded = await loadGuideForActor(req, params.id, ["archived"], "published");
  if ("response" in loaded) return loaded.response;
  const { guide, actor } = loaded;

  await prisma.guide.update({
    where: { id: guide.id },
    data: { status: "published", updatedAt: new Date() },
  });

  await recordOperation({
    actorId: actor.id,
    action: "guide_unarchive",
    targetType: "guide",
    targetId: guide.id,
    after: { status: "published" },
  });

  return NextResponse.json({
    code: "OK",
    data: { id: guide.id, status: "published" },
  });
}