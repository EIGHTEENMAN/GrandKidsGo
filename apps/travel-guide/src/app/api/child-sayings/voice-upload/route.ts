// POST /api/child-sayings/voice-upload — 录音上传 + 自动审核
// 完整流程：
//   1. 前端 multipart/form-data 上传音频文件（家长已试听确认）
//   2. 服务端存到本地 tmp（OSS key 到位后切 STS + aliyun-oss 直传）
//   3. 调用 voiceReview() 自动审核（ASR 转写 + 敏感词匹配）
//   4. 审核通过 → 创建 ChildSaying (status='published') + 返回 voiceOssKey
//   5. 审核未过 → 创建 ChildSaying (status='rejected') + 返回拒绝原因

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { moderateTravelText } from "@/lib/moderation";
import { transcribeAudio } from "@/lib/voice-asr";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 上传限制 30 秒录音

const TMP_DIR = process.env.VOICE_TMP_DIR || "/tmp/travel-voice-uploads";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-debug-user-id");
  if (!userId) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "请先登录" } }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: "BAD_FORM", message: "表单解析失败" } }, { status: 400 });
  }

  const audio = form.get("audio");
  const text = (form.get("text") as string | null) ?? "";
  const childId = (form.get("childId") as string | null) ?? null;
  const mood = (form.get("mood") as string | null) ?? null;
  const shareScope = (form.get("shareScope") as string | null) ?? "private";
  const spotId = (form.get("spotId") as string | null) ?? null;
  const durationStr = form.get("duration") as string | null;
  const duration = durationStr ? Number.parseInt(durationStr, 10) : null;

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: { code: "NO_AUDIO", message: "缺少音频文件" } }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "AUDIO_TOO_LARGE", message: `音频大小 0 ~ ${MAX_BYTES / 1024 / 1024}MB` } }, { status: 400 });
  }
  if (duration !== null && (duration < 1 || duration > 300)) {
    return NextResponse.json({ error: { code: "DURATION_OUT_OF_RANGE", message: "录音时长需在 1~300 秒" } }, { status: 400 });
  }

  // 1. 存到本地 tmp（OSS 上线后改 aliyun-oss put）
  await fs.mkdir(TMP_DIR, { recursive: true });
  const ext = audio.name?.split(".").pop() || audio.type.split("/")[1] || "webm";
  const ossKey = `voice/${userId}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const buf = Buffer.from(await audio.arrayBuffer());
  const tmpPath = path.join(TMP_DIR, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`);
  await fs.writeFile(tmpPath, buf);

  // 2. 自动审核（ASR 转写 + 敏感词）
  let asrText = text;
  let reviewReason: string | null = null;
  let status: "auditing" | "published" | "rejected" = "auditing";

  try {
    // 2a. ASR 转写（同步调用，失败则降级为用户填的 text）
    if (!asrText.trim()) {
      const asrResult = await transcribeAudio(tmpPath, audio.type);
      asrText = asrResult.text;
    }

    // 2b. 敏感词审核（DFA 本地词库，零依赖）
    const mod = moderateTravelText(asrText);
    if (mod.hardRejection) {
      status = "rejected";
      reviewReason = mod.reasons.join("；");
    } else if (!mod.passed) {
      // 软命中：进 audting 队列人工复核
      status = "auditing";
      reviewReason = mod.reasons.join("；");
    } else {
      status = "published";
    }
  } catch (e) {
    console.error("[voice-upload] review failed", e);
    // 审核失败兜底：保守策略 = 进审核队列
    status = "auditing";
    reviewReason = "审核服务暂时不可用，进人工复核队列";
  } finally {
    // 清理 tmp 文件
    fs.unlink(tmpPath).catch(() => {});
  }

  // 3. 写 ChildSaying 记录
  const saying = await prisma.childSaying.create({
    data: {
      userId,
      childId: childId || null,
      text: asrText || "(录音内容)",  // 审核完成前可能没文本
      mood: mood || null,
      spotId: spotId || null,
      source: "manual",
      status,
      shareScope,
      voiceOssKey: ossKey,
      voiceDuration: duration,
      voiceMime: audio.type,
      voiceReviewedAt: status === "auditing" ? null : new Date(),
      voiceRejectReason: status === "rejected" ? reviewReason : null,
    },
    select: {
      id: true, status: true, voiceOssKey: true, voiceDuration: true,
      text: true, voiceRejectReason: true,
    },
  });

  return NextResponse.json({
    code: status === "rejected" ? "REJECTED" : "OK",
    data: {
      ...saying,
      reviewStatus: status,
      reviewReason,
    },
  });
}