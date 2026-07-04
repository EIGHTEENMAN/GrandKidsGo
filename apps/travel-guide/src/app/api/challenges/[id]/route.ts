import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: {
      participants: {
        include: { user: { select: { nickname: true, avatar: true } } },
      },
    },
  });
  if (!challenge) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ code: 'OK', data: challenge });
}
