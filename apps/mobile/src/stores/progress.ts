// Simple progress tracking using uni storage

const STORAGE_KEY = 'grandkidsgo_progress'

interface ProgressData {
  lastVisit: number
  totalVisits: number
  appOpens: Record<string, number>
  recentApps: string[] // max 6
  totalContentViewed: number
  dailyStreak: number
  lastActiveDate: string
}

function load(): ProgressData {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    lastVisit: 0,
    totalVisits: 0,
    appOpens: {},
    recentApps: [],
    totalContentViewed: 0,
    dailyStreak: 0,
    lastActiveDate: '',
  }
}

function save(data: ProgressData) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(data))
}

export function trackAppOpen(appName: string) {
  const data = load()
  data.lastVisit = Date.now()
  data.totalVisits++
  data.appOpens[appName] = (data.appOpens[appName] || 0) + 1

  // Update recent apps
  data.recentApps = [appName, ...data.recentApps.filter(a => a !== appName)].slice(0, 6)
  data.totalContentViewed++

  // Daily streak
  const today = new Date().toDateString()
  if (data.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    data.dailyStreak = data.lastActiveDate === yesterday ? (data.dailyStreak || 0) + 1 : 1
    data.lastActiveDate = today
  }

  save(data)
}

export function getProgress(): ProgressData {
  return load()
}

export function getAppRanking(): { name: string; count: number }[] {
  const data = load()
  return Object.entries(data.appOpens)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function getRecentApps(): string[] {
  return load().recentApps
}
