// prisma/seed.ts — 走天下 v1.5 顶层种子入口
// 仅作为 npm/Prisma 兼容入口，实际工作由 data-pipeline 流水线完成。
//
// 使用方式：
//   npm run db:reset      → 删除数据并重建
//   npx prisma db seed    → 重新走一遍数据流水线
//   手动物理：
//     1. npx tsx src/lib/data-pipeline/01-amap-pull.ts
//     2. npx tsx src/lib/data-pipeline/02-ai-enrich.ts
//     3. DATABASE_URL=... npx tsx src/lib/data-pipeline/04-import-db.ts
//
// 注意：本脚本默认跳到 import-db。前两步已在上线前/数据更新时跑过。
// 若数据库完全清空，需要先跑 01 + 02 把 raw/ enriched/ 重新生成。

import { execSync } from "node:child_process";

function runStep(name: string, cmd: string): void {
  console.log(`\n[seed] >>> ${name}: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

async function main(): Promise<void> {
  const forceReimport = process.argv.includes("--full");

  if (forceReimport) {
    // 全量：从高德重新拉，重新 AI 起草，再入库
    runStep("拉取 POI", "npx tsx src/lib/data-pipeline/01-amap-pull.ts");
    runStep("AI 起草", "npx tsx src/lib/data-pipeline/02-ai-enrich.ts");
  } else {
    // 日常：仅入 enriched/ 到库（assets 已在前面跑过）
    console.log("[seed] 仅入 enriched/ 到库。如需全量，添加 --full 参数");
  }

  runStep("导入数据库", "npx tsx src/lib/data-pipeline/04-import-db.ts");
  console.log("\n[seed] ✓ 完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
