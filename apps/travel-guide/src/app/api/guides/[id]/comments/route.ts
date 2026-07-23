// GET /api/guides/[id]/comments — 评论列表
// POST /api/guides/[id]/comments — 提交评论（纯文本）
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.guideComment.findMany({
    where: { guideId: params.id, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, content: true, createdAt: true, userId: true },
  });
  return NextResponse.json({ code: "OK", data: { items: comments } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });

  const body = await req.json();
  const content = (body.content ?? "").trim().slice(0, 500);
  if (!content) return NextResponse.json({ code: "VALIDATION_ERROR", message: "评论不能为空" }, { status: 400 });

  // 防刷：1 天 1 条
  const yesterday = new Date(Date.now() - 86400000);
  const count = await prisma.guideComment.count({
    where: { guideId: params.id, userId, createdAt: { gte: yesterday } },
  });
  if (count > 0) return NextResponse.json({ code: "RATE_LIMIT", message: "同一篇攻略每天只能评论 1 次" }, { status: 429 });

  const comment = await prisma.guideComment.create({
    data: { guideId: params.id, userId, content },
  });

  return NextResponse.json({ code: "OK", data: { id: comment.id, content: comment.content, createdAt: comment.createdAt } });
}