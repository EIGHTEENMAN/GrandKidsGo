import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { moderateText } from "@/lib/moderation";

export const dynamic = "force-dynamic";

// GET /api/moderation - list pending reviews (for admin)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const [reviews, total] = await Promise.all([
    prisma.contentReview.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contentReview.count({ where: { status } }),
  ]);

  return NextResponse.json({
    code: "OK",
    data: reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/moderation - submit content for moderation check
export async function POST(request: Request) {
  const body = await request.json();
  const { content, contentType, contentId } = body;

  if (!content || !contentType) {
    return NextResponse.json(
      { code: "ERROR", message: "缺少必要参数" },
      { status: 400 },
    );
  }

  const result = moderateText(content);

  await prisma.contentReview.create({
    data: {
      contentType,
      contentId: contentId || null,
      content: content.substring(0, 500),
      reason: result.reason,
      status: result.isApproved ? "approved" : "pending",
    },
  });

  return NextResponse.json({ code: "OK", data: result });
}
