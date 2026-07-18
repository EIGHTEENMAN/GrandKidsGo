// 06-seed-badges.ts — 把勋章定义写入 TravelBadgeDef 表
// 运行：DATABASE_URL=... npx tsx src/lib/data-pipeline/06-seed-badges.ts
// v2.0: 扩展为 35 枚 + 稀有度 + 季节限定 + 隐藏标记

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { TRAVEL_BADGES } from "../badge-defs";

const prisma = new PrismaClient();

async function run(): Promise<void> {
  let count = 0;
  const byRarity: Record<string, number> = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  const hiddenCount = { total: 0, written: 0 };

  for (const b of TRAVEL_BADGES) {
    byRarity[b.rarity] = (byRarity[b.rarity] ?? 0) + 1;
    if (b.hiddenFlag) hiddenCount.total += 1;

    await prisma.travelBadgeDef.upsert({
      where: { name: b.name },
      update: {
        description: b.description,
        icon: b.icon,
        category: b.category,
        criteria: b.criteria,
        rarity: b.rarity,
        tier: b.tier,
        seasonalTag: b.seasonalTag ?? null,
        hiddenFlag: b.hiddenFlag ?? false,
      },
      create: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        criteria: b.criteria,
        rarity: b.rarity,
        tier: b.tier,
        seasonalTag: b.seasonalTag ?? null,
        hiddenFlag: b.hiddenFlag ?? false,
      },
    });

    if (b.hiddenFlag) hiddenCount.written += 1;
    count += 1;
  }

  console.log(`[06] 勋章定义入/更新 ${count} 枚`);
  console.log(`[06]   按稀有度: 铜 ${byRarity.bronze} / 银 ${byRarity.silver} / 金 ${byRarity.gold} / 钻石 ${byRarity.diamond}`);
  console.log(`[06]   隐藏勋章: ${hiddenCount.written} / ${hiddenCount.total}`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
