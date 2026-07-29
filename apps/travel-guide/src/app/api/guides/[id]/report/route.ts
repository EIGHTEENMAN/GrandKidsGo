// POST /api/guides/[id]/report — 举报攻略
// PR2 + D9/D10 决策：转 apps/moderation 独立服务（端口 3020）
// 副作用：把 guide 改 pending_review（admin 看到立刻处理）
// 任何人（包括作者自己以外的登录用户）都可举报。
//
// moderation 服务契约（apps/moderation/server/index.js:144）：
//   POST /api/moderation/report
//   body: { targetType, targetId, reason, contentSnippet? }
//   auth: 用户 JWT（auth middleware）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

const MODERATION_URL = process.env.MODERATION_SERVICE_URL || "http://127.0.0.1:3020";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "请先登录" } },
      { status: 401 },
    );
  }

  const guide = await prisma.guide.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, userId: true, title: true },
  });
  if (!guide) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "攻略不存在" } },
      { status: 404 },
    );
  }

  // 不能举报自己的攻略
  if (guide.userId === auth.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "不能举报自己的攻略" } },
      { status: 403 },
    );
  }

  let body: { reason?: string; contentSnippet?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "举报原因不能为空" } },
      { status: 400 },
    );
  }

  // 1. 转发到 moderation 服务（带用户 JWT）
  let moderationResponseId: string | null = null;
  let moderationError: string | null = null;
  try {
    // 沿用用户当前请求的 Authorization header 给下游（同一用户身份）
    const authHeader = req.headers.get("authorization") || "";
    const cookieToken = req.cookies.get("grandkidsgo_token")?.value || "";
    const userAuthHeader = authHeader.startsWith("Bearer ")
      ? authHeader
      : cookieToken
        ? `Bearer ${cookieToken}`
        : "";

    const r = await fetch(`${MODERATION_URL}/api/moderation/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userAuthHeader ? { Authorization: userAuthHeader } : {}),
      },
      body: JSON.stringify({
        targetType: "guide",
        targetId: guide.id,
        reason,
        contentSnippet: (body.contentSnippet ?? guide.title ?? "").slice(0, 500),
      }),
    });
    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      moderationResponseId = data?.id ?? null;
    } else {
      moderationError = `moderation ${r.status}: ${await r.text().catch(() => "")}`;
    }
  } catch (e) {
    moderationError = `moderation unreachable: ${(e as Error).message}`;
  }

  // 2. 副作用：把 guide 改 pending_review（D9 决策：admin 立刻能看到）
  // 仅当目前是 published 才改；其它状态（已 archived / 已被拒）不二次翻动
  if (guide.status === "published") {
    await prisma.guide.update({
      where: { id: guide.id },
      data: { status: "pending_review", updatedAt: new Date() },
    });
  }

  await recordOperation({
    actorId: auth.id,
    action: "guide_report",
    targetType: "guide",
    targetId: guide.id,
    after: {
      reason,
      moderationResponseId,
      moderationError,
      previousStatus: guide.status,
    },
  });

  // 即使 moderation 转发失败也接受（已写本地 log + 状态改了），但告诉前端
  return NextResponse.json({
    code: moderationError ? "PARTIAL" : "OK",
    data: {
      guideId: guide.id,
      moderationResponseId,
      moderationError,
      guideStatus: guide.status === "published" ? "pending_review" : guide.status,
    },
  });
}