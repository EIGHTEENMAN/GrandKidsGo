// GET /api/plans/:id — 单个计划详情

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const plan = await prisma.planRecord.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      cityId: true,
      childAges: true,
      travelStyle: true,
      timelineBlocks: true,
      city: { select: { name: true } },
    },
  });
  if (!plan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "计划不存在" } },
      { status: 404 },
    );
  }

  const days = Array.isArray(plan.timelineBlocks) ? (plan.timelineBlocks as any[]) : [];

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    status: plan.status,
    cityName: plan.city?.name ?? null,
    startDate: plan.startDate.toISOString().slice(0, 10),
    endDate: plan.endDate.toISOString().slice(0, 10),
    childAges: plan.childAges,
    travelStyle: plan.travelStyle,
    timelineBlocks: days.map((d: any, i: number) => ({
      dayIndex: i + 1,
      date:
        d?.date ??
        new Date(
          new Date(plan.startDate).getTime() + i * 86400000,
        )
          .toISOString()
          .slice(0, 10),
      theme: d?.theme ?? `Day ${i + 1}`,
      blocks: Array.isArray(d?.blocks) ? d.blocks : [],
      kidFriendlySummary: d?.kidFriendlySummary ?? "",
    })),
  });
}
