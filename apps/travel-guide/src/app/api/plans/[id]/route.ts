// PATCH /api/plans/:id — 轻量编辑（用户答复 2026-07-29：用户可以在生成的计划上进行修改）
//
// 可编辑字段：
// - title (string)
// - startDate / endDate (ISO date string)
// - childAges (number[])
// - timelineBlocks (TimelineDay[]) — 增删 block、调 kidHook 备注、改 days 顺序
// - status 流转：draft → confirmed (用户主动确认) / draft → archived (用户主动放弃)
//
// owner + status ∈ {draft, confirmed, active} 才允许编辑（completed / published / archived 锁定）。
// 完成后自动 cancel status='draft'/'confirmed' → 'draft'（强制重走一遍 wizard 流程或确认）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/verify-auth";

export const dynamic = "force-dynamic";

const EDITABLE_STATUS = new Set(["draft", "confirmed", "active"]);

interface TimelineBlock {
  blockId?: string;
  kind?: string;
  startMinutes?: number;
  endMinutes?: number;
  title?: string;
  kidHook?: string;
  notes?: string;
  spotId?: string;
  cityId?: string;
}

interface TimelineDay {
  day?: number;
  cityId?: string;
  date?: string;
  theme?: string;
  blocks?: TimelineBlock[];
  kidFriendlySummary?: string;
}

function isValidDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = new Date(s).getTime();
  return Number.isFinite(t);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "请先登录" } }, { status: 401 });
  }

  const plan = await prisma.planRecord.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, startDate: true, endDate: true },
  });
  if (!plan) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "计划不存在" } }, { status: 404 });
  }
  if (plan.userId !== auth.id && auth.role !== "admin") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "无权编辑他人的计划" } }, { status: 403 });
  }
  if (!EDITABLE_STATUS.has(plan.status)) {
    return NextResponse.json(
      { error: { code: "INVALID_STATUS", message: `当前状态 ${plan.status} 不允许编辑（行程已完成后归档）` } },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => null)) as null | Record<string, unknown>;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "请求体格式错误" } }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    updateData.title = body.title.slice(0, 200);
  }
  if (Array.isArray(body.childAges)) {
    const ages = body.childAges.filter((n) => Number.isFinite(n));
    if (ages.length === 0) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "至少 1 个孩子年龄" } }, { status: 400 });
    }
    updateData.childAges = ages;
  }
  if (isValidDate(body.startDate)) updateData.startDate = new Date(body.startDate);
  if (isValidDate(body.endDate)) updateData.endDate = new Date(body.endDate);
  if (Array.isArray(body.timelineBlocks)) {
    // 基本结构校验
    for (const day of body.timelineBlocks) {
      if (!day || typeof day !== "object" || !Array.isArray((day as TimelineDay).blocks)) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "timelineBlocks 结构错误" } }, { status: 400 });
      }
    }
    updateData.timelineBlocks = body.timelineBlocks;
  }
  if (body.status === "archived") {
    // 用户主动放弃这个计划
    updateData.status = "archived";
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "无可更新字段" } }, { status: 400 });
  }

  // 起止日期合法性
  if (updateData.startDate && updateData.endDate &&
      (updateData.startDate as Date).getTime() > (updateData.endDate as Date).getTime()) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "结束日期不能早于开始日期" } }, { status: 400 });
  }

  const updated = await prisma.planRecord.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, status: true, title: true, updatedAt: true, timelineBlocks: true },
  });

  return NextResponse.json({
    code: "OK",
    data: {
      id: updated.id,
      status: updated.status,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}