// 08-snapshot-leaderboard.ts
// 每日 02:00 cron 跑一次，生成排行榜快照。
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 B 第四节
//
// 用法：
//   直接跑（开发 / admin 手动）：npx tsx src/lib/data-pipeline/08-snapshot-leaderboard.ts
//   生产 cron：0 2 * * * root cd /grandkidsgo/apps/travel-guide && /usr/bin/npx tsx src/lib/data-pipeline/08-snapshot-leaderboard.ts >> /var/log/travel-leaderboard.log 2>&1

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { scoringEngine } from "../scoring";
import { batchFetchUsers, fallbackUser } from "../user-service";

const prisma = new PrismaClient();

type Scope = "mom" | "child" | "city" | "guide";
type Period = "week" | "month" | "all";

const ALL_SCOPES: Scope[] = ["mom", "child", "city", "guide"];
const ALL_PERIODS: Period[] = ["week", "month", "all"];

function isoWeek(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function periodStart(period: Period, now: Date): Date {
  const d = new Date(now);
  if (period === "week") {
    d.setDate(d.getDate() - 7);
  } else if (period === "month") {
    d.setMonth(d.getMonth() - 1);
  } else {
    d.setFullYear(d.getFullYear() - 10);
  }
  return d;
}

async function buildMamaBoard(period: Period): Promise<any[]> {
  const periodStartAt = periodStart(period, new Date());
  // travel-guide 没有 user 表（id 来自 auth-service）—— 用 plan_records 推断
  const plans = await prisma.planRecord.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  const users = plans.map((p) => ({ id: p.userId }));

  // 反作弊 + 评分
  const scored: Array<any> = [];
  for (const u of users) {
    const s = await scoringEngine.scoreMama(u.id);
    if (s.score <= 0) continue;
    const cheat = await scoringEngine.antiCheatFactor(u.id, periodStartAt);
    if (cheat < 1) {
      console.log(`[leaderboard] ${u.id} anti-cheat: factor=${cheat}`);
    }
    scored.push({ userId: u.id, ...s, score: s.score * cheat });
  }
  scored.sort((a, b) => b.score - a.score);
  const top50 = scored.slice(0, 50);

  // 批量拉昵称
  const authorMap = batchFetchUsers(top50.map((t) => t.userId));
  return top50.map((t, i) => {
    const author = authorMap.get(t.userId) ?? fallbackUser(t.userId);
    return {
      rank: i + 1,
      userId: t.userId,
      nickname: author.nickname,  // 已脱敏：主站无孩子姓名
      avatar: author.avatar,
      cityName: null,
      feelingScoreAvg: Math.round(t.feelingScoreAvg * 100) / 100,
      badgeCount: t.badgeCount,
      guideCount: t.guideCount,
      cityCount: t.cityCount,
      score: Math.round(t.score * 100) / 100,
      badgeBreakdown: t.badgeBreakdown,
    };
  });
}

async function buildKidBoard(period: Period): Promise<any[]> {
  // 孩子榜 = 妈妈榜的另一面，用真实感受分为主
  // 取 child_ages 通过 plan_records（travel_records 没这个字段）
  const records = await prisma.planRecord.findMany({
    where: { childAges: { isEmpty: false } },
    select: { userId: true, childAges: true },
  });
  // 按 userId 聚合：取最小月龄作为"代表孩子"
  const byUser = new Map<string, number>();
  for (const r of records) {
    if (!r.childAges?.length) continue;
    const minAge = Math.min(...r.childAges);
    if (!byUser.has(r.userId) || minAge < byUser.get(r.userId)!) {
      byUser.set(r.userId, minAge);
    }
  }

  const scored: Array<{ userId: string; ageMonths: number; score: number; feeling: number; cities: number }> = [];
  for (const [userId, ageMonths] of byUser.entries()) {
    const k = await scoringEngine.scoreKid(userId);
    if (k.score <= 0) continue;
    scored.push({ userId, ageMonths, score: k.score, feeling: k.feelingScoreAvg, cities: k.cityCount });
  }
  scored.sort((a, b) => b.score - a.score);
  const top50 = scored.slice(0, 50);

  return top50.map((t, i) => ({
    rank: i + 1,
    userId: t.userId,
    nickname: null,
    childLabel: `宝宝 ${t.ageMonths} 月`,  // 隐私：3 月粒度简化
    cityName: null,
    feelingScoreAvg: Math.round(t.feeling * 100) / 100,
    cityCount: t.cities,
    score: Math.round(t.score * 100) / 100,
  }));
}

async function buildCityBoard(period: Period): Promise<any[]> {
  const cities = await prisma.city.findMany({ select: { id: true } });
  const scored: any[] = [];
  for (const c of cities) {
    const s = await scoringEngine.scoreCity(c.id);
    if (s.score > 0) scored.push(s);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 30).map((s, i) => ({
    rank: i + 1,
    cityId: s.cityName,  // 复用字段（简化）
    cityName: s.cityName,
    tripCount: s.tripCount,
    feelingScoreAvg: Math.round(s.feelingAvg * 100) / 100,
    score: Math.round(s.score * 100) / 100,
  }));
}

async function buildGuideBoard(period: Period): Promise<any[]> {
  const guides = await prisma.guide.findMany({
    where: { status: "published" },
    select: { id: true, userId: true, publishedAt: true },
  });
  // 时间窗过滤
  const cutoff = periodStart(period, new Date());
  const recent = guides.filter((g) => g.publishedAt && g.publishedAt >= cutoff);
  const source = recent.length > 0 ? recent : guides;  // week/month 没数据则用 all

  const scored: any[] = [];
  for (const g of source) {
    const s = await scoringEngine.scoreGuide(g.id);
    if (s.score > 0) scored.push({ id: g.id, userId: g.userId, ...s });
  }
  scored.sort((a, b) => b.score - a.score);
  const top50 = scored.slice(0, 50);

  const authorMap = batchFetchUsers(top50.map((t) => t.userId));
  return top50.map((t, i) => {
    const author = authorMap.get(t.userId) ?? fallbackUser(t.userId);
    return {
      rank: i + 1,
      guideId: t.id,
      title: t.title,
      authorNickname: author.nickname,
      feelingContribution: Math.round(t.feelingContribution * 100) / 100,
      saveCount: t.saveCount,
      likeCount: t.likeCount,
      viewCount: t.viewCount,
      score: Math.round(t.score * 100) / 100,
    };
  });
}

async function snapshotOne(scope: Scope, period: Period, capturedAt: Date) {
  let payload: any[];
  if (scope === "mom") payload = await buildMamaBoard(period);
  else if (scope === "child") payload = await buildKidBoard(period);
  else if (scope === "city") payload = await buildCityBoard(period);
  else payload = await buildGuideBoard(period);

  await prisma.travelLeaderboardSnapshot.create({
    data: {
      scope,
      period,
      payloadJson: payload,
      capturedAt,
      weekKey: isoWeek(capturedAt),
    },
  });
  console.log(`[leaderboard] ${scope}/${period}: ${payload.length} entries captured`);
}

async function run() {
  const capturedAt = new Date();
  console.log(`[leaderboard] cron start at ${capturedAt.toISOString()}`);
  for (const scope of ALL_SCOPES) {
    for (const period of ALL_PERIODS) {
      try {
        await snapshotOne(scope, period, capturedAt);
      } catch (e) {
        console.error(`[leaderboard] ${scope}/${period} failed:`, (e as Error).message);
      }
    }
  }
  console.log(`[leaderboard] cron done`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
