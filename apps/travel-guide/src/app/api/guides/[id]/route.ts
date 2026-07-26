// GET /api/guides/:id — 攻略详情
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十三节第六条 + 附录 C

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchUser, fallbackUser } from "@/lib/user-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
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
  if (guide.status !== "published") {
    return NextResponse.json(
      { error: { code: "NOT_PUBLISHED", message: "攻略未发布" } },
      { status: 403 },
    );
  }

  // 浏览数 +1（fire-and-forget）
  prisma.guide
    .update({ where: { id: guide.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => { /* 忽略 */ });

  // 如果有源计划，一并返回（"一键生成我的版本"时会用）
  let sourcePlan = null;
  if (guide.sourcePlanRecordId) {
    const sp = await prisma.planRecord.findUnique({
      where: { id: guide.sourcePlanRecordId },
      select: { id: true, timelineBlocks: true, childAges: true, cityId: true },
    });
    sourcePlan = sp;
  }

  // v1.5 author 信息：跨服务从 auth-service 的 users 表拉真实 nickname/avatar
  // （user-service.ts 直接只读 SQLite，DB 不可用时降级为占位）
  const authorUser = guide.isAnonymous
    ? null
    : fetchUser(guide.userId) ?? fallbackUser(guide.userId);

  // 评分统计
  const ratingStats = await prisma.guideReview.aggregate({
    where: { guideId: guide.id, status: "published" },
    _avg: { adultRating: true, childRating: true },
    _count: { id: true },
  });
  const commentCount = await prisma.guideComment.count({
    where: { guideId: guide.id, status: "published" },
  });

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
      isLiked: false,
      isSaved: false,
      // isLiked/isSaved 需要 userId（从 req.headers.x-debug-user-id 取），P1 补
      // 当前前端直接从 API 缓存 isLiked/isSaved 状态
    },
  });
}
