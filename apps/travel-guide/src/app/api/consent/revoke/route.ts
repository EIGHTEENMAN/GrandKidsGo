// POST /api/consent/revoke — 撤回监护人单独同意（v1.4 第十五节 B 第四点）
// 触发：跨产品级联清除（攻略 / CDN / AI 向量 / 跨产品引用）
// 留痕：撤回日志 + 同意记录软撤销（revokedAt 写入而非物理删除）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";

interface Body {
  consentRecordId?: string;
  userId?: string;
  childId?: string;
  mediaIds?: string[];
  guideId?: string;
  planId?: string;
  reason?: string;
  initiatedBy?: "creator" | "parent_a" | "parent_b" | "child_8plus" | "admin";
  // 凭证（情况 B——其他人代撤回需身份证 + 监护关系证明）
  identityProofId?: string;
  guardianProofUrl?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.consentRecordId || !body?.userId) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "需 consentRecordId + userId" } },
      { status: 400 },
    );
  }

  const consent = await prisma.consentRecord.findUnique({
    where: { id: body.consentRecordId },
  });
  if (!consent) {
    return NextResponse.json(
      { error: { code: "CONSENT_NOT_FOUND" } },
      { status: 404 },
    );
  }
  if (consent.userId !== body.userId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "仅本人可撤回" } },
      { status: 403 },
    );
  }

  // 1. 在同意记录上软撤销（不物理删除——合规审计 3 年）
  await prisma.consentRecord.update({
    where: { id: consent.id },
    data: {
      revokedAt: new Date(),
      revokeReason: body.reason ?? "监护人撤回",
      revokeMediaIds: body.mediaIds ?? [],
    },
  });

  // 2. 创建撤回日志
  const retraction = await prisma.retractionLog.create({
    data: {
      initiatedBy: body.initiatedBy ?? "creator",
      initiatedByUserId: body.userId,
      mediaIds: body.mediaIds ?? [],
      guideId: body.guideId ?? null,
      planId: body.planId ?? null,
      proofType:
        body.initiatedBy === "creator" ? null : "id_card_and_birth_cert",
      proofUrl: body.guardianProofUrl ?? null,
      status: "in_progress",
      cascadeActions: [
        { action: "guide_content_replace", target: "pending", reason: "替换占位图" },
        { action: "ai_face_vector_clear", target: "pending", reason: "AI 已请求清除" },
        { action: "cdn_purge", target: "pending", reason: "CDN 24 小时内清除" },
        { action: "main_site_kill_ref", target: "pending", reason: "主站引用终止" },
      ],
      publicNote: "原作者已撤回部分内容",
    },
    select: { id: true },
  });

  // 3. 立即级联：标记关联素材 visibility=retracted
  if (body.mediaIds && body.mediaIds.length > 0) {
    await prisma.planMedia.updateMany({
      where: { id: { in: body.mediaIds } },
      data: { visibilityLevel: "retracted" },
    });
  }
  // 4. 立即级联：撤回指南
  if (body.guideId) {
    await prisma.guide.update({
      where: { id: body.guideId },
      data: { status: "rejected" },
    });
  }
  // 5. 立即级联：标记 AI 特征向量清理请求（v1.4 第十五节 B 第六点 b）
  if (body.mediaIds && body.mediaIds.length > 0) {
    await prisma.aiFeatureVectorTracking.updateMany({
      where: { sourceMediaIds: { hasSome: body.mediaIds } },
      data: { purgeRequestedAt: new Date() },
    });
  }

  await recordOperation({
    actorId: body.userId,
    actorRole: body.initiatedBy === "admin" ? "admin" : "user",
    action: "consent_revoke",
    targetType: "retraction",
    targetId: retraction.id,
    before: { consentRevoked: false },
    after: {
      consentId: body.consentRecordId,
      mediaIds: body.mediaIds,
      guideId: body.guideId,
      initiatedBy: body.initiatedBy,
    },
    ipAddress:
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({
    retractionId: retraction.id,
    cascade: ["plan_media:retracted", "guide:rejected", "ai_vector:clear_requested", "cdn:pending"],
    publicNote: "原作者已撤回部分内容",
  });
}
