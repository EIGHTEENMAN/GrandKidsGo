// GET /api/guides/[id]/auto-child-feedback
// 2026-07-31 v1.0 Phase C：聚合 guide 关联 plan 的 ChildRating，生成"孩子真实记录"HTML
// 用于攻略编辑器"插入孩子真实记录"按钮 + /plan/[id] 板块
//
// 详见 项目建设方案/亲子宝典数据闭环-v1.0.md §10

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TRIGGER_LABEL: Record<string, string> = {
  hungry: "饿了",
  sleepy: "困了",
  crowded: "人多",
  queueing: "排队",
  loud: "怕大声",
  dark: "怕黑",
  animal: "怕动物",
  height: "怕高",
  uncomfortable: "不舒服",
};

function bucketOfAge(months: number): string {
  if (months <= 6) return "0-6 月";
  if (months <= 12) return "7-12 月";
  if (months <= 24) return "13-24 月";
  if (months <= 36) return "25-36 月";
  if (months <= 60) return "37-60 月";
  if (months <= 84) return "61-84 月";
  if (months <= 120) return "85-120 月";
  return "121+ 月";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guideId = params.id;
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: { id: true, sourcePlanRecordId: true },
  });
  if (!guide) {
    return NextResponse.json(
      { code: "GUIDE_NOT_FOUND", message: "攻略不存在" },
      { status: 404 },
    );
  }
  if (!guide.sourcePlanRecordId) {
    return NextResponse.json({
      code: "OK",
      data: {
        sections: { favoriteMoments: [], cryTriggers: [], ageFeedback: null },
        html: "<p><em>该攻略未关联计划，无孩子真实记录</em></p>",
      },
    });
  }

  // 1. 拉 plan 下所有 rating
  const ratings = await prisma.childRating.findMany({
    where: { planRecordId: guide.sourcePlanRecordId },
    select: {
      spotId: true,
      favoriteMoment: true,
      cryTriggers: true,
      wishToReturn: true,
      parentJoy: true,
      childAgeAtVisit: true,
      emotionalPeak: true,
    },
  });

  if (ratings.length === 0) {
    return NextResponse.json({
      code: "OK",
      data: {
        sections: { favoriteMoments: [], cryTriggers: [], ageFeedback: null },
        html: "<p><em>还没有孩子真实评价记录</em></p>",
      },
    });
  }

  // 2. 拉 spot 名映射
  const spotIds = Array.from(new Set(
    ratings.map(r => r.spotId).filter((x): x is string => !!x),
  ));
  const spots = spotIds.length > 0
    ? await prisma.spot.findMany({ where: { id: { in: spotIds } }, select: { id: true, name: true } })
    : [];
  const spotNameMap = new Map(spots.map(s => [s.id, s.name]));

  // 3. 聚合 sections
  // favoriteMoments: top 3（按 text 长度升序，更精炼）
  const favoriteMoments = ratings
    .filter(r => r.favoriteMoment && r.favoriteMoment.trim())
    .map(r => ({
      spotName: r.spotId ? spotNameMap.get(r.spotId) ?? null : null,
      text: r.favoriteMoment!.trim(),
    }))
    .sort((a, b) => a.text.length - b.text.length)
    .slice(0, 3);

  // cryTriggers: 计数 + label
  const triggerCounts: Record<string, number> = {};
  for (const r of ratings) {
    if (Array.isArray(r.cryTriggers)) {
      for (const t of r.cryTriggers) {
        const trig = (t as any)?.trigger;
        if (typeof trig === 'string') {
          triggerCounts[trig] = (triggerCounts[trig] ?? 0) + 1;
        }
      }
    }
  }
  const cryTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trigger, count]) => ({
      trigger,
      label: TRIGGER_LABEL[trigger] ?? trigger,
      count,
    }));

  // ageFeedback: 同月龄桶统计（取 ratings 中最常见的月龄）
  const ageCounts = new Map<number, number>();
  for (const r of ratings) {
    if (typeof r.childAgeAtVisit === 'number') {
      ageCounts.set(r.childAgeAtVisit, (ageCounts.get(r.childAgeAtVisit) ?? 0) + 1);
    }
  }
  const topAge = Array.from(ageCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const ageFeedback = topAge != null
    ? {
        ageMonths: topAge,
        ageBucket: bucketOfAge(topAge),
        totalSpots: ratings.length,
        topEmotion: (() => {
          const emo = new Map<string, number>();
          for (const r of ratings) {
            if (r.emotionalPeak) emo.set(r.emotionalPeak, (emo.get(r.emotionalPeak) ?? 0) + 1);
          }
          return Array.from(emo.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '平静';
        })(),
      }
    : null;

  // 4. 生成 HTML（TipTap 兼容）
  const htmlParts: string[] = [];
  htmlParts.push('<h3>👶 孩子真实记录</h3>');
  if (favoriteMoments.length > 0) {
    htmlParts.push('<p><strong>🎉 孩子最开心的瞬间</strong></p>');
    htmlParts.push('<ul>');
    for (const m of favoriteMoments) {
      const place = m.spotName ? `（${m.spotName}）` : '';
      htmlParts.push(`<li>"${m.text}"${place}</li>`);
    }
    htmlParts.push('</ul>');
  }
  if (cryTriggers.length > 0) {
    htmlParts.push('<p><strong>😢 孩子哭闹的常见原因</strong></p>');
    htmlParts.push('<p>');
    for (const t of cryTriggers) {
      htmlParts.push(`<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:9999px;padding:2px 10px;margin-right:6px;font-size:13px;">${t.label} (${t.count} 次)</span>`);
    }
    htmlParts.push('</p>');
  }
  if (ageFeedback) {
    htmlParts.push(`<p><strong>📊 ${ageFeedback.ageBucket} 同月龄孩子参考</strong></p>`);
    htmlParts.push(`<p>${ageFeedback.totalSpots} 个 spot 平均分，最常见情绪：${ageFeedback.topEmotion}</p>`);
  }
  if (favoriteMoments.length === 0 && cryTriggers.length === 0 && !ageFeedback) {
    htmlParts.push('<p><em>暂无足够数据</em></p>');
  }

  return NextResponse.json({
    code: "OK",
    data: {
      sections: { favoriteMoments, cryTriggers, ageFeedback },
      html: htmlParts.join('\n'),
    },
  });
}
