// 拼装引擎 A — 5 步流水线编排
// 详见 项目建设方案/走天下实施方案-v1.5.md 第五节（第七二~六二二行）

import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import type {
  CandidateOutline,
  CandidateRhythm,
  CandidateStyle,
  ChildProfile,
  PlanOutline,
  TimelineBlock,
  TimelineDay,
  TravelParams,
} from "./types";
import { scoreAll, type ElementScores } from "./scorer";

const prisma = new PrismaClient();

const STYLES: CandidateStyle[] = ["time_saver", "money_saver", "comfort"];
const RHYTHMS: CandidateRhythm[] = ["compact", "balanced", "relaxed"];

interface LoadedData {
  city: { id: string; name: string };
  spots: Array<{
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    kidHighlights: string | null;
    momHighlights: string | null;
    dadHighlights: string | null;
    tips: string | null;
    pitfalls: string | null;
    spotType: string | null;
    durationMinutes: number | null;
    kidScore: number | null;
    momScore: number | null;
    dadScore: number | null;
    tags: string[];
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    hasHighChair: boolean;
    isKidTolerant: boolean;
    hasKidsMenu: boolean;
    avgPricePerPerson: number | null;
    tags: string[];
  }>;
  hotels: Array<{
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    hasFamilyRoom: boolean;
    hasKidsPool: boolean;
    avgPricePerNight: number | null;
    tags: string[];
  }>;
  parks: Array<{
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    hasKidsPlayArea: boolean;
  }>;
  childFeelingData: Map<string, { feelingMatch: number }>; // spotId → 匹配度
}

export async function assemble(params: TravelParams): Promise<PlanOutline> {
  const t0 = performance.now();
  // 步骤 1：孩子画像匹配
  validateChildren(params.childProfiles);

  // 加载该城市的 6 库联动数据
  const data = await loadAll(params);
  if (data.spots.length === 0) {
    throw new Error(`City ${params.cityId} 无可用景点数据`);
  }

  // 步骤 2：模板选择（v1 简化为：用天数 + 是否连程构造模板）
  const template = selectTemplate(params);

  // 步骤 3：多库联动筛选 + 多要素排序
  const days = params.endDate && params.startDate
    ? diffDaysInclusive(params.startDate, params.endDate)
    : template.days;

  // 步骤 4：连程衔接校验（v1 简化：跨城天数按 cityIds 切分）
  // 步骤 5：节奏调整 + 三档输出
  const candidates: CandidateOutline[] = [];
  for (const style of STYLES) {
    for (const rhythm of RHYTHMS) {
      candidates.push(
        buildCandidate(params, data, style, rhythm, days),
      );
    }
  }
  // 同一 style 内部按节奏选最优一份（一档一份，3 档 = 3 份）
  const top3 = STYLES.map(
    (style) =>
      candidates
        .filter((c) => c.style === style)
        .sort((a, b) => totalScore(b) - totalScore(a))[0]!,
  );

  const t1 = performance.now();
  if (process.env.NODE_ENV === "production") {
    console.log(`[assembler] ${(t1 - t0).toFixed(0)}ms`);
  }

  return {
    cityId: params.cityId,
    cityName: data.city.name,
    generatedAt: new Date().toISOString(),
    candidates: top3,
  };
}

async function loadAll(params: TravelParams): Promise<LoadedData> {
  const city = await prisma.city.findUnique({
    where: { id: params.cityId },
    select: { id: true, name: true },
  });
  if (!city) throw new Error(`City ${params.cityId} not found`);

  const [spots, restaurants, hotels, parks] = await Promise.all([
    prisma.spot.findMany({
      where: { cityId: params.cityId },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        kidHighlights: true,
        momHighlights: true,
        dadHighlights: true,
        tips: true,
        pitfalls: true,
        spotType: true,
        durationMinutes: true,
        kidScore: true,
        momScore: true,
        dadScore: true,
        tags: true,
      },
    }),
    prisma.restaurant.findMany({
      where: { cityId: params.cityId },
      select: {
        id: true, name: true, lat: true, lng: true,
        hasHighChair: true, isKidTolerant: true, hasKidsMenu: true,
        avgPricePerPerson: true, tags: true,
      },
    }),
    prisma.hotel.findMany({
      where: { cityId: params.cityId },
      select: {
        id: true, name: true, lat: true, lng: true,
        hasFamilyRoom: true, hasKidsPool: true,
        avgPricePerNight: true, tags: true,
      },
    }),
    prisma.park.findMany({
      where: { cityId: params.cityId },
      select: { id: true, name: true, lat: true, lng: true, hasKidsPlayArea: true },
    }),
  ]);

  // 感受画像匹配：v1 简化，没真实数据时给空 Map（key=spotId）
  const childFeelingData = new Map<string, { feelingMatch: number }>();
  if (params.hasChildFeelingProfile) {
    // 此处接入 ChildFeelingProfile 聚合查询，留接口待 #13-T2 完善
    // 占位：所有 spot 给 0.5
    for (const s of spots) childFeelingData.set(s.id, { feelingMatch: 0.5 });
  }

  return { city, spots, restaurants, hotels, parks, childFeelingData };
}

function validateChildren(children: ChildProfile[]): void {
  if (!children || children.length === 0) {
    throw new Error("至少需要一份孩子画像（ChildProfile）");
  }
  for (const c of children) {
    if (!c.childId || !c.name) {
      throw new Error("ChildProfile 缺 childId 或 name");
    }
  }
}

function selectTemplate(_params: TravelParams): { days: number } {
  // v1 简化：根据 endDate - startDate 推 days；fallback 3 天
  return { days: 3 };
}

function buildCandidate(
  params: TravelParams,
  data: LoadedData,
  style: CandidateStyle,
  rhythm: CandidateRhythm,
  days: number,
): CandidateOutline {
  const child = params.childProfiles[0]!;
  const blocksPerDay = rhythm === "compact" ? 3 : rhythm === "balanced" ? 2 : 2;
  const timeBlocks: TimelineDay[] = [];

  let cursor = 0;
  let lastPosition: { lat: number; lng: number } | null = null;
  let totalCost = 0;
  let totalActiveHours = 0;

  // 按候选池分数排序取 top spots
  const rankedSpots = rankSpotsForStyle(data.spots, child, style, rhythm, data.childFeelingData);

  const totalSlotPerDay = rhythm === "compact" ? 4 : 3;

  for (let day = 0; day < days; day++) {
    const dayBlocks: TimelineBlock[] = [];
    let blockCursor = 9 * 60; // 09:00 出发（分钟）
    let dayCost = 0;

    if (child.needNap !== "none" && rhythm !== "compact") {
      // 午休块
      dayBlocks.push({
        blockId: `d${day}-nap`,
        kind: "rest",
        startMinutes: 12 * 60 + 30,
        endMinutes: 14 * 60,
        title: "午休 / 能量恢复",
        restReason: "nap",
      });
      blockCursor = 14 * 60 + 30;
    }

    for (let slot = 0; slot < blocksPerDay; slot++) {
      const candidate = rankedSpots[cursor++];
      if (!candidate) break;

      // 接驳时长（基于经纬度估算）
      const transit = lastPosition && candidate.lat && candidate.lng && lastPosition
        ? haversineMinutes(lastPosition, { lat: candidate.lat, lng: candidate.lng })
        : 15;
      lastPosition = candidate.lat && candidate.lng
        ? { lat: candidate.lat, lng: candidate.lng }
        : lastPosition;

      const scoreDetail = data.childFeelingData.get(candidate.id)?.feelingMatch ?? 0;
      const childAgeMonths = approxChildAgeMonths(child);

      const inp = {
        spotScore: candidate.kidScore ?? 4.0,
        sameDayBlocks: dayBlocks,
        transitMinutesFromPrev: transit,
        photoWorthiness: candidate.momScore ? candidate.momScore / 5 : 0.7,
        priceCents: (candidate.durationMinutes ?? 60) * 100,
        budgetLevel: params.budgetLevel,
        ageFit: ageFitFromSpotType(candidate.spotType, childAgeMonths),
        likesMatch: matchLikes(candidate.tags, child.likes),
        timeFit: 0.85,
        feelingMatch: scoreDetail,
        hasFeelingProfile: params.hasChildFeelingProfile,
        rhythm,
        style,
      };
      const scores = scoreAll(inp);

      const start = blockCursor + Math.ceil(transit);
      const dur = candidate.durationMinutes ?? 90;
      const end = start + dur;

      dayBlocks.push({
        blockId: `d${day}-b${slot}`,
        kind: "spot",
        startMinutes: start,
        endMinutes: end,
        title: candidate.name,
        spotId: candidate.id,
        cityId: params.cityId,
        kidHook: candidate.kidHighlights ?? undefined,
        notes: candidate.pitfalls ?? undefined,
        scoreDetail: {
          evaluation: scores.evaluation,
          route: scores.route,
          cost: scores.cost,
          time: scores.time,
          photoWorthy: scores.photoWorthy,
          feelingMatch: scores.feelingMatch,
          composite: scores.composite,
        },
      });
      blockCursor = end + 15; // 15 分钟缓冲
      dayCost += inp.priceCents;
      totalActiveHours += dur / 60;
    }

    // 餐厅块（中午固定）
    const restaurant = pickRestaurant(data.restaurants, day, style);
    if (restaurant) {
      const tStart = rhythm === "compact" ? 12 * 60 : 11 * 60 + 30;
      const tEnd = tStart + 75;
      dayBlocks.push({
        blockId: `d${day}-lunch`,
        kind: "restaurant",
        startMinutes: tStart,
        endMinutes: tEnd,
        title: restaurant.name,
        restaurantId: restaurant.id,
        kidHook: restaurant.hasKidsMenu ? "有儿童菜单" : restaurant.hasHighChair ? "有儿童餐椅" : undefined,
      });
      dayCost += (restaurant.avgPricePerPerson ?? 80) * 100 * params.travelers.adults;
    }

    dayBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

    timeBlocks.push({
      dayIndex: day + 1,
      date: addDaysISO(params.startDate, day),
      theme: `Day ${day + 1} · ${rankedSpots[cursor - blocksPerDay]?.name ?? "探索"}周边`,
      blocks: dayBlocks,
      totalWalkMinutes: 0,
      totalCostCents: dayCost,
      cityId: params.cityId,
      kidFriendlySummary: `共 ${dayBlocks.filter((b) => b.kind === "spot").length} 个景点，已为 ${child.name} 过滤`,
    });
    totalCost += dayCost;
    void totalSlotPerDay;
  }

  return {
    style,
    rhythm,
    label: `${labelFor(style)} · ${labelForRhythm(rhythm)}`,
    whyThisPlan: whyFor(style, child, data),
    totalCostCents: totalCost,
    totalDays: days,
    totalActiveHours: Math.round(totalActiveHours * 10) / 10,
    days: timeBlocks,
  };
}

function rankSpotsForStyle(
  spots: LoadedData["spots"],
  child: ChildProfile,
  style: CandidateStyle,
  rhythm: CandidateRhythm,
  feelingMap: Map<string, { feelingMatch: number }>,
): Array<LoadedData["spots"][number] & { _score: number }> {
  const childAgeMonths = approxChildAgeMonths(child);
  return spots
    .map((s) => {
      const inp = {
        spotScore: s.kidScore ?? 4.0,
        sameDayBlocks: [],
        transitMinutesFromPrev: 15,
        photoWorthiness: (s.momScore ?? 4) / 5,
        priceCents: 10000,
        budgetLevel: "balanced" as const,
        ageFit: ageFitFromSpotType(s.spotType, childAgeMonths),
        likesMatch: matchLikes(s.tags, child.likes),
        timeFit: 0.85,
        feelingMatch: feelingMap.get(s.id)?.feelingMatch ?? 0,
        hasFeelingProfile: feelingMap.size > 0,
        rhythm,
        style,
      };
      const sc = scoreAll(inp);
      return { ...s, _score: sc.composite };
    })
    .sort((a, b) => b._score - a._score);
}

function ageFitFromSpotType(spotType: string | null, childAgeMonths: number): number {
  if (!spotType) return 0.7;
  const code = spotType.slice(0, 6);
  // 1101 = 动物园/公园类，1401 = 博物馆，1402 = 科技馆，1403 = 水族馆
  if (code.startsWith("11")) return childAgeMonths < 12 ? 0.9 : 0.8;
  if (code.startsWith("1402") || code.startsWith("1403")) return childAgeMonths >= 36 ? 0.95 : 0.6;
  if (code.startsWith("1401")) return childAgeMonths >= 60 ? 0.9 : 0.7;
  return 0.7;
}

function matchLikes(spotTags: string[], childLikes: string[]): number {
  if (childLikes.length === 0) return 0.5;
  const inter = spotTags.filter((t) => childLikes.includes(t)).length;
  return Math.min(1, inter / Math.max(1, childLikes.length));
}

function pickRestaurant(
  list: LoadedData["restaurants"],
  day: number,
  style: CandidateStyle,
): LoadedData["restaurants"][number] | null {
  if (list.length === 0) return null;
  // 简单轮转 + style 倾向：money_saver 优先 hasKidsMenu；comfort 优先 hasHighChair
  const sorted = [...list].sort((a, b) => {
    if (style === "money_saver") {
      return Number(b.hasKidsMenu) - Number(a.hasKidsMenu);
    }
    if (style === "comfort") {
      return Number(b.hasHighChair) - Number(a.hasHighChair);
    }
    return 0;
  });
  return sorted[day % sorted.length] ?? null;
}

function labelFor(s: CandidateStyle): string {
  return s === "time_saver" ? "省时档" : s === "money_saver" ? "省钱档" : "舒服档";
}
function labelForRhythm(r: CandidateRhythm): string {
  return r === "compact" ? "紧凑" : r === "balanced" ? "平衡" : "宽松";
}

function whyFor(style: CandidateStyle, child: ChildProfile, data: LoadedData): string {
  const topSpots = data.spots
    .slice(0, 3)
    .map((s) => s.name)
    .join("、");
  if (style === "time_saver") return `优先压缩接驳时长，行程紧凑，${topSpots}。适合假期短的 ${child.name} 家庭。`;
  if (style === "money_saver") return `优先公共交通/平价餐厅，儿童菜单友好。${topSpots}。`;
  return `优先长停留 + 午休，${topSpots} 等留出充足玩的时间。`;
}

function approxChildAgeMonths(child: ChildProfile): number {
  if (!child.birthDate) return 36; // 默认 3 岁
  const ms = Date.now() - new Date(child.birthDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

function diffDaysInclusive(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return Math.floor((b - a) / 86_400_000) + 1;
}

function addDaysISO(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function totalScore(c: CandidateOutline): number {
  return c.days.reduce(
    (sum, day) =>
      sum +
      day.blocks.reduce((s, b) => s + (b.scoreDetail?.composite ?? 0), 0),
    0,
  );
}

function haversineMinutes(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(sa));
  // 假设平均 30 km/h，含市内路况
  return Math.max(5, Math.round((km / 30) * 60));
}
