// POST /api/user/children  — 创建或更新孩子画像（v1.5 引擎 A 的核心输入）
// GET  /api/user/children  — 列出当前用户的孩子画像（合并本地 + auth-service 基础字段，S-3）
// PUT  /api/user/children  — 更新孩子扩展字段（基础字段走双写 S-2）
// 详见 项目建设方案/走天下实施方案-v1.5.md 第五节（ChildProfile 是必经输入）
// + 项目建设方案/走天下个人中心竞品调研-2026-07-24.md 第二节特色（双引擎中枢）

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  syncBaseFieldsToAuth,
  fetchAuthChild,
  fetchAuthChildren,
  getBearerToken,
  type BaseChildFields,
} from "@/lib/child-sync";

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
  // S-2: 双写控制
  syncBaseToAuth?: boolean;   // 默认 true（个人中心修改基础字段时）
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.userId || !body.name) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "需 userId + name" } },
      { status: 400 },
    );
  }
  // 不传 childId 就生成（标准 UUID，与 auth-service 命名空间一致）
  const childId = body.childId ?? crypto.randomUUID();

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
  // S-3: 读取时合并本地 + auth-service 基础字段
  const token = getBearerToken(req);
  const authChildren = token ? await fetchAuthChildren(token) : [];
  const localItems = await prisma.childProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // 按 childId 合并：auth-service 是基础字段的 SSOT
  const byChildId = new Map<string, Record<string, unknown>>();
  for (const ac of authChildren) {
    byChildId.set(ac.id, {
      childId: ac.id,
      nickname: ac.nickname,
      name: ac.nickname,
      gender: ac.gender ?? null,
      birthDate: ac.birthday ?? null,
      avatar: ac.avatar ?? null,
      // 本地扩展字段默认值
      likes: [],
      activities: [],
      dislikes: [],
      allergies: [],
      activeHoursPerDay: 6,
      needNap: "optional",
      earlyOrLate: "early_bird",
      hasMotionSickness: false,
      isShyWithStrangers: false,
    });
  }
  // 本地覆盖扩展字段（likes/needNap/晕车 等），基础字段保留 auth 的最新版
  for (const li of localItems) {
    const existing = byChildId.get(li.childId);
    byChildId.set(li.childId, {
      ...(existing ?? {
        childId: li.childId,
        nickname: li.nickname ?? li.name,
        name: li.name,
        gender: li.gender,
        birthDate: li.birthDate,
        avatar: li.avatar,
      }),
      // 本地扩展字段
      heightCm: li.heightCm,
      weightKg: li.weightKg,
      likes: li.likes,
      activities: li.activities,
      dislikes: li.dislikes,
      allergies: li.allergies,
      activeHoursPerDay: li.activeHoursPerDay,
      needNap: li.needNap,
      earlyOrLate: li.earlyOrLate,
      hasMotionSickness: li.hasMotionSickness,
      isShyWithStrangers: li.isShyWithStrangers,
      healthNotes: li.healthNotes,
      createdAt: li.createdAt,
      updatedAt: li.updatedAt,
    });
  }

  return NextResponse.json({ items: Array.from(byChildId.values()) });
}

// S-2: PUT — 扩展字段写本地，可选双写基础字段到 auth-service
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as (Body & { userId: string; childId: string }) | null;
  if (!body?.userId || !body.childId) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "需 userId + childId" } },
      { status: 400 },
    );
  }

  // S-2 步骤 1：若传了基础字段且未禁用双写，先写 auth-service
  const baseFields: BaseChildFields = {};
  if (body.nickname !== undefined) baseFields.nickname = body.nickname;
  if (body.gender !== undefined) baseFields.gender = body.gender;
  if (body.birthDate !== undefined) baseFields.birthday = body.birthDate;
  if (body.avatar !== undefined) baseFields.avatar = body.avatar;

  if (Object.keys(baseFields).length > 0 && body.syncBaseToAuth !== false) {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "同步基础字段需要 Bearer token" } },
        { status: 401 },
      );
    }
    const sync = await syncBaseFieldsToAuth(body.childId, baseFields, token);
    if (!sync.ok) {
      // auth 写失败 → 拒绝本地写，保持一致性
      return NextResponse.json(
        { error: { code: "AUTH_SYNC_FAILED", message: sync.message ?? "双写失败" } },
        { status: 502 },
      );
    }
  }

  // S-2 步骤 2：写本地（仅扩展字段，基础字段可能本地仍存旧值 → 同步覆盖以保显示一致）
  const updated = await prisma.childProfile.upsert({
    where: { userId_childId: { userId: body.userId, childId: body.childId } },
    update: {
      nickname: body.nickname ?? undefined,
      avatar: body.avatar ?? undefined,
      gender: body.gender ?? undefined,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      heightCm: body.heightCm ?? undefined,
      weightKg: body.weightKg ?? undefined,
      likes: body.likes ?? undefined,
      activities: body.activities ?? undefined,
      dislikes: body.dislikes ?? undefined,
      activeHoursPerDay: body.activeHoursPerDay ?? undefined,
      needNap: body.needNap ?? undefined,
      earlyOrLate: body.earlyOrLate ?? undefined,
      hasMotionSickness: body.hasMotionSickness ?? undefined,
      allergies: body.allergies ?? undefined,
      isShyWithStrangers: body.isShyWithStrangers ?? undefined,
      healthNotes: body.healthNotes ?? undefined,
    },
    create: {
      userId: body.userId,
      childId: body.childId,
      // S-3 兼容：name 也可空（旧数据回写时不强求）
      name: body.name ?? body.nickname ?? "未命名",
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
    select: { childId: true, name: true, nickname: true, updatedAt: true },
  });

  // v1.4 硬合规：保证 ChildFeelingProfile 空壳存在
  await prisma.childFeelingProfile.upsert({
    where: { childId: body.childId },
    update: {},
    create: {
      childId: body.childId,
      spotTypePreferences: {},
      cryingTriggers: {},
      energyCurveByTimeOfDay: {},
      averageEmotionalPeakDistribution: {},
      totalDataPoints: 0,
      privacyLevel: "anonymized",
    },
  });

  return NextResponse.json(updated);
}
