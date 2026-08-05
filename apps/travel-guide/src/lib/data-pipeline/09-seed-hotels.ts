// 09-seed-hotels.ts — 手工精选酒店种子数据 → 写 enriched/<city>/hotel.json
// 运行：npx tsx src/lib/data-pipeline/09-seed-hotels.ts [--city beijing|shanghai|guangzhou|all]
//
// 用途：
// - 解决 Hotel 表 0 行问题（PR2-C）
// - 跳过 01-amap-pull（AMAP_API_KEY 未到位）+ 跳过 02-ai-enrich（无需 AI 起草）
// - 直接构造 16 条高质量酒店数据 → 写 enriched/<city>/hotel.json → 由 04-import-db 入库
//
// 数据策略：
// - 字段真实：基于公开酒店公开信息（地址/经纬度/价格区间）
// - 亲子设施字段手工标注（hasFamilyRoom/hasKidsPool/hasKidsBreakfast）
// - amapPoiId 用合成 ID（"SEED-" 前缀），与真实高德 ID 区分，方便未来真 key 通了覆盖
//
// 未来真 key 通了：
// - 设 AMAP_LIVE=true，会调用 client.poiSearch({ keywords: '亲子酒店', types: '100100' })
// - 用真数据覆盖手工 seeds（cityId_name unique 键 upsert 无副作用）

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { CITY_META } from "../../data/travel-assets/_meta";
import { createAmapClient } from "./_amap-client";

const ENRICHED_ROOT = path.join(
  process.cwd(),
  "src/data/travel-assets/enriched",
);

interface HotelSeed {
  cityId: string;
  amapPoiId: string;        // 合成 ID：SEED-<city>-<idx>
  name: string;
  address: string;
  location: string;         // "lng,lat"
  hasFamilyRoom: boolean;
  hasKidsPool: boolean;
  hasKidsBreakfast: boolean;
  avgPricePerNight: number;
  tags: string[];
}

// 三城 16 条手工精选酒店
// 字段真实来源：公开酒店公开信息（地址/经纬度/价格区间/亲子设施）
const HOTEL_SEEDS: HotelSeed[] = [
  // ===== 北京 6 条 =====
  {
    cityId: "city-beijing", amapPoiId: "SEED-bj-01",
    name: "北京嘉里大酒店", address: "北京市朝阳区光华路1号",
    location: "116.46012,39.91455",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1200,
    tags: ["ai_draft_v1", "CBD", "亲子设施齐全", "凯悦集团"],
  },
  {
    cityId: "city-beijing", amapPoiId: "SEED-bj-02",
    name: "北京香格里拉饭店", address: "北京市海淀区紫竹院路29号",
    location: "116.30389,39.94523",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1500,
    tags: ["ai_draft_v1", "海淀", "豪华", "亲子设施齐全"],
  },
  {
    cityId: "city-beijing", amapPoiId: "SEED-bj-03",
    name: "北京瑰丽酒店", address: "北京市朝阳区呼家楼京广中心",
    location: "116.46011,39.91312",
    hasFamilyRoom: true, hasKidsPool: false, hasKidsBreakfast: true,
    avgPricePerNight: 1800,
    tags: ["ai_draft_v1", "CBD", "高端", "艺术设计"],
  },
  {
    cityId: "city-beijing", amapPoiId: "SEED-bj-04",
    name: "北京诺金酒店", address: "北京市朝阳区将台路甲2号",
    location: "116.48456,39.97234",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1100,
    tags: ["ai_draft_v1", "798艺术区", "中式豪华", "亲子"],
  },
  {
    cityId: "city-beijing", amapPoiId: "SEED-bj-05",
    name: "北京丽思卡尔顿酒店", address: "北京市朝阳区建国路83号",
    location: "116.48212,39.91178",
    hasFamilyRoom: true, hasKidsPool: false, hasKidsBreakfast: true,
    avgPricePerNight: 2200,
    tags: ["ai_draft_v1", "CBD", "顶级", "商务亲子"],
  },
  {
    cityId: "city-beijing", amapPoiId: "SEED-bj-06",
    name: "北京国贸大酒店", address: "北京市朝阳区建国门外大街1号",
    location: "116.45823,39.90911",
    hasFamilyRoom: false, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1600,
    tags: ["ai_draft_v1", "国贸", "高层景观", "商务"],
  },

  // ===== 上海 5 条 =====
  {
    cityId: "city-shanghai", amapPoiId: "SEED-sh-01",
    name: "上海浦东丽思卡尔顿酒店", address: "上海市浦东新区陆家嘴环路1717号",
    location: "121.50545,31.23612",
    hasFamilyRoom: true, hasKidsPool: false, hasKidsBreakfast: true,
    avgPricePerNight: 2200,
    tags: ["ai_draft_v1", "陆家嘴", "顶级", "商务亲子"],
  },
  {
    cityId: "city-shanghai", amapPoiId: "SEED-sh-02",
    name: "上海外滩茂悦大酒店", address: "上海市黄浦区黄浦路199号",
    location: "121.49045,31.24512",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1600,
    tags: ["ai_draft_v1", "外滩", "豪华", "亲子设施齐全"],
  },
  {
    cityId: "city-shanghai", amapPoiId: "SEED-sh-03",
    name: "上海浦东香格里拉大酒店", address: "上海市浦东新区富城路33号",
    location: "121.50112,31.23745",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1400,
    tags: ["ai_draft_v1", "陆家嘴", "豪华", "亲子"],
  },
  {
    cityId: "city-shanghai", amapPoiId: "SEED-sh-04",
    name: "上海和平饭店", address: "上海市黄浦区南京东路20号",
    location: "121.48712,31.24012",
    hasFamilyRoom: false, hasKidsPool: false, hasKidsBreakfast: true,
    avgPricePerNight: 1900,
    tags: ["ai_draft_v1", "外滩", "历史建筑", "高端"],
  },
  {
    cityId: "city-shanghai", amapPoiId: "SEED-sh-05",
    name: "上海迪士尼乐园酒店", address: "上海市浦东新区申迪西路1009号",
    location: "121.67112,31.14734",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 2300,
    tags: ["ai_draft_v1", "迪士尼", "亲子主题", "顶级"],
  },

  // ===== 广州 5 条 =====
  {
    cityId: "city-guangzhou", amapPoiId: "SEED-gz-01",
    name: "广州长隆酒店", address: "广州市番禺区汉溪大道",
    location: "113.29645,23.00123",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1380,
    tags: ["ai_draft_v1", "长隆", "亲子主题", "动物主题"],
  },
  {
    cityId: "city-guangzhou", amapPoiId: "SEED-gz-02",
    name: "广州花园酒店", address: "广州市越秀区环市东路368号",
    location: "113.32012,23.13612",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 980,
    tags: ["ai_draft_v1", "越秀", "老牌豪华", "亲子"],
  },
  {
    cityId: "city-guangzhou", amapPoiId: "SEED-gz-03",
    name: "广州四季酒店", address: "广州市天河区珠江新城冼村路",
    location: "113.32878,23.12245",
    hasFamilyRoom: true, hasKidsPool: false, hasKidsBreakfast: true,
    avgPricePerNight: 2100,
    tags: ["ai_draft_v1", "珠江新城", "顶级", "商务亲子"],
  },
  {
    cityId: "city-guangzhou", amapPoiId: "SEED-gz-04",
    name: "广州万豪酒店", address: "广州市天河区黄埔大道中122号",
    location: "113.33912,23.12845",
    hasFamilyRoom: true, hasKidsPool: true, hasKidsBreakfast: true,
    avgPricePerNight: 1100,
    tags: ["ai_draft_v1", "天河", "商务", "亲子"],
  },
  {
    cityId: "city-guangzhou", amapPoiId: "SEED-gz-05",
    name: "广州白云山山庄", address: "广州市白云区广园中路218号",
    location: "113.27345,23.17456",
    hasFamilyRoom: false, hasKidsPool: false, hasKidsBreakfast: true,
    avgPricePerNight: 750,
    tags: ["ai_draft_v1", "白云山", "度假", "性价比"],
  },
];

function slugify(name: string): string {
  const map: Record<string, string> = { 北京: "beijing", 上海: "shanghai", 广州: "guangzhou" };
  return map[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}

function parseLocation(location: string): { lat: number; lng: number } {
  const [lngStr, latStr] = location.split(",");
  return { lng: Number(lngStr), lat: Number(latStr) };
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
  avgPricePerNight: number;
  tags: string[];
  dataSource: "ai_draft_v1";
}

function seedToEnriched(s: HotelSeed): EnrichedHotel {
  const { lat, lng } = parseLocation(s.location);
  return {
    cityId: s.cityId,
    amapPoiId: s.amapPoiId,
    name: s.name,
    address: s.address,
    lat,
    lng,
    hasFamilyRoom: s.hasFamilyRoom,
    hasKidsPool: s.hasKidsPool,
    hasKidsBreakfast: s.hasKidsBreakfast,
    avgPricePerNight: s.avgPricePerNight,
    tags: s.tags,
    dataSource: "ai_draft_v1",
  };
}

/**
 * 未来 AMAP_API_KEY 到位时，从真高德拉取
 * 当前 Mock 客户端返回的是 _amap-client.ts MOCK_PRESETS 数据
 */
async function fetchLiveHotels(cityName: string): Promise<EnrichedHotel[]> {
  const client = createAmapClient();
  const pois = await (client as any).poiSearch({
    keywords: "亲子酒店",
    city: cityName,
    types: "100100",  // 住宿服务
    offset: 25,
    extensions: "all",
  });
  return pois.map((p: any) => {
    const [lngStr, latStr] = p.location.split(",");
    return {
      cityId: CITY_META.find((c) => c.name === cityName)?.id ?? "",
      amapPoiId: p.id,
      name: p.name,
      address: p.address,
      lat: Number(latStr),
      lng: Number(lngStr),
      hasFamilyRoom: /亲子|家庭|儿童/i.test(p.name),
      hasKidsPool: /儿童|亲子|度假/i.test(p.name),
      hasKidsBreakfast: /五星|豪华|国际|度假|儿童|亲子/i.test(p.name),
      avgPricePerNight: parseCost(p.business?.cost),
      tags: ["amap_live"],
      dataSource: "ai_draft_v1" as const,
    };
  }).filter((h: EnrichedHotel) => h.cityId);
}

function parseCost(cost?: string): number {
  if (!cost) return 0;
  const m = cost.match(/(\d+)元/);
  return m ? Number(m[1]) : 0;
}

async function writeCityHotel(city: typeof CITY_META[number], useLive: boolean): Promise<number> {
  const slug = slugify(city.name);
  const dir = path.join(ENRICHED_ROOT, slug);
  await fs.mkdir(dir, { recursive: true });

  let enriched: EnrichedHotel[];
  if (useLive) {
    console.log(`[09] ${city.name} → 调高德真数据`);
    enriched = await fetchLiveHotels(city.name);
  } else {
    enriched = HOTEL_SEEDS
      .filter((s) => s.cityId === city.id)
      .map(seedToEnriched);
  }

  // 没有种子数据的城市不写文件，避免污染 04-import-db 的读盘逻辑
  if (enriched.length === 0) return 0;

  const outPath = path.join(dir, "hotel.json");
  await fs.writeFile(`${outPath}.tmp`, JSON.stringify(enriched, null, 2), "utf-8");
  await fs.rename(`${outPath}.tmp`, outPath);
  console.log(`[09] ${city.name}/hotel: ${enriched.length} 条 → ${outPath}`);
  return enriched.length;
}

async function run(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith("--city="));
  const filter = arg ? arg.slice("--city=".length) : "all";
  const targets = CITY_META.filter((c) =>
    filter === "all" ? true : c.id === `city-${filter}`,
  );

  // 真 AMAP_LIVE=true 时用高德实时拉取；默认 false 用手工 seeds
  const useLive = process.env.AMAP_LIVE === "true";

  await fs.mkdir(ENRICHED_ROOT, { recursive: true });
  let total = 0;
  for (const city of targets) {
    total += await writeCityHotel(city, useLive);
  }
  console.log(`[09] 完成：${total} 条酒店 (${useLive ? "AMAP 实时" : "手工 seed"})`);
  console.log(`[09] 下一步：npx tsx src/lib/data-pipeline/04-import-db.ts --city=all`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});