// POST /api/guides/[id]/publish — 作者直发
// PR2 + D1 子权限：作者本人可跳过 DFA 直接 published
// 当前 status：draft / pending_review / rejected → published（不再跑 DFA）

import { NextRequest, NextResponse } from "next/server";
import { loadGuideForActor } from "@/lib/guide-actor";
import prisma from "@/lib/prisma";
import { track, TRACK } from "@/lib/analytics";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const loaded = await loadGuideForActor(req, params.id, ["draft", "pending_review", "rejected"], "published");
  if ("response" in loaded) return loaded.response;
  const { guide, actor } = loaded;

  await prisma.guide.update({
    where: { id: guide.id },
    data: {
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  track({
    eventName: TRACK.GUIDE_PUBLISH_SUBMITTED,
    userId: actor.id,
    properties: { guideId: guide.id, source: "publish_direct" },
  });
  await recordOperation({
    actorId: actor.id,
    action: "guide_publish",
    targetType: "guide",
    targetId: guide.id,
    after: { status: "published", source: "publish_direct" },
  });

  return NextResponse.json({
    code: "OK",
    data: { id: guide.id, status: "published" },
  });
}