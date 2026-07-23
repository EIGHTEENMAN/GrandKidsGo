// GET /api/poems/by-poem?poemId=1
// 返回该古诗词关联的走天下地点/攻略
// 供学诗词 reader 底部'也在这个地方'板块调用
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TRAVEL_BASE = "https://travel.grandand.com";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const poemId = Number(url.searchParams.get("poemId"));
  if (!poemId) return NextResponse.json({ code: "VALIDATION_ERROR", message: "poemId 必填" }, { status: 400 });

  const rows = await prisma.poemLocation.findMany({
    where: { poemId },
    orderBy: { confidence: "desc" },
    take: 10,
  });

  const data = rows.map((r) => ({
    placeId: r.placeId,
    placeType: r.placeType,
    placeName: r.placeName,
    linkType: r.linkType,
    url: `${TRAVEL_BASE}/place/${r.placeType}/${r.placeId}`,
  }));

  return NextResponse.json({ code: "OK", data });
}