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

  // 完成 + footprint 合并：城市 ID 集合
  // 1) completed plans cityIds
  const completedCityIds = new Set<string>(
    completedPlans.map((p: any) => p.cityId).filter(Boolean) as string[],
  );
  // 2) 用户 visited footprint 城市（覆盖了手动打卡和 from_plan 回填）
  const visitedFootprints = await prisma.footprint.findMany({
    where: { userId, state: "visited" },
    select: { cityId: true },
  });
  for (const fp of visitedFootprints) {
    if (fp.cityId) completedCityIds.add(fp.cityId);
  }
  // 把已完成的 city.id 转成 city.name 给 city_name_match 用
  const visitedCityNames = new Set<string>();
  if (completedCityIds.size > 0) {
    const cities = await prisma.city.findMany({
      where: { id: { in: [...completedCityIds] } },
      select: { id: true, name: true },
    });
    for (const c of cities) visitedCityNames.add(c.name);
  }
  // 同时把 footprint 的 city name 直接拿来（覆盖尚未 PATCH plan.status=completed 但已打卡的情况）
  if (visitedFootprints.length > 0) {
    const fCityIds = visitedFootprints.map((f: any) => f.cityId).filter(Boolean) as string[];
    if (fCityIds.length > 0) {
      const fCities = await prisma.city.findMany({
        where: { id: { in: [...new Set(fCityIds)] } },
        select: { name: true },
      });
      for (const c of fCities) visitedCityNames.add(c.name);
    }
  }

  await maybeAward(userId, "城市探索者", completedCityIds.size >= 1, newBadges);
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

  // v2.1 城市足迹勋章（基于 footprint + planRecord 合并 visitedCityNames）
  // 首都足迹：4 个一线城市 name match
  await maybeAward(
    userId,
    "首都足迹",
    ["北京", "上海", "广州", "深圳"].every((n) => visitedCityNames.has(n)),
    newBadges,
  );
  // 江南水乡：江浙沪至少 1 个
  await maybeAward(
    userId,
    "江南水乡",
    ["杭州", "苏州", "南京", "无锡"].some((n) => visitedCityNames.has(n)),
    newBadges,
  );
  // 西北豪情：西北至少 1 个
  await maybeAward(
    userId,
    "西北豪情",
    ["西安", "兰州", "银川", "西宁"].some((n) => visitedCityNames.has(n)),
    newBadges,
  );
  // 西南风情：西南至少 1 个
  await maybeAward(
    userId,
    "西南风情",
    ["重庆", "成都", "昆明", "贵阳", "大理"].some((n) => visitedCityNames.has(n)),
    newBadges,
  );

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
