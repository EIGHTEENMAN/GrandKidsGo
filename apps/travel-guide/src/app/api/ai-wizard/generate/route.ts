// POST /api/ai-wizard/generate — 流式生成完整攻略（HTML 片段）
// 复用 lib/ai/travel-wizard.generateGuideContent()

import { NextRequest } from 'next/server';
import { generateGuideContent, type TravelWizardParams, type GuideOutline } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // 需要流式响应

export async function POST(req: NextRequest) {
  let body: { params: TravelWizardParams; outline: GuideOutline };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body?.params?.destinationCity || !body?.outline?.sections) {
    return new Response(JSON.stringify({ error: 'INVALID_PARAMS' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Node.js ReadableStream 流式返回 SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of generateGuideContent(body.params, body.outline)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        const msg = (e as Error).message ?? 'AI 生成失败';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}