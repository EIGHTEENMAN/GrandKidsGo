import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const challenges = await prisma.challenge.findMany({
    include: {
      participants: {
        include: { user: { select: { nickname: true, avatar: true } } },
      },
    },
    orderBy: { startAt: 'desc' },
    take: 20,
  });
  return NextResponse.json({ code: 'OK', data: challenges });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.join) {
    const existing = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: body.userId, challengeId: body.challengeId } },
    });
    if (existing) {
      return NextResponse.json({ code: 'DUPLICATE', message: '已参加该挑战' }, { status: 409 });
    }
    const uc = await prisma.userChallenge.create({
      data: { userId: body.userId, challengeId: body.challengeId },
    });
    return NextResponse.json({ code: 'OK', data: uc }, { status: 201 });
  }

  const challenge = await prisma.challenge.create({
    data: {
      title: body.title,
      description: body.description,
      coverImage: body.coverImage,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
    },
  });
  return NextResponse.json({ code: 'OK', data: challenge }, { status: 201 });
}
