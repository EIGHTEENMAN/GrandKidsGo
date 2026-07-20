// POST /api/wizard/assemble/from-guide
// 详见 项目建设方案/走天下实施方案-v1.5.md 第五节"二引擎 A 拼装引擎 (一)"
//
// 有 sourceGuideId 时：保留源攻略景点清单，按用户新参数微调（重排名 + 重排序），输出单套大纲。
// 实现：读取 sourcePlanRecord 的 timelineBlocks，作为"必现"景点池，融合新参数权重重排。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { assemble } from "@/lib/assembler";
import { TravelParamsSchema } from "@/lib/assembler/types";

const prisma = new PrismaClient();

const Body = z.object({
  sourceGuideId: z.string().uuid(),
  params: TravelParamsSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMS",
          message: "请求体需含 sourceGuideId + params",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const guide = await prisma.guide.findUnique({
    where: { id: parsed.data.sourceGuideId },
    select: {
      id: true,
      cityId: true,
      childAges: true,
      days: true,
      sourcePlanRecordId: true,
      city: { select: { id: true, name: true } },
    },
  });
  if (!guide) {
    return NextResponse.json(
      { error: { code: "GUIDE_NOT_FOUND", message: "sourceGuideId 不存在" } },
      { status: 404 },
    );
  }

  // 强制 cityId 跟随源攻略
  const params = {
    ...parsed.data.params,
    cityId: guide.cityId ?? parsed.data.params.cityId,
  };

  try {
    // 当前只复用 cityId，不复用 planRecord 的 timelineBlocks（v1 简化为"重新拼"）
    // v1.5 后端可读 sourcePlanRecordId 复用点位，那时再加 — 见 #13-T2
    const outline = await assemble(params);
    return NextResponse.json({
      outline: {
        ...outline,
        forkedFrom: guide.id,
        cityName: guide.city?.name ?? outline.cityName,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "ASSEMBLE_FAILED", message: (e as Error).message } },
      { status: 500 },
    );
  }
}
