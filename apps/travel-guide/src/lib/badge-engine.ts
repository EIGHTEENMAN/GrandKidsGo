// 勋章检测引擎
// 详见 项目建设方案/走天下实施方案-v1.5.md 第八节第三段（发放时机四个）

import { PrismaClient } from "@prisma/client";
import { TRAVEL_BADGES, type BadgeDef } from "./badge-defs";

const prisma = new PrismaClient();

type Trigger =
  | "plan_saved"
  | "guide_published"
  | "social_milestone"
  | "manual_recheck";

/**
 * 主入口：从四个时机调用
 */
export async function checkBadgesFor(
  userId: string,
  trigger: Trigger,
  context: { guideId?: string; planId?: string } = {},
): Promise<string[]> {
  switch (trigger) {
    case "plan_saved":
    case "manual_recheck":
      return checkCityBadges(userId);
    case "guide_published":
      return checkGuideBadges(userId, context.guideId);
    case "social_milestone":
      return checkSocialBadges(userId);
    default:
      return [];
  }
}

async function checkCityBadges(userId: string): Promise<string[]> {
  const newBadges: string[] = [];
  // 行程完成的城市数
  const completedPlans = await prisma.planRecord.findMany({
    where: { userId, status: { in: ["completed", "published"] } },
    select: { cityId: true, city: { select: { tags: true } } },
  });
  const citySet = new Set(completedPlans.map((p: any) => p.cityId).filter(Boolean) as string[]);

  await maybeAward(userId, "城市探索者", citySet.size >= 1, newBadges);
  await maybeAward(
    userId,
    "海岛达人",
    completedPlans.filter((p: any) => p.city?.tags?.includes("海岛")).length >= 3,
    newBadges,
  );
  await maybeAward(
    userId,
    "古城探秘",
    completedPlans.filter((p: any) => p.city?.tags?.includes("古城")).length >= 3,
    newBadges,
  );
  await maybeAward(userId, "周末游侠", completedPlans.length >= 5, newBadges);

  return newBadges;
}

async function checkGuideBadges(
  userId: string,
  guideId?: string,
): Promise<string[]> {
  const newBadges: string[] = [];
  const myGuides = await prisma.guide.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      contentHtml: true,
      coverImages: true,
      cityId: true,
      tags: true,
    },
  });
  const published = myGuides.filter((g: any) => g.status === "published");
  await maybeAward(userId, "首篇攻略", published.length >= 1, newBadges);

  // 图文并茂
  const rich = published.find(
    (g: any) =>
      (g.coverImages?.length ?? 0) >= 5 && (g.contentHtml?.length ?? 0) >= 300,
  );
  await maybeAward(userId, "图文并茂", Boolean(rich), newBadges);

  // 避坑贡献者（v1 简化：以 tags 含"避坑"为准，正文坑计数留 v2）
  const withPitfalls = published.filter((g: any) => g.tags?.includes("避坑"));
  await maybeAward(userId, "避坑贡献者", withPitfalls.length >= 3, newBadges);

  // 小旅行家
  const mega = published.find(
    (g: any) => Array.isArray(g.tags) && g.tags.includes("多城市"),
  );
  await maybeAward(userId, "小旅行家", Boolean(mega), newBadges);

  // 真实记录者：连续 3 次发布
  const recent = published
    .map((g: any) => g.id)
    .slice(-3);
  await maybeAward(
    userId,
    "真实记录者",
    recent.length === 3,
    newBadges,
  );

  return newBadges;
}

async function checkSocialBadges(userId: string): Promise<string[]> {
  const newBadges: string[] = [];
  const myGuides = await prisma.guide.findMany({
    where: { userId },
    select: { saveCount: true, likeCount: true },
  });
  const topSave = Math.max(0, ...myGuides.map((g: any) => g.saveCount));
  const topLike = Math.max(0, ...myGuides.map((g: any) => g.likeCount));

  await maybeAward(userId, "人气攻略家", topSave >= 50, newBadges);
  await maybeAward(userId, "避坑英雄", topLike >= 10, newBadges);

  // 社区之星：粉丝数（UserFollow 表）
  const followerCount = await prisma.userFollow.count({
    where: { followeeId: userId },
  });
  await maybeAward(userId, "社区之星", followerCount >= 100, newBadges);

  return newBadges;
}

async function maybeAward(
  userId: string,
  badgeName: string,
  condition: boolean,
  newBadges: string[],
): Promise<void> {
  if (!condition) return;
  const def = TRAVEL_BADGES.find((b) => b.name === badgeName);
  if (!def) return;
  const existing = await prisma.travelBadge.findFirst({
    where: { userId, badgeDef: { name: badgeName } },
  });
  if (existing) return;
  // 拿 def id
  const defRow = await prisma.travelBadgeDef.findUnique({
    where: { name: badgeName },
    select: { id: true },
  });
  if (!defRow) return;
  await prisma.travelBadge.create({
    data: {
      userId,
      badgeDefId: defRow.id,
    },
  });
  newBadges.push(badgeName);
}

/**
 * 一次性初始化：把所有 BadgeDef 写入 TravelBadgeDef 表
 */
export async function seedBadgeDefs(): Promise<number> {
  let count = 0;
  for (const b of TRAVEL_BADGES) {
    await prisma.travelBadgeDef.upsert({
      where: { name: b.name },
      update: {
        description: b.description,
        icon: b.icon,
        category: b.category,
        criteria: b.criteria,
      },
      create: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        criteria: b.criteria,
      },
    });
    count += 1;
  }
  return count;
}
