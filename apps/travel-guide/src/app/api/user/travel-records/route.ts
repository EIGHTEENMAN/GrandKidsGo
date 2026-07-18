// GET /api/user/travel-records — 旅行明细列表
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 C USER 类

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED" } },
      { status: 401 },
    );
  }
  const items = await prisma.planRecord.findMany({
    where: { userId, status: { in: ["completed", "published"] } },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      cityId: true,
      startDate: true,
      endDate: true,
      childAges: true,
      travelStyle: true,
      title: true,
      city: { select: { name: true, kidHook: true, momHook: true } },
    },
  });

  return NextResponse.json({
    items: items.map((p: any) => ({
      id: p.id,
      cityId: p.cityId,
      cityName: p.city?.name ?? "未选城市",
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate.toISOString().slice(0, 10),
      childAges: p.childAges,
      travelStyle: p.travelStyle,
      title: p.title,
    })),
  });
}
