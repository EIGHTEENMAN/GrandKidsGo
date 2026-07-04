import { NextResponse } from 'next/server';

const AUTH_SERVICE = 'http://localhost:3007';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${AUTH_SERVICE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // Return auth-service response as-is (the frontend handles token storage)
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ code: 'ERROR', message: e.message }, { status: 500 });
  }
}
