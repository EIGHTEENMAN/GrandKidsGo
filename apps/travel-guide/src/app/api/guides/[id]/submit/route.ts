// POST /api/guides/[id]/submit — draft/rejected 重新提交审核
// PR2 + D4 决策：rejected 可修改后重提（DFA 重审）
// 来源状态：draft / rejected → 跑 L1 DFA → pending_review / rejected

import { NextRequest, NextResponse } from "next/server";
import { loadGuideForActor } from "@/lib/guide-actor";
import prisma from "@/lib/prisma";
import { moderateTravelText, type ModerationResult } from "@/lib/moderation";
import { track, TRACK } from "@/lib/analytics";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const loaded = await loadGuideForActor(req, params.id, ["draft", "rejected"], "pending_review");
  if ("response" in loaded) return loaded.response;
  const { guide, actor } = loaded;

  // 跑 L1 DFA（PR1 dual threshold）
  // - hard → rejected（机审自动拦截）
  // - soft → pending_review（进人工审核）
  // - clean → published（DFA 通过，自动发布）
  const text = `${guide.title ?? ""}\n${guide.contentHtml ?? ""}`;
  const moderation: ModerationResult = moderateTravelText(text);
  const finalStatus = moderation.nextStatus;

  await prisma.guide.update({
    where: { id: guide.id },
    data: {
      status: finalStatus,
      publishedAt: finalStatus === "published" ? new Date() : null,
      updatedAt: new Date(),
    },
  });

  track({
    eventName: TRACK.GUIDE_PUBLISH_SUBMITTED,
    userId: actor.id,
    properties: {
      guideId: guide.id,
      source: "submit",
      status: finalStatus,
      sensitivity: moderation.sensitivity,
    },
  });
  await recordOperation({
    actorId: actor.id,
    action: finalStatus === "rejected" ? "guide_reject" : "guide_pending",
    targetType: "guide",
    targetId: guide.id,
    after: { status: finalStatus, sensitivity: moderation.sensitivity, source: "submit", reason: moderation.reasons },
  });

  return NextResponse.json({
    code: "OK",
    data: {
      id: guide.id,
      status: finalStatus,
      sensitivity: moderation.sensitivity,
      rejectionReason: moderation.hardRejection ? moderation.reasons.join("; ") : null,
      pendingReason: moderation.softPending ? moderation.reasons.join("; ") : null,
    },
  });
}