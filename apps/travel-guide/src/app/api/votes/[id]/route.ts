import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const vote = await prisma.vote.findUnique({
    where: { id: params.id },
  });
  if (!vote) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ code: 'OK', data: { ...vote, options: JSON.parse(vote.options) } });
}
