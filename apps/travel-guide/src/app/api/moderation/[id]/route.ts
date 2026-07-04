import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/moderation/[id] - approve or reject a review
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const { status, reviewedBy } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { code: "ERROR", message: "状态值无效" },
      { status: 400 },
    );
  }

  const review = await prisma.contentReview.update({
    where: { id: params.id },
    data: {
      status,
      reviewedBy: reviewedBy || "admin",
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ code: "OK", data: review });
}
