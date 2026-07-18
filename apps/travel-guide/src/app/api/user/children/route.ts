// POST /api/user/children  — 创建或更新孩子画像（v1.5 引擎 A 的核心输入）
// GET  /api/user/children  — 列出当前用户的孩子画像
// 详见 项目建设方案/走天下实施方案-v1.5.md 第五节（ChildProfile 是必经输入）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Body {
  userId?: string;
  childId?: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  gender?: string;
  birthDate?: string;
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
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.userId || !body.name) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "需 userId + name" } },
      { status: 400 },
    );
  }
  // 不传 childId 就生成
  const childId = body.childId ?? `child-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const profile = await prisma.childProfile.upsert({
    where: { userId_childId: { userId: body.userId, childId } },
    update: {
      name: body.name,
      nickname: body.nickname ?? null,
      avatar: body.avatar ?? null,
      gender: body.gender ?? null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      heightCm: body.heightCm ?? null,
      weightKg: body.weightKg ?? null,
      likes: body.likes ?? [],
      activities: body.activities ?? [],
      dislikes: body.dislikes ?? [],
      activeHoursPerDay: body.activeHoursPerDay ?? 6,
      needNap: body.needNap ?? "optional",
      earlyOrLate: body.earlyOrLate ?? "early_bird",
      hasMotionSickness: body.hasMotionSickness ?? false,
      allergies: body.allergies ?? [],
      isShyWithStrangers: body.isShyWithStrangers ?? false,
      healthNotes: body.healthNotes ?? null,
    },
    create: {
      childId,
      userId: body.userId,
      name: body.name,
      nickname: body.nickname ?? null,
      avatar: body.avatar ?? null,
      gender: body.gender ?? null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      heightCm: body.heightCm ?? null,
      weightKg: body.weightKg ?? null,
      likes: body.likes ?? [],
      activities: body.activities ?? [],
      dislikes: body.dislikes ?? [],
      activeHoursPerDay: body.activeHoursPerDay ?? 6,
      needNap: body.needNap ?? "optional",
      earlyOrLate: body.earlyOrLate ?? "early_bird",
      hasMotionSickness: body.hasMotionSickness ?? false,
      allergies: body.allergies ?? [],
      isShyWithStrangers: body.isShyWithStrangers ?? false,
      healthNotes: body.healthNotes ?? null,
    },
    select: { childId: true, name: true, updatedAt: true },
  });

  // v1.4 硬合规：建立画像的同时必须建立空壳 ChildFeelingProfile，
  // 后续 childId 才能作为外键被 ChildRating 等引用
  await prisma.childFeelingProfile.upsert({
    where: { childId },
    update: {},
    create: {
      childId,
      spotTypePreferences: {},
      cryingTriggers: {},
      energyCurveByTimeOfDay: {},
      averageEmotionalPeakDistribution: {},
      totalDataPoints: 0,
      privacyLevel: "anonymized",
    },
  });

  return NextResponse.json(profile);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "USER_REQUIRED" } },
      { status: 400 },
    );
  }
  const items = await prisma.childProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}
