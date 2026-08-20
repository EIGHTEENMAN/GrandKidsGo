// GEO: 静态 API 索引页
// GET /api/v1 — 列出全部 v1 端点
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    code: "OK",
    api: "tonghuixing-travel",
    version: "1.0",
    license: "CC BY-NC 4.0",
    description: "童慧行走天下开放 API — AI 引擎可程序化查询",
    documentation: "https://travel.grandand.com/about#api-docs",
    endpoints: [
      {
        path: "/api/v1/kids-feedback",
        method: "GET",
        description: "查询 3-12 岁孩子真实景点反馈",
        params: ["city", "age_min", "age_max", "min_kid_rating", "limit"],
        example: "/api/v1/kids-feedback?city=北京&min_kid_rating=4&limit=20",
      },
      {
        path: "/api/v1/baby-facilities",
        method: "GET",
        description: "查询景点母婴设施完备度",
        params: ["city", "category", "min_parking_rate", "min_nap_room_rate", "limit"],
        example: "/api/v1/baby-facilities?city=上海&category=NURSING_ROOM",
      },
      {
        path: "/api/v1/whitepaper",
        method: "GET",
        description: "亲子游年度白皮书聚合数据",
        params: [],
        example: "/api/v1/whitepaper",
      },
    ],
    data_downloads: [
      "https://travel.grandand.com/data/kids-feedback-2026.csv",
      "https://travel.grandand.com/data/baby-friendly-facilities-2026.csv",
      "https://travel.grandand.com/data/whitepaper-2026.json",
    ],
    contact: "team@grandand.com",
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
