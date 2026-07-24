// 排行榜评分公式实现
// 详见 项目建设方案/走天下实施方案-v2.0.md 附录 B
//
// v1.5 真实 schema：
//   - child_ratings 没有 overall 字段，用 willingness_to_return (1-5) 代理
//   - travel_records 用 cost_cents 记成本
//   - plan_records 是孩子感受的主体
//
// v2.0 评分映射：
//   - 孩子真实感受分均值 = AVG( CASE willingness_to_return
//       WHEN 'definitely' THEN 5
//       WHEN 'likely' THEN 4
//       WHEN 'unsure' THEN 3
//       WHEN 'unlikely' THEN 2
//       WHEN 'never' THEN 1
//       ELSE 0 END )

import { PrismaClient } from "@prisma/client";
import { RARITY_WEIGHT } from "./badge-defs";

const prisma = new PrismaClient();

const HALF_LIFE_DAYS = 14;
const DECAY_LAMBDA = 0.05;

// v1.5 真实 schema 适配：把 willingness_to_return 转 0-5 分
// 实际 DB 里中英文混用，全列上
const WILLINGNESS_SCORE: Record<string, number> = {
  definitely: 5,
  要求再来: 5,
  likely: 4,
  可能再来: 4,
  unsure: 3,
  一般: 3,
  unlikely: 2,
  不太可能: 2,
  never: 1,
  不会再来: 1,
};

async function feelingScore(userId: string): Promise<{ avg: number; lastAt: Date | null }> {
  const ratings = await prisma.childRating.findMany({
    where: { planRecord: { userId } },
    select: { willingnessToReturn: true, recordedAt: true },
  });
  if (ratings.length === 0) return { avg: 0, lastAt: null };
  const sum = ratings.reduce((s, r) => s + (WILLINGNESS_SCORE[r.willingnessToReturn ?? ""] ?? 0), 0);
  const sorted = ratings.map((r) => r.recordedAt).sort((a, b) => b.getTime() - a.getTime());
  return { avg: sum / ratings.length, lastAt: sorted[0] ?? null };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;        // 脱敏后：真实昵称或"家长"/"宝宝 {N} 月"
  avatar: string | null;
  cityName: string | null;
  feelingScoreAvg: number;
  badgeCount: number;
  guideCount: number;
  cityCount: number;
  score: number;
  badgeBreakdown: { bronze: number; silver: number; gold: number; diamond: number };
}

/**
 * 时间衰减因子
 * 半衰期 14 天：14 天前 50% / 28 天前 25%
 */
function decayFactor(daysSinceLastAction: number): number {
  return Math.exp(-DECAY_LAMBDA * daysSinceLastAction);
}

/**
 * 反作弊：单日评分 > 50 → 该周分数 × 0.5
 * 返回 multiplier 0~1
 */
async function antiCheatFactor(userId: string, periodStart: Date): Promise<number> {
  const ratingsCount = await prisma.childRating.count({
    where: { planRecord: { userId }, recordedAt: { gte: periodStart } },
  });
  if (ratingsCount > 50) return 0.5;
  return 1.0;
}

/**
 * 人气榜综合得分
 * score = (0.5 * feeling + 0.2 * weightedBadge + 0.15 * guide + 0.15 * city) * decay
 */
async function scoreMama(userId: string): Promise<{
  score: number;
  feelingScoreAvg: number;
  badgeCount: number;
  guideCount: number;
  cityCount: number;
  badgeBreakdown: { bronze: number; silver: number; gold: number; diamond: number };
  lastActionAt: Date | null;
}> {
  // 孩子真实感受分均值
  const feelingAgg = await feelingScore(userId);
  const feelingScoreAvg = feelingAgg.avg;
  const lastRatingAt = feelingAgg.lastAt;

  // 勋章统计（按稀有度）
  const badges = await prisma.travelBadge.findMany({
    where: { userId },
    include: { badgeDef: { select: { rarity: true } } },
  });
  const badgeBreakdown = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  let weightedBadge = 0;
  for (const b of badges) {
    const r = b.badgeDef.rarity as keyof typeof RARITY_WEIGHT;
    badgeBreakdown[r] += 1;
    weightedBadge += RARITY_WEIGHT[r] ?? 1;
  }

  // 攻略数
  const guideCount = await prisma.guide.count({
    where: { userId, status: "published" },
  });

  // 城市数（去重已完成计划）
  const completedPlans = await prisma.planRecord.findMany({
    where: { userId, status: { in: ["completed", "published"] } },
    select: { cityId: true, updatedAt: true },
  });
  const citySet = new Set(completedPlans.map((p) => p.cityId).filter(Boolean));
  const cityCount = citySet.size;

  // 找到最近一次活动时间（评分 / 攻略 / 出行 取最大）
  const lastGuide = await prisma.guide.findFirst({
    where: { userId, status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true },
  });
  const candidates: (Date | null | undefined)[] = [lastRatingAt, lastGuide?.publishedAt];
  for (const p of completedPlans) candidates.push(p.updatedAt);
  const lastActionAt = candidates
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  // 计算分数
  const feeling = feelingScoreAvg;
  const base = 0.5 * feeling + 0.2 * weightedBadge + 0.15 * guideCount + 0.15 * cityCount;
  const daysSince = lastActionAt
    ? Math.max(0, (Date.now() - lastActionAt.getTime()) / 86400000)
    : 365; // 没活动 → 衰减到接近 0
  const decayed = base * decayFactor(daysSince);

  return {
    score: decayed,
    feelingScoreAvg,
    badgeCount: badges.length,
    guideCount,
    cityCount,
    badgeBreakdown,
    lastActionAt,
  };
}

/**
 * 孩子榜：仅看真实感受分 × 城市多样性
 * score = feeling × (1 + 0.1 * city) × decay
 */
async function scoreKid(userId: string) {
  const m = await scoreMama(userId);
  const city = m.cityCount;
  const base = m.feelingScoreAvg * (1 + 0.1 * city);
  const daysSince = m.lastActionAt
    ? Math.max(0, (Date.now() - m.lastActionAt.getTime()) / 86400000)
    : 365;
  return { ...m, score: base * decayFactor(daysSince) };
}

/**
 * 城市榜：log(tripCount + 1) × (0.7 + 0.3 * feelingAvg)
 */
async function scoreCity(cityId: string): Promise<{ score: number; tripCount: number; feelingAvg: number; cityName: string }> {
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) return { score: 0, tripCount: 0, feelingAvg: 0, cityName: "" };

  const tripCount = await prisma.planRecord.count({
    where: { cityId, status: { in: ["completed", "published"] } },
  });
  const ratings = await prisma.childRating.findMany({
    where: { planRecord: { cityId } },
    select: { willingnessToReturn: true },
  });
  const feelingAvg = ratings.length
    ? ratings.reduce((s, r) => s + (WILLINGNESS_SCORE[r.willingnessToReturn ?? ""] ?? 0), 0) / ratings.length
    : 0;
  const score = Math.log(tripCount + 1) * (0.7 + 0.3 * feelingAvg);
  return { score, tripCount, feelingAvg, cityName: city.name };
}

/**
 * 攻略榜：0.4 * feeling + 0.3 * save + 0.2 * like + 0.1 * view
 */
async function scoreGuide(guideId: string): Promise<{ score: number; feelingContribution: number; saveCount: number; likeCount: number; viewCount: number; title: string }> {
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: { title: true, saveCount: true, likeCount: true, viewCount: true, sourcePlanRecordId: true },
  });
  if (!guide) return { score: 0, feelingContribution: 0, saveCount: 0, likeCount: 0, viewCount: 0, title: "" };

  // feeling 贡献 = 攻略源计划的所有孩子评分均值
  let feelingAvg = 0;
  if (guide.sourcePlanRecordId) {
    const ratings = await prisma.childRating.findMany({
      where: { planRecordId: guide.sourcePlanRecordId },
      select: { willingnessToReturn: true },
    });
    if (ratings.length) {
      feelingAvg = ratings.reduce((s, r) => s + (WILLINGNESS_SCORE[r.willingnessToReturn ?? ""] ?? 0), 0) / ratings.length;
    }
  }
  const score = 0.4 * feelingAvg + 0.3 * guide.saveCount + 0.2 * guide.likeCount + 0.1 * Math.min(guide.viewCount, 1000);
  return {
    score,
    feelingContribution: feelingAvg,
    saveCount: guide.saveCount,
    likeCount: guide.likeCount,
    viewCount: guide.viewCount,
    title: guide.title,
  };
}

export const scoringEngine = {
  scoreMama,
  scoreKid,
  scoreCity,
  scoreGuide,
  antiCheatFactor,
  decayFactor,
  HALF_LIFE_DAYS,
};
