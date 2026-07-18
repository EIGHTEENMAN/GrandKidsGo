// POST /api/wizard/assemble
// 详见 项目建设方案/走天下实施方案-v1.5.md 第四节 + 附录 C WIZARD 类

import { NextRequest, NextResponse } from "next/server";
import { assemble } from "@/lib/assembler";
import { TravelParamsSchema } from "@/lib/assembler/types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = TravelParamsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMS",
          message: "TravelParams 校验失败",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const outline = await assemble(parsed.data);
    return NextResponse.json({ candidates: outline.candidates });
  } catch (e) {
    console.error("[api/wizard/assemble]", e);
    return NextResponse.json(
      { error: { code: "ASSEMBLE_FAILED", message: (e as Error).message } },
      { status: 500 },
    );
  }
}
