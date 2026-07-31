// POST /api/ai-wizard/outline — 生成行程大纲（非流式）
// 复用 lib/ai/travel-wizard.generateGuideOutline()

import { NextRequest, NextResponse } from 'next/server';
import { generateGuideOutline, type TravelWizardParams } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: TravelWizardParams;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '请求体不是合法 JSON' } },
      { status: 400 },
    );
  }

  // 入参基本校验
  if (!body.destinationCity || body.days < 1 || body.days > 30) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: '缺少目的地或天数不合法（1-30）' } },
      { status: 400 },
    );
  }

  try {
    const outline = await generateGuideOutline(body);
    return NextResponse.json({ code: 'OK', data: outline });
  } catch (e) {
    const msg = (e as Error).message ?? 'AI 生成失败';
    console.error('[ai-wizard/outline]', msg);
    return NextResponse.json(
      { error: { code: 'AI_FAILED', message: msg } },
      { status: 500 },
    );
  }
}