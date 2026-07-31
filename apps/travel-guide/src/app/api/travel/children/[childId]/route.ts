// PATCH /api/travel/children/[childId]
// 单字段或多字段更新孩子扩展画像（Phase A：让 ChildDetail 可编辑）
// 内部转发到 PUT /api/user/children，认证透传。
//
// 为什么不直接调 PUT /api/user/children？
// - 命名空间隔离：编辑入口统一在 /api/travel/* 下（与 children-create 同源代理）
// - 未来要加权限校验（只允许本人编辑自己的孩子）

import { NextRequest, NextResponse } from "next/server";
import { authedFetch } from "@/lib/auth";

interface Body {
  userId: string;
  // 任意扩展字段子集
  heightCm?: number;
  weightKg?: number;
  likes?: string[];
  activities?: string[];
  dislikes?: string[];
  activeHoursPerDay?: number;
  needNap?: "required" | "optional" | "none";
  earlyOrLate?: "early_bird" | "night_owl";
  hasMotionSickness?: boolean;
  allergies?: string[];
  isShyWithStrangers?: boolean;
  healthNotes?: string;
  // 2026-07-31 v1.0 Phase A
  hasStudentCard?: boolean;
  idCardPrefix?: string;
  needsChildTicket?: boolean;
  strollerWidthCm?: number;
  comfortableTempC?: string;
  fearsAnimals?: boolean;
  dietaryRestrictions?: string[];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { childId: string } },
) {
  const childId = params.childId;
  if (!childId) {
    return NextResponse.json(
      { code: "MISSING_CHILD_ID", message: "childId 不能为空" },
      { status: 400 },
    );
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.userId) {
    return NextResponse.json(
      { code: "MISSING_USER_ID", message: "userId 不能为空" },
      { status: 400 },
    );
  }

  // 转发到 PUT /api/user/children（本地 Next.js 路由）
  try {
    const res = await authedFetch(`${process.env.NEXT_PUBLIC_TRAVEL_API ?? ''}/api/user/children`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        childId,
        syncBaseToAuth: false, // 编辑入口暂不双写基础字段（基础字段走 children-create 流程）
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { code: "UPSTREAM_ERROR", message: json?.error?.message ?? `HTTP ${res.status}` },
        { status: res.status },
      );
    }
    return NextResponse.json({ code: "OK", data: json });
  } catch (e: any) {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: e?.message ?? "更新失败" },
      { status: 500 },
    );
  }
}
