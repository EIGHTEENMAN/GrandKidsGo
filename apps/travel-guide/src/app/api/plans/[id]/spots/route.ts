// GET /api/plans/[id]/spots — plan 引用的所有 spots + 孩子专题字段
// PR2 P2：用于 /plan/[id] 详情页「孩子专题板块」
// 返回：
//   - spots: array of { id, name, kidHighlights, momHighlights, dadHighlights, tips, pitfalls,
//                       recommendedMonths, durationMinutes, kidScore, momScore, dadScore, images, tags, address, phone }
//   - per-day breakdown（days 字段含每个 block 对应的 spot 信息）
//   - summary: { totalSpots, avgKidScore, hasStrollerIssue, hasStrollerFriendly }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const plan = await prisma.planRecord.findUnique({
    where: { id: params.id },
    select: { id: true, timelineBlocks: true },
  });
  if (!plan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "计划不存在" } },
      { status: 404 },
    );
  }

  // 抽取 plan 中所有 block 引用的 spotId
  const spotIds = new Set<string>();
  const tbs = Array.isArray(plan.timelineBlocks) ? (plan.timelineBlocks as any[]) : [];
  for (const day of tbs) {
    const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
    for (const b of blocks) {
      if (typeof b?.spotId === "string" && b.spotId) spotIds.add(b.spotId);
    }
  }

  if (spotIds.size === 0) {
    return NextResponse.json({
      code: "OK",
      data: { spots: [], summary: { totalSpots: 0, avgKidScore: null, hasStrollerIssue: false, hasStrollerFriendly: false }, perDay: [] },
    });
  }

  const spots = await prisma.spot.findMany({
    where: { id: { in: Array.from(spotIds) } },
    select: {
      id: true,
      name: true,
      kidHighlights: true,
      momHighlights: true,
      dadHighlights: true,
      tips: true,
      pitfalls: true,
      recommendedMonths: true,
      durationMinutes: true,
      kidScore: true,
      momScore: true,
      dadScore: true,
      images: true,
      tags: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      spotType: true,
      // P2 v3 新字段
      ticketPrice: true,
      openHours: true,
      nearbyFacilities: true,
    },
  });

  // 每个 spot 的"孩子友好度评分"
  const scores = spots.map(s => s.kidScore ?? 0).filter(n => n > 0);
  const avgKidScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  // 推车友好度启发：tags 含 '推车可达' 或 kidScore >= 4.5
  const hasStrollerFriendly = spots.some(s =>
    (s.tags ?? []).some(t => /推车|stroller/i.test(t)) || (s.kidScore ?? 0) >= 4.5
  );
  const hasStrollerIssue = spots.some(s =>
    (s.tags ?? []).some(t => /台阶|楼梯|山路|无障碍|轮椅/i.test(t)) && !hasStrollerFriendly
  );

  // per-day breakdown（含 block 的 transport 数据）
  const perDay = tbs.map((day: any, dayIdx: number) => ({
    dayIndex: dayIdx + 1,
    blocks: (Array.isArray(day?.blocks) ? day.blocks : []).map((b: any) => {
      const spot = spots.find(s => s.id === b.spotId);
      return {
        blockId: b.blockId,
        kind: b.kind,
        title: b.title,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        kidHook: b.kidHook,
        notes: b.notes,
        // P2 v3 块内 transport 信息
        transportMode: b.transportMode,
        trafficMinutes: b.trafficMinutes,
        distanceFromHotel: b.distanceFromHotel,
        parkingInfo: b.parkingInfo,
        nearbyRestaurants: b.nearbyRestaurants,
        spot: spot ? {
          id: spot.id,
          name: spot.name,
          kidHighlights: spot.kidHighlights,
          tips: spot.tips,
          pitfalls: spot.pitfalls,
          durationMinutes: spot.durationMinutes,
          kidScore: spot.kidScore,
          tags: spot.tags,
          address: spot.address,
          phone: spot.phone,
          images: spot.images?.slice(0, 3) ?? [],
          spotType: spot.spotType,
          ticketPrice: spot.ticketPrice,
          openHours: spot.openHours,
          nearbyFacilities: spot.nearbyFacilities,
        } : null,
      };
    }),
  }));

  return NextResponse.json({
    code: "OK",
    data: {
      spots: spots.map(s => ({
        id: s.id,
        name: s.name,
        kidHighlights: s.kidHighlights,
        momHighlights: s.momHighlights,
        dadHighlights: s.dadHighlights,
        tips: s.tips,
        pitfalls: s.pitfalls,
        recommendedMonths: s.recommendedMonths,
        durationMinutes: s.durationMinutes,
        kidScore: s.kidScore,
        momScore: s.momScore,
        dadScore: s.dadScore,
        images: s.images?.slice(0, 3) ?? [],
        tags: s.tags,
        address: s.address,
        phone: s.phone,
        spotType: s.spotType,
        lat: s.lat,
        lng: s.lng,
        // P2 v3 新字段
        ticketPrice: s.ticketPrice,
        openHours: s.openHours,
        nearbyFacilities: s.nearbyFacilities,
      })),
      summary: {
        totalSpots: spots.length,
        avgKidScore,
        hasStrollerFriendly,
        hasStrollerIssue,
      },
      perDay,
    },
  });
}