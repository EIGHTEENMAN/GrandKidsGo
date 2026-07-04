import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { reviewContent } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await prisma.kidSay.findMany({
    include: { user: { select: { nickname: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ code: 'OK', data: items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const item = await prisma.kidSay.create({
    data: { content: body.content, age: body.age, userId: body.userId },
  });

  // 自动审核
  await reviewContent(prisma, 'kid_say', body.content, item.id);

  return NextResponse.json({ code: 'OK', data: item }, { status: 201 });
}
