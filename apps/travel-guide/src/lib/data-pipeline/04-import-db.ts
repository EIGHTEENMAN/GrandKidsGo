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
  const map: Record<string, string> = {
    北京: "beijing", 上海: "shanghai", 广州: "guangzhou",
    深圳: "shenzhen", 成都: "chengdu", 杭州: "hangzhou",
    西安: "xian", 南京: "nanjing", 苏州: "suzhou",
    青岛: "qingdao", 厦门: "xiamen", 重庆: "chongqing",
    武汉: "wuhan", 天津: "tianjin", 大连: "dalian",
    沈阳: "shenyang", 长沙: "changsha", 郑州: "zhengzhou",
    济南: "jinan", 昆明: "kunming", 南宁: "nanning",
    海口: "haikou", 三亚: "sanya", 福州: "fuzhou",
    温州: "wenzhou", 宁波: "ningbo", 合肥: "hefei",
    南昌: "nanchang", 佛山: "fushun", 东莞: "dongguan",
    珠海: "zhuhai", 汕头: "shantou", 丽江: "lijiang",
    大理: "dali", 拉萨: "lhasa", 西双版纳: "xishuangbanna",
    长春: "changchun", 哈尔滨: "haerbin", 秦皇岛: "qinhuangdao",
    北戴河: "beidaihe", 石家庄: "shijiazhuang", 太原: "taiyuan",
    兰州: "lanzhou", 西宁: "xining", 洛阳: "luoyang",
    开封: "kaifeng", 黄山: "huangshan", 宜昌: "wuhanguanggu",
    峨眉山: "chongqing-emei", 台北: "taipei", 香港: "hongkong",
  };
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
      tags: ["亲子", "数据采集中"],
      bestSeasons: ["3", "4", "5", "9", "10", "11"],
      kidHook: `${city.name} 亲子数据由高德 POI + AI 起草保障的初始数据。KOL 复评后升级。`,
      momHook: `${city.name} 妈妈视角点点评测待 KOL 复评。`,
      dadHook: `${city.name} 爸爸视角待 KOL 复评。`,
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

/** Prisma 拒绝空字符串写入可选 String 字段，所以这里把空字符串/数组/非字符串规范为 null */
function emptyToNull(s: unknown): string | null {
  if (s == null) return null;
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t === "" ? null : t;
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
          address: emptyToNull(s.address),
          phone: emptyToNull(s.tel),
          openHours: emptyToNull(s.openHours),
          ticketPrice: emptyToNull(s.costText),
          kidHighlights: s.kidHighlights?.join(" | "),
          momHighlights: s.momHook,
          dadHighlights: s.dadHook,
          tips: s.tips?.join(" | "),
          pitfalls: s.pitfalls?.join(" | "),
          spotType: s.spotType,
          images: Array.isArray(s.images) ? s.images : [],
          coverImages: Array.isArray(s.images) ? s.images.slice(0, 3) : [],
        },
        create: {
          cityId,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          address: emptyToNull(s.address),
          phone: emptyToNull(s.tel),
          openHours: emptyToNull(s.openHours),
          ticketPrice: emptyToNull(s.costText),
          kidHighlights: s.kidHighlights?.join(" | "),
          momHighlights: s.momHook,
          dadHighlights: s.dadHook,
          tips: s.tips?.join(" | "),
          pitfalls: s.pitfalls?.join(" | "),
          spotType: s.spotType,
          images: Array.isArray(s.images) ? s.images : [],
          coverImages: Array.isArray(s.images) ? s.images.slice(0, 3) : [],
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
        update: {
          lat: r.lat,
          lng: r.lng,
          coverImages: Array.isArray(r.images) ? r.images.slice(0, 3) : [],
        },
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
          coverImages: Array.isArray(r.images) ? r.images.slice(0, 3) : [],
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
        update: {
          lat: h.lat,
          lng: h.lng,
          coverImages: Array.isArray(h.images) ? h.images.slice(0, 3) : [],
        },
        create: {
          cityId,
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          hasFamilyRoom: h.hasFamilyRoom ?? false,
          hasKidsPool: h.hasKidsPool ?? false,
          hasKidsBreakfast: h.hasKidsBreakfast ?? false,
          avgPricePerNight: h.avgPricePerNight,
          coverImages: Array.isArray(h.images) ? h.images.slice(0, 3) : [],
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
        update: {
          lat: p.lat,
          lng: p.lng,
          coverImages: Array.isArray(p.images) ? p.images.slice(0, 3) : [],
        },
        create: {
          id: `${cityId}-park-${p.amapPoiId}`,
          cityId,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          hasKidsPlayArea: p.hasKidsPlayArea ?? false,
          coverImages: Array.isArray(p.images) ? p.images.slice(0, 3) : [],
          tags: p.tags ?? ["ai_draft_v1"],
        },
      });
    } catch (e) {
      console.warn(`[04] park skip ${p.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/park：${parks.length} 条`);

  // Hospitals
  const hospitals = await importJsonArray<any>(path.join(ENRICHED_ROOT, slug, "hospital.json"));
  for (const h of hospitals) {
    try {
      await prisma.hospital.upsert({
        where: { id: `${cityId}-hospital-${h.amapPoiId}` },
        update: {
          lat: h.lat,
          lng: h.lng,
          address: emptyToNull(h.address),
          phone: emptyToNull(h.phone),
          coverImages: Array.isArray(h.images) ? h.images.slice(0, 3) : [],
        },
        create: {
          id: `${cityId}-hospital-${h.amapPoiId}`,
          cityId,
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          hasPediatrics: h.hasPediatrics ?? false,
          address: emptyToNull(h.address),
          phone: emptyToNull(h.phone),
          coverImages: Array.isArray(h.images) ? h.images.slice(0, 3) : [],
        },
      });
    } catch (e) {
      console.warn(`[04] hospital skip ${h.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/hospital：${hospitals.length} 条`);

  // Malls
  const malls = await importJsonArray<any>(path.join(ENRICHED_ROOT, slug, "mall.json"));
  for (const m of malls) {
    try {
      await prisma.mall.upsert({
        where: { id: `${cityId}-mall-${m.amapPoiId}` },
        update: {
          lat: m.lat,
          lng: m.lng,
          address: emptyToNull(m.address),
          phone: emptyToNull(m.phone),
          coverImages: Array.isArray(m.images) ? m.images.slice(0, 3) : [],
        },
        create: {
          id: `${cityId}-mall-${m.amapPoiId}`,
          cityId,
          name: m.name,
          lat: m.lat,
          lng: m.lng,
          hasKidsPlayArea: m.hasKidsPlayArea ?? false,
          address: emptyToNull(m.address),
          phone: emptyToNull(m.phone),
          coverImages: Array.isArray(m.images) ? m.images.slice(0, 3) : [],
          tags: m.tags ?? ["ai_draft_v1"],
        },
      });
    } catch (e) {
      console.warn(`[04] mall skip ${m.name}：${(e as Error).message}`);
    }
  }
  console.log(`[04] ${city.name}/mall：${malls.length} 条`);
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
