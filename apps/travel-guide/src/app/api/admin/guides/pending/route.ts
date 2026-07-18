// GET /api/admin/guides/pending — 后台"攻略待审"列表
// POST /api/admin/guides/:id/approve — 通过（→ published）
// POST /api/admin/guides/:id/reject — 拒绝（→ rejected + 原因）
//
// v1 简化：admin 角色校验用 ADMIN_TOKEN 共享密钥；后续接入 admin app 统一权限系统

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 20));

  const [items, total] = await Promise.all([
    prisma.guide.findMany({
      where: { status: "pending_review" },
      orderBy: { createdAt: "asc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        title: true,
        contentHtml: true,
        coverImages: true,
        cityId: true,
        childAges: true,
        days: true,
        userId: true,
        createdAt: true,
        city: { select: { name: true } },
      },
    }),
    prisma.guide.count({ where: { status: "pending_review" } }),
  ]);

  return NextResponse.json({
    items: items.map((g: any) => ({
      id: g.id,
      title: g.title,
      contentPreview: g.contentHtml.slice(0, 200),
      cover: g.coverImages[0] ?? null,
      cityName: g.city?.name,
      childAges: g.childAges,
      days: g.days,
      userId: g.userId,
      createdAt: g.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
}
