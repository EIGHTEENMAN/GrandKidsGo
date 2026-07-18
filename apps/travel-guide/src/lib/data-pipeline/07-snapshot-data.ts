// 07-snapshot-data.ts — 每日全量资产快照
// 运行：npx tsx src/lib/data-pipeline/07-snapshot-data.ts
//
// 用途：把当天所有 UGC + 合规 + 撤回记录导出 JSON，
// 落地 src/data/travel-assets/snapshots/<YYYY-MM-DD>/（git）
// + 阿里云 OSS bucket grandkidsgo-assets-backup/<YYYY-MM-DD>/（备份）
// DailySnapshot 表只追踪元数据（路径/sha256/条数），保证"可重生"。

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { recordOperation } from "../operation-log";

const prisma = new PrismaClient();

const SNAPSHOT_ROOT = path.join(process.cwd(), "src/data/travel-assets/snapshots");

async function snapshotDate(): Promise<string> {
  return new Date().toISOString().slice(0, 10);
}

async function writeJsonAtomic(p: string, data: unknown): Promise<{ sha256: string; size: number }> {
  const json = JSON.stringify(data, null, 2);
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, json, "utf-8");
  await fs.rename(tmp, p);
  const sha256 = crypto.createHash("sha256").update(json).digest("hex");
  const buf = await fs.readFile(p);
  return { sha256, size: buf.byteLength };
}

async function runScope(dateDir: string, scope: string): Promise<{ count: number; sha256: string; size: number; path: string }> {
  let data: unknown;
  let count = 0;
  if (scope === "all") {
    // 一次拉 4 张表的全量（不限于当天的，但快照 day 0 取基线）
    const [guides, consents, ratings, retractions] = await Promise.all([
      prisma.guide.findMany({}),
      prisma.consentRecord.findMany({}),
      prisma.childRating.findMany({}),
      prisma.retractionLog.findMany({}),
    ]);
    data = { guides, consents, ratings, retractions };
    count = guides.length + consents.length + ratings.length + retractions.length;
  } else if (scope === "guides") {
    data = await prisma.guide.findMany({});
    count = (data as any[]).length;
  } else if (scope === "consents") {
    data = await prisma.consentRecord.findMany({});
    count = (data as any[]).length;
  } else if (scope === "ratings") {
    data = await prisma.childRating.findMany({});
    count = (data as any[]).length;
  } else {
    throw new Error(`unknown scope: ${scope}`);
  }

  const filePath = path.join(dateDir, `${scope}.json`);
  const { sha256, size } = await writeJsonAtomic(filePath, data);
  return { count, sha256, size, path: filePath };
}

async function run(): Promise<void> {
  const date = await snapshotDate();
  const dateDir = path.join(SNAPSHOT_ROOT, date);
  await fs.mkdir(dateDir, { recursive: true });

  const scopes = ["guides", "consents", "ratings", "all"];
  for (const scope of scopes) {
    const { count, sha256, size, path: p } = await runScope(dateDir, scope);
    await prisma.dailySnapshot.upsert({
      where: { snapshotDate_scope: { snapshotDate: new Date(date), scope } },
      update: {
        gitPath: p,
        fileSha256: sha256,
        fileSize: size,
        recordCount: count,
      },
      create: {
        snapshotDate: new Date(date),
        scope,
        gitPath: p,
        fileSha256: sha256,
        fileSize: size,
        recordCount: count,
      },
    });
    await recordOperation({
      actorId: "system",
      actorRole: "system",
      action: "snapshot_create",
      targetType: "snapshot",
      targetId: `${date}/${scope}`,
      after: { count, sha256, size },
    });
    console.log(`[07] snapshot ${date}/${scope}: ${count} 条 (${(size / 1024).toFixed(1)} KB)`);
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
