// GET /api/guides/mine?type=drafts|published|archived|saved|all — 我的攻略列表
// 详见 项目建设方案/走天下个人中心竞品调研-2026-07-24.md 第二节 P0-2
// 攻略体系 v1.0 PR1：tab 字符串统一定义在 lib/guide-status.ts
// 用户答复 2026-07-29：从 OperationLog 拉最近一次审核动作的 reason，让前端展示 DFA 命中详情

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";
import { statusInForTab, type MineTab } from "@/lib/guide-status";

export const dynamic = "force-dynamic";

const KNOWN_TYPES = new Set<MineTab | "saved">([
  "drafts",
  "published",
  "archived",
  "saved",
  "all",
]);

/**
 * 从 OperationLog 拉最近一次针对该 guide 的审核动作的 reason。
 * - hard 拒 → action='guide_reject' 的 after.reason
 * - soft pending → action='guide_pending' 或 'guide_reject'（PR1 dual threshold 用 guide_reject 也包含 soft）
 *   实际 PR2 from-plan 中 hard→action=guide_reject，soft→action=guide_pending；/api/guides POST / submit 用同样的策略
 */
async function getLatestReviewReason(guideId: string, userId: string): Promise<{
  reason: string | null;
  sensitivity: string | null;
  reviewedAt: string | null;
} | null> {
  const log = await prisma.operationLog.findFirst({
    where: {
      targetType: "guide",
      targetId: guideId,
      actorId: userId,
      action: { in: ["guide_reject", "guide_pending", "guide_withdraw"] },
    },
    orderBy: { createdAt: "desc" },
    select: { afterJson: true, createdAt: true },
  });
  if (!log) return null;
  const after = (log.afterJson ?? {}) as Record<string, unknown>;
  // reason 可能是 array（多 soft 命中）；join 成 string
  let reason: string | null = null;
  if (Array.isArray(after.reason)) reason = after.reason.join("; ");
  else if (typeof after.reason === "string") reason = after.reason;
  return {
    reason,
    sensitivity: (after.sensitivity as string) ?? null,
    reviewedAt: log.createdAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "请先登录" } }, { status: 401 });
  }
  const userId = auth.id;
  const url = new URL(req.url);
  const rawType = url.searchParams.get("type") ?? "published";
  const type: MineTab | "saved" = KNOWN_TYPES.has(rawType as MineTab | "saved")
    ? (rawType as MineTab | "saved")
    : "published";

  if (type === "drafts") {
    const items = await prisma.guideDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        mode: true,
        params: true,    // 标题存在 params.title
        createdAt: true,
        updatedAt: true,
      },
    });
    // 把标题展平到顶层，方便前端直接用 g.title
    const flat = items.map(d => {
      const p = (d.params ?? {}) as Record<string, unknown>;
      return {
        id: d.id,
        title: (p.title as string) ?? "未命名草稿",
        status: d.status,
        mode: d.mode,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });
    return NextResponse.json({ items: flat, type });
  }

  if (type === "saved") {
    const saves = await prisma.guideSave.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        guide: {
          select: {
            id: true, title: true, coverImages: true, cityId: true,
            viewCount: true, saveCount: true, likeCount: true,
            publishedAt: true, status: true, days: true,
          },
        },
      },
    });
    const items = saves
      .filter((s) => s.guide && s.guide.status === "published")
      .map((s) => ({ ...s.guide, savedAt: s.createdAt }));
    return NextResponse.json({ items, type });
  }

  // drafts / published / archived / all 都查 Guide 表（GuideDraft 是 TipTap 的本地缓存，本路由先不暴露）
  const statusIn = statusInForTab(type);
  const items = await prisma.guide.findMany({
    where: { userId, status: { in: statusIn } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      coverImages: true,
      cityId: true,
      days: true,
      viewCount: true,
      saveCount: true,
      likeCount: true,
      publishedAt: true,
      status: true,
      updatedAt: true,
    },
  });

  // PR1 增强：从 OperationLog 拉每条的审核 reason（pending_review / rejected 的卡片需要展示）
  const enriched = await Promise.all(items.map(async (g) => {
    const meta = await getLatestReviewReason(g.id, userId);
    return {
      ...g,
      reviewReason: meta?.reason ?? null,
      reviewSensitivity: meta?.sensitivity ?? null,
      reviewedAt: meta?.reviewedAt ?? null,
    };
  }));

  return NextResponse.json({ items: enriched, type });
}