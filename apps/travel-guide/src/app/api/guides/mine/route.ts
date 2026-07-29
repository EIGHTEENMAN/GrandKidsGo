// GET /api/guides/mine?type=drafts|published|archived|saved|all — 我的攻略列表
// 详见 项目建设方案/走天下个人中心竞品调研-2026-07-24.md 第二节 P0-2
// 攻略体系 v1.0 PR1：tab 字符串统一定义在 lib/guide-status.ts

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
  return NextResponse.json({ items, type });
}