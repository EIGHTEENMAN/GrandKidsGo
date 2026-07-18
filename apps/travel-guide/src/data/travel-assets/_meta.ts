// 走天下数据资产 — 类型与城市元数据
// 这是资产层的 TS Schema，所有 raw/ enriched/ 目录里的 JSON 都遵守

export type DataSource = "ai_draft_v1" | "kol_reviewed" | "official_curated";

/**
 * 高德 raw POI 结构。
 * name/lat/lng/address/电话等元信息从高德原样保留，便于追源。
 * 亲子相关字段先留空，待 02-ai-enrich 填。
 */
export interface AmapRawPoi {
  id: string;                      // 高德 poi id
  name: string;
  address: string;
  location: { lat: number; lng: number };
  tel?: string;
  type: string;                    // 高德 type 编码：大类|中类|小类
  typecode: string;
  cityId: string;                  // 走天下 City.id
  cityName: string;
  fetchedAt: string;               // ISO 时间
}

/** Spot 高德 raw + 子类元数据 */
export interface AmapRawSpot extends AmapRawPoi {
  subtype: "spot";
  durationMinutes?: number;        // 建议停留（高德有时返回，无则后续 enrich 估算）
  tags: string[];                  // 高德 POI tags，分隔符 ; 转数组
}

/** Restaurant 高德 raw */
export interface AmapRawRestaurant extends AmapRawPoi {
  subtype: "restaurant";
  cuisine?: string;
  avgPricePerPerson?: number;      // 高德 cost 字段
  openHours?: string;
}

/** Hotel 高德 raw */
export interface AmapRawHotel extends AmapRawPoi {
  subtype: "hotel";
  star?: string;                   // 高德 hotel_rating
  avgPricePerNight?: number;
}

/** Park 高德 raw */
export interface AmapRawPark extends AmapRawPoi {
  subtype: "park";
  durationMinutes?: number;
}

/** Playground 高德 raw（儿童游乐场 POI） */
export interface AmapRawPlayground extends AmapRawPoi {
  subtype: "playground";
  ageMinMonths?: number;
  ageMaxMonths?: number;
}

/** Mall 高德 raw（综合商场，紧急预案用） */
export interface AmapRawMall extends AmapRawPoi {
  subtype: "mall";
  hasKidsPlayArea: boolean;
}

/** Hospital 高德 raw（医院，紧急预案用） */
export interface AmapRawHospital extends AmapRawPoi {
  subtype: "hospital";
  hasPediatrics: boolean;
  phone?: string;
}

/** 高德 raw union */
export type AnyAmapRaw =
  | AmapRawSpot
  | AmapRawRestaurant
  | AmapRawHotel
  | AmapRawPark
  | AmapRawPlayground
  | AmapRawMall
  | AmapRawHospital;

/**
 * Enriched 后的 Spot 完整形态（含护城河字段）
 * 直接对应 Prisma Spot 字段，import-db 用此形态 upsert。
 */
export interface EnrichedSpot {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  kidHighlights?: string;
  momHighlights?: string;
  dadHighlights?: string;
  tips?: string;
  pitfalls?: string;
  recommendedMonths: number[];
  durationMinutes?: number;
  kidScore?: number;
  momScore?: number;
  dadScore?: number;
  images: string[];
  tags: string[];
  spotType?: string;
  dataSource: DataSource;
}

export interface EnrichedRestaurant {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  hasHighChair: boolean;             // enriched 时 AI 推断，无信号默认 false
  isKidTolerant: boolean;
  hasKidsMenu: boolean;
  cuisine?: string;
  avgPricePerPerson?: number;
  tags: string[];
  dataSource: DataSource;
}

export interface EnrichedHotel {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  hasFamilyRoom: boolean;
  hasKidsPool: boolean;
  hasKidsBreakfast: boolean;
  avgPricePerNight?: number;
  tags: string[];
  dataSource: DataSource;
}

export interface EnrichedPark {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  hasKidsPlayArea: boolean;
  durationMinutes?: number;
  tags: string[];
}

export interface EnrichedPlayground {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  ageMinMonths?: number;
  ageMaxMonths?: number;
  durationMinutes?: number;
  tags: string[];
}

export interface EnrichedMall {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  hasKidsPlayArea: boolean;
  tags: string[];
}

export interface EnrichedHospital {
  name: string;
  cityId: string;
  amapPoiId: string;
  lat: number;
  lng: number;
  hasPediatrics: boolean;
  address?: string;
  phone?: string;
}

/**
 * 三城首站元数据
 * adcode 从国家统计局 GB/T 2260 高德兼容版
 */
export interface CityMeta {
  id: string;                  // 走天下 City.id（UUID）
  name: string;                // 中文名
  adcode: string;              // 高德 adcode
  province: string;
  /**
   * 高德搜索关键词模板，每个关键词调一次 POI 搜索。
   * 配合 POI 大类 type=08(公园)|11(景点)|05(餐饮)|10(酒店) 过滤。
   * 关键词调高德 "v1 亲子 / 儿童 / 适合孩子" 类提示词，覆盖度比纯 type 更高。
   */
  keywords: string[];
  center: { lat: number; lng: number };
}

export const CITY_META: CityMeta[] = [
  {
    id: "city-beijing",
    name: "北京",
    adcode: "110000",
    province: "北京市",
    keywords: ["亲子", "儿童", "博物馆", "动物园", "海洋馆", "科技馆", "公园", "游乐园", "主题乐园", "自然博物馆"],
    center: { lat: 39.9042, lng: 116.4074 },
  },
  {
    id: "city-shanghai",
    name: "上海",
    adcode: "310000",
    province: "上海市",
    keywords: ["亲子", "儿童", "博物馆", "动物园", "海洋馆", "科技馆", "公园", "游乐园", "主题乐园", "自然博物馆"],
    center: { lat: 31.2304, lng: 121.4737 },
  },
  {
    id: "city-guangzhou",
    name: "广州",
    adcode: "440100",
    province: "广东省",
    keywords: ["亲子", "儿童", "博物馆", "动物园", "海洋馆", "科技馆", "公园", "游乐园", "主题乐园", "自然博物馆"],
    center: { lat: 23.1291, lng: 113.2644 },
  },
];
