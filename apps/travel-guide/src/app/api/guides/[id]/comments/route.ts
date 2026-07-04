import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.content || !body.userId) {
      return NextResponse.json({ code: 'ERROR', message: '参数不完整' }, { status: 400 });
    }
    const comment = await prisma.comment.create({
      data: { content: body.content, guideId: params.id, userId: body.userId },
    });
    return NextResponse.json({ code: 'OK', data: comment }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ code: 'ERROR', message: e.message }, { status: 500 });
  }
}
