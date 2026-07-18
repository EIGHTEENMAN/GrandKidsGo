// 反作弊中间件 + 规则引擎
// 详见 项目建设方案/走天下实施方案-v2.0.md 第十节 + 附录 D
//
// R1：单日评分 > 50 条 → 该周分数 × 0.5（已在 scoring.ts 实现）
// R2：单条攻略 7 天内 > 100 收藏 + 0 评论 → 标记异常
// R3：连续 3 周 Top 10 但 feeling_score_avg < 3 → 不参与公开榜
//
// 所有规则跑在 leaderboard snapshot 之前，额外做一次 R2/R3 检查

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FlaggedItem {
  userId: string;
  guideId?: string;
  rule: "R1" | "R2" | "R3";
  reason: string;
  severity: "warning" | "flag" | "block";
  detectedAt: Date;
}

/**
 * 对指定的 userId 列表做全量反作弊检查
 * 返回需要标记的用户列表
 */
export async function runAntiCheat(userIds: string[]): Promise<FlaggedItem[]> {
  const flagged: FlaggedItem[] = [];
  const now = new Date();

  for (const userId of userIds) {
    // ─── R2：异常收藏 ───
    const guides = await prisma.guide.findMany({
      where: {
        userId,
        status: "published",
        publishedAt: { gte: new Date(now.getTime() - 7 * 86400000) },
      },
      select: {
        id: true,
        saveCount: true,
        likeCount: true,
        viewCount: true,
        tags: true,
        publishedAt: true,
      },
    });

    for (const g of guides) {
      // R2: 7天内 > 100 收藏 + 0 评论(like) → 可能刷量
      if (g.saveCount > 100 && g.likeCount === 0) {
        flagged.push({
          userId,
          guideId: g.id,
          rule: "R2",
          reason: `攻略 ${g.id.slice(0, 8)} 7 天内 ${g.saveCount} 收藏但 0 评论`,
          severity: "flag",
          detectedAt: now,
        });
      }
      // R2 增强版：高收藏+低点赞比（<10%）也标记
      if (
        g.saveCount > 50 &&
        g.likeCount > 0 &&
        g.saveCount / g.likeCount > 10
      ) {
        flagged.push({
          userId,
          guideId: g.id,
          rule: "R2",
          reason: `攻略 ${g.id.slice(0, 8)} 收藏/点赞比异常 (${g.saveCount}/${g.likeCount})`,
          severity: "warning",
          detectedAt: now,
        });
      }
    }

    // ─── R3：连续 Top 10 但低分 ───
    const recentSnapshots = await prisma.travelLeaderboardSnapshot.findMany({
      where: { scope: "mom", period: "week" },
      orderBy: { capturedAt: "desc" },
      take: 3,
    });

    let weeksInTop10 = 0;
    let totalFeeling = 0;
    let feelingCount = 0;

    for (const snap of recentSnapshots) {
      const items = (snap.payloadJson as any[]) ?? [];
      const me = items.find((it: any) => it.userId === userId);
      if (me && me.rank <= 10) {
        weeksInTop10++;
        if (me.feelingScoreAvg !== undefined) {
          totalFeeling += me.feelingScoreAvg;
          feelingCount++;
        }
      }
    }

    if (weeksInTop10 >= 3 && feelingCount > 0) {
      const avgFeeling = totalFeeling / feelingCount;
      if (avgFeeling < 3) {
        flagged.push({
          userId,
          rule: "R3",
          reason: `连续 ${weeksInTop10} 周 Top10 但真实感受分均值仅 ${avgFeeling.toFixed(1)}`,
          severity: "block",
          detectedAt: now,
        });
      }
    }
  }

  return flagged;
}

/**
 * 检查单个用户是否应被反作弊规则过滤（用于 leaderboard 构建时）
 * 返回 multiplier（0 表示完全屏蔽）
 */
export async function antiCheatMultiplier(userId: string): Promise<number> {
  const flagged = await runAntiCheat([userId]);
  const blocks = flagged.filter((f) => f.severity === "block");
  if (blocks.length > 0) return 0;

  const flags = flagged.filter((f) => f.severity === "flag");
  if (flags.length > 0) return 0.5;

  return 1.0;
}
