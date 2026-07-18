// 04-import-db.ts — enriched/ → Prisma upsert
// 运行：DATABASE_URL=... npx tsx src/lib/data-pipeline/04-import-db.ts [--city beijing|...]
//
// 行为：
// - 读 enriched/<city>/<subtype>.json
// - 用 amapPoiId 作业务键 upsert（避免重复）
// - City 单独 upsert，province/adcode 从 CITY_META 拿
// - 失败单条容错，continue 整体流程

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import { CITY_META } from "../../data/travel-assets/_meta";

const ENRICHED_ROOT = path.join(
  process.cwd(),
  "src/data/travel-assets/enriched",
);

const prisma = new PrismaClient();

function slugify(name: string): string {
  const map: Record<string, string> = { 北京: "beijing", 上海: "shanghai", 广州: "guangzhou" };
  return map[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}

async function ensureCity(city: typeof CITY_META[number]): Promise<void> {
  await prisma.city.upsert({
    where: { name: city.name },
    update: {
      province: city.province,
      lat: city.center.lat,
      lng: city.center.lng,
    },
    create: {
      id: city.id,
      name: city.name,
      province: city.province,
      lat: city.center.lat,
      lng: city.center.lng,
      tags: ["亲子", "三城首站"],
      bestSeasons: ["3", "4", "5", "9", "10", "11"],
      kidHook: `${city.name} 三城首站，由高德 POI + AI 起草保障的初始数据。KOL 复评后升级。`,
      momHook: `${city.name} 妈妈视角点点评测请到发完后被 KOL 复评。`,
      dadHook: `${city.name} 爸爸视角下延续体力考里考虑。`,
    },
  });
}

async function importJsonArray<T>(p: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(p, "utf-8"));
  } catch {
    return [];
  }
}

async function importCity(city: typeof CITY_META[number]): Promise<void> {
  const cityId = city.id;
  const slug = slugify(city.name);

  // Spots
  const spots = await importJsonArray<any>(path.join(ENRICHED_ROOT, slug, "spot.json"));
  for (const s of spots) {
    try {
      await prisma.spot.upsert({
        where: { cityId_name: { cityId, name: s.name } },
        update: {
          lat: s.lat,
          lng: s.lng,
          kidHighlights: s.kidHighlights?.join(" | "),
          momHighlights: s.momHook,
          dadHighlights: s.dadHook,
          tips: s.tips?.join(" | "),
          pitfalls: s.pitfalls?.join(" | "),
          spotType: s.spotType,
        },
        create: {
          cityId,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          kidHighlights: s.kidHighlights?.join(" | "),
          momHighlights: s.momHook,
          dadHighlights: s.dadHook,
          tips: s.tips?.join(" | "),
          pitfalls: s.pitfalls?.join(" | "),
          spotType: s.spotType,
          images: [],
          tags: s.tags ?? [],
          recommendedMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          kidScore: 4.2,
          momScore: 4.0,
          dadScore: 3.8,
        },
      });
    } catch (e) {
      console.warn(`[04] spot skip ${s.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/spot：${spots.length} 条`);

  // Restaurants
  const restaurants = await importJsonArray<any>(path.join(ENRICHED_ROOT, slug, "restaurant.json"));
  for (const r of restaurants) {
    try {
      await prisma.restaurant.upsert({
        where: { cityId_name: { cityId, name: r.name } },
        update: { lat: r.lat, lng: r.lng },
        create: {
          cityId,
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          hasHighChair: r.hasHighChair ?? false,
          isKidTolerant: r.isKidTolerant ?? false,
          hasKidsMenu: r.hasKidsMenu ?? false,
          cuisine: r.cuisine,
          avgPricePerPerson: r.avgPricePerPerson,
          tags: r.tags ?? ["ai_draft_v1"],
        },
      });
    } catch (e) {
      console.warn(`[04] restaurant skip ${r.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/restaurant：${restaurants.length} 条`);

  // Hotels
  const hotels = await importJsonArray<any>(path.join(ENRICHED_ROOT, slug, "hotel.json"));
  for (const h of hotels) {
    try {
      await prisma.hotel.upsert({
        where: { cityId_name: { cityId, name: h.name } },
        update: { lat: h.lat, lng: h.lng },
        create: {
          cityId,
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          hasFamilyRoom: h.hasFamilyRoom ?? false,
          hasKidsPool: h.hasKidsPool ?? false,
          hasKidsBreakfast: h.hasKidsBreakfast ?? false,
          avgPricePerNight: h.avgPricePerNight,
          tags: h.tags ?? ["ai_draft_v1"],
        },
      });
    } catch (e) {
      console.warn(`[04] hotel skip ${h.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/hotel：${hotels.length} 条`);

  // Parks
  const parks = await importJsonArray<any>(path.join(ENRICHED_ROOT, slug, "park.json"));
  for (const p of parks) {
    try {
      await prisma.park.upsert({
        where: { id: `${cityId}-park-${p.amapPoiId}` },
        update: { lat: p.lat, lng: p.lng },
        create: {
          id: `${cityId}-park-${p.amapPoiId}`,
          cityId,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          hasKidsPlayArea: p.hasKidsPlayArea ?? false,
          tags: p.tags ?? ["ai_draft_v1"],
        },
      });
    } catch (e) {
      console.warn(`[04] park skip ${p.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/park：${parks.length} 条`);
}

async function run(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith("--city="));
  const filter = arg ? arg.slice("--city=".length) : "all";
  const targets = CITY_META.filter((c) =>
    filter === "all" ? true : slugify(c.name) === filter,
  );

  for (const city of targets) {
    await ensureCity(city);
    await importCity(city);
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
