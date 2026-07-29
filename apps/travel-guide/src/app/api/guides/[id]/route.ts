// GET /api/guides/:id — 攻略详情（攻略体系 v1.0 PR2 增强）
// 增强字段（PR2）：
// - sourcePlanTimeline[]   来源 plan 的 timelineBlocks 折叠摘要
// - childSayings[]         关联的 ChildSaying 列表
// - ratingSummary          v1.5 5 维度评分聚合（仅当有 sourcePlanRecordId）
// - isOwnable              当前用户是不是作者
// - permissions            { canEdit / canPublish / canArchive / canUnarchive / canReport }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchUser, fallbackUser } from "@/lib/user-service";
import { verifyAuth } from "@/lib/verify-auth";
import { normalizeStatus } from "@/lib/guide-status";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuth(req);
  const viewerId = auth?.id ?? null;
  const viewerIsAdmin = auth?.role === "admin";

  const guide = await prisma.guide.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      coverImages: true,
      contentHtml: true,
      cityId: true,
      days: true,
      childAges: true,
      travelStyle: true,
      tags: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      viewCount: true,
      saveCount: true,
      likeCount: true,
      isAnonymous: true,
      city: {
        select: {
          id: true,
          name: true,
          kidHook: true,
          momHook: true,
          dadHook: true,
        },
      },
      userId: true,
      sourcePlanRecordId: true,
    },
  });
  if (!guide) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "攻略不存在" } },
      { status: 404 },
    );
  }
  const currentStatus = normalizeStatus(guide.status);
  const isOwner = !!viewerId && guide.userId === viewerId;
  const canSeeNonPublished = isOwner || viewerIsAdmin;
  if (currentStatus !== "published" && !canSeeNonPublished) {
    return NextResponse.json(
      { error: { code: "NOT_PUBLISHED", message: "攻略未发布" } },
      { status: 403 },
    );
  }

  // 浏览数 +1（fire-and-forget）
  prisma.guide
    .update({ where: { id: guide.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => { /* 忽略 */ });

  // 如果有源计划，一并返回
  let sourcePlan: {
    id: string;
    timelineBlocks: unknown;
    childAges: number[];
    cityId: string | null;
    days?: number;
  } | null = null;
  if (guide.sourcePlanRecordId) {
    const sp = await prisma.planRecord.findUnique({
      where: { id: guide.sourcePlanRecordId },
      select: { id: true, timelineBlocks: true, childAges: true, cityId: true, title: true },
    });
    if (sp) {
      const tbs = Array.isArray(sp.timelineBlocks) ? (sp.timelineBlocks as any[]) : [];
      sourcePlan = {
        id: sp.id,
        timelineBlocks: tbs.map((day: any, i: number) => ({
          day: i + 1,
          blocks: Array.isArray(day?.blocks) ? day.blocks : [],
        })),
        childAges: sp.childAges,
        cityId: sp.cityId,
        days: tbs.length,
      };
    }
  }

  // v1.5 author 信息：跨服务从 auth-service 的 users 表拉真实 nickname/avatar
  const authorUser = guide.isAnonymous
    ? null
    : fetchUser(guide.userId) ?? fallbackUser(guide.userId);

  // 评分统计（按 guide 维度；和 sourcePlan 维度的 5 维度区分）
  const ratingStats = await prisma.guideReview.aggregate({
    where: { guideId: guide.id, status: "published" },
    _avg: { adultRating: true, childRating: true },
    _count: { id: true },
  });
  const commentCount = await prisma.guideComment.count({
    where: { guideId: guide.id, status: "published" },
  });

  // PR2 增强：关联 childSayings
  const childSayings = await prisma.childSaying.findMany({
    where: {
      sourceGuideId: guide.id,
      status: "published",
      shareScope: { in: ["public", "anonymous"] },
    },
    select: {
      id: true,
      text: true,
      mood: true,
      spotId: true,
      source: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // PR2 增强：权限矩阵
  // 作者本人：在任意 status 下都可走对应转换（受 canTransition 约束）
  // 非作者登录用户：仅可 report (published)
  // 匿名：除公开浏览外什么都不能做
  const permissions = {
    canEdit: isOwner && ["draft", "rejected", "published"].includes(currentStatus),
    canSubmit: isOwner && ["draft", "rejected"].includes(currentStatus),
    canPublishDirect: isOwner && ["draft", "pending_review", "rejected"].includes(currentStatus),
    canArchive: isOwner && currentStatus !== "archived",
    canUnarchive: isOwner && currentStatus === "archived",
    canWithdraw: isOwner && currentStatus === "published", // D6：撤回编辑 → draft
    canReport: !!viewerId && !isOwner && currentStatus === "published",
    canDelete: isOwner || viewerIsAdmin, // 真删留给后续 PR；此处仅占位
  };

  // PR2 增强：isOwnable（详情页可隐藏/显示作者操作栏）
  const isOwnable = isOwner || viewerIsAdmin;

  return NextResponse.json({
    code: "OK",
    data: {
      id: guide.id,
      title: guide.title,
      coverImages: guide.coverImages,
      contentHtml: guide.contentHtml,
      city: guide.city,
      days: guide.days,
      childAges: guide.childAges,
      travelStyle: guide.travelStyle,
      season: null,
      tags: guide.tags,
      status: currentStatus,
      publishedAt: guide.publishedAt?.toISOString() ?? null,
      createdAt: guide.createdAt?.toISOString() ?? null,
      stats: {
        view: guide.viewCount,
        save: guide.saveCount,
        like: guide.likeCount,
        avgAdultRating: ratingStats._avg.adultRating ?? null,
        avgChildRating: ratingStats._avg.childRating ?? null,
        ratingCount: ratingStats._count.id,
        commentCount,
      },
      author: guide.isAnonymous
        ? { id: null, nickname: "童慧行用户", avatar: null }
        : { id: authorUser!.id, nickname: authorUser!.nickname, avatar: authorUser!.avatar },
      sourcePlan,                          // PR2: 含 timelineBlocks 折叠摘要
      childSayings,                        // PR2: 关联孩子说
      // ratingSummary 在 PR3 的前端组件里再调用 /api/plans/[id]/ratings/summary 拉
      // 这里先返回 sourcePlanRecordId 让前端知道去哪儿拉
      sourcePlanRecordId: guide.sourcePlanRecordId,
      isOwnable,                           // PR2
      permissions,                         // PR2
      isLiked: false,
      isSaved: false,
      // isLiked/isSaved 需要 userId（从 req.headers.x-debug-user-id 取），P1 补
    },
  });
}

// PUT /api/guides/:id — 编辑攻略（PR3）
// 仅作者本人，且 status ∈ {draft, rejected, published} 可写。
// published → 写完 status 维持 published（D6 决策：published 可编辑）；
//   改完想再过 DFA 进 pending_review → 调用 POST /api/guides/[id]/submit。
// rejected / draft → 写完 status 不变（用户再点提交审核才进 pending_review）。
// 注：写操作本身不跑 DFA（D6 决策：作者编辑不会被偶然命中软词拦截）。
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "请先登录" } }, { status: 401 });
  }
  const guide = await prisma.guide.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!guide) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "攻略不存在" } }, { status: 404 });
  }
  if (guide.userId !== auth.id && auth.role !== "admin") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "无权编辑他人的攻略" } }, { status: 403 });
  }
  const current = normalizeStatus(guide.status);
  if (!["draft", "rejected", "published"].includes(current)) {
    return NextResponse.json(
      { error: { code: "INVALID_STATUS", message: `当前状态 ${current} 不允许编辑` } },
      { status: 409 },
    );
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "请求体不能为空" } }, { status: 400 });
  }
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") updateData.title = body.title.slice(0, 200);
  if (typeof body.contentHtml === "string") {
    updateData.contentHtml = body.contentHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/on\w+=["'][^"']*["']/gi, "")
      .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"')
      .slice(0, 50000);
  }
  if (typeof body.cityId !== "undefined") updateData.cityId = body.cityId || null;
  if (typeof body.days !== "undefined") updateData.days = body.days || null;
  if (Array.isArray(body.childAges)) updateData.childAges = body.childAges;
  if (typeof body.travelStyle !== "undefined") updateData.travelStyle = body.travelStyle;
  if (Array.isArray(body.coverImages)) updateData.coverImages = body.coverImages;
  if (Array.isArray(body.tags)) updateData.tags = body.tags;

  const updated = await prisma.guide.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, status: true, updatedAt: true },
  });
  return NextResponse.json({ code: "OK", data: updated });
}