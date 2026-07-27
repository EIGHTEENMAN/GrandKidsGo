// /api/auth/children-create — 同源代理到 auth-service POST /api/user/children
// 解决客户端直接 fetch 内部 AUTH_SERVICE_URL 会被浏览器拦截（CORS / 127.0.0.1 不可达）的问题。
// 该路由只被浏览器调用；Next.js 进程内 fetch('http://localhost:3007') 是 OK 的。

import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3007';

interface Body {
  nickname?: string;
  gender?: string;
  birthday?: string;
  avatar?: string;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json(
      { code: 'AUTH_REQUIRED', message: '缺少 Bearer token' },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.nickname) {
    return NextResponse.json(
      { code: 'INVALID_INPUT', message: '孩子昵称不能为空' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${AUTH_SERVICE}/api/user/children`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify({
        nickname: body.nickname,
        gender: body.gender,
        birthday: body.birthday,
        avatar: body.avatar,
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { code: 'ERROR', message: text.slice(0, 200) };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json(
      { code: 'ERROR', message: `auth-service POST 失败: ${msg}` },
      { status: 502 },
    );
  }
}
