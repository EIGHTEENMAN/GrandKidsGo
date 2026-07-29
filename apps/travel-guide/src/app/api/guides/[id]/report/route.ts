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

  // 1. 转发到 moderation 服务
  // moderation 的 /api/moderation/report 用的是 auth middleware（用户 JWT），不是 serviceAuth；
  // 转发时需要用 moderation 自己的 secret 重签用户 token。
  // - 如果 MODERATION_JWT_SECRET 配了：用它重签转发（生产推荐，token 短时）
  // - 否则 fallback：沿用用户的 Authorization header（仅当 secret 跨服务一致时可用）
  let moderationResponseId: string | null = null;
  let moderationError: string | null = null;
  try {
    const authHeader = req.headers.get("authorization") || "";
    const cookieToken = req.cookies.get("grandkidsgo_token")?.value || "";
    let userToken = "";
    if (authHeader.startsWith("Bearer ")) userToken = authHeader.slice(7);
    else if (cookieToken) userToken = cookieToken;

    const modSecret = process.env.MODERATION_JWT_SECRET || "grandkidsgo-moderation-dev";
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (userToken && modSecret) {
      // 用 moderation 的 secret 重签一份短时 token（5 分钟），保留 sub + role
      try {
        const jwt = await import("jsonwebtoken");
        const payload = jwt.default.verify(userToken, process.env.AUTH_SERVICE_JWT_SECRET || process.env.JWT_SECRET || "grandkidsgo-jwt-secret-dev") as { sub?: string; id?: string; role?: string };
        const modToken = jwt.default.sign(
          { sub: payload.sub ?? payload.id, role: payload.role ?? "user" },
          modSecret,
          { expiresIn: "5m" },
        );
        headers.Authorization = `Bearer ${modToken}`;
      } catch {
        // 重签失败 → fallback 用原 token（仅当 secret 一致时才生效）
        if (userToken) headers.Authorization = `Bearer ${userToken}`;
      }
    } else if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
    }

    const r = await fetch(`${MODERATION_URL}/api/moderation/report`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetType: "guide",
        targetId: guide.id,
        reason,
        contentSnippet: (body.contentSnippet ?? guide.title ?? "").slice(0, 500),
      }),
    });
    // PR4 DEBUG：把 moderation 实际响应带回来便于排查转发问题
    const rawText = await r.text().catch(() => "");
    if (r.ok) {
      const data = JSON.parse(rawText || "{}");
      moderationResponseId = data?.id ?? null;
    } else {
      moderationError = `moderation ${r.status}: hasAuthHeader=${!!headers.Authorization} first40=${rawText.slice(0, 80)}`;
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