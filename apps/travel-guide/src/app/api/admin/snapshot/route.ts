// POST /api/admin/snapshot — 手动触发每日快照
// v1 上线后可挂 cron（每日凌晨 3 点）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  // 调脚本（execSync 等同）
  const { execSync } = await import("node:child_process");
  try {
    const out = execSync("npx tsx src/lib/data-pipeline/07-snapshot-data.ts", {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    const todaySnapshots = await prisma.dailySnapshot.findMany({
      where: { snapshotDate: new Date() },
      orderBy: { scope: "asc" },
    });
    return NextResponse.json({
      ok: true,
      snapshots: todaySnapshots.map((s) => ({
        scope: s.scope,
        recordCount: s.recordCount,
        fileSha256: s.fileSha256,
        fileSize: s.fileSize,
      })),
      stdout: out,
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SNAPSHOT_FAILED", message: (e as Error).message } },
      { status: 500 },
    );
  }
}
