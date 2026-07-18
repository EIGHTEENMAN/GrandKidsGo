// 01-amap-pull.ts — 高德 POI 拉取 → 写 raw/
// 运行：npx tsx src/lib/data-pipeline/01-amap-pull.ts [--city beijing|shanghai|guangzhou|all]
//
// 作用：raw/ 是第一层资产（永不修改）。任何时候都能从这层重生。
//
// 行为：
// - 按 CITY_META.keywords 遍历每个关键词
// - 高德分页拉到全部 POI
// - 按子类映射（spot/restaurant/hotel/park/playground/mall/hospital）
// - 写 raw/<city>/<subtype>.json，附带 fetchedAt 时间戳
// - 同名 POI 按高德 id 去重

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { CITY_META, type AmapRawPoi } from "../../data/travel-assets/_meta";
import { createAmapClient } from "./_amap-client";

const ASSETS_ROOT = path.join(
  process.cwd(),
  "src/data/travel-assets/raw",
);

/** 高德返回的 city 中文名 → raw 目录的拼音 slug。保持脚本不依赖 city 名拼写。 */
function slugify(name: string): string {
  const map: Record<string, string> = {
    北京: "beijing",
    上海: "shanghai",
    广州: "guangzhou",
  };
  return map[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}

interface PoiEntry {
  cityId: string;
  cityName: string;
  raw: Awaited<ReturnType<ReturnType<typeof createAmapClient>["poiSearch"]>>[number];
  keywords: string; // 来源关键词，便于追溯
  fetchedAt: string;
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function writeJsonAtomic(p: string, data: unknown): Promise<void> {
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, p);
}

async function pullOne(city: typeof CITY_META[number]): Promise<Record<string, PoiEntry[]>> {
  const client = createAmapClient();
  const fetchedAt = new Date().toISOString();
  const all: PoiEntry[] = [];

  for (const kw of city.keywords) {
    let page = 1;
    while (true) {
      let items: Awaited<ReturnType<typeof client.poiSearch>> = [];
      try {
        items = await (client as any).poiSearch({
          keywords: kw,
          city: city.name,
          offset: 25,
          page,
          extensions: "all",
        });
      } catch (e) {
        console.warn(`[01] ${city.name}/${kw} p${page} 失败：${(e as Error).message}`);
        break;
      }
      if (items.length === 0) break;
      for (const item of items) {
        const subtype = inferSubtypeFromType(item.typecode);
        if (!subtype) continue;
        all.push({
          cityId: city.id,
          cityName: city.name,
          raw: item,
          keywords: kw,
          fetchedAt,
        });
      }
      if (items.length < 25) break;
      page += 1;
      // 高德每页 25；防止无限循环，加个硬上限
      if (page > 10) break;
    }
  }
  return dedupeByPoiId(all);
}

function inferSubtypeFromType(
  typecode: string,
): "spot" | "restaurant" | "hotel" | "park" | "playground" | "mall" | "hospital" | null {
  const code = typecode.slice(0, 6);
  if (code.startsWith("14")) return "spot";          // 科教文化
  if (code.startsWith("05")) return "restaurant";    // 餐饮
  if (code.startsWith("10")) return "hotel";         // 住宿
  if (code.startsWith("08")) return "park";          // 公园
  if (code.startsWith("11")) return "spot";          // 风景名胜（含动物园/游乐园）
  if (code.startsWith("06")) return "mall";          // 购物
  if (code.startsWith("09")) return "hospital";      // 医疗
  return null;
}

function dedupeByPoiId(items: PoiEntry[]): Record<string, PoiEntry[]> {
  const bySubtype: Record<string, Map<string, PoiEntry>> = {};
  for (const it of items) {
    const subtype = inferSubtypeFromType(it.raw.typecode);
    if (!subtype) continue;
    if (!bySubtype[subtype]) bySubtype[subtype] = new Map();
    const existing = bySubtype[subtype].get(it.raw.id);
    if (!existing) bySubtype[subtype].set(it.raw.id, it);
  }
  return Object.fromEntries(
    Object.entries(bySubtype).map(([k, v]) => [k, Array.from(v.values())]),
  );
}

async function run(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith("--city="));
  const filter = arg ? arg.slice("--city=".length) : "all";
  const targets = CITY_META.filter((c) =>
    filter === "all" ? true : c.id === `city-${filter}`,
  );

  await ensureDir(ASSETS_ROOT);

  for (const city of targets) {
    const cityDir = path.join(ASSETS_ROOT, slugify(city.name));
    await ensureDir(cityDir);
    const grouped = await pullOne(city);
    const counts: Record<string, number> = {};
    for (const [subtype, items] of Object.entries(grouped)) {
      const outPath = path.join(cityDir, `${subtype}.json`);
      await writeJsonAtomic(outPath, items);
      counts[subtype] = items.length;
    }
    console.log(
      `[01] ${city.name} 完成 ${Object.entries(counts)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
