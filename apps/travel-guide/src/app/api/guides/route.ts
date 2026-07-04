import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  const where: any = { isPublish: true };
  if (destination) where.destination = { contains: destination };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { summary: { contains: search } },
      { destination: { contains: search } },
    ];
  }

  const guides = await prisma.guide.findMany({
    where,
    include: { author: { select: { nickname: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ code: 'OK', data: guides }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const guide = await prisma.guide.create({
    data: {
      title: body.title,
      summary: body.summary,
      destination: body.destination,
      category: body.category,
      coverImage: body.coverImage,
      ageRange: body.ageRange,
      days: body.days,
      authorId: body.authorId,
      sections: {
        create: (body.sections || []).map((s: any, i: number) => ({
          title: s.title,
          content: s.content,
          order: i,
        })),
      },
    },
    include: { sections: true },
  });

  return NextResponse.json({ code: 'OK', data: guide }, { status: 201 });
}
