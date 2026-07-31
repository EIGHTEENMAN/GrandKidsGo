/**
 * 种子脚本：生成 child_feeling_profiles 合成数据以触发"孩子最怕"预警
 *
 * 运行：npx tsx prisma/seed-child-fear-warnings.ts
 *
 * 策略：
 *   - "110100"（游乐场）：高哭闹率 ~45%，触发器：人太多/排队太久/怕大声
 *   - "110101"（动物园）：中高哭闹率 ~35%，触发器：怕动物/人多
 *   - "140300"（海洋馆）：高哭闹率 ~40%，触发器：怕黑/怕大声
 *   - "140200"（科技馆）：低哭闹率 ~10%，大部分孩子玩得开心
 *   - "140100"（博物馆）：低哭闹率 ~8%，但有小部分烦躁
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 按 spotType 定义的合成数据概要
type SeedProfile = {
  childId: string;
  name: string;
  birthDate: Date;
  spotTypeRatings: Record<string, { sample: number; avgScore: number; topEmotion: string }>;
  cryTriggers: Record<string, number>;
  topEmotionTriggers: Record<string, Record<string, number>>;
};

function makeProfiles(): SeedProfile[] {
  const base = new Date("2023-01-01");
  return [
    {
      childId: "child-1784276659762-786446",
      name: "小可乐",
      birthDate: new Date("2023-08-01"),
      spotTypeRatings: {
        "110100": { sample: 8, avgScore: 2.8, topEmotion: "哭闹" },
        "110101": { sample: 6, avgScore: 3.2, topEmotion: "烦躁" },
        "140300": { sample: 4, avgScore: 2.5, topEmotion: "哭闹" },
        "140200": { sample: 5, avgScore: 4.2, topEmotion: "兴奋" },
        "140100": { sample: 4, avgScore: 4.5, topEmotion: "兴奋" },
      },
      cryTriggers: { "人太多": 5, "排队太久": 3, "怕动物": 2, "怕大声": 4 },
      topEmotionTriggers: {
        "人太多": { "哭闹": 0.5, "烦躁": 0.3, "平静": 0.2 },
        "排队太久": { "哭闹": 0.4, "烦躁": 0.4, "平静": 0.2 },
        "怕动物": { "哭闹": 0.6, "烦躁": 0.3, "平静": 0.1 },
        "怕大声": { "哭闹": 0.5, "烦躁": 0.3, "平静": 0.2 },
      },
    },
    {
      childId: "seed-child-1",
      name: "豆豆",
      birthDate: new Date("2022-05-15"),
      spotTypeRatings: {
        "110100": { sample: 10, avgScore: 2.5, topEmotion: "哭闹" },
        "110101": { sample: 5, avgScore: 3.8, topEmotion: "兴奋" },
        "140300": { sample: 3, avgScore: 2.0, topEmotion: "哭闹" },
        "140200": { sample: 6, avgScore: 4.0, topEmotion: "兴奋" },
        "140100": { sample: 3, avgScore: 4.3, topEmotion: "兴奋" },
      },
      cryTriggers: { "人太多": 6, "排队太久": 4, "怕大声": 3, "怕动物": 1 },
      topEmotionTriggers: {
        "人太多": { "哭闹": 0.6, "烦躁": 0.3, "平静": 0.1 },
        "排队太久": { "哭闹": 0.5, "烦躁": 0.3, "平静": 0.2 },
        "怕大声": { "哭闹": 0.4, "烦躁": 0.4, "平静": 0.2 },
        "怕动物": { "哭闹": 0.3, "烦躁": 0.5, "平静": 0.2 },
      },
    },
    {
      childId: "seed-child-2",
      name: "朵朵",
      birthDate: new Date("2023-11-20"),
      spotTypeRatings: {
        "110100": { sample: 7, avgScore: 3.0, topEmotion: "烦躁" },
        "110101": { sample: 8, avgScore: 3.5, topEmotion: "兴奋" },
        "140300": { sample: 5, avgScore: 2.8, topEmotion: "哭闹" },
        "140200": { sample: 7, avgScore: 4.5, topEmotion: "兴奋" },
        "140100": { sample: 5, avgScore: 4.0, topEmotion: "兴奋" },
      },
      cryTriggers: { "怕动物": 4, "人太多": 3, "怕黑": 5, "怕大声": 2 },
      topEmotionTriggers: {
        "怕动物": { "哭闹": 0.7, "烦躁": 0.2, "平静": 0.1 },
        "人太多": { "哭闹": 0.3, "烦躁": 0.5, "平静": 0.2 },
        "怕黑": { "哭闹": 0.6, "烦躁": 0.3, "平静": 0.1 },
        "怕大声": { "哭闹": 0.5, "烦躁": 0.3, "平静": 0.2 },
      },
    },
    {
      childId: "seed-child-3",
      name: "小宇",
      birthDate: new Date("2021-09-12"),
      spotTypeRatings: {
        "110100": { sample: 12, avgScore: 2.2, topEmotion: "哭闹" },
        "110101": { sample: 9, avgScore: 3.0, topEmotion: "烦躁" },
        "140300": { sample: 6, avgScore: 2.3, topEmotion: "哭闹" },
        "140200": { sample: 8, avgScore: 4.8, topEmotion: "兴奋" },
        "140100": { sample: 6, avgScore: 4.2, topEmotion: "兴奋" },
      },
      cryTriggers: { "排队太久": 7, "人太多": 5, "怕大声": 4, "不舒服": 3 },
      topEmotionTriggers: {
        "排队太久": { "哭闹": 0.5, "烦躁": 0.4, "平静": 0.1 },
        "人太多": { "哭闹": 0.4, "烦躁": 0.4, "平静": 0.2 },
        "怕大声": { "哭闹": 0.5, "烦躁": 0.3, "平静": 0.2 },
        "不舒服": { "哭闹": 0.6, "烦躁": 0.2, "平静": 0.2 },
      },
    },
    {
      childId: "seed-child-4",
      name: "糖糖",
      birthDate: new Date("2024-02-28"),
      spotTypeRatings: {
        "110100": { sample: 5, avgScore: 2.0, topEmotion: "哭闹" },
        "110101": { sample: 4, avgScore: 3.8, topEmotion: "兴奋" },
        "140300": { sample: 2, avgScore: 1.5, topEmotion: "哭闹" },
        "140200": { sample: 3, avgScore: 4.0, topEmotion: "兴奋" },
        "140100": { sample: 2, avgScore: 4.5, topEmotion: "兴奋" },
      },
      cryTriggers: { "怕大声": 4, "怕黑": 3, "人太多": 2, "怕动物": 2 },
      topEmotionTriggers: {
        "怕大声": { "哭闹": 0.7, "烦躁": 0.2, "平静": 0.1 },
        "怕黑": { "哭闹": 0.8, "烦躁": 0.1, "平静": 0.1 },
        "人太多": { "哭闹": 0.5, "烦躁": 0.3, "平静": 0.2 },
        "怕动物": { "哭闹": 0.6, "烦躁": 0.3, "平静": 0.1 },
      },
    },
  ];
}

function buildMonthlyFeedback(profile: SeedProfile) {
  const ageMonths = Math.floor(
    (Date.now() - profile.birthDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  );
  const buckets = ["0-6m", "6-12m", "12-24m", "24-36m", "36-48m", "48-60m", "60m+"];
  const bucket = ageMonths < 6 ? "0-6m"
    : ageMonths < 12 ? "6-12m"
    : ageMonths < 24 ? "12-24m"
    : ageMonths < 36 ? "24-36m"
    : ageMonths < 48 ? "36-48m"
    : ageMonths < 60 ? "48-60m"
    : "60m+";

  const feedback: Record<string, Record<string, { avgScore: number; count: number; topEmotion: string }>> = {};
  const data = profile.spotTypeRatings;
  // only fill the relevant bucket
  feedback[bucket] = {};
  for (const [spotType, stats] of Object.entries(data)) {
    feedback[bucket][spotType] = {
      avgScore: stats.avgScore,
      count: stats.sample,
      topEmotion: stats.topEmotion,
    };
  }
  // also fill some adjacent buckets with lower counts
  const bucketIdx = buckets.indexOf(bucket);
  if (bucketIdx > 0) {
    const adj = buckets[bucketIdx - 1];
    feedback[adj] = {};
    for (const [spotType, stats] of Object.entries(data)) {
      feedback[adj][spotType] = {
        avgScore: Math.min(stats.avgScore + 0.2, 5),
        count: Math.max(1, Math.floor(stats.sample * 0.5)),
        topEmotion: stats.topEmotion,
      };
    }
  }
  return feedback;
}

function buildCrossSpotPattern(profile: SeedProfile) {
  // synthetic: simulate spot-to-spot emotional drops
  const pairs: Record<string, { avgDrop: number; sampleCount: number; confidence: string }> = {};
  for (const [st1, r1] of Object.entries(profile.spotTypeRatings)) {
    for (const [st2, r2] of Object.entries(profile.spotTypeRatings)) {
      if (st1 === st2) continue;
      const key = `${st1}->${st2}`;
      const drop = r1.avgScore - r2.avgScore;
      pairs[key] = {
        avgDrop: Math.round(drop * 10) / 10,
        sampleCount: Math.min(r1.sample, r2.sample),
        confidence: drop > 1 ? "high" : drop > 0.3 ? "medium" : "low",
      };
    }
  }
  return pairs;
}

function buildParentJoyByActivity(profile: SeedProfile) {
  const parentJoys = ["满足", "轻松", "享受", "疲惫", "焦虑"];
  const result: Record<string, Record<string, number>> = {};
  for (const [spotType, stats] of Object.entries(profile.spotTypeRatings)) {
    result[spotType] = {};
    for (const joy of parentJoys) {
      if (stats.avgScore >= 4) {
        result[spotType][joy] = joy === "满足" ? stats.sample * 0.5 : stats.sample * 0.15;
      } else if (stats.avgScore >= 3) {
        result[spotType][joy] = joy === "疲惫" ? stats.sample * 0.4 : stats.sample * 0.15;
      } else {
        result[spotType][joy] = joy === "焦虑" ? stats.sample * 0.5 : stats.sample * 0.1;
      }
    }
  }
  return result;
}

async function main() {
  console.log(`🚀 开始注入「孩子最怕」预警种子数据...`);

  const profiles = makeProfiles();

  for (const p of profiles) {
    // Upsert ChildProfile
    const existingChild = await prisma.childProfile.findUnique({ where: { childId: p.childId } });
    if (!existingChild) {
      await prisma.childProfile.create({
        data: {
          childId: p.childId,
          name: p.name,
          birthDate: p.birthDate,
          gender: "unknown",
          userId: "seed-user",
        },
      });
      console.log(`  ✅ 创建 ChildProfile: ${p.name} (${p.childId})`);
    } else {
      console.log(`  ℹ️  已存在 ChildProfile: ${existingChild.name ?? p.name} (${p.childId})`);
    }

    // Calculate total data points
    const totalDP = Object.values(p.spotTypeRatings).reduce((sum, r) => sum + r.sample, 0);

    // Upsert ChildFeelingProfile
    const data = {
      spotTypePreferences: Object.fromEntries(
        Object.entries(p.spotTypeRatings).map(([st, r]) => [st, r.sample])
      ),
      averageActiveStayMinutes: 90,
      cryingTriggers: p.cryTriggers,
      energyCurveByTimeOfDay: {
        "上午": { "满电": 0.1, "正常": 0.4, "略疲": 0.3, "累趴": 0.2 },
        "下午": { "满电": 0.05, "正常": 0.3, "略疲": 0.35, "累趴": 0.3 },
      },
      averageEmotionalPeakDistribution: { "兴奋": 0.25, "平静": 0.3, "无聊": 0.15, "烦躁": 0.2, "哭闹": 0.1 },
      totalDataPoints: totalDP,
      lastUpdatedAt: new Date(),
      privacyLevel: "anonymized",
      monthlyFeedback: buildMonthlyFeedback(p),
      crossSpotPattern: buildCrossSpotPattern(p),
      topEmotionTriggers: p.topEmotionTriggers,
      parentJoyByActivity: buildParentJoyByActivity(p),
    };

    await prisma.childFeelingProfile.upsert({
      where: { childId: p.childId },
      update: data,
      create: { childId: p.childId, ...data },
    });
    console.log(`  ✅ ChildFeelingProfile: ${totalDP} data points`, Object.entries(p.spotTypeRatings).map(([st, r]) => `${st}:${r.avgScore}`).join(", "));
  }

  console.log("\n📊 预警覆盖的 spotType:");
  console.log("  🔴 110100 (游乐场): 高哭闹率 ~45% — 应触发预警");
  console.log("  🔴 140300 (海洋馆): 高哭闹率 ~40% — 应触发预警");
  console.log("  🟡 110101 (动物园): 中高哭闹率 ~35% — 可能触发预警");
  console.log("  🟢 140200 (科技馆): 低哭闹率 ~10% — 不触发");
  console.log("  🟢 140100 (博物馆): 低哭闹率 ~8% — 不触发");

  await prisma.$disconnect();
  console.log("\n✅ 种子数据注入完成！");
}

main().catch((e) => {
  console.error("❌ 种子数据注入失败:", e);
  prisma.$disconnect();
  process.exit(1);
});
