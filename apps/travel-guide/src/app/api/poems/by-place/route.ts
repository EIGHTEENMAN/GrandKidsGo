// GET /api/poems/by-place?type=sight&id=spot-uuid
// 返回该地点关联的所有古诗词
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const POEM_BASE = "https://xueshici.grandand.com/#reader/";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "sight";
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ code: "VALIDATION_ERROR", message: "id 必填" }, { status: 400 });

  // 直接按 placeId 匹配（sight 类型），并扩展同 city
  const place = await prisma.poemLocation.findFirst({ where: { placeType: type, placeId: id } });
  const where: Record<string, unknown> = { placeType: type, placeId: id };
  if (place?.cityId) {
    // OR 查询：同 place + 同 city
    const rows = await prisma.poemLocation.findMany({
      where: { OR: [{ placeType: type, placeId: id }, { cityId: place.cityId }] },
      orderBy: { confidence: "desc" },
    });
    return NextResponse.json({
      code: "OK",
      data: rows.map(r => ({
        poemId: r.poemId, poemTitle: r.poemTitle, poemAuthor: r.poemAuthor,
        linkType: r.linkType, verseLine: r.verseLine, confidence: r.confidence,
        url: `${POEM_BASE}${r.poemId}-1`,
      })),
    });
  }

  const rows = await prisma.poemLocation.findMany({ where, orderBy: { confidence: "desc" } });
  return NextResponse.json({
    code: "OK",
    data: rows.map(r => ({
      poemId: r.poemId, poemTitle: r.poemTitle, poemAuthor: r.poemAuthor,
      linkType: r.linkType, verseLine: r.verseLine, confidence: r.confidence,
      url: `${POEM_BASE}${r.poemId}-1`,
    })),
  });
}