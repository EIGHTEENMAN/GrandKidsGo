// GET /api/child-sayings/:id/voice — 录音流代理（OSS 还没 STS 时的临时方案）
// 真实 OSS 上线后改成 302 redirect 到 OSS 直链，节省 server 流量

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const saying = await prisma.childSaying.findUnique({
    where: { id: params.id },
    select: { voiceOssKey: true, voiceMime: true, voiceDuration: true },
  });
  if (!saying?.voiceOssKey) {
    return NextResponse.json({ error: { code: "NO_VOICE", message: "无录音" } }, { status: 404 });
  }

  // OSS 没上线时的兜底：从本地 tmp 找（注意：开发态才有效）
  const TMP_DIR = process.env.VOICE_TMP_DIR || "/tmp/travel-voice-uploads";
  const fileName = saying.voiceOssKey.split("/").pop() ?? "";
  const localPath = path.join(TMP_DIR, fileName);

  try {
    const buf = await fs.readFile(localPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": saying.voiceMime ?? "audio/webm",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // OSS 直传上线后这里改成 302 redirect 到 OSS 签名 URL
    return NextResponse.json(
      { error: { code: "VOICE_FILE_GONE", message: "录音文件暂不可用（OSS 未配置 / 文件已清理）" } },
      { status: 404 },
    );
  }
}