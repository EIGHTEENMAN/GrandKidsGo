// POST /api/plans/[id]/complete — 标记计划为已完成
//
// 触发链：
//   1. PlanRecord.status = 'completed'
//   2. backfill footprints（city + timelineBlocks.spotId → Footprint visited）
//   3. checkBadgesFor(userId, 'plan_saved') — 触发勋章评估（含足迹勋章）
//
// 设计：
//   - 旧 PATCH /api/plans/[id] 锁定 completed（不允许编辑）
//   - 完成是单向操作：只在 status 当前允许进入 completed 时触发
//   - 兼容 draft/confirmed/active → completed
//   - 幂等：已经是 completed 不会重复 backfill
//
// 入参：{}（无）
// 出参：{ ok: true, footprintBackfill: {...}, badgesAwarded: [...] }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";
import { backfillFootprintsForCompletedPlan } from "@/lib/backfill-footprints";
import { checkBadgesFor } from "@/lib/badge-engine";

export const dynamic = "force-dynamic";

const ALLOW_FROM = new Set(["draft", "confirmed", "active"]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { code: "AUTH_REQUIRED", message: "请先登录" },
      { status: 401 },
    );
  }

  const plan = await prisma.planRecord.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!plan) {
    return NextResponse.json(
      { code: "PLAN_NOT_FOUND", message: "计划不存在" },
      { status: 404 },
    );
  }
  if (plan.userId !== auth.id && auth.role !== "admin") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "无权操作他人的计划" },
      { status: 403 },
    );
  }

  // 幂等：已经是 completed 直接返回查回之前的结果
  if (plan.status === "completed") {
    const existingFootprints = await prisma.footprint.findMany({
      where: { userId: plan.userId, sourceId: plan.id, state: "visited" },
      select: { id: true, cityId: true, spotId: true, source: true },
    });
    return NextResponse.json({
      code: "OK",
      data: {
        alreadyCompleted: true,
        footprintCount: existingFootprints.length,
        note: "已是 completed 状态，未重新触发",
      },
    });
  }

  if (!ALLOW_FROM.has(plan.status)) {
    return NextResponse.json(
      {
        code: "INVALID_STATUS",
        message: `当前状态 ${plan.status} 不允许标记完成（仅 draft/confirmed/active 可）`,
      },
      { status: 409 },
    );
  }

  // 1) 状态流转
  await prisma.planRecord.update({
    where: { id: plan.id },
    data: { status: "completed" },
  });

  // 2) 同步回填足迹
  let footprintResult: Awaited<
    ReturnType<typeof backfillFootprintsForCompletedPlan>
  > | null = null;
  try {
    footprintResult = await backfillFootprintsForCompletedPlan(plan.id);
  } catch (e) {
    console.error(`[plans] backfill failed for plan ${plan.id}:`, e);
  }

  // 3) 异步勋章评估（不阻塞响应）
  checkBadgesFor(plan.userId, "plan_saved", { planId: plan.id }).then(
    (newBadges) => {
      if (newBadges.length) {
        console.log(
          `[plans] plan=${plan.id} completed → badges awarded: ${newBadges.join(", ")}`,
        );
      }
    },
  );

  return NextResponse.json({
    code: "OK",
    data: {
      planId: plan.id,
      footprintBackfill: footprintResult,
    },
  });
}
