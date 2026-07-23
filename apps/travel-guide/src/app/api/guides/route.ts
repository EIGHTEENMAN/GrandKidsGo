// POST /api/guides — 发布攻略（v4.1）
// 修复 create 页死链：表单提交 contentHtml（HTML 字符串，TipTap 产出）+ 元数据
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractChildSayingsFromHtml } from "@/lib/extract-child-sayings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 鉴权
    const userId = req.headers.get("x-debug-user-id");
    if (!userId) {
      return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
    }

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

    const guide = await prisma.guide.create({
      data: {
        userId,
        title,
        contentHtml: safeHtml,
        cityId: cityId ?? null,
        days: days ?? null,
        childAges: childAges ?? [],
        travelStyle: travelStyle ?? null,
        status: "published",
        publishedAt: new Date(),
        coverImages: coverImages ?? [],
        tags: body.tags ?? [],
      },
    });

    // 自动提取：从 contentHtml 中识别孩子说的话
    const autoExtracted = extractChildSayingsFromHtml(contentHtml);

    // 孩子说：创建 childSaying 记录（手动录入 + 自动提取）
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

    return NextResponse.json({
      code: "OK",
      data: { id: guide.id, title: guide.title },
    });
  } catch (e) {
    console.error("[POST /api/guides]", e);
    return NextResponse.json({ code: "ERROR", message: "发布失败" }, { status: 500 });
  }
}