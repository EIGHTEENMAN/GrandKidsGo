// 社区动态生成器（v2.0）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 C
// 3 类动态：badge_unlocked / guide_published / trip_completed
// 不接 LLM，纯模板渲染——避免内容运营失控

import { PrismaClient } from "@prisma/client";
import { batchFetchUsers, fallbackUser } from "./user-service";

const prisma = new PrismaClient();

export type ActivityType = "badge_unlocked" | "guide_published" | "trip_completed";

export interface GeneratedActivity {
  userId: string;
  type: ActivityType;
  targetId: string;
  contentJson: {
    template: string;
    text: string;
    meta: Record<string, any>;
  };
  isPublic: boolean;
}

// ============= 模板（去 LLM） =============

const TEMPLATES = {
  badge_unlocked: (data: { nickname: string; badgeName: string; icon: string; rarity: string }) => ({
    template: "badge_unlock",
    text: `恭喜 @${data.nickname} 获得「${data.badgeName}」勋章 ${data.icon}`,
    meta: { badgeName: data.badgeName, icon: data.icon, rarity: data.rarity },
  }),
  guide_published: (data: { nickname: string; guideTitle: string; cityName: string; days: number }) => ({
    template: "guide_publish",
    text: `@${data.nickname} 发布了新攻略《${data.guideTitle}》` +
      (data.cityName ? ` · ${data.cityName}` : "") +
      (data.days ? ` · ${data.days} 天` : ""),
    meta: { guideTitle: data.guideTitle, cityName: data.cityName, days: data.days },
  }),
  trip_completed: (data: { nickname: string; cityName: string; days: number; feelingAvg: number }) => ({
    template: "trip_complete",
    text: `@${data.nickname} 完成了 ${data.days} 天 ${data.cityName} 行程` +
      (data.feelingAvg > 0 ? `，孩子真实感受分 ${data.feelingAvg}/5` : ""),
    meta: { cityName: data.cityName, days: data.days, feelingAvg: data.feelingAvg },
  }),
};

const RARITY_EMOJI: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ============= 触发器 =============

/**
 * 勋章获得时：插入动态
 */
export async function onBadgeUnlocked(userId: string, badgeDefId: string): Promise<GeneratedActivity | null> {
  // 检查用户是否允许公开动态
  const privacy = await prisma.travelPrivacySetting.findUnique({ where: { userId } }).catch(() => null);
  if (privacy && !privacy.allowCommunityFeed) return null;

  const def = await prisma.travelBadgeDef.findUnique({ where: { id: badgeDefId } });
  if (!def) return null;
  // 隐藏勋章不公开动态
  if (def.hiddenFlag) return null;

  const user = batchFetchUsers([userId]).get(userId) ?? fallbackUser(userId);
  const content = TEMPLATES.badge_unlocked({
    nickname: user.nickname,
    badgeName: def.name,
    icon: def.icon ?? "🏅",
    rarity: def.rarity,
  });
  const activity = await prisma.travelActivity.create({
    data: {
      userId,
      type: "badge_unlocked",
      targetId: badgeDefId,
      contentJson: content as any,
      isPublic: true,
    },
  });
  return {
    userId, type: "badge_unlocked", targetId: badgeDefId,
    contentJson: content, isPublic: true,
  };
}

/**
 * 攻略发布时：插入动态
 */
export async function onGuidePublished(guideId: string): Promise<GeneratedActivity | null> {
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: { city: { select: { name: true } } },
  });
  if (!guide) return null;

  const privacy = await prisma.travelPrivacySetting.findUnique({ where: { userId: guide.userId } }).catch(() => null);
  if (privacy && !privacy.allowCommunityFeed) return null;

  const user = batchFetchUsers([guide.userId]).get(guide.userId) ?? fallbackUser(guide.userId);
  const content = TEMPLATES.guide_published({
    nickname: user.nickname,
    guideTitle: guide.title,
    cityName: guide.city?.name ?? "",
    days: guide.days ?? 0,
  });
  await prisma.travelActivity.create({
    data: {
      userId: guide.userId,
      type: "guide_published",
      targetId: guideId,
      contentJson: content as any,
      isPublic: true,
    },
  });
  return {
    userId: guide.userId, type: "guide_published", targetId: guideId,
    contentJson: content, isPublic: true,
  };
}

/**
 * 出行完成时：插入动态
 */
export async function onTripCompleted(planRecordId: string): Promise<GeneratedActivity | null> {
  const plan = await prisma.planRecord.findUnique({
    where: { id: planRecordId },
    include: { city: { select: { name: true } } },
  });
  if (!plan) return null;

  const privacy = await prisma.travelPrivacySetting.findUnique({ where: { userId: plan.userId } }).catch(() => null);
  if (privacy && !privacy.allowCommunityFeed) return null;

  // 孩子真实感受分均值
  const ratings = await prisma.childRating.findMany({
    where: { planRecordId },
    select: { willingnessToReturn: true },
  });
  const WILLINGNESS: Record<string, number> = {
    definitely: 5, 要求再来: 5,
    likely: 4, 可能再来: 4,
    unsure: 3, 一般: 3,
    unlikely: 2, 不太可能: 2,
    never: 1, 不会再来: 1,
  };
  const feelingAvg = ratings.length
    ? round1(ratings.reduce((s, r) => s + (WILLINGNESS[r.willingnessToReturn ?? ""] ?? 0), 0) / ratings.length)
    : 0;

  const days = Math.max(1, Math.round((plan.endDate.getTime() - plan.startDate.getTime()) / 86400000));

  const user = batchFetchUsers([plan.userId]).get(plan.userId) ?? fallbackUser(plan.userId);
  const content = TEMPLATES.trip_completed({
    nickname: user.nickname,
    cityName: plan.city?.name ?? "某城市",
    days,
    feelingAvg,
  });
  await prisma.travelActivity.create({
    data: {
      userId: plan.userId,
      type: "trip_completed",
      targetId: planRecordId,
      contentJson: content as any,
      isPublic: true,
    },
  });
  return {
    userId: plan.userId, type: "trip_completed", targetId: planRecordId,
    contentJson: content, isPublic: true,
  };
}

export const activityGenerator = {
  onBadgeUnlocked,
  onGuidePublished,
  onTripCompleted,
  TEMPLATES,
  RARITY_EMOJI,
};
