// GET /api/badges/all-defs — 全部勋章定义（含隐藏），个人中心「勋章墙」展示用
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const defs = await prisma.travelBadgeDef.findMany({
    orderBy: [{ rarity: 'asc' }, { tier: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      category: true,
      rarity: true,
      tier: true,
      seasonalTag: true,
      hiddenFlag: true,
    },
  });
  return NextResponse.json({ items: defs });
}