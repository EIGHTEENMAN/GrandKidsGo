// GET /api/guides/[id]/ratings — 双维度评分列表
// POST /api/guides/[id]/ratings — 提交评分（adultRating + childRating 双维度）
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const reviews = await prisma.guideReview.findMany({
    where: { guideId: params.id, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, adultRating: true, childRating: true, childAgeMonths: true, text: true, tags: true, createdAt: true, visitDate: true },
  });
  return NextResponse.json({ code: "OK", data: { items: reviews } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });

  const body = await req.json();
  const adultRating = body.adultRating;
  if (!adultRating || adultRating < 1 || adultRating > 5) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "大人评分需 1-5" }, { status: 400 });
  }

  // 防刷：同一用户对同一攻略只能评 1 次
  const existing = await prisma.guideReview.findFirst({
    where: { guideId: params.id, userId, status: "published" },
  });
  if (existing) {
    return NextResponse.json({ code: "RATE_LIMIT", message: "你已经评过分了" }, { status: 429 });
  }

  const review = await prisma.guideReview.create({
    data: {
      guideId: params.id,
      userId,
      adultRating,
      childRating: body.childRating ?? null,
      childAgeMonths: body.childAgeMonths ?? null,
      text: (body.text ?? "").trim().slice(0, 1000) || null,
      tags: body.tags ?? [],
      visitDate: body.visitDate ? new Date(body.visitDate) : null,
    },
  });

  return NextResponse.json({ code: "OK", data: { id: review.id, adultRating: review.adultRating, childRating: review.childRating } });
}