// 05-snapshot.ts — 把当天 enriched/ → snapshots/<YYYY-MM-DD>/
// 运行：npx tsx src/lib/data-pipeline/05-snapshot.ts
// 用途：每日跑一次，给数据资产留时间维度可回放历史版本。

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ENRICHED_ROOT = path.join(
  process.cwd(),
  "src/data/travel-assets/enriched",
);
const SNAPSHOT_ROOT = path.join(
  process.cwd(),
  "src/data/travel-assets/snapshots",
);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function run(): Promise<void> {
  const dest = path.join(SNAPSHOT_ROOT, today());
  await fs.mkdir(dest, { recursive: true });
  const cities = await fs.readdir(ENRICHED_ROOT);
  for (const city of cities) {
    const fromDir = path.join(ENRICHED_ROOT, city);
    const toDir = path.join(dest, city);
    await fs.mkdir(toDir, { recursive: true });
    const stat = await fs.stat(fromDir);
    if (!stat.isDirectory()) continue;
    const files = await fs.readdir(fromDir);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      await fs.copyFile(path.join(fromDir, f), path.join(toDir, f));
    }
  }
  console.log(`[05] snapshot → ${dest}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
