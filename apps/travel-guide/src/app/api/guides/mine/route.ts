// GET /api/guides/mine?type=published|drafts|saved — 我的攻略列表
// 详见 项目建设方案/走天下个人中心竞品调研-2026-07-24.md 第二节 P0-2

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-debug-user-id');
  if (!userId) {
    return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: '请先登录' } }, { status: 401 });
  }
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'published';

  if (type === 'drafts') {
    const items = await prisma.guideDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        mode: true,
        params: true,    // 标题存在 params.title
        createdAt: true,
        updatedAt: true,
      },
    });
    // 把标题展平到顶层，方便前端直接用 g.title
    const flat = items.map(d => {
      const p = (d.params ?? {}) as Record<string, unknown>;
      return {
        id: d.id,
        title: (p.title as string) ?? '未命名草稿',
        status: d.status,
        mode: d.mode,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });
    return NextResponse.json({ items: flat, type });
  }

  if (type === 'saved') {
    const saves = await prisma.guideSave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        guide: {
          select: {
            id: true, title: true, coverImages: true, cityId: true,
            viewCount: true, saveCount: true, likeCount: true,
            publishedAt: true, status: true, days: true,
          },
        },
      },
    });
    const items = saves
      .filter((s) => s.guide && s.guide.status === 'published')
      .map((s) => ({ ...s.guide, savedAt: s.createdAt }));
    return NextResponse.json({ items, type });
  }

  // published
  const items = await prisma.guide.findMany({
    where: { userId, status: { in: ['published', 'pending'] } },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      coverImages: true,
      cityId: true,
      days: true,
      viewCount: true,
      saveCount: true,
      likeCount: true,
      publishedAt: true,
      status: true,
    },
  });
  return NextResponse.json({ items, type });
}