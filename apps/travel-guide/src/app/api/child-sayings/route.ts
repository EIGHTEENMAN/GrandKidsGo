// GET /api/child-sayings — 童言趣语列表
// POST /api/child-sayings — 提交童言
// GET /api/child-sayings/random — 随机金句
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const childId = url.searchParams.get("childId");
  const shareScope = url.searchParams.get("shareScope");
  const userId = req.headers.get("x-debug-user-id");  // P0-4: 个人中心孩子说按用户过滤
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (childId) where.childId = childId;
  if (shareScope) where.shareScope = shareScope;

  const items = await prisma.childSaying.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, text: true, mood: true, shareScope: true,
      createdAt: true, childId: true, spotId: true, source: true,
    },
  });

  return NextResponse.json({ code: "OK", data: { items } });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });

  const body = await req.json();
  const text = (body.text ?? "").trim().slice(0, 200);
  if (!text) return NextResponse.json({ code: "VALIDATION_ERROR", message: "童言不能为空" }, { status: 400 });

  const item = await prisma.childSaying.create({
    data: {
      userId,
      childId: body.childId ?? null,
      text,
      mood: body.mood ?? null,
      shareScope: body.shareScope ?? "private",
    },
  });

  return NextResponse.json({ code: "OK", data: { id: item.id, text: item.text, createdAt: item.createdAt } });
}