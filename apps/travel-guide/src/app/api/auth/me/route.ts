import { NextResponse } from 'next/server';

const AUTH_SERVICE = 'http://localhost:3007';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/user/profile`, {
      headers: { Authorization: auth || '' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ code: 'ERROR', message: e.message }, { status: 500 });
  }
}
