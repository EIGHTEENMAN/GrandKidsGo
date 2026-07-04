import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await prisma.childGallery.findMany({
    include: { user: { select: { nickname: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ code: 'OK', data: items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const item = await prisma.childGallery.create({
    data: {
      imageUrl: body.imageUrl,
      caption: body.caption,
      userId: body.userId,
    },
  });
  return NextResponse.json({ code: 'OK', data: item }, { status: 201 });
}
