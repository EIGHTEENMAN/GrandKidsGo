// POST /api/guides — 发布攻略（攻略体系 v1.0 PR1 + PR2 雏形）
//
// v1.0 决策：
// - D2 手动发布也跑 L1 DFA（不再裸奔 published）
// - hard 命中 → status=rejected，HTTP 200 但响应里带 rejectionReason
// - soft 命中 → status=pending_review，HTTP 200 但响应里带 pendingReason
// - clean       → status=published
// - PR3 还会加 /api/guides/[id]/submit 重提；当前 POST 直接覆盖（v1 简化）
//
// 注：本端点仍保持"POST 即发布"的语义（autoCreate=true），未拆 draft+submit 两步，
// PR3 落 /guides/[id]/edit 后再补 draft 分支。
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractChildSayingsFromHtml } from "@/lib/extract-child-sayings";
import { extractImagesFromHtml } from "@/lib/extract-guide-images";
import { verifyAuth } from "@/lib/verify-auth";
import { moderateTravelText } from "@/lib/moderation";
import { recordOperation } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 鉴权
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
    }
    const userId = auth.id;

    const body = await req.json();
    const { title, contentHtml, cityId, spotId, days, childAges, travelStyle, coverImages, childSayings } = body;

    if (!title || !contentHtml) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "标题和内容不能为空" }, { status: 400 });
    }

    // 弱标签过滤（配合 sanitize 全量清洗）
    const safeHtml = contentHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/on\w+=["'][^"']*["']/gi, "")
      .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"')
      .slice(0, 50000);

    // PR1：先创建 draft 行拿 ID，跑 DFA，再 update status。
    // 一行 create+update 比三选一分支写更稳，便于埋点一致。
    const guide = await prisma.guide.create({
      data: {
        userId,
        title,
        contentHtml: safeHtml,
        cityId: cityId ?? null,
        days: days ?? null,
        childAges: childAges ?? [],
        travelStyle: travelStyle ?? null,
        status: "draft", // 临时占位，下一步 DFA 后立即覆盖
        publishedAt: null,
        coverImages: coverImages ?? [],
        tags: body.tags ?? [],
      },
    });

    // PR1 L1 DFA：手动发布也必须过审（D2 决策）
    const moderation = moderateTravelText(`${title}\n${safeHtml}`);
    const finalStatus = moderation.nextStatus;
    const finalPublishedAt = finalStatus === "published" ? new Date() : null;

    await prisma.guide.update({
      where: { id: guide.id },
      data: {
        status: finalStatus,
        publishedAt: finalPublishedAt,
        updatedAt: new Date(),
      },
    });

    // 自动提取：从 contentHtml 中识别孩子说的话
    const autoExtracted = extractChildSayingsFromHtml(contentHtml);

    // 孩子说：创建 childSaying 记录（手动录入 + 自动提取）
    // 只在 hard 通过或 clean 时写入；soft pending_review 也写入（用户已发，作者可见但公开页隐藏）
    const allSayings = [
      ...(Array.isArray(childSayings) ? childSayings.map((s: any) => ({
        text: s.text, mood: s.mood, spotId: s.spotId ?? spotId,
        source: 'manual' as const, status: 'published' as const,
      })) : []),
      ...autoExtracted.map((s) => ({
        text: s.text, mood: null, spotId: spotId ?? null,
        source: s.source, status: s.status,
      })),
    ];

    for (const s of allSayings) {
      const text = (s.text ?? "").trim().slice(0, 200);
      if (!text) continue;
      await prisma.childSaying.create({
        data: {
          userId,
          childId: null,
          text,
          mood: s.mood ?? null,
          spotId: s.spotId ?? null,
          source: s.source ?? "manual",
          status: s.status ?? "published",
          sourceGuideId: s.source === "auto_extract" ? guide.id : null,
          shareScope: "private",
        },
      });
    }

    // 自动提取：从 contentHtml 中提取图片 → 录入儿童画廊
    // 仅在未被 hard reject 时执行（rejected 的攻略不提取）
    if (finalStatus !== "rejected") {
      const autoImages = extractImagesFromHtml(safeHtml);
      for (const img of autoImages) {
        // 通过 ossKey 去重：避免重复发布时重复插入
        const existing = await prisma.planMedia.findFirst({
          where: { ossKey: img.ossKey, sourceType: "gallery", sourceGuideId: guide.id },
          select: { id: true },
        });
        if (existing) continue;

        await prisma.planMedia.create({
          data: {
            planRecordId: "gallery",
            type: "image",
            ossKey: img.ossKey,
            ossUrl: img.ossUrl,
            caption: (img.caption || img.title || "").trim().slice(0, 300) || null,
            childId: null,
            spotId: spotId ?? null,
            sourceType: "gallery",
            sourceGuideId: guide.id,
            visibilityLevel: "private",
          },
        });
      }
    }

    // 响应：返回最终 status，前端按状态分支引导（v1 简化，PR3 在 /guides/[id]/edit 顶部 banner 处理）

    // PR 后续：admin 审核拆分要求 OperationLog 含 sensitivity + reason
    // - hard  → action=guide_reject
    // - soft  → action=guide_pending
    // - clean → action=guide_publish（自动通过，无需人工）
    await recordOperation({
      actorId: userId,
      action:
        finalStatus === "rejected"
          ? "guide_reject"
          : finalStatus === "pending_review"
            ? "guide_pending"
            : "guide_publish",
      targetType: "guide",
      targetId: guide.id,
      after: {
        status: finalStatus,
        sensitivity: moderation.sensitivity,
        source: finalStatus === "published" ? "publish_direct" : "submit",
        reason: moderation.reasons,
      },
    });

    return NextResponse.json({
      code: "OK",
      data: {
        id: guide.id,
        title: guide.title,
        status: finalStatus,
        sensitivity: moderation.sensitivity,
        rejectionReason: moderation.hardRejection ? moderation.reasons.join("; ") : null,
        pendingReason: moderation.softPending ? moderation.reasons.join("; ") : null,
      },
    });
  } catch (e) {
    console.error("[POST /api/guides]", e);
    return NextResponse.json({ code: "ERROR", message: "发布失败" }, { status: 500 });
  }
}