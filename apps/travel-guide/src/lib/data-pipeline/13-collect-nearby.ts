// 13-collect-nearby.ts — 给 spots 表填 nearby_facilities（周边亲子便利设施）
// 运行：npx tsx src/lib/data-pipeline/13-collect-nearby.ts [--city beijing|...] [--limit N] [--dry-run] [--force] [--concurrency 8]
//
// 数据来源：高德周边搜索 v3/place/around，中心点=spot.lat/lng，半径=2000m
//
// 周边 5 类（覆盖前端期望字段名 + 配额可控）：
//   - 母婴室: 双路搜 (types=060000 keywords=母婴室) + (types=060000 keywords=母婴)，合并去重
//   - 儿童餐: 餐饮大类 + 儿童友好品牌正则识别（肯德基/麦当劳/必胜客/海底捞/亲子/儿童）
//   - 医院  : 医疗大类 + 儿科医院识别（独立儿科标记 isPediatrics）
//   - 便利店: 便利店子类
//   - 停车场: 停车场子类
//
// 输出 JSON 形态（写入 Spot.nearbyFacilities JSONB）：
//   { 母婴室:[{name,distance}], 儿童餐:[...], 医院:[...], 便利店:[...], 停车场:[...], 推车可达:bool, 无障碍通道:bool }
//
// 优化：
//   - 并发处理多个 spot（默认 8 个并发，可调）
//   - 经纬度 4 位小数网格缓存（~11m 精度）— 附近 spot 复用查询结果
//   - 双路母婴室搜 + 去重
//   - 儿科医院识别（parentHospital 是否带儿科科室）
//   - 无障碍通道通过高德 tag.in_tag_atag 识别（弱信号）
//   - 失败重试 1 次 + 退避 200ms
//   - 进度条 + ETA 估算

import { PrismaClient } from "@prisma/client";
import { createAmapClient } from "./_amap-client";

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

/** 无障碍通道识别（基于高德 tag 字段，弱信号） */
const ACCESSIBILITY_RE = /无障碍|disabled|accessible/i;

interface CategoryConfig {
  key: string;
  queries: Array<{ types: string; keywords: string }>; // 多路搜合并
}

const NEARBY_CATEGORIES: CategoryConfig[] = [
  {
    key: "母婴室",
    queries: [
      { types: "060000", keywords: "母婴室" },  // 主路：商场内母婴室
      { types: "060000", keywords: "母婴" },     // 辅路：母婴用品店
    ],
  },
  {
    key: "儿童餐",
    queries: [{ types: "050000", keywords: "" }], // 空 keywords 拉全部餐饮，正则二次识别
  },
  {
    key: "医院",
    queries: [{ types: "090000", keywords: "" }],
  },
  {
    key: "便利店",
    queries: [{ types: "060101", keywords: "" }],
  },
  {
    key: "停车场",
    queries: [{ types: "150200", keywords: "" }],
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
      const isQpsLimit = msg.includes("CUQPS") || msg.includes("LIMIT") || msg.includes("Too Many");
      if (isQpsLimit && attempt < MAX_RETRY) {
        // QPS 限流：长退避 1s，让 QPS 窗口重置
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      if (attempt === MAX_RETRY) {
        if (!isQpsLimit) console.warn(`[13] around 失败（已重试 ${MAX_RETRY} 次）: ${msg}`);
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

async function main() {
  const cityFilter = parseArg("city");
  const limitStr = parseArg("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : null;
  const concStr = parseArg("concurrency");
  const concurrency = concStr ? parseInt(concStr, 10) : 2;  // 默认 2（高德 QPS 上限 3）
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  console.log(`[13] city=${cityFilter ?? "all"} limit=${limit ?? "无"} dryRun=${dryRun} force=${force} concurrency=${concurrency}`);

  const client = createAmapClient();
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
  console.log(`[13] 处理 ${spots.length} 个 spot`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let cacheHits = 0;
  let retriedCount = 0;

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
      const allItems: any[] = [];

      for (const q of cat.queries) {
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

      let list: any[];
      if (cat.key === "儿童餐") {
        list = rawList.filter((p: any) => p.name && CHILD_FRIENDLY_RESTAURANT_RE.test(p.name)).slice(0, 5);
      } else if (cat.key === "医院") {
        list = rawList.slice(0, 5).map((p: any) => ({
          ...p,
          isPediatrics: p.name && PEDIATRICS_RE.test(p.name),
        }));
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
  await pMap(spots, concurrency, async (spot) => {
    const r = await processSpot(spot);
    if (r.kind === "updated") updated++;
    else if (r.kind === "skip") skipped++;
    else if (r.kind === "error") { errors++; console.warn(`[13] update skip ${spot.name}: ${r.msg}`); }
  }, (done, total) => {
    if (Date.now() - lastProgressAt > 3000 || done === total) {
      lastProgressAt = Date.now();
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = done / elapsed;
      const eta = (total - done) / rate;
      console.log(`[13] 进度 ${done}/${total} (${(done * 100 / total).toFixed(1)}%) rate=${rate.toFixed(1)}/s eta=${eta.toFixed(0)}s updated=${updated} skipped=${skipped} cacheHits=${cacheHits} retried=${retriedCount}`);
    }
  });

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[13] 完成 updated=${updated} skipped=${skipped} errors=${errors} cacheHits=${cacheHits} 用时 ${totalElapsed}s`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});