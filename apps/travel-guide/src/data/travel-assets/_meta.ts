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
  { id: "city-shenzhen", name: "深圳", adcode: "440300", province: "广东省",
    keywords: ["亲子", "儿童", "主题乐园", "海洋公园", "科技馆", "公园"],
    center: { lat: 22.5431, lng: 114.0579 } },
  { id: "city-chengdu", name: "成都", adcode: "510100", province: "四川省",
    keywords: ["亲子", "熊猫", "博物馆", "动物园", "主题乐园", "公园"],
    center: { lat: 30.5728, lng: 104.0668 } },
  { id: "city-hangzhou", name: "杭州", adcode: "330100", province: "浙江省",
    keywords: ["亲子", "西湖", "动物园", "海洋公园", "博物馆", "公园"],
    center: { lat: 30.2741, lng: 120.1551 } },
  { id: "city-xian", name: "西安", adcode: "610100", province: "陕西省",
    keywords: ["亲子", "历史", "博物馆", "兵马俑", "公园"],
    center: { lat: 34.3416, lng: 108.9398 } },
  { id: "city-nanjing", name: "南京", adcode: "320100", province: "江苏省",
    keywords: ["亲子", "历史", "博物馆", "动物园", "公园"],
    center: { lat: 32.0603, lng: 118.7969 } },
  { id: "city-suzhou", name: "苏州", adcode: "320500", province: "江苏省",
    keywords: ["亲子", "园林", "博物馆", "动物园", "公园"],
    center: { lat: 31.2989, lng: 120.5853 } },
  { id: "city-qingdao", name: "青岛", adcode: "370200", province: "山东省",
    keywords: ["亲子", "海边", "海洋公园", "博物馆", "公园"],
    center: { lat: 36.0671, lng: 120.3826 } },
  { id: "city-xiamen", name: "厦门", adcode: "350200", province: "福建省",
    keywords: ["亲子", "海边", "海洋公园", "博物馆", "公园"],
    center: { lat: 24.4798, lng: 118.0894 } },
  { id: "city-chongqing", name: "重庆", adcode: "500000", province: "重庆市",
    keywords: ["亲子", "动物园", "主题乐园", "博物馆", "公园"],
    center: { lat: 29.5630, lng: 106.5516 } },
  { id: "city-wuhan", name: "武汉", adcode: "420100", province: "湖北省",
    keywords: ["亲子", "动物园", "海洋公园", "博物馆", "公园"],
    center: { lat: 30.5928, lng: 114.3055 } },
  { id: "city-tianjin", name: "天津", adcode: "120000", province: "天津市",
    keywords: ["亲子", "海洋公园", "博物馆", "公园"],
    center: { lat: 39.3434, lng: 117.3616 } },
  { id: "city-dalian", name: "大连", adcode: "210200", province: "辽宁省",
    keywords: ["亲子", "海边", "海洋公园", "博物馆", "公园"],
    center: { lat: 38.9140, lng: 121.6147 } },
  { id: "city-shenyang", name: "沈阳", adcode: "210100", province: "辽宁省",
    keywords: ["亲子", "博物馆", "动物园", "主题乐园", "公园"],
    center: { lat: 41.8057, lng: 123.4315 } },
  { id: "city-changsha", name: "长沙", adcode: "430100", province: "湖南省",
    keywords: ["亲子", "主题乐园", "博物馆", "公园"],
    center: { lat: 28.2282, lng: 112.9388 } },
  { id: "city-zhengzhou", name: "郑州", adcode: "410100", province: "河南省",
    keywords: ["亲子", "博物馆", "动物园", "公园"],
    center: { lat: 34.7466, lng: 113.6253 } },
  { id: "city-jinan", name: "济南", adcode: "370100", province: "山东省",
    keywords: ["亲子", "动物园", "公园", "博物馆"],
    center: { lat: 36.6512, lng: 117.1201 } },
  { id: "city-kunming", name: "昆明", adcode: "530100", province: "云南省",
    keywords: ["亲子", "动物园", "公园", "民族村"],
    center: { lat: 24.8801, lng: 102.8329 } },
  { id: "city-nanning", name: "南宁", adcode: "450100", province: "广西壮族自治区",
    keywords: ["亲子", "动物园", "公园", "主题乐园"],
    center: { lat: 22.8170, lng: 108.3669 } },
  { id: "city-haikou", name: "海口", adcode: "460100", province: "海南省",
    keywords: ["亲子", "海边", "海洋公园", "公园"],
    center: { lat: 20.0444, lng: 110.1989 } },
  { id: "city-sanya", name: "三亚", adcode: "460200", province: "海南省",
    keywords: ["亲子", "海边", "海洋公园", "主题乐园", "酒店"],
    center: { lat: 18.2528, lng: 109.5119 } },
  { id: "city-fuzhou", name: "福州", adcode: "350100", province: "福建省",
    keywords: ["亲子", "动物园", "海洋公园", "公园"],
    center: { lat: 26.0745, lng: 119.2965 } },
  { id: "city-wenzhou", name: "温州", adcode: "330300", province: "浙江省",
    keywords: ["亲子", "动物园", "公园", "海边"],
    center: { lat: 27.9938, lng: 120.6993 } },
  { id: "city-ningbo", name: "宁波", adcode: "330200", province: "浙江省",
    keywords: ["亲子", "海洋公园", "动物园", "博物馆", "公园"],
    center: { lat: 29.8683, lng: 121.5440 } },
  { id: "city-hefei", name: "合肥", adcode: "340100", province: "安徽省",
    keywords: ["亲子", "博物馆", "动物园", "公园"],
    center: { lat: 31.8206, lng: 117.2272 } },
  { id: "city-nanchang", name: "南昌", adcode: "360100", province: "江西省",
    keywords: ["亲子", "动物园", "公园", "博物馆"],
    center: { lat: 28.6820, lng: 115.8579 } },
  { id: "city-fushun", name: "佛山", adcode: "440600", province: "广东省",
    keywords: ["亲子", "主题乐园", "公园"],
    center: { lat: 23.0218, lng: 113.1219 } },
  { id: "city-dongguan", name: "东莞", adcode: "441900", province: "广东省",
    keywords: ["亲子", "主题乐园", "公园"],
    center: { lat: 23.0207, lng: 113.7518 } },
  { id: "city-zhuhai", name: "珠海", adcode: "440400", province: "广东省",
    keywords: ["亲子", "海洋公园", "主题乐园", "海边"],
    center: { lat: 22.2710, lng: 113.5767 } },
  { id: "city-shantou", name: "汕头", adcode: "440500", province: "广东省",
    keywords: ["亲子", "海边", "公园"],
    center: { lat: 23.3535, lng: 116.6822 } },
  { id: "city-lijiang", name: "丽江", adcode: "530700", province: "云南省",
    keywords: ["亲子", "古城", "雪山", "公园"],
    center: { lat: 26.8721, lng: 100.2330 } },
  { id: "city-dali", name: "大理", adcode: "532900", province: "云南省",
    keywords: ["亲子", "古城", "洱海", "公园"],
    center: { lat: 25.6065, lng: 100.2679 } },
  { id: "city-lhasa", name: "拉萨", adcode: "540100", province: "西藏自治区",
    keywords: ["亲子", "历史", "博物馆", "公园"],
    center: { lat: 29.6469, lng: 91.1175 } },
  { id: "city-xishuangbanna", name: "西双版纳", adcode: "532800", province: "云南省",
    keywords: ["亲子", "动物园", "森林公园", "公园"],
    center: { lat: 22.0017, lng: 100.7971 } },
  { id: "city-changchun", name: "长春", adcode: "220100", province: "吉林省",
    keywords: ["亲子", "电影", "主题乐园", "公园"],
    center: { lat: 43.8868, lng: 125.3245 } },
  { id: "city-haerbin", name: "哈尔滨", adcode: "230100", province: "黑龙江省",
    keywords: ["亲子", "冰雪", "动物园", "公园"],
    center: { lat: 45.8038, lng: 126.5350 } },
  { id: "city-qinhuangdao", name: "秦皇岛", adcode: "130300", province: "河北省",
    keywords: ["亲子", "海边", "主题乐园", "公园"],
    center: { lat: 39.9354, lng: 119.6005 } },
  { id: "city-beidaihe", name: "北戴河", adcode: "130304", province: "河北省",
    keywords: ["亲子", "海边", "公园"],
    center: { lat: 39.8349, lng: 119.4949 } },
  { id: "city-shijiazhuang", name: "石家庄", adcode: "130100", province: "河北省",
    keywords: ["亲子", "动物园", "公园"],
    center: { lat: 38.0428, lng: 114.5149 } },
  { id: "city-taiyuan", name: "太原", adcode: "140100", province: "山西省",
    keywords: ["亲子", "博物馆", "公园"],
    center: { lat: 37.8706, lng: 112.5489 } },
  { id: "city-lanzhou", name: "兰州", adcode: "620100", province: "甘肃省",
    keywords: ["亲子", "动物园", "公园"],
    center: { lat: 36.0611, lng: 103.8343 } },
  { id: "city-xining", name: "西宁", adcode: "630100", province: "青海省",
    keywords: ["亲子", "动物园", "公园"],
    center: { lat: 36.6171, lng: 101.7782 } },
  { id: "city-luoyang", name: "洛阳", adcode: "410300", province: "河南省",
    keywords: ["亲子", "历史", "博物馆", "公园"],
    center: { lat: 34.6197, lng: 112.4540 } },
  { id: "city-kaifeng", name: "开封", adcode: "410200", province: "河南省",
    keywords: ["亲子", "历史", "公园", "主题乐园"],
    center: { lat: 34.7972, lng: 114.3076 } },
  { id: "city-huangshan", name: "黄山", adcode: "341000", province: "安徽省",
    keywords: ["亲子", "爬山", "自然", "公园"],
    center: { lat: 29.7147, lng: 118.3376 } },
  { id: "city-wuhanguanggu", name: "宜昌", adcode: "420500", province: "湖北省",
    keywords: ["亲子", "山水", "公园"],
    center: { lat: 30.6919, lng: 111.2864 } },
  { id: "city-chongqing-emei", name: "峨眉山", adcode: "511100", province: "四川省",
    keywords: ["亲子", "爬山", "自然", "猴子"],
    center: { lat: 29.6010, lng: 103.4847 } },
  { id: "city-taipei", name: "台北", adcode: "710000", province: "台湾省",
    keywords: ["亲子", "博物馆", "动物园", "主题乐园", "海洋公园"],
    center: { lat: 25.0330, lng: 121.5654 } },
  { id: "city-hongkong", name: "香港", adcode: "810000", province: "香港特别行政区",
    keywords: ["亲子", "主题乐园", "海洋公园", "公园"],
    center: { lat: 22.3193, lng: 114.1694 } },
];
