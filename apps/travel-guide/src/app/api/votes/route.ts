import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const votes = await prisma.vote.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return NextResponse.json({ code: 'OK', data: votes.map(v => ({ ...v, options: JSON.parse(v.options) })) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const vote = await prisma.vote.create({
    data: {
      title: body.title,
      options: JSON.stringify(body.options),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      creatorId: body.creatorId,
    },
  });
  return NextResponse.json({ code: 'OK', data: { ...vote, options: body.options } }, { status: 201 });
}
