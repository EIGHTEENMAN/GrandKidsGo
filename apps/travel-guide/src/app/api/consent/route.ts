// POST /api/consent — 记录监护人单独同意（v1.4 第十五节 B 第二点）
// v1.4 硬合规：必须显式勾选，必须弹独立确认窗，不可默认勾选，必须电子留痕。
//
// 入参 scope 分类：
//   - publish_to_public         公开孩子素材
//   - ai_polish                  AI 润色用素材
//   - ai_face_analysis           AI 处理人脸
//   - ai_voice_analysis          AI 处理声音
//   - personalized_recommendation 个性化推荐
//
// 留痕字段：userId / childId / scope / targetIds / grantedAt / ipAddress /
//          agreementVersion / guardianPhone（3 年）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";

const ALLOWED_SCOPES = new Set([
  "publish_to_public",
  "ai_polish",
  "ai_face_analysis",
  "ai_voice_analysis",
  "personalized_recommendation",
]);

interface Body {
  userId?: string;
  childId?: string;
  scope?: string;
  targetIds?: string[];
  ipAddress?: string;
  userAgent?: string;
  agreementVersion?: string;
  guardianPhone?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.userId || !body.childId || !body.scope) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_FIELDS",
          message: "需 userId / childId / scope",
        },
      },
      { status: 400 },
    );
  }
  if (!ALLOWED_SCOPES.has(body.scope)) {
    return NextResponse.json(
      { error: { code: "INVALID_SCOPE", message: `scope 非法: ${body.scope}` } },
      { status: 400 },
    );
  }
  if (!body.guardianPhone || !/^1[3-9]\d{9}$/.test(body.guardianPhone)) {
    return NextResponse.json(
      { error: { code: "GUARDIAN_PHONE_REQUIRED", message: "需有效手机号（首次留痕）" } },
      { status: 400 },
    );
  }

  const ip =
    body.ipAddress ??
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = body.userAgent ?? req.headers.get("user-agent") ?? "unknown";

  const record = await prisma.consentRecord.create({
    data: {
      userId: body.userId,
      childId: body.childId,
      scope: body.scope,
      targetIds: body.targetIds ?? [],
      ipAddress: ip,
      userAgent: ua,
      agreementVersion: body.agreementVersion ?? "v1.5-2026-07-17",
      guardianPhone: body.guardianPhone,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 年过期
    },
    select: { id: true, grantedAt: true, expiresAt: true },
  });

  await recordOperation({
    actorId: body.userId,
    action: "consent_grant",
    targetType: "consent",
    targetId: record.id,
    after: { scope: body.scope, targetIds: body.targetIds, ipAddress: ip },
    ipAddress: ip,
    userAgent: ua,
  });

  return NextResponse.json({ id: record.id, grantedAt: record.grantedAt });
}
