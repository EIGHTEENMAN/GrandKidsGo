// POST /api/plans — 创建计划
// GET /api/plans — 当前用户的计划列表
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 C PLAN 类

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PlanCreateBody {
  userId?: string;
  cityId?: string;
  sourceGuideId?: string;
  startDate?: string;
  endDate?: string;
  travelers?: { adults: number; children: number };
  childAges?: number[];
  travelStyle?: string;
  status?: "draft" | "confirmed" | "active" | "completed" | "published";
  title?: string;
  timelineBlocks?: any;  // 来自移动端的 days 数组（v1 简化：作为 JSON 整体存入）
  candidateLabel?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as PlanCreateBody | null;
  if (!body || !body.userId || !body.startDate || !body.endDate || !body.cityId) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_FIELDS",
          message: "需 userId / cityId / startDate / endDate",
        },
      },
      { status: 400 },
    );
  }

  const childAges = Array.isArray(body.childAges) ? body.childAges : [];
  if (childAges.length === 0) {
    return NextResponse.json(
      { error: { code: "CHILD_REQUIRED", message: "至少 1 个孩子年龄" } },
      { status: 400 },
    );
  }

  const created = await prisma.planRecord.create({
    data: {
      userId: body.userId,
      cityId: body.cityId,
      sourceGuideId: body.sourceGuideId ?? null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      travelers: body.travelers ?? { adults: 2, children: 1 },
      childAges,
      travelStyle: body.travelStyle ?? null,
      status: body.status ?? "draft",
      title: body.title ?? `${body.cityId} 行程`,
      timelineBlocks: body.timelineBlocks ?? null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json(created);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status") ?? undefined;
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "userId 必填" } },
      { status: 400 },
    );
  }

  const items = await prisma.planRecord.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { startDate: "desc" },
    take: 50,
    select: {
      id: true,
      cityId: true,
      startDate: true,
      endDate: true,
      status: true,
      title: true,
      childAges: true,
      city: { select: { name: true } },
    },
  });

  return NextResponse.json({ items });
}
