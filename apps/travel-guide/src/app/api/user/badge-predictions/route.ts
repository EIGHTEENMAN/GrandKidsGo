// GET /api/user/badge-predictions
// 勋章触发预测（引擎 B 第 7 类）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第五节 + 附录 C
//
// 基于纯规则预测未来 30 天可解锁勋章
// 输入：当前用户（从 header 提取）
// 输出：最多 5 条预测，按置信度降序

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { predictBadgesFor } from "@/lib/badge-predictor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED", message: "需要登录" } },
      { status: 401 },
    );
  }

  try {
    const predictions = await predictBadgesFor(userId);
    return NextResponse.json({
      items: predictions,
      total: predictions.length,
    });
  } catch (e) {
    console.error("[badge-predictions] error:", (e as Error).message);
    return NextResponse.json(
      { error: { code: "PREDICT_FAILED", message: "预测生成失败" }, items: [] },
      { status: 500 },
    );
  }
}
