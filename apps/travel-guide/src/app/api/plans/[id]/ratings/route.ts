// POST /api/plans/:id/ratings — 写入 ChildRating
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十四节 第三段（v1.5 多维度结构化）
// 2026-07-31 v1.0 Phase B：加 4 字段（favoriteMoment / wishToReturn / parentJoy / cryTriggers）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recomputeChildFeelingProfile } from "@/lib/child-profile-aggregate";

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
  // 2026-07-31 v1.0 Phase B
  favoriteMoment?: string | null;
  wishToReturn?: string | null;
  parentJoy?: string | null;
  cryTriggers?: any[] | null;
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
  // v1.0 Phase B：空壳包含 4 个新聚合字段
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
      monthlyFeedback: {},
      crossSpotPattern: {},
      topEmotionTriggers: {},
      parentJoyByActivity: {},
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
      // 2026-07-31 v1.0 Phase B
      favoriteMoment: body.favoriteMoment ?? null,
      wishToReturn: body.wishToReturn ?? null,
      parentJoy: body.parentJoy ?? null,
      cryTriggers: body.cryTriggers ? (body.cryTriggers as any) : null,
    },
    select: { id: true },
  });

  // 同步重算感受画像聚合
  try { await recomputeChildFeelingProfile(body.childId); }
  catch (e) { console.error('[ratings] recompute profile failed', e); }

  return NextResponse.json({ id: created.id });
}
