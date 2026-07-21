// POST /api/guides/fork — 一键 fork 攻略到自己的出行计划
// 详见 项目建设方案/走天下实施方案-v3.0.md 智能攻略章节
//
// 用户在真实攻略详情页点"用这个攻略做我的计划"，fork 源攻略的：
//   - cityId（出行城市）
//   - childAges（孩子月龄，按源攻略作者的孩子）
//   - days（天数）
//   - travelStyle（旅行风格）
// 创建一份草稿 PlanRecord，用户可在该计划基础上修改（不是从零开始）
//
// 请求体: { sourceGuideId: string }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "请先登录" } },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const sourceGuideId = body.sourceGuideId;
  if (!sourceGuideId) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "需要 sourceGuideId" } },
      { status: 400 },
    );
  }

  // 查源攻略
  const guide = await prisma.guide.findUnique({
    where: { id: sourceGuideId },
    select: {
      id: true,
      title: true,
      cityId: true,
      city: { select: { name: true } },
      childAges: true,
      days: true,
      travelStyle: true,
      sourcePlanRecordId: true,
    },
  });
  if (!guide) {
    return NextResponse.json(
      { error: { code: "GUIDE_NOT_FOUND", message: "源攻略不存在" } },
      { status: 404 },
    );
  }

  // 创建 fork PlanRecord (草稿)
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + (guide.days || 3) * 86400000).toISOString().slice(0, 10);

  const plan = await prisma.planRecord.create({
    data: {
      userId,
      cityId: guide.cityId,
      title: `${guide.title} · 我的版本`,
      status: "draft",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      childAges: guide.childAges || [],
      travelStyle: guide.travelStyle,
      travelers: { adults: 2, children: (guide.childAges || []).length || 1 },
      sourceGuideId: guide.id,
      timelineBlocks: [], // 用户可后续填充
    },
  });

  // 记录 fork 关系
  await prisma.guideFork.create({
    data: {
      sourceGuideId: guide.id,
      forkedByUserId: userId,
      planRecordId: plan.id,
      modified: false,
    },
  });

  return NextResponse.json({
    code: "OK",
    data: {
      planRecordId: plan.id,
      forkedFrom: guide.id,
      sourceTitle: guide.title,
      cityName: guide.city?.name,
      days: guide.days,
      startDate,
      endDate,
      message: `已基于《${guide.title}》创建你的计划草案，可继续修改`,
    },
  });
}
