// POST /api/guides — 发布攻略（v4.1）
// 修复 create 页死链：表单提交 contentHtml（HTML 字符串，TipTap 产出）+ 元数据
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 鉴权
    const userId = req.headers.get("x-debug-user-id");
    if (!userId) {
      return NextResponse.json({ code: "AUTH_REQUIRED", message: "请先登录" }, { status: 401 });
    }

    const body = await req.json();
    const { title, contentHtml, cityId, days, childAges, travelStyle, coverImages } = body;

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

    return NextResponse.json({
      code: "OK",
      data: { id: guide.id, title: guide.title },
    });
  } catch (e) {
    console.error("[POST /api/guides]", e);
    return NextResponse.json({ code: "ERROR", message: "发布失败" }, { status: 500 });
  }
}