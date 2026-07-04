import { NextResponse } from 'next/server';

const AUTH_SERVICE = 'http://localhost:3007';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const res = await fetch(`${AUTH_SERVICE}/api/user/children`, {
    headers: { Authorization: auth || '' },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  const body = await request.json();
  const res = await fetch(`${AUTH_SERVICE}/api/user/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth || '' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
