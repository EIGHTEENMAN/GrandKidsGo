// POST /api/analytics/event — 接收前端埋点，转发 PostHog

import { NextRequest } from "next/server";
import { receiveClientEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  return receiveClientEvent(req);
}
