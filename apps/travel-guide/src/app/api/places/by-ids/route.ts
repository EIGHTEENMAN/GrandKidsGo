// POST /api/places/by-ids — 批量查 spots 详情（preview 页用）
// body: { ids: string[] }
// 返回: { spots: Array<SpotDetail> } — 字段同 /api/places/[type]/[id]

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ids 不能为空" } }, { status: 400 });
    }
    const ids = body.ids.filter((s): s is string => typeof s === "string" && s.length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ spots: [] });
    }
    const rows = await prisma.spot.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        kidHighlights: true,
        momHighlights: true,
        dadHighlights: true,
        tips: true,
        pitfalls: true,
        durationMinutes: true,
        kidScore: true,
        images: true,
        tags: true,
        address: true,
        phone: true,
        ticketPrice: true,
        openHours: true,
        nearbyFacilities: true,
        lat: true,
        lng: true,
      },
    });
    return NextResponse.json({
      code: "OK",
      data: { spots: rows },
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "QUERY_FAILED", message: (e as Error).message } },
      { status: 500 },
    );
  }
}