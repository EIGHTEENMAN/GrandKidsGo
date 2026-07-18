// 4 步向导共享状态（v1 简单实现：localStorage 持久化）
// 三步共享一份 WizardParams，跨页用 storage 同步
// 后续若引入 pinia，可在此基础上替换为 store

import type { WizardParams, ChildProfileInput } from './travel-api'

const STORAGE_KEY = 'grandkidsgo_travel_wizard_draft'

export interface WizardDraft {
  cityId?: string
  cityName?: string
  startDate?: string
  endDate?: string
  budgetLevel?: 'economy' | 'balanced' | 'premium'
  preferredSpotTypes?: string[]
  travelers?: { adults: number; children: number }
  childProfile?: ChildProfileInput
}

export function loadDraft(): WizardDraft {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    return raw ? (JSON.parse(raw as string) as WizardDraft) : {}
  } catch {
    return {}
  }
}

export function saveDraft(patch: Partial<WizardDraft>): void {
  const cur = loadDraft()
  uni.setStorageSync(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }))
}

export function clearDraft(): void {
  uni.removeStorageSync(STORAGE_KEY)
}

export function buildFinalParams(d: WizardDraft, userId: string): WizardParams | null {
  if (!d.cityId || !d.startDate || !d.endDate || !d.childProfile) {
    return null
  }
  const childProfile: ChildProfileInput = d.childProfile
  return {
    userId,
    cityId: d.cityId,
    startDate: d.startDate,
    endDate: d.endDate,
    travelers: d.travelers ?? { adults: 2, children: 1 },
    childProfiles: [childProfile],
    budgetLevel: d.budgetLevel ?? 'balanced',
    preferredSpotTypes: d.preferredSpotTypes,
    hasChildFeelingProfile: false,
  }
}

export function diffDaysInclusive(start: string, end: string): number {
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1
  return Math.floor((b - a) / 86_400_000) + 1
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(date: string, n: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
