// 拼装引擎 A — 5 步流水线编排
// 详见 项目建设方案/走天下实施方案-v1.5.md 第五节
//
// v1 多城拼接扩展（2026-07-28）：
// - cities[] 接 ≥1 城，按顺序拼接
// - 跨城日：Transit block（haversine + 阈值选 mode）+ Hotel block（按 kid-friendly 评分）
// - 多城 spot 池独立 per city，按 spots 密度启发分配天数
// - 向后兼容：cities 缺省时退化为单城模式（= [cityId]）
// - 注意：Hotel 表当前 0 行（pipeline 未写 hotel.json），pickHotel 返回 null 时走"过夜：待订"占位
// - 注意：Transit 时长为 haversine 估值，PR2 起接 AMAP/12306 真实数据

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
  TransitMode,
  TravelParams,
} from "./types";
import { scoreAll, type ElementScores } from "./scorer";

const prisma = new PrismaClient();

const STYLES: CandidateStyle[] = ["time_saver", "money_saver", "comfort"];
const RHYTHMS: CandidateRhythm[] = ["compact", "balanced", "relaxed"];

// ---------------------------------------------------------------------------
// 多城 + 单城共用类型
// ---------------------------------------------------------------------------
interface LoadedSpot {
  id: string;
  cityId?: string;                 // 多城加载时携带；单城路径下 undefined
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
}
interface LoadedRestaurant {
  id: string;
  cityId?: string;
  name: string;
  lat: number | null;
  lng: number | null;
  hasHighChair: boolean;
  isKidTolerant: boolean;
  hasKidsMenu: boolean;
  avgPricePerPerson: number | null;
  tags: string[];
}
interface LoadedHotel {
  id: string;
  cityId?: string;
  name: string;
  lat: number | null;
  lng: number | null;
  hasFamilyRoom: boolean;
  hasKidsPool: boolean;
  avgPricePerNight: number | null;
  tags: string[];
}

interface LoadedData {
  city: { id: string; name: string };                  // primary（首站）
  // 多城拼接 (v1) — 单城时只有 1 个 key
  cityById: Record<string, { id: string; name: string; lat: number | null; lng: number | null }>;
  spotsByCity: Record<string, LoadedSpot[]>;
  restaurantsByCity: Record<string, LoadedRestaurant[]>;
  hotelsByCity: Record<string, LoadedHotel[]>;
  // 兼容旧 buildCandidate：给出 primary 城的扁平数组
  spots: LoadedSpot[];
  restaurants: LoadedRestaurant[];
  hotels: LoadedHotel[];
  parks: Array<{ id: string; name: string; lat: number | null; lng: number | null; hasKidsPlayArea: boolean }>;
  childFeelingData: Map<string, { feelingMatch: number }>;
}

interface CityAllocation {
  cityId: string;
  days: number;
}

interface TransitPair {
  fromCityId: string;
  toCityId: string;
  mode: TransitMode;
  minutes: number;
  distanceKm: number;
}

// 启发分配（v1）：不接 LLM，按 spots 密度 + 跨城预留
const MIN_DAYS_PER_CITY = 1;
const MAX_DAYS_PER_CITY = 6;
const TRANSIT_OVERHEAD_DAYS_PER_LEG = 0.5;
const KIDS_BIAS_FACTOR = 0.1;

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------
export async function assemble(params: TravelParams): Promise<PlanOutline> {
  const t0 = performance.now();
  validateChildren(params.childProfiles);

  // 决定要访问的城市列表（向后兼容：cities 缺省 = [cityId]）
  const citiesToVisit: string[] =
    params.cities && params.cities.length > 0 ? params.cities : [params.cityId];

  // 一次性加载多城数据
  const data = await loadAllMulti(citiesToVisit);

  // 校验：每个被选城必须有 ≥1 个 spot
  for (const cityId of citiesToVisit) {
    if ((data.spotsByCity[cityId] ?? []).length === 0) {
      const cityName = data.cityById[cityId]?.name ?? cityId;
      throw new Error(`城市「${cityName}」暂无景点数据，请换一城`);
    }
  }

  // 总天数
  const totalDays =
    params.endDate && params.startDate
      ? diffDaysInclusive(params.startDate, params.endDate)
      : 3;

  // 多城天数分配
  const spotsCounts: Record<string, number> = {};
  for (const cityId of citiesToVisit) {
    spotsCounts[cityId] = (data.spotsByCity[cityId] ?? []).length;
  }
  const allocation = computeCityAllocation(citiesToVisit, spotsCounts, totalDays);

  // 跨城 transit 信息
  const transitPairs: TransitPair[] = citiesToVisit.slice(0, -1).map((fromCityId, i) => {
    const toCityId = citiesToVisit[i + 1]!;
    const from = data.cityById[fromCityId]!;
    const to = data.cityById[toCityId]!;
    const transit = getTransitModeAndMinutes(from, to);
    return { fromCityId, toCityId, ...transit };
  });

  // 9 套候选（3 style × 3 rhythm），按 style 取最优一份
  const candidates: CandidateOutline[] = [];
  for (const style of STYLES) {
    for (const rhythm of RHYTHMS) {
      candidates.push(
        buildMultiCityCandidate(params, data, style, rhythm, allocation, transitPairs),
      );
    }
  }
  const top3 = STYLES.map(
    (style) =>
      candidates
        .filter((c) => c.style === style)
        .sort((a, b) => totalScore(b) - totalScore(a))[0]!,
  );

  const t1 = performance.now();
  if (process.env.NODE_ENV === "production") {
    console.log(`[assembler] ${(t1 - t0).toFixed(0)}ms multi=${citiesToVisit.length}`);
  }

  return {
    cityId: citiesToVisit[0]!,
    cityName: data.cityById[citiesToVisit[0]!]!.name,
    cityIds: citiesToVisit,
    cityNames: citiesToVisit.map((id) => data.cityById[id]!.name),
    generatedAt: new Date().toISOString(),
    candidates: top3,
  };
}

// ---------------------------------------------------------------------------
// 多城数据加载：一次性查 N 城 × 3 表（spot/restaurant/hotel）。
// 复刻旧 loadAll 的字段选择 + 加 per-city 分桶。
// ---------------------------------------------------------------------------
async function loadAllMulti(cityIds: string[]): Promise<LoadedData> {
  if (cityIds.length === 0) throw new Error("至少需要 1 个目的地城市");

  const cities = await prisma.city.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, name: true, lat: true, lng: true },
  });
  if (cities.length !== cityIds.length) {
    const found = new Set(cities.map((c) => c.id));
    const missing = cityIds.find((id) => !found.has(id));
    throw new Error(`City ${missing ?? "(unknown)"} not found`);
  }
  // 按用户传入的顺序排（prisma findMany 不保证 in 顺序）
  const sortedCities = cityIds.map((id) => cities.find((c) => c.id === id)!);

  const [allSpots, allRestaurants, allHotels] = await Promise.all([
    prisma.spot.findMany({
      where: { cityId: { in: cityIds } },
      select: {
        id: true, cityId: true, name: true, lat: true, lng: true,
        kidHighlights: true, momHighlights: true, dadHighlights: true,
        tips: true, pitfalls: true, spotType: true, durationMinutes: true,
        kidScore: true, momScore: true, dadScore: true, tags: true,
      },
    }),
    prisma.restaurant.findMany({
      where: { cityId: { in: cityIds } },
      select: {
        id: true, cityId: true, name: true, lat: true, lng: true,
        hasHighChair: true, isKidTolerant: true, hasKidsMenu: true,
        avgPricePerPerson: true, tags: true,
      },
    }),
    prisma.hotel.findMany({
      where: { cityId: { in: cityIds } },
      select: {
        id: true, cityId: true, name: true, lat: true, lng: true,
        hasFamilyRoom: true, hasKidsPool: true,
        avgPricePerNight: true, tags: true,
      },
    }),
  ]);

  // 按 cityId 分桶
  const spotsByCity: Record<string, LoadedSpot[]> = {};
  const restaurantsByCity: Record<string, LoadedRestaurant[]> = {};
  const hotelsByCity: Record<string, LoadedHotel[]> = {};
  for (const id of cityIds) {
    spotsByCity[id] = [];
    restaurantsByCity[id] = [];
    hotelsByCity[id] = [];
  }
  for (const s of allSpots) {
    const arr = spotsByCity[s.cityId!];
    if (arr) arr.push(s);
  }
  for (const r of allRestaurants) {
    const arr = restaurantsByCity[r.cityId!];
    if (arr) arr.push(r);
  }
  for (const h of allHotels) {
    const arr = hotelsByCity[h.cityId!];
    if (arr) arr.push(h);
  }

  const cityById: Record<string, { id: string; name: string; lat: number | null; lng: number | null }> = {};
  for (const c of sortedCities) cityById[c.id] = c;

  // 感受画像占位（同原 loadAll 行为）
  const childFeelingData = new Map<string, { feelingMatch: number }>();
  if (allSpots.length > 0 && (allSpots[0] as any).cityId) {
    // v1 占位：hasChildFeelingProfile=true 时给所有 spot 0.5 匹配度
    // （原本在 loadAll 内部；这里简化处理：assemble() 入参已知，外部判断）
  }

  // primary = 首站
  const primaryId = cityIds[0]!;
  return {
    city: { id: primaryId, name: cityById[primaryId]!.name },
    cityById,
    spotsByCity,
    restaurantsByCity,
    hotelsByCity,
    spots: spotsByCity[primaryId] ?? [],
    restaurants: restaurantsByCity[primaryId] ?? [],
    hotels: hotelsByCity[primaryId] ?? [],
    parks: [],
    childFeelingData,
  };
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

// ---------------------------------------------------------------------------
// 多城天数分配（启发式 v1；PR2 起接 LLM）
// 规则：
//   - 每城至少 MIN_DAYS_PER_CITY=1 天，最多 MAX_DAYS_PER_CITY=6
//   - 多城时扣减跨城预留（每段 0.5 天）
//   - 剩余按 spots 密度 + kid-friendly bias 加权均分
//   - 余数回到首城
// ---------------------------------------------------------------------------
export function computeCityAllocation(
  cityIds: string[],
  spotsCounts: Record<string, number>,
  totalDays: number,
): CityAllocation[] {
  if (cityIds.length === 0) return [];
  if (cityIds.length === 1) {
    return [{ cityId: cityIds[0]!, days: Math.max(MIN_DAYS_PER_CITY, totalDays) }];
  }

  // 跨城预留：每段 0.5 天，按 ceil 算（保证至少 1 天留给转场）
  const transitOverhead = Math.ceil(TRANSIT_OVERHEAD_DAYS_PER_LEG * (cityIds.length - 1));
  const remaining = Math.max(totalDays - transitOverhead, cityIds.length * MIN_DAYS_PER_CITY);

  const weights = cityIds.map((id) => {
    const spots = spotsCounts[id] ?? 0;
    // kid bias：spots 数 ≥3 才轻微加权（鼓励高 spot 密度的城）
    const kidBias = spots >= 3 ? 1 + KIDS_BIAS_FACTOR : 1;
    return Math.max(1, spots) * kidBias;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const daysPerCity = cityIds.map((_, i) => {
    const share = (weights[i]! / totalWeight) * remaining;
    return clamp(MIN_DAYS_PER_CITY, MAX_DAYS_PER_CITY, Math.round(share));
  });

  // 校验 sum(daysPerCity) ≤ totalDays（含 transit），差值回到首城
  const sumAlloc = daysPerCity.reduce((a, b) => a + b, 0);
  const expectedTotal = totalDays - transitOverhead;
  const diff = expectedTotal - sumAlloc;
  if (diff !== 0) {
    daysPerCity[0] = clamp(
      MIN_DAYS_PER_CITY,
      MAX_DAYS_PER_CITY,
      daysPerCity[0]! + diff,
    );
  }

  return cityIds.map((id, i) => ({ cityId: id, days: daysPerCity[i]! }));
}

// 自动推荐总天数（v1）：按 spots 数 + 跨城预留
export function autoSuggestTotalDays(
  cityIds: string[],
  spotsCounts: Record<string, number>,
): number {
  if (cityIds.length === 0) return 3;
  const base = cityIds.reduce((sum, id) => {
    const spots = spotsCounts[id] ?? 0;
    return sum + Math.max(2, Math.round(spots * 0.4 + 1));
  }, 0);
  const overhead = cityIds.length > 1
    ? Math.ceil(TRANSIT_OVERHEAD_DAYS_PER_LEG * (cityIds.length - 1))
    : 0;
  return clamp(2, 21, base + overhead);
}

// ---------------------------------------------------------------------------
// 跨城交通启发（v1）
// 阈值：<2km walk / 2-50km drive / 50-300km HSR / ≥300km flight
// 时长：mode-specific 平均速度 + 接驳预留
// PR2 起接入 AMAP 公交 API 或 12306 真实数据
// ---------------------------------------------------------------------------
export function getTransitModeAndMinutes(
  from: { lat: number | null; lng: number | null; name?: string },
  to: { lat: number | null; lng: number | null; name?: string },
): { mode: TransitMode; minutes: number; distanceKm: number } {
  if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
    // 数据缺失：fallback 到 drive 中位估算
    return { mode: "drive", minutes: 180, distanceKm: 120 };
  }
  const dKm = haversineKm(from.lat, from.lng, to.lat, to.lng);
  if (dKm < 2) {
    return { mode: "walk", minutes: Math.max(10, Math.round((dKm / 5) * 60)), distanceKm: dKm };
  }
  if (dKm < 50) {
    // drive：60 km/h 平均，含市内
    return { mode: "drive", minutes: Math.max(15, Math.round((dKm / 60) * 60)), distanceKm: dKm };
  }
  if (dKm < 300) {
    // high_speed_rail：250 km/h + 60 min 接驳
    return { mode: "high_speed_rail", minutes: Math.round((dKm / 250) * 60) + 60, distanceKm: dKm };
  }
  // flight：600 km/h + 180 min 候机+登机
  return { mode: "flight", minutes: Math.round((dKm / 600) * 60) + 180, distanceKm: dKm };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const sa = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

const TRANSIT_MODE_LABEL: Record<TransitMode, string> = {
  walk: "步行",
  drive: "自驾",
  high_speed_rail: "高铁",
  flight: "飞机",
};

// ---------------------------------------------------------------------------
// 酒店智能选择（v1）
// 评分：hasFamilyRoom*5 + hasKidsPool*4 + hasKidsBreakfast*3 + kids-tag*2
// style 倾向：money_saver → 按 avgPricePerNight 升序；comfort → 按评分降序；time_saver → 同 comfort
// 数据空时返回 null（调用方走"过夜：待订"占位）
// ---------------------------------------------------------------------------
const KIDS_TAG_KEYWORDS = ["亲子", "family", "kids", "儿童", "母婴", "宝贝", "童"];

export function pickHotel(
  hotels: LoadedHotel[],
  style: CandidateStyle,
): LoadedHotel | null {
  if (hotels.length === 0) return null;

  const score = (h: LoadedHotel): number => {
    const hasKidsTag = (h.tags ?? []).some((t) =>
      KIDS_TAG_KEYWORDS.some((k) => t.toLowerCase().includes(k.toLowerCase()))
    );
    return (
      (h.hasFamilyRoom ? 5 : 0) +
      (h.hasKidsPool ? 4 : 0) +
      ((h as any).hasKidsBreakfast ? 3 : 0) +
      (hasKidsTag ? 2 : 0)
    );
  };

  const sorted = [...hotels];
  if (style === "money_saver") {
    sorted.sort((a, b) => {
      const ap = (a.avgPricePerNight ?? 0) - (b.avgPricePerNight ?? 0);
      return ap !== 0 ? ap : score(b) - score(a);
    });
  } else {
    sorted.sort((a, b) => score(b) - score(a));
  }
  return sorted[0] ?? null;
}

// ---------------------------------------------------------------------------
// 多城候选构造（per style × rhythm）
// ---------------------------------------------------------------------------
function buildMultiCityCandidate(
  params: TravelParams,
  data: LoadedData,
  style: CandidateStyle,
  rhythm: CandidateRhythm,
  allocation: CityAllocation[],
  transitPairs: TransitPair[],
): CandidateOutline {
  const child = params.childProfiles[0]!;
  const blocksPerDay = rhythm === "compact" ? 3 : 2;
  const timeBlocks: TimelineDay[] = [];

  let dayIndex = 0;
  let totalCost = 0;
  let totalActiveHours = 0;

  // 选每个城一次 rankedSpots（同一个 candidate 内复用）
  const rankedByCity: Record<string, Array<LoadedSpot & { _score: number }>> = {};
  for (const a of allocation) {
    rankedByCity[a.cityId] = rankSpotsForStyle(
      data.spotsByCity[a.cityId] ?? [],
      child,
      style,
      rhythm,
      data.childFeelingData,
    );
  }

  // 每城的 spot cursor
  const cursorsByCity: Record<string, number> = {};
  for (const a of allocation) cursorsByCity[a.cityId] = 0;

  // 拼接多城
  allocation.forEach((a, cityPos) => {
    const cityId = a.cityId;
    const cityData = rankedByCity[cityId]!;
    for (let d = 0; d < a.days; d++) {
      const dayBlocks: TimelineBlock[] = [];
      let blockCursor = 9 * 60; // 09:00 出发
      let dayCost = 0;

      // 午休块（非 compact 节奏 + 孩子需要午休）
      if (child.needNap !== "none" && rhythm !== "compact") {
        dayBlocks.push({
          blockId: `d${dayIndex}-nap`,
          kind: "rest",
          startMinutes: 12 * 60 + 30,
          endMinutes: 14 * 60,
          title: "午休 / 能量恢复",
          cityId,
          restReason: "nap",
        });
        blockCursor = 14 * 60 + 30;
      }

      // spot blocks
      let lastPosition: { lat: number; lng: number } | null = null;
      for (let slot = 0; slot < blocksPerDay; slot++) {
        const candidate = cityData[cursorsByCity[cityId]!++];
        if (!candidate) break;

        const transit =
          lastPosition && candidate.lat && candidate.lng
            ? spotHaversineMinutes(lastPosition, { lat: candidate.lat, lng: candidate.lng })
            : 15;
        if (candidate.lat && candidate.lng) {
          lastPosition = { lat: candidate.lat, lng: candidate.lng };
        }

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
          hasFeelingProfile: data.childFeelingData.size > 0,
          rhythm,
          style,
        };
        const scores = scoreAll(inp);
        const start = blockCursor + Math.ceil(transit);
        const dur = candidate.durationMinutes ?? 90;
        const end = start + dur;

        dayBlocks.push({
          blockId: `d${dayIndex}-b${slot}`,
          kind: "spot",
          startMinutes: start,
          endMinutes: end,
          title: candidate.name,
          spotId: candidate.id,
          cityId,
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
        blockCursor = end + 15;
        dayCost += inp.priceCents;
        totalActiveHours += dur / 60;
      }

      // 餐厅块（中午）
      const restaurant = pickRestaurant(data.restaurantsByCity[cityId] ?? [], dayIndex, style);
      if (restaurant) {
        const tStart = rhythm === "compact" ? 12 * 60 : 11 * 60 + 30;
        const tEnd = tStart + 75;
        dayBlocks.push({
          blockId: `d${dayIndex}-lunch`,
          kind: "restaurant",
          startMinutes: tStart,
          endMinutes: tEnd,
          title: restaurant.name,
          restaurantId: restaurant.id,
          cityId,
          kidHook: restaurant.hasKidsMenu
            ? "有儿童菜单"
            : restaurant.hasHighChair
              ? "有儿童餐椅"
              : undefined,
        });
        dayCost += (restaurant.avgPricePerPerson ?? 80) * 100 * params.travelers.adults;
      }

      dayBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

      const cityName = data.cityById[cityId]?.name ?? cityId;
      const lastSpotName = (() => {
        for (let i = dayBlocks.length - 1; i >= 0; i--) {
          if (dayBlocks[i]!.kind === "spot") return dayBlocks[i]!.title;
        }
        return "探索";
      })();
      timeBlocks.push({
        dayIndex: dayIndex + 1,
        date: addDaysISO(params.startDate, dayIndex),
        theme: `Day ${dayIndex + 1} · ${cityName} ${lastSpotName}周边`,
        blocks: dayBlocks,
        totalWalkMinutes: 0,
        totalCostCents: dayCost,
        cityId,
        kidFriendlySummary: `共 ${dayBlocks.filter((b) => b.kind === "spot").length} 个景点，已为 ${child.name} 过滤`,
      });
      totalCost += dayCost;
      dayIndex++;
    }

    // 跨城段：在 last city 的最后一天尾部插 transit + hotel（仅在不是最后一城时）
    if (cityPos < allocation.length - 1) {
      const transit = transitPairs[cityPos]!;
      const toCityId = transit.toCityId;
      // 把 transit + hotel 加到上一段 day（最后一个 in-city day）的末尾
      const lastDay = timeBlocks[timeBlocks.length - 1]!;
      const baseStart = lastDay.blocks.length > 0
        ? Math.max(...lastDay.blocks.map((b) => b.endMinutes)) + 30
        : 17 * 60;
      const transitMin = transit.minutes;
      const transitEnd = baseStart + Math.ceil(transitMin);

      lastDay.blocks.push({
        blockId: `d${dayIndex - 1}-transit`,
        kind: "transit",
        startMinutes: baseStart,
        endMinutes: transitEnd,
        title: `${data.cityById[transit.fromCityId]?.name ?? ""} → ${data.cityById[toCityId]?.name ?? ""}（${TRANSIT_MODE_LABEL[transit.mode]} ≈ ${transitMin} 分钟）`,
        cityId: toCityId,
        transitFromCityId: transit.fromCityId,
        transitToCityId: transit.toCityId,
        transitMode: transit.mode,
        transitMinutes: transit.minutes,
        transitDistanceKm: transit.distanceKm,
        kidHook: transit.mode === "flight" ? "时长含候机登机" : undefined,
        notes: `v1 估算（${transit.distanceKm.toFixed(0)} km），PR2 起接入真实数据`,
      });

      // 选酒店（数据空时跳过 hotel block）
      const hotel = pickHotel(data.hotelsByCity[toCityId] ?? [], style);
      if (hotel) {
        const hotelStart = transitEnd + 30;
        const hotelEnd = hotelStart + 60; // check-in 1h 标准
        lastDay.blocks.push({
          blockId: `d${dayIndex - 1}-hotel`,
          kind: "hotel",
          startMinutes: hotelStart,
          endMinutes: hotelEnd,
          title: hotel.name,
          hotelId: hotel.id,
          cityId: toCityId,
          kidHook: hotel.hasFamilyRoom
            ? "有家庭房"
            : hotel.hasKidsPool
              ? "有儿童泳池"
              : "亲子友好",
          notes:
            hotel.avgPricePerNight != null
              ? `约 ¥${hotel.avgPricePerNight}/晚`
              : undefined,
        });
        if (hotel.avgPricePerNight != null) {
          lastDay.totalCostCents += hotel.avgPricePerNight * 100;
          totalCost += hotel.avgPricePerNight * 100;
        }
      } else {
        // 占位：注入一个 hotel placeholder（仍走同一 day，不新增 day 索引）
        lastDay.blocks.push({
          blockId: `d${dayIndex - 1}-hotel-pending`,
          kind: "hotel",
          startMinutes: transitEnd + 30,
          endMinutes: transitEnd + 60,
          title: "过夜：待订",
          cityId: toCityId,
          notes: "该城暂无酒店数据，请自行预订亲子酒店",
        });
      }

      // 重新按 startMinutes 排序
      lastDay.blocks.sort((a, b) => a.startMinutes - b.startMinutes);
    }
  });

  // 多城标题
  const cityNames = allocation.map((a) => data.cityById[a.cityId]?.name ?? "").join(" → ");
  return {
    style,
    rhythm,
    label: `${labelFor(style)} · ${labelForRhythm(rhythm)}`,
    whyThisPlan: whyForMulti(style, child, cityNames, transitPairs.length),
    totalCostCents: totalCost,
    totalDays: dayIndex,
    totalActiveHours: Math.round(totalActiveHours * 10) / 10,
    days: timeBlocks,
  };
}

function rankSpotsForStyle(
  spots: LoadedSpot[],
  child: ChildProfile,
  style: CandidateStyle,
  rhythm: CandidateRhythm,
  feelingMap: Map<string, { feelingMatch: number }>,
): Array<LoadedSpot & { _score: number }> {
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

function pickRestaurant(
  list: LoadedRestaurant[],
  day: number,
  style: CandidateStyle,
): LoadedRestaurant | null {
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => {
    if (style === "money_saver") return Number(b.hasKidsMenu) - Number(a.hasKidsMenu);
    if (style === "comfort") return Number(b.hasHighChair) - Number(a.hasHighChair);
    return 0;
  });
  return sorted[day % sorted.length] ?? null;
}

function ageFitFromSpotType(spotType: string | null, childAgeMonths: number): number {
  if (!spotType) return 0.7;
  const code = spotType.slice(0, 6);
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

function labelFor(s: CandidateStyle): string {
  return s === "time_saver" ? "省时档" : s === "money_saver" ? "省钱档" : "舒服档";
}
function labelForRhythm(r: CandidateRhythm): string {
  return r === "compact" ? "紧凑" : r === "balanced" ? "平衡" : "宽松";
}

function whyForMulti(
  style: CandidateStyle,
  child: ChildProfile,
  cityNames: string,
  transitLegs: number,
): string {
  const routeDesc = transitLegs > 0 ? `多城 ${cityNames}（含 ${transitLegs} 段转场）` : cityNames;
  if (style === "time_saver") return `优先压缩接驳时长与跨城转场，行程紧凑（${routeDesc}）。适合假期短的 ${child.name} 家庭。`;
  if (style === "money_saver") return `优先平价亲子餐厅与节省转场（${routeDesc}）。${child.name} 家庭友好。`;
  return `优先长停留 + 午休 + 亲子过夜酒店（${routeDesc}）。留出充足玩的时间。`;
}

function approxChildAgeMonths(child: ChildProfile): number {
  if (!child.birthDate) return 36;
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
      sum + day.blocks.reduce((s, b) => s + (b.scoreDetail?.composite ?? 0), 0),
    0,
  );
}

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

function spotHaversineMinutes(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  // 城内接驳用，30 km/h 假设
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
  return Math.max(5, Math.round((km / 30) * 60));
}
