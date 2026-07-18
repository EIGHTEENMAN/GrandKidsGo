// 勋章触发预测（引擎 B 第 7 类）
// 详见 项目建设方案/走天下实施方案-v2.0.md 附录 C + 第八节
//
// 纯规则预测：不使用 LLM
// 基于：
//   1. 孩子画像素描（年龄/偏好/活动量）
//   2. 已解锁勋章（已获得的跳过去）
//   3. 城市探索模式（去过哪些城市/景点类型）
//   4. 季节感知（5 个月份判断）
//   5. 社交互动（收藏/点赞数）
//
// 输出：未来 30 天最可能解锁的勋章列表（最多 5 条），含解锁条件和难度

import { PrismaClient } from "@prisma/client";
import { TRAVEL_BADGES, type BadgeDef } from "./badge-defs";

const prisma = new PrismaClient();

export interface Prediction {
  badgeDefId: string | null;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  actionHint: string;
}

/**
 * 预测用户未来 30 天可解锁勋章
 */
export async function predictBadgesFor(userId: string): Promise<Prediction[]> {
  // 1. 并行拉取用户数据
  const [
    awarded,
    childProfiles,
    completedPlans,
    guides,
    followCount,
    saveCount,
  ] = await Promise.all([
    // 已获得勋章
    prisma.travelBadge.findMany({
      where: { userId },
      include: { badgeDef: { select: { name: true } } },
    }),
    // 孩子画像
    prisma.childProfile.findMany({
      where: { userId },
    }),
    // 已完成计划
    prisma.planRecord.findMany({
      where: { userId, status: { in: ["completed", "published"] } },
      include: {
        city: { select: { tags: true, id: true } },
        ratings: { select: { spotId: true, willingnessToReturn: true, childId: true } },
      },
    }),
    // 已发布攻略
    prisma.guide.findMany({
      where: { userId, status: "published" },
      select: { id: true, tags: true, saveCount: true, likeCount: true, coverImages: true, contentHtml: true },
    }),
    // 粉丝数
    prisma.travelFollowRelation.count({ where: { followeeId: userId } }),
    // 攻略总收藏
    prisma.guide.findMany({
      where: { userId, status: "published" },
      select: { saveCount: true },
    }),
  ]);

  // 已获得勋章名
  const awardedNames = new Set(awarded.map((b) => b.badgeDef.name));

  // 已完成城市 ID
  const completedCityIds = new Set(completedPlans.map((p) => p.cityId).filter((id): id is string => id !== null));

  // 孩子年龄范围
  let minChildAgeMonths = 999;
  let maxChildAgeMonths = 0;
  for (const cp of childProfiles) {
    if (cp.birthDate) {
      const age = Math.floor((Date.now() - cp.birthDate.getTime()) / 2592000000);
      if (age < minChildAgeMonths) minChildAgeMonths = age;
      if (age > maxChildAgeMonths) maxChildAgeMonths = age;
    }
  }

  // 孩子偏好（从 dislike/likes 归纳）
  const allLikes = childProfiles.flatMap((cp) => cp.likes ?? []);
  const allDislikes = childProfiles.flatMap((cp) => cp.dislikes ?? []);
  const hasMotionSickness = childProfiles.some((cp) => cp.hasMotionSickness);
  const needNap = childProfiles.some((cp) => cp.needNap === "yes");

  // 攻略统计
  const publishedGuideCount = guides.length;
  const richGuides = guides.filter((g) => (g.coverImages?.length ?? 0) >= 5 && (g.contentHtml?.length ?? 0) >= 300).length;
  const pitfallGuides = guides.filter((g) => g.tags?.includes("避坑"));
  const totalSaveCount = saveCount.reduce((s, sv) => s + sv.saveCount, 0);
  const maxSave = Math.max(0, ...guides.map((g) => g.saveCount));
  const maxLike = Math.max(0, ...guides.map((g) => g.likeCount));

  // 季节判断
  const now = new Date();
  const month = now.getMonth() + 1;
  const isSummer = month >= 6 && month <= 8;
  const isWinter = month === 12 || month === 1 || month === 2;
  const isSpring = month >= 3 && month <= 5;
  const isAutumn = month >= 9 && month <= 11;
  const isCherry = month === 3 || month === 4;
  const isRedLeaf = month >= 10 && month <= 11;

  const predictions: Prediction[] = [];

  // childProfileCount 用于亲子协作类判断
  const childProfileCount = childProfiles.length;

  // 逐条检查勋章条件，给出预测
  for (const badge of TRAVEL_BADGES) {
    if (awardedNames.has(badge.name)) continue; // 已获得

    const pred = checkPrediction(badge, {
      completedCityIds, minChildAgeMonths, maxChildAgeMonths,
      publishedGuideCount, richGuides, pitfallGuides,
      totalSaveCount, maxSave, maxLike, followCount,
      allLikes, allDislikes, hasMotionSickness, needNap,
      isSummer, isWinter, isSpring, isAutumn, isCherry, isRedLeaf,
      month, childProfileCount,
    });
    if (pred) predictions.push(pred);
  }

  // 按置信度排序（high > medium > low），然后按稀有度
  const confOrder = { high: 0, medium: 1, low: 2 };
  const rarityOrder: Record<string, number> = { bronze: 3, silver: 2, gold: 1, diamond: 0 };
  predictions.sort((a, b) => {
    const c = (confOrder[a.confidence] ?? 99) - (confOrder[b.confidence] ?? 99);
    if (c !== 0) return c;
    return (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99);
  });

  // 查 badgeDefId
  const withIds = await Promise.all(
    predictions.slice(0, 5).map(async (p) => {
      const def = await prisma.travelBadgeDef.findUnique({
        where: { name: p.name },
        select: { id: true },
      });
      return { ...p, badgeDefId: def?.id ?? null };
    }),
  );

  return withIds;
}

interface CheckContext {
  completedCityIds: Set<string>;
  minChildAgeMonths: number;
  maxChildAgeMonths: number;
  publishedGuideCount: number;
  richGuides: number;
  pitfallGuides: { id: string; tags: string[]; saveCount: number; likeCount: number }[];
  totalSaveCount: number;
  maxSave: number;
  maxLike: number;
  followCount: number;
  allLikes: string[];
  allDislikes: string[];
  hasMotionSickness: boolean;
  needNap: boolean;
  isSummer: boolean;
  isWinter: boolean;
  isSpring: boolean;
  isAutumn: boolean;
  isCherry: boolean;
  isRedLeaf: boolean;
  month: number;
  childProfileCount: number; // v2.0 新增
}

function checkPrediction(badge: BadgeDef, ctx: CheckContext): Prediction | null {
  const c = badge.criteria;
  const type = c.type as string;

  // ============ 城市探索类 ============
  if (badge.category === "城市探索") {
    if (type === "city_count" && ctx.completedCityIds.size < c.value) {
      const needed = (c.value as number) - ctx.completedCityIds.size;
      if (needed <= 2) {
        return make("high", badge, `再去 ${needed} 个城市即可解锁`, "完成一次新城市出行");
      }
      if (needed <= 5) {
        return make("medium", badge, `还需要探索 ${needed} 个城市`, "规划一次跨城旅行");
      }
      return make("low", badge, `还需要探索 ${needed} 个城市`, "探索更多城市目的地");
    }
    if (type === "generations_met") {
      return make("low", badge, "需要三代同游记录", "安排一次带长辈的出行");
    }
    if (type === "total_trips" && (c.value as number) <= 5 && ctx.completedCityIds.size >= 3) {
      const done = ctx.completedCityIds.size;
      const needed = (c.value as number) - done;
      if (needed <= 2) return make("high", badge, `差 ${needed} 次出行`, "再完成几次周边游");
    }

    // 按城市标签的勋章
    if (type === "city_type_count") {
      const cityIdArray = Array.from(ctx.completedCityIds);
      const hasTag = cityIdArray.some((id) => {
        const tags = c.tags;
        return tags && Array.isArray(tags) && tags.includes(id);
      });
      if (!hasTag) return make("medium", badge, `需要访问特定类型城市`, "搜索有该标签的城市");
    }
  }

  // ============ 内容产出类 ============
  if (badge.category === "内容产出") {
    if (type === "guide_count" && ctx.publishedGuideCount < c.value) {
      const needed = (c.value as number) - ctx.publishedGuideCount;
      if (needed <= 2) return make("high", badge, `再发布 ${needed} 篇攻略`, "完成一次出行并撰写攻略");
      if (needed <= 5) return make("medium", badge, `再发布 ${needed} 篇攻略`, "持续积累旅行经验");
    }
    if (type === "rich_guide" && ctx.richGuides < c.value && ctx.publishedGuideCount >= 2) {
      return make("medium", badge, "需要一篇图文并茂的攻略", "选一篇已有攻略配 5 张以上图片");
    }
    if (type === "pitfall_count") {
      const pitfallCount = ctx.pitfallGuides.length;
      const needed = (c.value as number) - pitfallCount;
      if (pitfallCount > 0 && needed <= 2) return make("medium", badge, `再写 ${needed} 篇避坑攻略`, "在攻略中添加避坑经验");
      if (needed <= 2) return make("high", badge, "差一点就写够避坑攻略了", "下次出行注明避坑内容");
    }
  }

  // ============ 社交影响类 ============
  if (badge.category === "社交影响") {
    if (type === "total_saves" && ctx.totalSaveCount < c.value) {
      const needed = (c.value as number) - ctx.totalSaveCount;
      if (ctx.publishedGuideCount >= 2 && ctx.maxSave >= 5) {
        return make("medium", badge, `总收藏数再 +${needed}`, "写一篇高质量攻略提升收藏");
      }
      if (ctx.maxSave >= (c.value as number) * 0.7) {
        return make("high", badge, `热门攻略离目标只差一点`, "优化攻略内容吸引收藏");
      }
    }
    if (type === "max_saves" && ctx.maxSave < c.value) {
      if (ctx.maxSave >= (c.value as number) * 0.8) {
        return make("high", badge, "单篇收藏即将达标", "重点推广最优的一篇攻略");
      }
      if (ctx.maxSave >= 5) return make("medium", badge, "再多些互动即可解锁", "邀请好友收藏你的攻略");
    }
    if (type === "follower_count" && ctx.followCount < c.value) {
      if (ctx.followCount >= 5) return make("medium", badge, `已有 ${ctx.followCount} 位粉丝`, "持续发布优质内容吸引关注");
    }
  }

  // ============ 父母成长类 ============
  if (badge.category === "父母成长") {
    if (type === "child_age_range" && ctx.minChildAgeMonths < 999) {
      const minAge = c.minAge as number;
      const maxAge = c.maxAge as number;
      if (ctx.minChildAgeMonths >= minAge && ctx.maxChildAgeMonths <= maxAge) {
        return make("high", badge, "孩子的年龄正好适合这个阶段勋章", "完成一次有记录出行");
      }
    }
    if (type === "has_needs_met" && ctx.needNap && ctx.completedCityIds.size >= 2) {
      return make("medium", badge, "已关注到孩子的作息需求", "在一次出行中记录休息安排");
    }
  }

  // ============ 季节限定类 ============
  if (badge.category === "季节限定") {
    if (badge.seasonalTag === "暑期限定" && ctx.isSummer) {
      return make("high", badge, "当前正值暑假，是解锁的好时机", "这个夏天计划一次亲子出行");
    }
    if (badge.seasonalTag === "寒假限定" && ctx.isWinter) {
      return make("high", badge, "寒假已到，带孩子出行吧", "计划一次冬日旅行");
    }
    if (type === "specific_date" && c.dates?.includes?.(`${String(ctx.month).padStart(2, "0")}-`)) {
      return make("high", badge, "当前月份正是时机", "在本月完成一次出行");
    }
    // 通用季节提醒
    if (c.season === "spring" && ctx.isSpring && ctx.publishedGuideCount >= 1) {
      return make("medium", badge, "春天正是出游好时节", "完成一次春日出行记录");
    }
    if (c.season === "autumn" && ctx.isAutumn && ctx.publishedGuideCount >= 1) {
      return make("medium", badge, "秋天适合出行探索", "完成一次秋日出游");
    }
    if (badge.name === "雪国" && ctx.isWinter && ctx.completedCityIds.size >= 1) {
      return make("medium", badge, "冬天去北方雪国游玩", "计划一次冰雪之旅");
    }
  }

  // ============ 亲子协作类 ============
  if (badge.category === "亲子协作") {
    if (type === "both_parents_rated" && ctx.completedCityIds.size >= 1) {
      return make("medium", badge, "带配偶一起记录感受", "下次出行让配偶也参与评分");
    }
    if (type === "multi_child" && ctx.childProfileCount >= 2 && ctx.completedCityIds.size >= 1) {
      return make("medium", badge, "多孩家庭天然优势", "带所有孩子一起出行并记录");
    }
  }

  // ============ 隐藏勋章提示 ============
  if (badge.hiddenFlag) {
    if (badge.name === "凌晨的旅人" && ctx.publishedGuideCount >= 1) {
      return make("low", badge, "凌晨 4-6 点记录出行感受", "试试在清晨记录孩子的感受");
    }
    if (badge.name === "治愈者" && ctx.totalSaveCount >= 3) {
      return make("low", badge, "攻略被收藏越多越好", "持续产出暖心内容");
    }
    if (badge.name === "跨年出行" && (ctx.month === 12 || ctx.month === 1)) {
      return make("high", badge, "正值跨年期间!", "在 12.31 或 1.1 完成出行记录");
    }
  }

  // ============ 兜底 ============
  // 如果是城市类且有完成城市，给弱提示
  if (badge.category === "城市探索" && ctx.completedCityIds.size >= 1) {
    return make("low", badge, "持续探索新城市即可解锁", "多去不同城市体验");
  }
  if (badge.category === "内容产出" && ctx.publishedGuideCount >= 1) {
    return make("low", badge, "持续产出内容即可解锁", "发布更多攻略");
  }

  return null;
}

function make(
  confidence: "high" | "medium" | "low",
  badge: BadgeDef,
  reason: string,
  actionHint: string,
): Prediction {
  return {
    badgeDefId: null,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    rarity: badge.rarity,
    confidence,
    reason,
    actionHint,
  };
}
