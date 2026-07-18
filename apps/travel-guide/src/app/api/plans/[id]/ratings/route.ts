// POST /api/plans/:id/ratings — 写入 ChildRating
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十四节 第三段（v1.5 多维度结构化）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Body {
  spotId?: string;
  childId?: string;
  physicalState?: string;
  emotionalPeak?: string;
  stayDurationMinutes?: number | null;
  willingnessToReturn?: string;
  cryEpisodes?: any[];
  childAgeAtVisit?: number | null;
  linkedMediaIds?: string[];
  blockId?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const planId = params.id;
  const plan = await prisma.planRecord.findUnique({
    where: { id: planId },
    select: { id: true, childAges: true },
  });
  if (!plan) {
    return NextResponse.json(
      { error: { code: "PLAN_NOT_FOUND", message: "计划不存在" } },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.childId) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "childId 必填" } },
      { status: 400 },
    );
  }

  const age =
    typeof body.childAgeAtVisit === "number"
      ? body.childAgeAtVisit
      : plan.childAges[0] ?? null;

  // v1.5：childId 外键到 ChildFeelingProfile（这个表也是 v1.5 新增的"感受画像"）。
  // 第一次写 rating 前，先建立画像空壳（不阻塞数据采集；后续每晚聚合填充）。
  await prisma.childFeelingProfile.upsert({
    where: { childId: body.childId },
    update: {},
    create: {
      childId: body.childId,
      spotTypePreferences: {},
      cryingTriggers: {},
      energyCurveByTimeOfDay: {},
      averageEmotionalPeakDistribution: {},
      totalDataPoints: 0,
      privacyLevel: "anonymized",
    },
  });

  const created = await prisma.childRating.create({
    data: {
      planRecordId: planId,
      timelineBlockId: body.blockId ?? null,
      spotId: body.spotId ?? null,
      childId: body.childId,
      physicalState: body.physicalState ?? null,
      emotionalPeak: body.emotionalPeak ?? null,
      stayDurationMinutes: body.stayDurationMinutes ?? null,
      willingnessToReturn: body.willingnessToReturn ?? null,
      cryEpisodes: (body.cryEpisodes as any) ?? [],
      childAgeAtVisit: age,
      linkedMediaIds: body.linkedMediaIds ?? [],
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id });
}
