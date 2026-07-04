import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const AUTH_SERVICE = 'http://localhost:3007';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${AUTH_SERVICE}/api/auth/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // Upsert user to Prisma for entity relations
    if (data.code === 'OK' && data.data?.user?.id) {
      const u = data.data.user;
      try {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {
            username: u.username,
            nickname: u.nickname || u.username,
            avatar: u.avatar,
          },
          create: {
            id: u.id,
            username: u.username,
            nickname: u.nickname || u.username,
            password: '', // auth-service handles auth
            avatar: u.avatar,
            role: 'user',
          },
        });
      } catch {}
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ code: 'ERROR', message: e.message }, { status: 500 });
  }
}
