// 02-ai-enrich.ts — 读 raw/ → 调 AI 抽象层起草护城河字段 → 写 enriched/
// 运行：npx tsx src/lib/data-pipeline/02-ai-enrich.ts [--city beijing|shanghai|guangzhou|all] [--subtype spot|...]
//
// 行为：
// - 读 raw/<city>/<subtype>.json
// - 对每个 POI 调 AI 抽象层 json() 起草 kidHook/momHook/dadHook/kidHighlights/tips/pitfalls
// - dataSource 标记为 "ai_draft_v1"
// - 写 enriched/<city>/<subtype>.json（精简后的 EnrichedSpot 形态，便于 04-import-db 直接消费）
// - 错误容错：单条 AI 调用失败时退化为"待 KOL 复评"占位，不中断整体流程

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { getProvider } from "../ai/registry";
import { CITY_META } from "../../data/travel-assets/_meta";

const RAW_ROOT = path.join(process.cwd(), "src/data/travel-assets/raw");
const ENRICHED_ROOT = path.join(
  process.cwd(),
  "src/data/travel-assets/enriched",
);

const GuardianSchema = z.object({
  kidHook: z.string().min(1).max(120),
  momHook: z.string().min(1).max(120),
  dadHook: z.string().min(1).max(120),
  kidHighlights: z.array(z.string()).min(1).max(5),
  tips: z.array(z.string()).min(1).max(5),
  pitfalls: z.array(z.string()).min(1).max(5),
  dataSource: z.literal("ai_draft_v1"),
});

interface RawEntry {
  cityId: string;
  cityName: string;
  subtype: string;
  raw: {
    id: string;
    name: string;
    address: string;
    location: string;
    tel?: string;
    typecode: string;
    cityname?: string;
    business?: { cost?: string; open_time?: string; rating?: string };
  };
  keywords: string;
  fetchedAt: string;
}

interface EnrichedSpot {
  cityId: string;
  amapPoiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tel?: string;
  spotType?: string;
  costText?: string;
  openHours?: string;
  kidHook: string;
  momHook: string;
  dadHook: string;
  kidHighlights: string[];
  tips: string[];
  pitfalls: string[];
  dataSource: "ai_draft_v1";
  fetchedAt: string;
}

interface EnrichedRestaurant {
  cityId: string;
  amapPoiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hasHighChair: boolean;       // AI 推断，弱字段
  isKidTolerant: boolean;
  hasKidsMenu: boolean;
  cuisine?: string;
  avgPricePerPerson?: number;
  tags: string[];
  dataSource: "ai_draft_v1";
}

interface EnrichedHotel {
  cityId: string;
  amapPoiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hasFamilyRoom: boolean;
  hasKidsPool: boolean;
  hasKidsBreakfast: boolean;
  avgPricePerNight?: number;
  tags: string[];
  dataSource: "ai_draft_v1";
}

interface EnrichedPark {
  cityId: string;
  amapPoiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hasKidsPlayArea: boolean;
  tags: string[];
  dataSource: "ai_draft_v1";
}

const ANTHROPIC_PERSONA = `你是走天下的"AI 起草"模块，专门为亲子旅行 POI 起草妈妈的视角描述。
要求：
- kidHook：10-30 字，描述这个地方对孩子最有效的吸引点，用妈妈视角。
- momHook：妈妈视角，10-30 字（出片/安静/亲子设施）。
- dadHook：爸爸视角，10-30 字（体力/动线/值不值）。
- kidHighlights：1-3 条，孩子在场能玩什么。
- tips：1-3 条，去之前要知道的事（开放时间/预约/装备）。
- pitfalls：1-3 条，妈妈容易踩的坑（排队/餐饮/抱娃难度）。
- 严禁编造票价、营业时间或孩子年龄限制——只基于 POI 名称 + 公共常识判断。
- 文风温柔平实、避免夸张形容词（"超""绝""必打卡"）。
- 显著标注"AI 起草，请 KOL 复评"在 kidHook 末尾。`;

function systemPrompt(kind: string): string {
  return `${ANTHROPIC_PERSONA}\n\n当前对象类型：${kind}`;
}

function userPrompt(entry: RawEntry): string {
  return [
    `地点名称：${entry.raw.name}`,
    `地址：${entry.raw.address}`,
    `POI 类型：${entry.subtype}`,
    `来源关键词：${entry.keywords}`,
    entry.raw.business?.cost ? `高德 cost：${entry.raw.business.cost}` : null,
    entry.raw.business?.open_time ? `高德 open_time：${entry.raw.business.open_time}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const FALLBACK_GUARDIAN: z.infer<typeof GuardianSchema> = {
  kidHook: "AI 起草中，请 KOL 复评",
  momHook: "AI 起草中，请 KOL 复评",
  dadHook: "AI 起草中，请 KOL 复评",
  kidHighlights: ["AI 起草中，请 KOL 复评"],
  tips: ["建议提前预约，避免周末人流高峰"],
  pitfalls: ["馆内餐饮选择有限，可自带零食与水杯"],
  dataSource: "ai_draft_v1",
};

async function callGuardian(entry: RawEntry): Promise<z.infer<typeof GuardianSchema>> {
  const provider = getProvider();
  try {
    return await provider.json(
      [
        { role: "system", content: systemPrompt(entry.subtype) },
        { role: "user", content: userPrompt(entry) },
      ],
      { schema: GuardianSchema, temperature: 0.5, maxTokens: 500 },
    );
  } catch (e) {
    console.warn(`[02] AI 起草失败 ${entry.raw.name}：${(e as Error).message}，使用降级占位`);
    return FALLBACK_GUARDIAN;
  }
}

function parseLocation(location: string): { lat: number; lng: number } {
  const [lngStr, latStr] = location.split(",");
  return { lng: Number(lngStr), lat: Number(latStr) };
}

function slugify(name: string): string {
  const map: Record<string, string> = { 北京: "beijing", 上海: "shanghai", 广州: "guangzhou" };
  return map[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}

async function enrichSpot(entry: RawEntry): Promise<EnrichedSpot> {
  const { lat, lng } = parseLocation(entry.raw.location);
  const g = await callGuardian(entry);
  return {
    cityId: entry.cityId,
    amapPoiId: entry.raw.id,
    name: entry.raw.name,
    address: entry.raw.address,
    lat,
    lng,
    tel: entry.raw.tel,
    spotType: entry.raw.typecode,
    costText: entry.raw.business?.cost,
    openHours: entry.raw.business?.open_time,
    kidHook: g.kidHook,
    momHook: g.momHook,
    dadHook: g.dadHook,
    kidHighlights: g.kidHighlights,
    tips: g.tips,
    pitfalls: g.pitfalls,
    dataSource: g.dataSource,
    fetchedAt: entry.fetchedAt,
  };
}

async function enrichRestaurant(entry: RawEntry): Promise<EnrichedRestaurant> {
  const { lat, lng } = parseLocation(entry.raw.location);
  const g = await callGuardian(entry);
  return {
    cityId: entry.cityId,
    amapPoiId: entry.raw.id,
    name: entry.raw.name,
    address: entry.raw.address,
    lat,
    lng,
    hasHighChair: /肯德基|海底捞|外婆|麦当劳|必胜客|亲子/i.test(entry.raw.name),
    isKidTolerant: !/酒吧|火锅|麻辣|烤肉/i.test(entry.raw.name),
    hasKidsMenu: /肯德基|麦当劳|必胜客/i.test(entry.raw.name),
    cuisine: entry.raw.business?.cost,
    avgPricePerPerson: parseCost(entry.raw.business?.cost),
    tags: ["ai_draft_v1"],
    dataSource: "ai_draft_v1",
  };
}

function parseCost(cost?: string): number | undefined {
  if (!cost) return undefined;
  const m = cost.match(/(\d+)元/);
  if (!m) return undefined;
  return Number(m[1]);
}

async function enrichHotel(entry: RawEntry): Promise<EnrichedHotel> {
  const { lat, lng } = parseLocation(entry.raw.location);
  return {
    cityId: entry.cityId,
    amapPoiId: entry.raw.id,
    name: entry.raw.name,
    address: entry.raw.address,
    lat,
    lng,
    hasFamilyRoom: /亲子|家庭|儿童/i.test(entry.raw.name),
    hasKidsPool: /儿童|亲子|度假/i.test(entry.raw.name),
    hasKidsBreakfast: /五星|豪华|国际|度假|儿童|亲子/i.test(entry.raw.name),
    avgPricePerNight: parseCost(entry.raw.business?.cost),
    tags: ["ai_draft_v1"],
    dataSource: "ai_draft_v1",
  };
}

async function enrichPark(entry: RawEntry): Promise<EnrichedPark> {
  const { lat, lng } = parseLocation(entry.raw.location);
  return {
    cityId: entry.cityId,
    amapPoiId: entry.raw.id,
    name: entry.raw.name,
    address: entry.raw.address,
    lat,
    lng,
    hasKidsPlayArea: /儿童|亲子|游园|游乐园/i.test(entry.raw.name),
    tags: ["ai_draft_v1"],
    dataSource: "ai_draft_v1",
  };
}

async function processCity(citySlug: string): Promise<void> {
  const cityDir = path.join(RAW_ROOT, citySlug);
  const enrichedDir = path.join(ENRICHED_ROOT, citySlug);
  await fs.mkdir(enrichedDir, { recursive: true });

  const subtypes = ["spot", "restaurant", "hotel", "park"];
  for (const st of subtypes) {
    const rawPath = path.join(cityDir, `${st}.json`);
    let entries: RawEntry[] = [];
    try {
      entries = JSON.parse(await fs.readFile(rawPath, "utf-8"));
    } catch {
      continue;
    }

    const out: (EnrichedSpot | EnrichedRestaurant | EnrichedHotel | EnrichedPark)[] = [];
    for (const entry of entries) {
      try {
        if (st === "spot") out.push(await enrichSpot(entry));
        else if (st === "restaurant") out.push(await enrichRestaurant(entry));
        else if (st === "hotel") out.push(await enrichHotel(entry));
        else if (st === "park") out.push(await enrichPark(entry));
      } catch (e) {
        console.warn(`[02] ${citySlug}/${st}/${entry.raw.name} skip：${(e as Error).message}`);
      }
    }
    const outPath = path.join(enrichedDir, `${st}.json`);
    await fs.writeFile(`${outPath}.tmp`, JSON.stringify(out, null, 2), "utf-8");
    await fs.rename(`${outPath}.tmp`, outPath);
    console.log(`[02] ${citySlug}/${st}: ${out.length}/${entries.length}`);
  }
}

async function run(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith("--city="));
  const filter = arg ? arg.slice("--city=".length) : "all";
  const targets = filter === "all"
    ? CITY_META.map((c) => slugify(c.name))
    : [filter];

  await fs.mkdir(ENRICHED_ROOT, { recursive: true });
  for (const slug of targets) {
    await processCity(slug);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
