// 走天下 mobile API 封装
// baseURL 取 token 同步时的同一域：grandkidsgo_token 跨越子域共享
// v1 简化：所有请求直接以全 URL 调用 travel-guide 服务（后续在请求头统一加 token）

import { ref } from 'vue'

export interface ChildProfileInput {
  childId: string
  name: string
  birthDate?: string
  likes: string[]
  activities: string[]
  dislikes: string[]
  activeHoursPerDay: number
  needNap: 'required' | 'optional' | 'none'
  earlyOrLate: 'early_bird' | 'night_owl'
  hasMotionSickness: boolean
  allergies: string[]
  isShyWithStrangers: boolean
}

export interface WizardParams {
  userId: string
  cityId: string
  cities?: string[]
  startDate: string
  endDate: string
  travelers: { adults: number; children: number }
  childProfiles: ChildProfileInput[]
  budgetLevel: 'economy' | 'balanced' | 'premium'
  preferredSpotTypes?: string[]
  sourceGuideId?: string
  hasChildFeelingProfile: boolean
}

export interface TimelineBlock {
  blockId: string
  kind: 'spot' | 'restaurant' | 'park' | 'playground' | 'hotel' | 'transit' | 'rest'
  startMinutes: number
  endMinutes: number
  title: string
  spotId?: string
  restaurantId?: string
  hotelId?: string
  cityId?: string
  kidHook?: string
  notes?: string
  restReason?: 'nap' | 'late_arrival' | 'early_departure' | 'buffer'
  scoreDetail?: {
    evaluation: number
    route: number
    cost: number
    time: number
    photoWorthy: number
    feelingMatch: number
    composite: number
  }
}

export interface TimelineDay {
  dayIndex: number
  date: string
  theme: string
  blocks: TimelineBlock[]
  totalCostCents: number
  cityId: string
  kidFriendlySummary: string
}

export interface CandidateOutline {
  style: 'time_saver' | 'money_saver' | 'comfort'
  rhythm: 'compact' | 'balanced' | 'relaxed'
  label: string
  whyThisPlan: string
  totalCostCents: number
  totalDays: number
  totalActiveHours: number
  days: TimelineDay[]
}

export interface PlanOutline {
  cityId: string
  cityName: string
  generatedAt: string
  candidates: CandidateOutline[]
}

export const TRAVEL_API_BASE = ref('https://travel.grandand.com')

function authHeaders(): Record<string, string> {
  const token = uni.getStorageSync('grandkidsgo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchCityOptions(): Promise<Array<{ id: string; name: string }>> {
  const res = await uni.request({
    url: `${TRAVEL_API_BASE.value}/api/cities`,
    method: 'GET',
    header: authHeaders(),
  })
  const data = res.data as any
  if (data?.code !== 'OK') return defaultCitySeed()
  return data.data ?? []
}

// v1 上线初期的兜底（API 不可达时）
function defaultCitySeed(): Array<{ id: string; name: string }> {
  return [
    { id: 'city-beijing', name: '北京' },
    { id: 'city-shanghai', name: '上海' },
    { id: 'city-guangzhou', name: '广州' },
  ]
}

export async function assembleOutline(params: WizardParams): Promise<PlanOutline> {
  const res = await uni.request({
    url: `${TRAVEL_API_BASE.value}/api/wizard/assemble`,
    method: 'POST',
    header: { ...authHeaders(), 'Content-Type': 'application/json' },
    data: params,
  })
  const data = res.data as any
  if (data?.error) {
    throw new Error(data.error.message ?? '拼装失败')
  }
  // data 直接是 PlanOutline
  return data as PlanOutline
}

export interface PlanRecordCreate {
  userId: string
  cityId: string
  sourceGuideId?: string
  startDate: string
  endDate: string
  travelers: { adults: number; children: number }
  childAges: number[]
  travelStyle?: string
  status: 'draft' | 'confirmed' | 'active' | 'completed' | 'published'
  title?: string
  timelineBlocks: TimelineDay[]
  candidateLabel?: string
}

export async function createPlanRecord(body: PlanRecordCreate): Promise<{ id: string }> {
  const res = await uni.request({
    url: `${TRAVEL_API_BASE.value}/api/plans`,
    method: 'POST',
    header: { ...authHeaders(), 'Content-Type': 'application/json' },
    data: body,
  })
  const data = res.data as any
  if (data?.error) {
    throw new Error(data.error.message ?? '计划创建失败')
  }
  return { id: data?.id ?? '' }
}
