// POST /api/guides/from-plan/:planId
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十五节 + 附录 C GUIDE 类

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { reviewGuide } from "@/lib/moderation";
import { recordOperation } from "@/lib/operation-log";

const prisma = new PrismaClient();

interface Body {
  title?: string;
  contentHtml?: string;
  coverImages?: string[];
  tags?: string[];
  isAnonymous?: boolean;
}

function safeHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  // v1 简化：仅去掉 <script> 内容 + 完全不当 HTML 编码（发布编辑器走 TipTap 已经做了 escape）
  return input.replace(/<script[\s\S]*?<\/script>/gi, "").slice(0, 5000);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { planId: string } },
) {
  const planId = params.planId;
  if (!planId) {
    return NextResponse.json(
      { error: { code: "MISSING_PLAN_ID", message: "planId required" } },
      { status: 400 },
    );
  }

  const plan = await prisma.planRecord.findUnique({
    where: { id: planId },
    select: {
      id: true,
      userId: true,
      cityId: true,
      timelineBlocks: true,
      childAges: true,
      travelStyle: true,
      title: true,
      city: { select: { name: true } },
    },
  });
  if (!plan) {
    return NextResponse.json(
      { error: { code: "PLAN_NOT_FOUND", message: "planId 不存在" } },
      { status: 404 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch { /* 允许空 body，title 自动生成 */ }

  // v1.5 第十五节：标题自动生成嵌入孩子感受数据
  const childAgeText =
    plan.childAges.length > 0
      ? `${Math.floor(plan.childAges[0]! / 12)}岁娃`
      : "亲子";
  const days = Array.isArray(plan.timelineBlocks)
    ? (plan.timelineBlocks as any[]).length
    : 0;
  const cityName = plan.city?.name ?? "未选城市";
  const autoTitle = `${cityName} ${days}天 · ${childAgeText}`;
  const finalTitle = (body.title ?? plan.title ?? autoTitle).slice(0, 100);

  // contentHtml 兜底：基于 timelineBlocks 自动生成骨架（v1.5 第十五节"按状态切换写"）
  let contentHtml = safeHtml(body.contentHtml);
  if (!contentHtml) {
    const days = Array.isArray(plan.timelineBlocks)
      ? (plan.timelineBlocks as any[])
      : [];
    const html = days
      .map((day: any, i: number) => {
        const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
        const lis = blocks
          .map((b: any) => {
            const timeText =
              typeof b.startMinutes === "number" && typeof b.endMinutes === "number"
                ? `${Math.floor(b.startMinutes / 60)
                    .toString()
                    .padStart(2, "0")}:${(b.startMinutes % 60)
                    .toString()
                    .padStart(2, "0")}-${Math.floor(b.endMinutes / 60)
                    .toString()
                    .padStart(2, "0")}:${(b.endMinutes % 60)
                    .toString()
                    .padStart(2, "0")}`
                : "";
            return `<li><b>${timeText}</b> ${escapeHtml(b.title ?? "")}${
              b.kidHook ? ` · ${escapeHtml(b.kidHook)}` : ""
            }</li>`;
          })
          .join("");
        return `<h3>Day ${i + 1}</h3><ul>${lis}</ul>`;
      })
      .join("");
    contentHtml = `<p>${escapeHtml(autoTitle)}</p>${html}`;
  }

  // 创建 Guide（先用 draft 状态，等 review 完再决定是否 published）
  const guide = await prisma.guide.create({
    data: {
      userId: plan.userId,
      sourcePlanRecordId: plan.id,
      title: finalTitle,
      coverImages: body.coverImages ?? [],
      contentHtml,
      cityId: plan.cityId,
      days,
      childAges: plan.childAges,
      travelStyle: plan.travelStyle ?? undefined,
      season: undefined,
      status: "draft", // 临时，审核后切换
      tags: body.tags ?? [],
      isAnonymous: body.isAnonymous ?? false,
    },
    select: { id: true },
  });

  // 跑 DFA 审核
  const result = await reviewGuide({ guideId: guide.id, text: contentHtml });
  if (result.hardRejection) {
    await recordOperation({
      actorId: plan.userId,
      action: "guide_reject",
      targetType: "guide",
      targetId: guide.id,
      after: { status: "rejected", reason: result.reasons },
    });
    return NextResponse.json(
      {
        id: guide.id,
        status: "rejected",
        rejectionReason: result.reasons.join("; "),
      },
      { status: 200 },
    );
  }
  await recordOperation({
    actorId: plan.userId,
    action: "guide_publish",
    targetType: "guide",
    targetId: guide.id,
    after: { status: "pending_review" },
  });
  return NextResponse.json({ id: guide.id, status: "pending_review" });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
