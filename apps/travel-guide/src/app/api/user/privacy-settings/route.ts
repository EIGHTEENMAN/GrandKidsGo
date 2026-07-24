// GET / PUT /api/user/privacy-settings — 隐私设置读写
// TravelPrivacySetting 表只有 4 字段（leaderboard/feed/badge share + updatedAt）
// 资料 Tab 走 PUT /api/user/profile（auth-service）
// 账号 Tab 跳主站账号中心
// 通知偏好 Tab 暂无表，本地 useState 占位

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-debug-user-id');
  if (!userId) {
    return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: '请先登录' } }, { status: 401 });
  }
  const setting = await prisma.travelPrivacySetting.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json({ data: setting });
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-debug-user-id');
  if (!userId) {
    return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: '请先登录' } }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const updated = await prisma.travelPrivacySetting.upsert({
    where: { userId },
    update: {
      allowLeaderboardPublic: typeof body.allowLeaderboardPublic === 'boolean' ? body.allowLeaderboardPublic : undefined,
      allowCommunityFeed: typeof body.allowCommunityFeed === 'boolean' ? body.allowCommunityFeed : undefined,
      badgeShareScope: ['private', 'public', 'community'].includes(body.badgeShareScope) ? body.badgeShareScope : undefined,
    },
    create: {
      userId,
      allowLeaderboardPublic: body.allowLeaderboardPublic ?? true,
      allowCommunityFeed: body.allowCommunityFeed ?? true,
      badgeShareScope: body.badgeShareScope ?? 'private',
    },
  });
  return NextResponse.json({ data: updated });
}