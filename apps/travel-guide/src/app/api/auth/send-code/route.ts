import { NextResponse } from 'next/server';

const AUTH_SERVICE = 'http://localhost:3007';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${AUTH_SERVICE}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
