// GET /api/guides/search?q=&city=&tag=
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十三节第五条 + 附录 C
// 单一搜索框 + 实体识别：
//   - 搜攻略标题/正文（LIKE）
//   - 搜城市名 → 返回 City 列表
//   - 搜景点名 → 返回 Spot 列表
// 攻略优先排序（命中 title 权重高），其他次之。

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAX_RESULTS = 30;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const pr = url.searchParams.get("pr") ?? undefined; // type filter: guide/city/spot

  const itemTypesToRun: string[] = pr
    ? [pr]
    : ["guide", "city", "spot", "hotel"];

  const results: Array<{
    type: "guide" | "city" | "spot" | "hotel" | "restaurant";
    id: string;
    title: string;
    subtitle?: string;
    matchScore?: number;
  }> = [];

  // 1. 攻略搜索（命中 title 比 contentHtml 权重高）
  if (itemTypesToRun.includes("guide")) {
    const guides = await prisma.guide.findMany({
      where: {
        status: "published",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
          { contentHtml: { contains: q, mode: "insensitive" } },
        ],
      },
      take: MAX_RESULTS,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        days: true,
        cityId: true,
        city: { select: { name: true } },
      },
    });
    for (const g of guides) {
      results.push({
        type: "guide",
        id: g.id,
        title: g.title,
        subtitle: `${g.city?.name ?? ""}${g.days ? ` · ${g.days} 天` : ""}`,
        matchScore:
          g.title.includes(q) ? 3
          : g.tags?.includes?.(q) ? 2
          : 1,
      });
    }
  }

  // 2. 城市搜索
  if (itemTypesToRun.includes("city")) {
    const cities = await prisma.city.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
      select: { id: true, name: true, province: true, kidHook: true },
    });
    for (const c of cities) {
      results.push({
        type: "city",
        id: c.id,
        title: c.name,
        subtitle: c.province ?? c.kidHook ?? "",
        matchScore: 2,
      });
    }
  }

  // 3. 景点搜索
  if (itemTypesToRun.includes("spot")) {
    const spots = await prisma.spot.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
      select: {
        id: true,
        name: true,
        city: { select: { name: true } },
        kidHighlights: true,
      },
    });
    for (const s of spots) {
      results.push({
        type: "spot",
        id: s.id,
        title: s.name,
        subtitle: `${s.city?.name ?? ""}${s.kidHighlights ? " · " + s.kidHighlights.slice(0, 30) : ""}`,
        matchScore: 1,
      });
    }
  }

  // 4. 餐厅 + 酒店（同景点逻辑）
  if (itemTypesToRun.includes("restaurant")) {
    const rs = await prisma.restaurant.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true, city: { select: { name: true } } },
    });
    for (const r of rs) {
      results.push({
        type: "restaurant",
        id: r.id,
        title: r.name,
        subtitle: r.city?.name ?? "",
        matchScore: 1,
      });
    }
  }
  if (itemTypesToRun.includes("hotel")) {
    const hs = await prisma.hotel.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true, city: { select: { name: true } } },
    });
    for (const h of hs) {
      results.push({
        type: "hotel",
        id: h.id,
        title: h.name,
        subtitle: h.city?.name ?? "",
        matchScore: 1,
      });
    }
  }

  results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return NextResponse.json({ items: results.slice(0, MAX_RESULTS) });
}
