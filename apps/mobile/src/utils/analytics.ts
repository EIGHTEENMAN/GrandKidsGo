// 走天下 mobile 埋点客户端
// 通过 POST /api/analytics/event 把事件转发到 travel-guide
// travel-guide 收到事件后批量上报 PostHog（fire-and-forget）

import { TRAVEL_API_BASE } from './travel-api'

const ENABLE_ANALYTICS = true

export const TRACK = {
  WIZARD_STEP_COMPLETED: 'wizard_quick_step_completed',
  WIZARD_COMPLETED: 'wizard_quick_completed',
  PLAN_CREATED: 'plan_created',
  PLAN_CONFIRMED: 'plan_confirmed',
  GUIDE_FEED_VIEWED: 'guide_feed_viewed',
  GUIDE_DETAIL_VIEWED: 'guide_detail_viewed',
  GUIDE_SAVE_CLICKED: 'guide_save_clicked',
  GUIDE_SAVE_STATE_CHANGED: 'guide_save_state_changed',
  GUIDE_LIKE_CLICKED: 'guide_like_clicked',
  GUIDE_LIKE_STATE_CHANGED: 'guide_like_state_changed',
  PLAN_RATING_CREATED: 'plan_rating_created',
  SEARCH_QUERY_SUBMITTED: 'search_query_submitted',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',
  GUIDE_PUBLISH_STARTED: 'guide_publish_started',
  GUIDE_PUBLISH_SUBMITTED: 'guide_publish_submitted',
  GUIDE_SHARE_EXTERNAL_CLICKED: 'guide_share_external_clicked',
  GUIDE_SHARE_EXTERNAL_COMPLETED: 'guide_share_external_completed',
} as const

let cachedDistinctId = ''
function ensureDistinctId(): string {
  if (cachedDistinctId) return cachedDistinctId
  let id = ''
  try {
    id = uni.getStorageSync('grandkidsgo_analytics_id') || ''
    if (!id) {
      id = `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
      uni.setStorageSync('grandkidsgo_analytics_id', id)
    }
  } catch { id = 'm-anon' }
  cachedDistinctId = id
  return id
}

export function track(eventName: string, properties: Record<string, unknown> = {}): void {
  if (!ENABLE_ANALYTICS) return
  try {
    const userId = (uni.getStorageSync('grandkidsgo_user') as any)?.id ?? null
    uni.request({
      url: `${TRAVEL_API_BASE.value}/api/analytics/event`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        eventName,
        distinctId: ensureDistinctId(),
        userId,
        properties,
        timestamp: Date.now(),
      },
    })
  } catch {
    /* 静默 */
  }
}
