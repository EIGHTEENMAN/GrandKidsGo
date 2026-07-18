// GET /api/cities — 列出已初始化城市
// 详见 项目建设方案/走天下实施方案-v1.5.md 第四节 + 附录 C

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cities = await prisma.city.findMany({
    select: {
      id: true,
      name: true,
      province: true,
      coverImage: true,
      kidHook: true,
      momHook: true,
      dadHook: true,
      tags: true,
      bestSeasons: true,
      lat: true,
      lng: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ code: "OK", data: cities });
}
