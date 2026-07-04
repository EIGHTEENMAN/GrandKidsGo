import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const AUTH_SERVICE = 'http://localhost:3007';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const res = await fetch(`${AUTH_SERVICE}/api/user/profile`, {
    headers: { Authorization: auth || '' },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: Request) {
  const auth = request.headers.get('authorization');
  const body = await request.json();
  const res = await fetch(`${AUTH_SERVICE}/api/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth || '' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // Sync nickname/avatar to Prisma if update succeeded
  if (data.code === 'OK' && auth) {
    try {
      const token = auth.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.userId;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { nickname: body.nickname, avatar: body.avatar },
        });
      }
    } catch {}
  }

  return NextResponse.json(data, { status: res.status });
}
