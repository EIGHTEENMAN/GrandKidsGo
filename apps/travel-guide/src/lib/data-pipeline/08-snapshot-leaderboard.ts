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
import { runAntiCheat } from "../anti-cheat";

const prisma = new PrismaClient();

type Scope = "mom" | "child" | "city" | "guide";
type Period = "week" | "month" | "all";

const ALL_SCOPES: Scope[] = ["mom", "child", "city", "guide"];
const ALL_PERIODS: Period[] = ["week", "month", "all"];

// 全局反作弊状态（由 initAntiCheat 填充）
let blockedIds = new Set<string>();
let flaggedIds = new Set<string>();

async function initAntiCheat() {
  const plans = await prisma.planRecord.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  const allUserIds = plans.map((p) => p.userId);
  const flagged = await runAntiCheat(allUserIds);
  blockedIds = new Set(
    flagged.filter((f) => f.severity === "block").map((f) => f.userId),
  );
  flaggedIds = new Set(
    flagged.filter((f) => f.severity === "flag").map((f) => f.userId),
  );
  if (blockedIds.size > 0) {
    console.log(`[anti-cheat] blocked: ${Array.from(blockedIds).join(", ")}`);
  }
  if (flaggedIds.size > 0) {
    console.log(`[anti-cheat] flagged: ${Array.from(flaggedIds).join(", ")}`);
  }
}

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
  const plans = await prisma.planRecord.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  const users = plans.map((p) => ({ id: p.userId }));

  const scored: Array<any> = [];
  for (const u of users) {
    if (blockedIds.has(u.id)) {
      console.log(`[leaderboard] ${u.id} blocked by anti-cheat`);
      continue;
    }
    const s = await scoringEngine.scoreMama(u.id);
    if (s.score <= 0) continue;
    const cheat = await scoringEngine.antiCheatFactor(u.id, periodStartAt);
    if (cheat < 1) {
      console.log(`[leaderboard] ${u.id} anti-cheat R1: factor=${cheat}`);
    }
    const r23Factor = flaggedIds.has(u.id) ? 0.5 : 1;
    scored.push({ userId: u.id, ...s, score: s.score * cheat * r23Factor });
  }
  scored.sort((a, b) => b.score - a.score);
  const top50 = scored.slice(0, 50);

  const authorMap = batchFetchUsers(top50.map((t) => t.userId));
  return top50.map((t, i) => {
    const author = authorMap.get(t.userId) ?? fallbackUser(t.userId);
    return {
      rank: i + 1,
      userId: t.userId,
      nickname: author.nickname,
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
  const records = await prisma.planRecord.findMany({
    where: { childAges: { isEmpty: false } },
    select: { userId: true, childAges: true },
  });
  const byUser = new Map<string, number>();
  for (const r of records) {
    if (!r.childAges?.length) continue;
    const minAge = Math.min(...r.childAges);
    if (!byUser.has(r.userId) || minAge < byUser.get(r.userId)!) {
      byUser.set(r.userId, minAge);
    }
  }

  const scored: Array<{ userId: string; ageMonths: number; score: number; feeling: number; cities: number }> = [];
  const byUserEntries = Array.from(byUser.entries());
  for (const [userId, ageMonths] of byUserEntries) {
    if (blockedIds.has(userId)) continue;
    const k = await scoringEngine.scoreKid(userId);
    if (k.score <= 0) continue;
    const r23Factor = flaggedIds.has(userId) ? 0.5 : 1;
    scored.push({ userId, ageMonths, score: k.score * r23Factor, feeling: k.feelingScoreAvg, cities: k.cityCount });
  }
  scored.sort((a, b) => b.score - a.score);
  const top50 = scored.slice(0, 50);

  return top50.map((t, i) => ({
    rank: i + 1,
    userId: t.userId,
    nickname: null,
    childLabel: `宝宝 ${t.ageMonths} 月`,
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
    cityId: s.cityName,
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
  const cutoff = periodStart(period, new Date());
  const recent = guides.filter((g) => g.publishedAt && g.publishedAt >= cutoff);
  const source = recent.length > 0 ? recent : guides;

  const scored: any[] = [];
  for (const g of source) {
    if (blockedIds.has(g.userId)) continue;
    const s = await scoringEngine.scoreGuide(g.id);
    if (s.score > 0) {
      const r23Factor = flaggedIds.has(g.userId) ? 0.5 : 1;
      scored.push({ id: g.id, userId: g.userId, ...s, score: s.score * r23Factor });
    }
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

  // 先跑反作弊
  await initAntiCheat();

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
