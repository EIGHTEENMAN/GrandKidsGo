import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const guide = await prisma.guide.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } },
      sections: { orderBy: { order: 'asc' } },
      ratings: { select: { score: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { nickname: true } } },
      },
    },
  });
  if (!guide) {
    return NextResponse.json({ code: 'ERROR', message: '攻略不存在' }, { status: 404 });
  }

  await prisma.guide.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } });

  return NextResponse.json({ code: 'OK', data: { ...guide, viewCount: guide.viewCount + 1 } });
}
