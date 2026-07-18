// PostHog 埋点工具（Next.js 后端兼容）
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十一节 + 附录 D

const POSTHOG_KEY = process.env.POSTHOG_API_KEY ?? "";
const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://app.posthog.com";

interface AnalyticsEvent {
  eventName: string;
  userId?: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/**
 * Fire-and-forget 上报。未配置 POSTHOG_API_KEY 时静默跳过（dev 默认）。
 */
export function track(evt: AnalyticsEvent): void {
  if (!POSTHOG_KEY) return;
  const body = {
    api_key: POSTHOG_KEY,
    event: evt.eventName,
    distinct_id: evt.distinctId ?? evt.userId ?? "anonymous",
    properties: {
      ...evt.properties,
      user_id: evt.userId,
      ...evt.context,
    },
    timestamp: new Date().toISOString(),
  };
  fetch(`${POSTHOG_HOST}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => { /* 静默失败 */ });
}

/**
 * mobile / 前端的浏览器端埋点入口（通过 sendBeacon 异步发到本服务）
 */
export async function receiveClientEvent(req: Request): Promise<Response> {
  if (!POSTHOG_KEY) {
    // 未配 PostHog key 时静默吞掉，给客户端 200 OK 占位
    return jsonResponse({ ok: true, noPostHog: true });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch { /* ignore */ }
  if (!body?.eventName) {
    return jsonResponse({ ok: false }, 400);
  }
  track({
    eventName: body.eventName,
    userId: body.userId,
    distinctId: body.distinctId ?? body.userId,
    properties: body.properties,
    context: body.context,
  });
  return jsonResponse({ ok: true });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// 走天下相关事件名（与 v1.5 附录 D 一致）
export const TRACK = {
  WIZARD_STEP_COMPLETED: "wizard_quick_step_completed",
  WIZARD_COMPLETED: "wizard_quick_completed",
  PLAN_CREATED: "plan_created",
  PLAN_CONFIRMED: "plan_confirmed",
  PLAN_STARTED: "plan_started",
  PLAN_MEDIA_UPLOADED: "plan_media_uploaded",
  PLAN_NOTE_CREATED: "plan_note_created",
  PLAN_RATING_CREATED: "plan_rating_created",
  PLAN_PITFALL_MARKED: "plan_pitfall_marked",
  PLAN_COMPLETED: "plan_completed",
  GUIDE_FEED_VIEWED: "guide_feed_viewed",
  GUIDE_DETAIL_VIEWED: "guide_detail_viewed",
  GUIDE_SAVE_CLICKED: "guide_save_clicked",
  GUIDE_SAVE_STATE_CHANGED: "guide_save_state_changed",
  GUIDE_LIKE_CLICKED: "guide_like_clicked",
  GUIDE_LIKE_STATE_CHANGED: "guide_like_state_changed",
  GUIDE_AI_QA_ASKED: "guide_ai_qa_asked",
  GUIDE_SHARE_EXTERNAL_CLICKED: "guide_share_external_clicked",
  GUIDE_SHARE_EXTERNAL_COMPLETED: "guide_share_external_completed",
  GUIDE_PUBLISH_STARTED: "guide_publish_started",
  GUIDE_PUBLISH_SUBMITTED: "guide_publish_submitted",
  GUIDE_PUBLISH_APPROVED: "guide_publish_approved",
  GUIDE_PUBLISH_REJECTED: "guide_publish_rejected",
  SEARCH_QUERY_SUBMITTED: "search_query_submitted",
  SEARCH_RESULT_CLICKED: "search_result_clicked",
} as const;
