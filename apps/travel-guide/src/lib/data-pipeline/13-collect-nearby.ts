// 13-collect-nearby.ts — 给 spots 表填 nearby_facilities（周边亲子便利设施）
// 运行：npx tsx src/lib/data-pipeline/13-collect-nearby.ts [--city beijing|...] [--limit N] [--dry-run] [--force] [--concurrency 8] [--mode auto|around|regeo]
//
// 数据来源：高德周边搜索 v3/place/around，中心点=spot.lat/lng，半径=2000m
//
// 2026-10-29 双模式改造（搜索配额被封死 8 天后的止血 + 换桶）：
//
// 【为什么改】高德「搜索类」配额（place/around / place/text / place/polygon）
// 与「地理编码类」配额（geocode/geo / geocode/regeo）是**两个独立桶**。
// 2026-10-29 实测：搜索桶已被 10044 USER_DAILY_QUERY_OVER_LIMIT 封死，
// 连续 8 天（10/22~10/29）cron 每天白烧 9058 次失败调用、产出 0 条数据，
// 且因为错误分类 bug（10044 被误判成 QPS 限流 → 告警被吞）一直没人发现。
// 同期 regeo 单日实测连打 30000 次 0 失败 → 地理编码桶是活的。
//
// 【两种模式】
//   around（v3/place/around，原有）：召回率高（母婴室/儿童餐靠它），
//          但吃搜索类配额，2026-10-29 起已不可用。
//   regeo（v3/geocode/regeo，新增）：吃地理编码类配额，poitype 可按类目精准召回，
//          走独立桶。缺点：单次最多回 30 条、无关键词过滤，
//          母婴室/儿童餐这类细分类召回率低于 around（实测 0/40 vs 114/433）。
//
// 【mode=auto（默认）】先试 around，命中 10044 配额错误则**立刻切 regeo**，
//   并在整轮剩余部分用 regeo 跑完（不再空烧配额）。
//
// 【typecode 修正】原 13 脚本用的 types 有 3 个是错的（高德实际分类码不同），
//   实测修正为：
//     便利店 060101(购物中心) → 060400(超市/便利店)
//     停车场 150200(空)        → 150900(停车场相关)
//     药店   090200(口腔门诊)   → 090601(药房)
//   医院   090000(医疗大类)    → 090100(综合医院) 更精准
//
// 周边 11 类（覆盖前端期望字段名 + 配额可控）：
//   - 母婴室: 名称正则识别母婴生活馆/母婴店/孩子王等
//   - 儿童餐: 餐饮大类 + 儿童友好品牌正则识别
//   - 医院  : 医疗大类 + 儿科医院识别（独立儿科标记 isPediatrics）
//   - 便利店: 超市/便利店子类
//   - 停车场: 停车场子类
//   - 药店  : 药房子类（应急用药）
//   - 母婴店: 商场内母婴用品店（奶粉/尿不湿）
//   - 玩具店: 反斗城/乐高/泡泡玛特 等儿童玩具专卖店
//   - 儿童书店: 绘本馆/儿童书店
//   - 亲子酒店: 住宿大类 + 亲子/家庭/儿童 名称正则二次过滤
//   - 直饮水: 公园/景区常见直饮水点
//
// 输出 JSON 形态（写入 Spot.nearbyFacilities JSONB）：
//   { 母婴室:[{name,distance}], 儿童餐:[...], 医院:[...], 便利店:[...], 停车场:[...],
//     药店:[...], 母婴店:[...], 玩具店:[...], 儿童书店:[...], 亲子酒店:[...], 直饮水:[...],
//     推车可达:bool, 无障碍通道:bool }
//
// 优化：
//   - 并发处理多个 spot（默认 8 个并发，可调）
//   - 经纬度 4 位小数网格缓存（~11m 精度）— 附近 spot 复用查询结果
//   - 双路母婴室搜 + 去重
//   - 儿科医院识别（parentHospital 是否带儿科科室）
//   - 无障碍通道通过高德 tag.in_tag_atag 识别（弱信号）
//   - 失败重试 1 次 + 退避 200ms
//   - 进度条 + ETA 估算

import { PrismaClient, Prisma } from "@prisma/client";
import { createAmapClient, isQuotaExhausted, isQpsLimited } from "./_amap-client";

const prisma = new PrismaClient();

const RADIUS = 2000;
const OFFSET = 25;
const CACHE_PRECISION = 4;
const MAX_RETRY = 1;
/** 高德个人开发者 QPS 上限 3，并发降到 2 留 buffer
 *  每个 around 调用之间至少 sleep 350ms 控制 QPS */
const QPS_INTERVAL_MS = 400;

/** 儿童友好餐厅品牌识别 */
const CHILD_FRIENDLY_RESTAURANT_RE = /肯德基|麦当劳|必胜客|汉堡王|赛百味|棒约翰|外婆|俏江南|海底捞|真功夫|亲子|儿童/i;

/** 儿科医院识别（基于关键词） */
const PEDIATRICS_RE = /儿童医院|儿科|妇幼|儿童医学|小儿|儿童保健/i;

/** 亲子酒店识别（基于名称） */
const CHILD_FRIENDLY_HOTEL_RE = /亲子|家庭|儿童|度假|主题|club/i;

/** 无障碍通道识别（基于高德 tag 字段，弱信号） */
const ACCESSIBILITY_RE = /无障碍|disabled|accessible/i;

/** 母婴相关店名识别（v3 around 实测这类 POI 归在购物类下） */
const BABY_STORE_RE = /母婴室|母婴中心|母婴生活|母婴店|母婴用品|孕婴|宝贝|孩子王|丽家|爱婴|贝因美/i;

/** 儿童书店识别 */
const KIDS_BOOKSTORE_RE = /绘本|儿童书店|少儿|童书|书吧/i;

/** 玩具店识别 */
const TOY_STORE_RE = /玩具|反斗城|乐高|泡泡玛特|积木|扭蛋/i;

interface CategoryConfig {
  key: string;
  /** around 模式：types + keywords 多路搜 */
  queries: Array<{ types: string; keywords: string }>;
  /** regeo 模式：poitype 分类码（实测有效） */
  poitype?: string;
  /** 结果二次过滤（名称正则） */
  nameRe?: RegExp;
  /** 结果二次过滤（type 字符串正则） */
  typeRe?: RegExp;
}

/**
 * 11 类配置。
 * types/keywords —— around 模式（v3/place/around），keywords 为空=按类目全量
 * poitype        —— regeo 模式（v3/geocode/regeo），高德分类码
 *
 * 2026-10-29 typecode 实测修正（原先 3 个是错的）：
 *   便利店 060101 → 060400；停车场 150200 → 150900；药店 090200 → 090601
 */
const NEARBY_CATEGORIES: CategoryConfig[] = [
  {
    key: "母婴室",
    queries: [
      { types: "060000", keywords: "母婴室" },
      { types: "060000", keywords: "母婴" },
    ],
    poitype: "060000",
    nameRe: BABY_STORE_RE,
  },
  {
    key: "儿童餐",
    queries: [{ types: "050000", keywords: "" }],
    poitype: "050000",
    nameRe: CHILD_FRIENDLY_RESTAURANT_RE,
  },
  {
    key: "医院",
    queries: [{ types: "090000", keywords: "" }],
    poitype: "090100",
    typeRe: /医疗|医院|门诊|卫生服务|保健/i,
  },
  {
    key: "便利店",
    queries: [{ types: "060400", keywords: "" }],
    poitype: "060400",
    typeRe: /超市|便利店|便民商店/i,
  },
  {
    key: "停车场",
    queries: [{ types: "150900", keywords: "" }],
    poitype: "150900",
    typeRe: /停车场/i,
  },
  {
    key: "药店",
    queries: [{ types: "090601", keywords: "" }],
    poitype: "090601",
    typeRe: /药房|药店|医药/i,
  },
  {
    key: "母婴店",
    queries: [{ types: "060000", keywords: "母婴" }],
    poitype: "060000",
    nameRe: BABY_STORE_RE,
  },
  {
    key: "玩具店",
    queries: [{ types: "060000", keywords: "玩具" }],
    poitype: "060000",
    nameRe: TOY_STORE_RE,
  },
  {
    key: "儿童书店",
    queries: [
      { types: "060000", keywords: "书店" },
      { types: "060000", keywords: "绘本馆" },
    ],
    poitype: "140000",
    nameRe: KIDS_BOOKSTORE_RE,
  },
  {
    key: "亲子酒店",
    queries: [{ types: "100000", keywords: "" }],
    poitype: "100000",
    nameRe: CHILD_FRIENDLY_HOTEL_RE,
  },
  {
    key: "直饮水",
    queries: [{ types: "060000", keywords: "直饮水" }],
    poitype: "060000",
    nameRe: /直饮水|饮水点/i,
  },
];

function parseArg(name: string): string | null {
  const prefix = "--" + name + "=";
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

/** 简单并发控制器（带 QPS 节流） */
async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>, onProgress?: (done: number, total: number) => void): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
      // 每个 spot 处理完做 sleep，避免连续 QPS 触发高德限流
      await new Promise(r => setTimeout(r, QPS_INTERVAL_MS));
      if (onProgress) onProgress(cursor, items.length);
    }
  });
  await Promise.all(workers);
  return results;
}

/** 带重试的高德 around 调用
 *  QPS 限流时退避更长（指数退避：1s → 3s），避免持续触发限流 */
async function aroundWithRetry(client: any, params: any): Promise<any[]> {
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      return await client.around(params);
    } catch (e: any) {
      const msg = (e?.message ?? "");
      // 2026-10-29 修复：配额耗尽（10044/10003）必须**立即上抛**，
      // 不能当成 QPS 限流退避重试——那会让脚本空烧一整天配额。
      if (isQuotaExhausted(e)) throw e;
      if (isQpsLimited(e) && attempt < MAX_RETRY) {
        // QPS 限流：长退避 1s，让 QPS 窗口重置
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      if (attempt === MAX_RETRY) {
        console.warn(`[13] around 失败（已重试 ${MAX_RETRY} 次）: ${msg}`);
        return [];
      }
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  return [];
}

/** 带重试的高德 regeo 调用（地理编码桶，配额独立） */
async function regeoWithRetry(client: any, params: any): Promise<any[]> {
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      return await client.regeo(params);
    } catch (e: any) {
      if (isQuotaExhausted(e)) throw e;
      const msg = (e?.message ?? "");
      if (isQpsLimited(e) && attempt < MAX_RETRY) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      if (attempt === MAX_RETRY) {
        console.warn(`[13] regeo 失败（已重试 ${MAX_RETRY} 次）: ${msg}`);
        return [];
      }
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  return [];
}

/** 按 name 去重合并多路查询结果 */
function dedupeByName(items: any[]): any[] {
  const seen = new Map<string, any>();
  for (const it of items) {
    if (!it.name) continue;
    if (!seen.has(it.name) || (it.distance != null && (seen.get(it.name).distance == null || it.distance < seen.get(it.name).distance))) {
      seen.set(it.name, it);
    }
  }
  return Array.from(seen.values());
}

/** 两点球面距离（米） */
function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function main() {
  const cityFilter = parseArg("city");
  const limitStr = parseArg("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : null;
  const concStr = parseArg("concurrency");
  const concurrency = concStr ? parseInt(concStr, 10) : 2;  // 默认 2（高德 QPS 上限 3）
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const modeArg = parseArg("mode") ?? "auto";
  const mode = (["auto", "around", "regeo"] as const).includes(modeArg as any)
    ? (modeArg as "auto" | "around" | "regeo")
    : "auto";
  /** 本次运行的 API 调用上限（防单轮跑爆整个配额桶）。达到即正常收尾，留待明早续跑。 */
  const maxCallsStr = parseArg("max-calls");
  const maxCalls = maxCallsStr ? parseInt(maxCallsStr, 10) : null;

  console.log(`[13] city=${cityFilter ?? "all"} limit=${limit ?? "无"} dryRun=${dryRun} force=${force} concurrency=${concurrency} mode=${mode}${maxCalls ? ` maxCalls=${maxCalls}` : ""}`);

  const client = createAmapClient();
  // 跑前提示：AMAP 当日已用配额（多天续跑时一眼看出还剩多少）
  if ((client as any).usedToday !== undefined) {
    const u = (client as any).usedToday as number;
    const b = (client as any).dailyBudget as number;
    console.log(`[13] AMAP 当日已用 ${u}/${b}（剩余 ${b - u} calls）`);
  }
  const cache = new Map<string, Record<string, any[]>>();
  const startTime = Date.now();

  const spots = await prisma.spot.findMany({
    where: {
      ...(cityFilter ? { cityId: `city-${cityFilter}` } : {}),
      lat: { not: null },
      lng: { not: null },
    },
    select: { id: true, name: true, cityId: true, lat: true, lng: true, nearbyFacilities: true },
    ...(limit ? { take: limit } : {}),
  });
  // 已写入 nearbyFacilities 的 spot 数（force=true 时仍会跑这些），方便续跑
  const alreadyFilled = spots.filter(s => s.nearbyFacilities && Object.keys(s.nearbyFacilities as any).length > 0).length;
  const toRun = force ? spots.length : spots.length - alreadyFilled;
  console.log(`[13] 处理 ${spots.length} 个 spot（已写入 ${alreadyFilled}, ${force ? "force 全跑" : `待跑 ${toRun}`}）`);

  // 空 spot：上游 04-import-db 没入该城市的 spot。退非 0 让 cron 报警 + 不前进 state，
  // 明早同一城市再跑 (避免把 spot=0 静默当成功)
  if (spots.length === 0) {
    console.error(`[13] ❌ ${cityFilter ?? "当前"} 城市在数据库里 0 个 spot — 04-import-db 漏跑或 AI enrich 失败，请人工排查`);
    await prisma.$disconnect();
    process.exit(2);
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let cacheHits = 0;
  let retriedCount = 0;
  /** 当前生效的采集模式（around → regeo 自动切换） */
  let activeMode: "around" | "regeo" = mode === "regeo" ? "regeo" : "around";
  /** 搜索配额是否已确认耗尽（耗尽后不再尝试 around） */
  let searchQuotaDead = mode === "regeo";
  /** 本轮已发的 API 调用数（用于 maxCalls 限流） */
  let apiCalls = 0;
  /** 是否因达到 maxCalls 而提前收尾 */
  let hitMaxCalls = false;

  /** 限流闸：达到 maxCalls 就抛特殊标记，让外层提前收尾（而不是跑完全城再炸配额） */
  class MaxCallsReached extends Error {
    constructor() {
      super("达到 maxCalls 上限");
      this.name = "MaxCallsReached";
    }
  }
  function chargeCall() {
    apiCalls++;
    if (maxCalls && apiCalls > maxCalls) throw new MaxCallsReached();
  }

  async function fetchCategoryRegeo(
    client: any,
    cat: CategoryConfig,
    location: string,
  ): Promise<any[]> {
    if (!cat.poitype) return [];
    const items = await regeoWithRetry(client, {
      location,
      radius: RADIUS,
      poitype: cat.poitype,
      // 必须 all：extensions=base 时高德不返回 regeocode.pois 数组
      extensions: "all",
    });
    let list = items;
    if (cat.typeRe) list = list.filter((p: any) => cat.typeRe!.test(p.type || ""));
    if (cat.nameRe) list = list.filter((p: any) => cat.nameRe!.test(p.name || ""));
    return list;
  }

  async function processSpot(spot: typeof spots[number]) {
    if (spot.lat == null || spot.lng == null) return { kind: "skip" as const };
    if (!force && spot.nearbyFacilities && Object.keys(spot.nearbyFacilities as any).length > 0) {
      return { kind: "skip" as const };
    }

    const gridKey = `${spot.lat.toFixed(CACHE_PRECISION)}|${spot.lng.toFixed(CACHE_PRECISION)}`;
    const fac: Record<string, any[]> = {};
    let hasAccessibilityTag = false;

    for (const cat of NEARBY_CATEGORIES) {
      const cacheKey = `${gridKey}|${cat.key}`;
      if (cache.has(cacheKey)) {
        fac[cat.key] = cache.get(cacheKey)!;
        cacheHits++;
        continue;
      }

      const location = `${spot.lng},${spot.lat}`;
      let list: any[] = [];

      if (activeMode === "around") {
        try {
          const allItems: any[] = [];
          for (const q of cat.queries) {
            chargeCall();
            const items = await aroundWithRetry(client, {
              keywords: q.keywords,
              location,
              radius: RADIUS,
              types: q.types,
              offset: OFFSET,
            });
            allItems.push(...items);
          }
          const merged = dedupeByName(allItems);
          const rawList = merged.slice(0, 25).map((p: any) => ({
            name: p.name,
            distance: p.distance ? Number(p.distance) : null,
            address: p.address ?? null,
          }));

          if (cat.key === "儿童餐") {
            list = rawList.filter((p: any) => p.name && CHILD_FRIENDLY_RESTAURANT_RE.test(p.name)).slice(0, 5);
          } else if (cat.key === "医院") {
            list = rawList.slice(0, 5).map((p: any) => ({
              ...p,
              isPediatrics: p.name && PEDIATRICS_RE.test(p.name),
            }));
          } else if (cat.key === "亲子酒店") {
            list = rawList.filter((p: any) => p.name && CHILD_FRIENDLY_HOTEL_RE.test(p.name)).slice(0, 5);
          } else {
            list = rawList.slice(0, 5);
          }

          // 检测无障碍通道：所有返回里如果有 POI 名称/地址含"无障碍"
          for (const p of merged) {
            if ((p.name && ACCESSIBILITY_RE.test(p.name)) || (p.address && ACCESSIBILITY_RE.test(p.address))) {
              hasAccessibilityTag = true;
              break;
            }
          }
        } catch (e: any) {
          // 2026-10-29：搜索配额耗尽 → 整轮切 regeo（独立配额桶），不再空烧
          if (isQuotaExhausted(e)) {
            if (!searchQuotaDead) {
              searchQuotaDead = true;
              activeMode = "regeo";
              console.warn(
                `[13] ⚠️  搜索类配额已耗尽（${e?.message ?? e}），本轮剩余 spot 改用 regeo（地理编码桶，独立配额）`,
              );
            }
          } else {
            console.warn(`[13] around 异常: ${e?.message ?? e}`);
          }
          if (e instanceof MaxCallsReached) throw e;
        }
      }

      // regeo 模式（搜索桶死了，或显式 --mode=regeo）
      if (activeMode === "regeo" && list.length === 0) {
        try {
          chargeCall();
          const raw = await fetchCategoryRegeo(client, cat, location);
          list = raw
            .map((p: any) => {
              const [plng, plat] = String(p.location || "").split(",").map(Number);
              const d =
                plng && plat
                  ? Math.round(haversine(spot.lng!, spot.lat!, plng, plat))
                  : p.distance
                    ? Math.round(Number(p.distance))
                    : null;
              return { name: p.name, distance: d, address: p.address ?? null };
            })
            .filter((p: any) => p.name)
            .sort((a: any, b: any) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
            .slice(0, 5);

          if (cat.key === "医院") {
            list = list.map((p: any) => ({ ...p, isPediatrics: p.name && PEDIATRICS_RE.test(p.name) }));
          }
          for (const p of raw) {
            if ((p.name && ACCESSIBILITY_RE.test(p.name)) || (p.address && ACCESSIBILITY_RE.test(p.address))) {
              hasAccessibilityTag = true;
              break;
            }
          }
        } catch (e: any) {
          if (isQuotaExhausted(e)) {
            console.error(
              `[13] ❌ 地理编码类配额也耗尽（${e?.message ?? e}）— 今日无法采集，退出待明日重置`,
            );
            await prisma.$disconnect();
            process.exit(3);
          }
          if (e instanceof MaxCallsReached) throw e;
          console.warn(`[13] regeo 异常: ${e?.message ?? e}`);
        }
      }

      fac[cat.key] = list;
      cache.set(cacheKey, list);
    }

    const hasParkingNear = fac["停车场"]?.some((p: any) => p.distance && p.distance < 200);
    const hasEssentialNear = fac["便利店"]?.some((p: any) => p.distance && p.distance < 200);

    const facilities = {
      ...fac,
      推车可达: Boolean(hasParkingNear || hasEssentialNear),
      无障碍通道: hasAccessibilityTag,
    };

    // 防护：所有 11 类周边设施都为空（高德 daily quota 耗尽时常见）。
    // 此时跳过写入，避免污染 spot.nearby_facilities（前端无法区分"真没设施"与"还没采集"）。
    const allFacEmpty = NEARBY_CATEGORIES.every(c => {
      const arr = (facilities as any)[c.key];
      return Array.isArray(arr) && arr.length === 0;
    });
    if (allFacEmpty) {
      console.warn(`[13] ${spot.name} 11 类全空，跳过写入（疑似 AMAP quota 耗尽）`);
      return { kind: "skip" as const };
    }

    if (!dryRun) {
      try {
        await prisma.spot.update({
          where: { id: spot.id },
          data: { nearbyFacilities: facilities as any },
        });
        return { kind: "updated" as const };
      } catch (e) {
        return { kind: "error" as const, msg: (e as Error).message };
      }
    } else {
      const empty = Object.values(fac).every((v: any) => Array.isArray(v) && v.length === 0);
      const icon = empty ? "  ○" : "  ●";
      const counts = NEARBY_CATEGORIES.map(c => `${c.key.slice(0, 1)}${fac[c.key].length}`).join("/");
      const pediatricsFlag = fac["医院"]?.some((h: any) => h.isPediatrics) ? "儿科" : "";
      const accessibilityFlag = hasAccessibilityTag ? "无障碍" : "";
      console.log(`${icon} ${spot.name}: ${counts} ${pediatricsFlag}${accessibilityFlag}`);
      return { kind: "dry" as const };
    }
  }

  let lastProgressAt = 0;
  let aborted = false;
  await pMap(spots, concurrency, async (spot) => {
    if (aborted) return;
    try {
      const r = await processSpot(spot);
      if (r.kind === "updated") updated++;
      else if (r.kind === "skip") skipped++;
      else if (r.kind === "error") { errors++; console.warn(`[13] update skip ${spot.name}: ${r.msg}`); }
    } catch (e: any) {
      if (e instanceof MaxCallsReached) {
        aborted = true;
        hitMaxCalls = true;
        return;
      }
      throw e;
    }
  }, (done, total) => {
    if (Date.now() - lastProgressAt > 3000 || done === total) {
      lastProgressAt = Date.now();
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = done / elapsed;
      const eta = (total - done) / rate;
      console.log(`[13] 进度 ${done}/${total} (${(done * 100 / total).toFixed(1)}%) rate=${rate.toFixed(1)}/s eta=${eta.toFixed(0)}s updated=${updated} skipped=${skipped} cacheHits=${cacheHits} retried=${retriedCount} mode=${activeMode}`);
    }
  });

  if (hitMaxCalls) {
    console.log(`[13] ⏸  达到 maxCalls=${maxCalls} 上限，正常收尾（本轮已写 ${updated} 个），剩余留待下次续跑`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[13] 完成 updated=${updated} skipped=${skipped} errors=${errors} cacheHits=${cacheHits} 用时 ${totalElapsed}s 采集模式=${activeMode}`);
  // 跑后提示：明早续跑时一眼看出还剩多少 spot + AMAP quota 余量
  if (!force) {
    // Prisma Json 字段的 NULL 判断：必须用 Prisma.DbNull。
    // 2026-10-29 修复：`{ equals: null }` 在 Prisma 5.22 下对 JSONB 列
    // 永远返回 0（SQL NULL 被当成 JSON null 匹配不上），导致这里永远报
    // "全部写完"——青岛实际 894 个 spot 一个都没写，脚本却报 ✅。
    const stillEmpty = await prisma.spot.count({
      where: {
        ...(cityFilter ? { cityId: `city-${cityFilter}` } : {}),
        lat: { not: null },
        lng: { not: null },
        nearbyFacilities: { equals: Prisma.DbNull },
      },
    });
    if (stillEmpty > 0) {
      console.log(`[13] ⚠️  还有 ${stillEmpty} 个 spot 未写 nearby_facilities，建议明天 daily quota reset 后重跑本脚本`);
    } else {
      console.log(`[13] ✅ 该城全部 spot 已写完 nearby_facilities`);
    }
  }
  if ((client as any).usedToday !== undefined) {
    const u = (client as any).usedToday as number;
    const b = (client as any).dailyBudget as number;
    const s = (client as any).usedIn?.("search");
    const g = (client as any).usedIn?.("geocode");
    console.log(
      `[13] AMAP 当日累计 ${u} calls（搜索桶 ${s ?? "-"} / 地理编码桶 ${g ?? "-"}）`,
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
