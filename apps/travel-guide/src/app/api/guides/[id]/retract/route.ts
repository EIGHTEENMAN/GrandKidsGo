// POST /api/guides/[id]/retract — 作者撤回（published → draft）
// 攻略体系 v1.0 D6 决策：published 可撤回编辑。
// 仅作者本人，且 status=published 可触发。
// 撤回后状态变 draft（不在公开 feed，可继续编辑）。
// 撤回后想再发布走 POST /api/guides/[id]/publish 或 /submit。

import { NextRequest, NextResponse } from "next/server";
import { loadGuideForActor } from "@/lib/guide-actor";
import prisma from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const loaded = await loadGuideForActor(req, params.id, ["published"], "draft");
  if ("response" in loaded) return loaded.response;
  const { guide, actor } = loaded;

  await prisma.guide.update({
    where: { id: guide.id },
    data: { status: "draft", updatedAt: new Date() },
  });

  await recordOperation({
    actorId: actor.id,
    action: "guide_withdraw",
    targetType: "guide",
    targetId: guide.id,
    after: { status: "draft", source: "retract" },
  });

  return NextResponse.json({
    code: "OK",
    data: { id: guide.id, status: "draft" },
  });
}