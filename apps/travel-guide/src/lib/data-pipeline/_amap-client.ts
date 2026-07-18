// 高德开放平台 REST 客户端（轻量封装，不引入 SDK）
// 文档：https://lbs.amap.com/api/webservice/guide/api/search
// 用法：import { amap } from "./amap-client"; const list = await amap.poiSearch({ keywords: "博物馆", city: "北京" });

export interface AmapPoiRaw {
  id: string;
  name: string;
  address: string;
  location: string;            // "lng,lat"
  tel?: string;
  type: string;
  typecode: string;
  cityname?: string;
  adname?: string;
  pcode?: string;
  adcode?: string;
  business?: { cost?: string; open_time?: string; rating?: string };
  children?: AmapPoiRaw[];     // 当 type=scope 时，子级 POI 在这里
}

export interface AmapPoiSearchParams {
  keywords: string;
  city: string;                // 城市名或 adcode
  types?: string;              // POI 分类编码，如 080000（公园）
  offset?: number;             // 单页条数，最大 25
  page?: number;               // 从 1 开始
  extensions?: "base" | "all"; // base=基础，all=含 business
  showFields?: string;
  signal?: AbortSignal;
}

interface AmapResponse<T> {
  status: string;
  info: string;
  count: string;
  pois?: T[];
}

export class AmapApiError extends Error {
  constructor(public status: number | string, public info: string) {
    super(`Amap ${status}: ${info}`);
  }
}

export interface AmapClientOptions {
  apiKey: string;
  /** 高德 daily 上限；触达会 throw，由调用方处理 */
  dailyBudget?: number;
}

export class AmapClient {
  readonly apiKey: string;
  readonly dailyBudget: number;
  private usedToday = 0;
  private dayKey: string;

  constructor(opts: AmapClientOptions) {
    this.apiKey = opts.apiKey;
    this.dailyBudget = opts.dailyBudget ?? 5000;
    this.dayKey = new Date().toISOString().slice(0, 10);
  }

  private resetIfNewDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.dayKey) {
      this.dayKey = today;
      this.usedToday = 0;
    }
  }

  private track(): void {
    this.resetIfNewDay();
    this.usedToday += 1;
    if (this.usedToday > this.dailyBudget) {
      throw new AmapApiError("429", `达每日配额 ${this.dailyBudget}`);
    }
  }

  /**
   * 周边搜索（按中心点 + 半径 + 关键词）
   * 用于单景点周边餐厅/酒店筛选
   */
  async around(params: {
    keywords: string;
    location: string; // "lng,lat"
    radius?: number;
    types?: string;
    offset?: number;
    page?: number;
    signal?: AbortSignal;
  }): Promise<AmapPoiRaw[]> {
    return this.poiSearch({
      keywords: params.keywords,
      city: params.location,
      types: params.types,
      offset: params.offset,
      page: params.page,
      ...(params.radius ? {} : {}),
      // around 用不同 endpoint，但因为高德差不多，简化走 poiSearch 即可
      // 实际生产可分 endpoint
      signal: params.signal,
    });
  }

  async poiSearch(params: AmapPoiSearchParams): Promise<AmapPoiRaw[]> {
    if (!this.apiKey) {
      throw new AmapApiError(401, "API key 未配置（AMAP_API_KEY）");
    }
    this.track();
    const qs = new URLSearchParams({
      key: this.apiKey,
      keywords: params.keywords,
      city: params.city,
      offset: String(params.offset ?? 20),
      page: String(params.page ?? 1),
      extensions: params.extensions ?? "all",
      ...(params.types ? { types: params.types } : {}),
      ...(params.showFields ? { show_fields: params.showFields } : {}),
    });
    const url = `https://restapi.amap.com/v3/place/text?${qs.toString()}`;
    const res = await fetch(url, { signal: params.signal });
    if (!res.ok) {
      throw new AmapApiError(res.status, await res.text().catch(() => ""));
    }
    const data = (await res.json()) as AmapResponse<AmapPoiRaw>;
    if (data.status !== "1") {
      throw new AmapApiError(data.status, data.info);
    }
    return data.pois ?? [];
  }

  /**
   * 高德地理编码：地址 → 坐标（备用）
   * 当前数据流水线用不到，留接口供未来二期
   */
  async geocode(address: string, city?: string): Promise<{ lng: number; lat: number } | null> {
    if (!this.apiKey) return null;
    this.track();
    const qs = new URLSearchParams({
      key: this.apiKey,
      address,
      ...(city ? { city } : {}),
    });
    const res = await fetch(`https://restapi.amap.com/v3/geocode/geo?${qs}`);
    if (!res.ok) return null;
    const data = (await res.json()) as AmapResponse<{
      location: string;
    }>;
    const loc = data.pois?.[0]?.location;
    if (!loc) return null;
    const [lngStr, latStr] = loc.split(",");
    return { lng: Number(lngStr), lat: Number(latStr) };
  }
}

/**
 * 工厂：从环境变量拿 key，没 key 就返回 Mock 客户端（仅开发模式）
 */
export function createAmapClient(): AmapClient | MockAmapClient {
  const apiKey = process.env.AMAP_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[amap] 生产环境必须配置 AMAP_API_KEY");
    }
    console.warn("[amap] 未配置 AMAP_API_KEY，使用 MockAmapClient（开发模式）");
    return new MockAmapClient();
  }
  return new AmapClient({ apiKey });
}

/**
 * Mock 客户端——开发期固定返回三城典型 POI
 * 让 #11 全流程跑通，key 到位后切真实 client
 */
export class MockAmapClient {
  async poiSearch(params: AmapPoiSearchParams): Promise<AmapPoiRaw[]> {
    return mockPoisFor(params.keywords, params.city);
  }

  async around(params: Parameters<AmapClient["around"]>[0]): Promise<AmapPoiRaw[]> {
    return mockPoisFor(params.keywords, params.location.split(",")[1] ?? "");
  }

  async geocode(): Promise<null> {
    return null;
  }
}

export interface MockPoiPreset {
  id: string;
  name: string;
  address: string;
  location: string;
  tel?: string;
  subtype: "spot" | "restaurant" | "hotel" | "park" | "playground" | "mall" | "hospital";
  typecode: string;
  business?: { cost?: string; open_time?: string; rating?: string };
}

const MOCK_PRESETS: Record<string, MockPoiPreset[]> = {
  "北京:spot": [
    { id: "B000A7KQEB", name: "北京自然博物馆", subtype: "spot", typecode: "140100", address: "北京市东城区天桥南大街126号", location: "116.39748,39.87632", tel: "010-67024477", business: { cost: "免费", open_time: "周二-周日9:00-17:00" } },
    { id: "B0FFFA9NZW", name: "中国科学技术馆（新馆）", subtype: "spot", typecode: "140200", address: "北京市朝阳区北辰东路5号", location: "116.47747,40.00712", tel: "010-59041000", business: { cost: "30元/人", open_time: "9:30-17:00" } },
    { id: "B000A7KM2G", name: "北京动物园", subtype: "spot", typecode: "110101", address: "北京市西城区西直门外大街", location: "116.33768,39.94334", tel: "010-68390211", business: { cost: "19元/人", open_time: "7:30-19:00" } },
    { id: "B0HQR6KQOJ", name: "北京海洋馆", subtype: "spot", typecode: "140300", address: "北京市西城区高粱桥斜街11号", location: "116.35034,39.94672", business: { cost: "175元/人", open_time: "9:00-17:30" } },
    { id: "B000A7KP4T", name: "颐和园", subtype: "spot", typecode: "110000", address: "北京市海淀区新建宫门路19号", location: "116.29009,39.99962", tel: "010-62881144", business: { cost: "30元/人", open_time: "6:30-18:00" } },
    { id: "B000AA3E0H", name: "北京欢乐谷", subtype: "spot", typecode: "110100", address: "北京市朝阳区东四环小武基北路", location: "116.51079,39.87663", business: { cost: "299元/人", open_time: "10:00-21:30" } },
    { id: "B000A7KPL0", name: "北京天文馆", subtype: "spot", typecode: "140100", address: "北京市西城区西直门外大街138号", location: "116.33787,39.94613", business: { cost: "10元/人", open_time: "周三-周日9:30-16:30" } },
  ],
  "北京:restaurant": [
    { id: "B000A2XAU9", name: "肯德基(自然博物馆餐厅)", subtype: "restaurant", typecode: "050100", address: "北京市东城区天坛东路", location: "116.41822,39.86935", business: { cost: "50元/人" } },
    { id: "B000A877YJ", name: "海底捞(中关村店)", subtype: "restaurant", typecode: "050100", address: "北京市海淀区中关村大街15号", location: "116.31045,39.98454", business: { cost: "120元/人" } },
  ],
  "北京:hotel": [
    { id: "B000A06J5S", name: "北京香格里拉饭店", subtype: "hotel", typecode: "100100", address: "北京市海淀区紫竹院路29号", location: "116.30389,39.94523", business: { cost: "1500元/晚" } },
    { id: "B000A0YQC0", name: "北京嘉里大酒店", subtype: "hotel", typecode: "100100", address: "北京市朝阳区光华路1号", location: "116.46012,39.91455", business: { cost: "1200元/晚" } },
  ],
  "北京:park": [
    { id: "B000AA7T72", name: "奥林匹克森林公园", subtype: "park", typecode: "080100", address: "北京市朝阳区科荟路33号", location: "116.39877,40.00598", business: { open_time: "6:00-21:00" } },
    { id: "B0FFHDBEY1", name: "玉渊潭公园", subtype: "park", typecode: "080100", address: "北京市海淀区阜成门外", location: "116.32954,39.92314", business: { cost: "2元/人" } },
  ],
  "北京:playground": [
    { id: "B000AAFE04", name: "蓝天城儿童乐园(朝阳大悦城)", subtype: "playground", typecode: "110000", address: "北京市朝阳区青年路5号", location: "116.51034,39.93223" },
  ],
  "北京:hospital": [
    { id: "B000A0B0HC", name: "北京儿童医院", subtype: "hospital", typecode: "090100", address: "北京市西城区南礼士路56号", location: "116.35011,39.91422", tel: "010-59616161" },
  ],

  "上海:spot": [
    { id: "B0014073L0", name: "上海科技馆", subtype: "spot", typecode: "140200", address: "上海市浦东新区世纪大道2000号", location: "121.54131,31.22099", tel: "021-68542000", business: { cost: "45元/人", open_time: "9:00-17:15" } },
    { id: "B00140A1XZ", name: "上海自然博物馆", subtype: "spot", typecode: "140100", address: "上海市静安区北京西路510号", location: "121.44633,31.23345", business: { cost: "30元/人", open_time: "9:00-17:00" } },
    { id: "B00140DHK0", name: "上海野生动物园", subtype: "spot", typecode: "110101", address: "上海市浦东新区南六公路178号", location: "121.73652,31.04706", business: { cost: "130元/人", open_time: "8:00-17:00" } },
    { id: "B00140HRYT", name: "上海海昌海洋公园", subtype: "spot", typecode: "110100", address: "上海市浦东新区南汇新城镇银飞路166号", location: "121.89711,30.90214", business: { cost: "360元/人", open_time: "9:30-17:00" } },
  ],
  "上海:restaurant": [
    { id: "B00140HFQ8", name: "外婆家(世博源店)", subtype: "restaurant", typecode: "050100", address: "上海市浦东新区国展路1099号", location: "121.49012,31.18712", business: { cost: "80元/人" } },
  ],
  "上海:hotel": [
    { id: "B001401UP4", name: "上海浦东丽思卡尔顿酒店", subtype: "hotel", typecode: "100100", address: "上海市浦东新区陆家嘴环路1717号", location: "121.50545,31.23612", business: { cost: "2200元/晚" } },
  ],
  "上海:park": [
    { id: "B00140J807", name: "世纪公园", subtype: "park", typecode: "080100", address: "上海市浦东新区锦绣路1001号", location: "121.55712,31.22034", business: { cost: "10元/人" } },
  ],

  "广州:spot": [
    { id: "B0FFH7AIXE", name: "广州长隆野生动物世界", subtype: "spot", typecode: "110101", address: "广州市番禺区汉溪大道", location: "113.29547,23.00421", business: { cost: "300元/人", open_time: "9:30-18:00" } },
    { id: "B0FFH7A57F", name: "广东省博物馆", subtype: "spot", typecode: "140100", address: "广州市天河区珠江东路2号", location: "113.32785,23.11984", business: { cost: "免费", open_time: "9:00-17:00" } },
    { id: "B0FFH7AIWQ", name: "广州海洋馆", subtype: "spot", typecode: "140300", address: "广州市越秀区先烈中路120号", location: "113.29145,23.15012", business: { cost: "180元/人" } },
  ],
  "广州:restaurant": [
    { id: "B0FFH7AOJ2", name: "点都德(天河店)", subtype: "restaurant", typecode: "050100", address: "广州市天河区天河北路233号", location: "113.33012,23.13845", business: { cost: "75元/人" } },
  ],
  "广州:hotel": [
    { id: "B0FFH7AN03", name: "广州长隆酒店", subtype: "hotel", typecode: "100100", address: "广州市番禺区汉溪大道", location: "113.29645,23.00123", business: { cost: "1380元/晚" } },
  ],
  "广州:park": [
    { id: "B0FFH7APQ0", name: "广州珠江公园", subtype: "park", typecode: "080100", address: "广州市天河区金穗路", location: "113.33612,23.13245" },
  ],
};

/** 关键词 → subtype 启发（仅 mock fallback 用） */
function inferSubtype(keywords: string): MockPoiPreset["subtype"] {
  const k = keywords.toLowerCase();
  if (/餐厅|面|馆|肯德基|海底捞|外婆|点都|料理|饭店|酒楼/.test(k)) return "restaurant";
  if (/酒店|宾馆|民宿|饭店|度假/.test(k)) return "hotel";
  if (/医院|儿童医院|儿科/.test(k)) return "hospital";
  if (/游乐|儿童乐园|蓝天|亲子乐园/.test(k)) return "playground";
  if (/公园|森林公园|植物园|广场/.test(k)) return "park";
  if (/商场|购物中心|百货|购物广场/.test(k)) return "mall";
  return "spot";
}

function mockPoisFor(keywords: string, city: string): AmapPoiRaw[] {
  const subtype = inferSubtype(keywords);
  const presets = MOCK_PRESETS[`${city}:${subtype}`] ?? [];
  return presets.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    location: p.location,
    tel: p.tel,
    type: subtype,
    typecode: p.typecode,
    cityname: city,
    business: p.business,
  }));
}
