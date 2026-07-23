// GET /api/gallery — 儿童画廊列表
// POST /api/gallery — 上传照片
// DELETE /api/gallery/[id] — 撤回
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 画廊列表
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const childId = url.searchParams.get("childId");
  const visibilityLevel = url.searchParams.get("visibilityLevel") ?? "private";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 100);

  const where: Record<string, unknown> = { sourceType: "gallery" };
  if (childId) where.childId = childId;
  if (visibilityLevel) where.visibilityLevel = visibilityLevel;

  const items = await prisma.planMedia.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, ossUrl: true, caption: true, childId: true, sourceType: true,
      visibilityLevel: true, createdAt: true, spotId: true,
    },
  });

  return NextResponse.json({ code: "OK", data: { items } });
}

// 上传完成后回写
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });

  const body = await req.json();
  const { ossKey, ossUrl, caption, childId, spotId } = body;

  if (!ossKey) return NextResponse.json({ code: "VALIDATION_ERROR", message: "ossKey 不能为空" }, { status: 400 });

  const item = await prisma.planMedia.create({
    data: {
      planRecordId: "gallery",   // 画廊照片用占位 planRecordId
      type: "image",
      ossKey,
      ossUrl: ossUrl ?? null,
      caption: (caption ?? "").trim().slice(0, 300) || null,
      childId: childId ?? null,
      spotId: spotId ?? null,
      sourceType: "gallery",
      visibilityLevel: body.visibilityLevel ?? "private",
    },
  });

  return NextResponse.json({ code: "OK", data: { id: item.id, ossUrl: item.ossUrl, caption: item.caption } });
}