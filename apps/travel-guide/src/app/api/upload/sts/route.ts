// POST /api/upload/sts — 签发阿里云 OSS STS 临时凭证（5 分钟过期）
// 详见 项目建设方案/走天下实施方案-v1.5.md 附录 F

import { NextRequest, NextResponse } from "next/server";

/**
 * 阿里云 STS 接口合约。
 * v1 上线初期：未配置 ALIYUN_STS_* 环境变量时，返回占位结构（mobile 端可正常上传到直传 mock）
 * 真实生产：调用 https://sts.aliyuncs.com 签发
 */

interface StsResponse {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  bucket: string;
  region: string;
  uploadDir: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    planRecordId?: string;
    fileType?: "photo" | "video";
  };

  const planRecordId = body.planRecordId ?? "unknown";
  const fileType = body.fileType ?? "photo";

  const ak = process.env.ALIYUN_STS_ACCESS_KEY_ID;
  const sk = process.env.ALIYUN_STS_ACCESS_KEY_SECRET;

  if (!ak || !sk) {
    // 开发模式：返回 mock STS，前端拿到凭证后可以用 aliyun-oss SDK 直传
    return NextResponse.json({
      accessKeyId: "MOCK_STS_KEY_ID",
      accessKeySecret: "MOCK_STS_KEY_SECRET",
      securityToken: "MOCK_STS_TOKEN",
      expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      bucket: process.env.ALIYUN_OSS_BUCKET ?? "grandkidsgo-travel",
      region: process.env.ALIYUN_OSS_REGION ?? "oss-cn-hangzhou",
      uploadDir: `plans/${planRecordId}/${fileType}/`,
      isMock: true,
    } satisfies StsResponse & { isMock: true });
  }

  // 真实 STS 签发 — 留接口待 #16-T2 接入
  // 文档：https://help.aliyun.com/document_detail/28756.html
  return NextResponse.json(
    {
      error: {
        code: "STS_NOT_IMPLEMENTED",
        message: "真实 STS 调用待 #16-T2 接入（先在 .env 配 ALIYUN_STS_* 后启用）",
      },
    },
    { status: 501 },
  );
}
