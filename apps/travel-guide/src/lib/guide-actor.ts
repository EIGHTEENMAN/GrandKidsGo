// 攻略作者操作公共 helper（PR2）
// 任何 PR2 的作者侧路由（submit / publish / archive / unarchive / report）都先过这里。

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "./prisma";
import { verifyAuth } from "./verify-auth";
import { canTransition, type GuideStatus, normalizeStatus } from "./guide-status";

export interface GuideActor {
  id: string;
  role?: string;
}

/**
 * 加载攻略并做 owner + 状态合法性校验。
 * 失败时直接返回 NextResponse，调用方接到非 null 就 return。
 *
 * 返回：
 * - { guide }            — 鉴权/owner/status 全过
 * - { guide, error: null } 缺 status 转换许可（409）
 * - null                 — 已包 NextResponse，调用方直接 return
 */
export interface GuideActorMinimal {
  id: string;
  userId: string;
  status: string;
  title: string | null;
  contentHtml: string | null;
}

export async function loadGuideForActor(
  req: NextRequest,
  guideId: string,
  allowedFrom: GuideStatus[],
  target: GuideStatus,
): Promise<
  | { guide: GuideActorMinimal; actor: GuideActor }
  | { response: NextResponse }
> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return {
      response: NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "请先登录" } },
        { status: 401 },
      ),
    };
  }

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      userId: true,
      status: true,
      title: true,
      contentHtml: true,
    },
  });
  if (!guide) {
    return {
      response: NextResponse.json(
        { error: { code: "NOT_FOUND", message: "攻略不存在" } },
        { status: 404 },
      ),
    };
  }

  // owner 校验（非 admin）
  if (guide.userId !== auth.id && auth.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "无权操作他人的攻略" } },
        { status: 403 },
      ),
    };
  }

  // 状态合法性：当前 status 必须 ∈ allowedFrom，且 allowedFrom[0] → target 合法
  const current = normalizeStatus(guide.status);
  if (!allowedFrom.includes(current)) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: "INVALID_STATUS",
            message: `当前状态 ${current} 不允许此操作`,
            currentStatus: current,
            allowedFrom,
          },
        },
        { status: 409 },
      ),
    };
  }
  if (!canTransition(current, target)) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: "INVALID_TRANSITION",
            message: `状态 ${current} → ${target} 不合法`,
          },
        },
        { status: 409 },
      ),
    };
  }

  return { guide, actor: auth };
}