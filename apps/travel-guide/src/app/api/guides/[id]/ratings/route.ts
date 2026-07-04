import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.score || !body.userId) {
      return NextResponse.json({ code: 'ERROR', message: '参数不完整' }, { status: 400 });
    }
    const existing = await prisma.rating.findUnique({
      where: { guideId_userId: { guideId: params.id, userId: body.userId } },
    });
    if (existing) {
      return NextResponse.json({ code: 'ERROR', message: '你已经评过分了' }, { status: 409 });
    }
    const rating = await prisma.rating.create({
      data: { score: body.score, guideId: params.id, userId: body.userId },
    });
    return NextResponse.json({ code: 'OK', data: rating }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ code: 'ERROR', message: e.message }, { status: 500 });
  }
}
