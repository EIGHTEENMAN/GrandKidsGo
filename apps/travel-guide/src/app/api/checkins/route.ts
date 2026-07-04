import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { reviewContent } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checkins = await prisma.childCheckIn.findMany({
    include: { user: { select: { nickname: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ code: 'OK', data: checkins });
}

export async function POST(request: Request) {
  const body = await request.json();
  const checkin = await prisma.childCheckIn.create({
    data: {
      location: body.location,
      note: body.note,
      lat: body.lat,
      lng: body.lng,
      userId: body.userId,
    },
  });

  // 审核签到备注
  if (body.note) {
    await reviewContent(prisma, 'checkin_note', body.note, checkin.id);
  }

  return NextResponse.json({ code: 'OK', data: checkin }, { status: 201 });
}
