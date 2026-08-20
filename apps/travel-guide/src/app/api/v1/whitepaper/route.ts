// GEO: 静态 API 端点 — 白皮书数据
// GET /api/v1/whitepaper
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 小时重新生成

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "whitepaper-2026.json");
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    return NextResponse.json({
      code: "OK",
      api: "whitepaper",
      version: "1.0",
      license: "CC BY-NC 4.0",
      ...data,
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({
      code: "NOT_READY",
      message: "白皮书数据暂未生成。请先运行 npx tsx scripts/generate-whitepaper.ts",
    }, { status: 503 });
  }
}
