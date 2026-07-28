// POST /api/plans — 创建计划
// GET /api/plans — 当前用户的计划列表
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 C PLAN 类

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PlanCreateBody {
  userId?: string;
  cityId?: string;
  cityIds?: string[];               // v1: 多城拼接 — primary city 仍走 cityId
  cityNames?: string[];             // 仅用于 title 拼接
  sourceGuideId?: string;
  startDate?: string;
  endDate?: string;
  travelers?: { adults: number; children: number };
  childAges?: number[];
  travelStyle?: string;
  status?: "draft" | "confirmed" | "active" | "completed" | "published";
  title?: string;
  timelineBlocks?: any;  // 来自移动端的 days 数组（v1 简化：作为 JSON 整体存入）
  candidateLabel?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as PlanCreateBody | null;
  if (!body || !body.userId || !body.startDate || !body.endDate) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_FIELDS",
          message: "需 userId / startDate / endDate (cityId 取 cityId 或 cityIds[0])",
        },
      },
      { status: 400 },
    );
  }

  // 多城优先取 cityIds[0]，缺省回退 cityId
  const primaryCityId = body.cityId ?? body.cityIds?.[0];
  if (!primaryCityId) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "需 cityId 或 cityIds[0]" } },
      { status: 400 },
    );
  }

  const childAges = Array.isArray(body.childAges) ? body.childAges : [];
  if (childAges.length === 0) {
    return NextResponse.json(
      { error: { code: "CHILD_REQUIRED", message: "至少 1 个孩子年龄" } },
      { status: 400 },
    );
  }

  // 标题拼接：多城 join
  const defaultTitle = body.cityNames && body.cityNames.length > 0
    ? `${body.cityNames.join(" · ")} ${diffDays(body.startDate, body.endDate)}天行程${body.candidateLabel ? " · " + body.candidateLabel : ""}`
    : body.cityIds && body.cityIds.length > 1
      ? `${body.cityIds.join(" · ")} ${diffDays(body.startDate, body.endDate)}天行程`
      : `${primaryCityId} 行程`;

  const created = await prisma.planRecord.create({
    data: {
      userId: body.userId,
      cityId: primaryCityId,
      sourceGuideId: body.sourceGuideId ?? null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      travelers: body.travelers ?? { adults: 2, children: 1 },
      childAges,
      travelStyle: body.travelStyle ?? null,
      status: body.status ?? "draft",
      title: body.title ?? defaultTitle,
      timelineBlocks: body.timelineBlocks ?? null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json(created);
}

function diffDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return Math.floor((b - a) / 86_400_000) + 1;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status") ?? undefined;
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "userId 必填" } },
      { status: 400 },
    );
  }

  const items = await prisma.planRecord.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { startDate: "desc" },
    take: 50,
    select: {
      id: true,
      cityId: true,
      startDate: true,
      endDate: true,
      status: true,
      title: true,
      childAges: true,
      timelineBlocks: true,        // v1: 用来推算 cityIds（多城拼接存于 JSON 里）
      city: { select: { name: true } },
    },
  });

  // v1：每条 plan 补一个 cityIds[] 字段（从 timelineBlocks JSON 推算）
  const enriched = items.map((p) => {
    const cityIds = extractCityIdsFromBlocks(p.timelineBlocks);
    const primaryCityId = p.cityId;
    return {
      ...p,
      cityIds: cityIds && cityIds.length > 0 ? cityIds : primaryCityId ? [primaryCityId] : [],
      timelineBlocks: undefined,  // 不返回原始大 JSON，减少 payload
    };
  });

  return NextResponse.json({ items: enriched });
}

// 从 TimelineDay[] 提取出现的 cityId（按出现顺序，去重）
function extractCityIdsFromBlocks(blocks: unknown): string[] | null {
  if (!Array.isArray(blocks)) return null;
  const out: string[] = [];
  for (const day of blocks) {
    if (day && typeof day === "object" && "cityId" in (day as any)) {
      const cid = (day as any).cityId;
      if (typeof cid === "string" && !out.includes(cid)) out.push(cid);
    }
    // 也看 day.blocks[].cityId（用于 transit 块归属到 toCityId）
    const innerBlocks = (day as any)?.blocks;
    if (Array.isArray(innerBlocks)) {
      for (const b of innerBlocks) {
        const cid = b?.cityId;
        if (typeof cid === "string" && !out.includes(cid)) out.push(cid);
      }
    }
  }
  return out;
}
