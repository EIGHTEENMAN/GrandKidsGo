import { reactive, watch } from "vue"

export interface WordRecord {
  wordId: number
  word: string
  meaning: string
  correct: number
  total: number
  lastReview: number // timestamp
  mastered: boolean
}

/**
 * v3 增强：每日学习统计
 * dailyStats: { 'YYYY-MM-DD': { words: number, correct: number } }
 */
export interface DailyStat {
  words: number
  correct: number
}

const STATS_KEY = 'english_word_stats'

function loadDailyStats(): Record<string, DailyStat> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // 保留 60 天
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const filtered: Record<string, DailyStat> = {}
    for (const k of Object.keys(parsed)) {
      if (k >= cutoffStr) filtered[k] = parsed[k]
    }
    return filtered
  } catch {
    return {}
  }
}

export const wordStore = reactive({
  records: new Map<number, WordRecord>(),
  todayStudyTime: 0, // seconds
  todayWords: new Set<number>(),
  lastStudyDate: "",
  dailyStats: loadDailyStats() as Record<string, DailyStat>,
})

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function bumpDailyStat(correct: boolean) {
  const k = todayKey()
  const cur = wordStore.dailyStats[k] || { words: 0, correct: 0 }
  cur.words++
  if (correct) cur.correct++
  wordStore.dailyStats[k] = cur
}

export function recordAnswer(wordId: number, word: string, meaning: string, correct: boolean) {
  const r = wordStore.records.get(wordId) || { wordId, word, meaning, correct: 0, total: 0, lastReview: 0, mastered: false }
  r.total++
  if (correct) r.correct++
  r.lastReview = Date.now()
  const ratio = r.correct / r.total
  r.mastered = r.total >= 3 && ratio >= 0.8
  wordStore.records.set(wordId, r)
  wordStore.todayWords.add(wordId)
  wordStore.lastStudyDate = new Date().toDateString()
  bumpDailyStat(correct)
}

export function getMasteredCount(): number {
  let count = 0
  wordStore.records.forEach(r => { if (r.mastered) count++ })
  return count
}

export function getAccuracy(): number {
  let correct = 0, total = 0
  wordStore.records.forEach(r => { correct += r.correct; total += r.total })
  return total > 0 ? Math.round(correct / total * 100) : 0
}

export function getCorrectCount(): number {
  let count = 0
  wordStore.records.forEach(r => { count += r.correct })
  return count
}

export function getWrongCount(): number {
  let count = 0
  wordStore.records.forEach(r => { count += r.total - r.correct })
  return count
}

/**
 * 计算连续学习天数（streak）
 * 从今天往回数，每天必须有 dailyStats 且 words > 0
 * 允许"今天没学但昨天及之前连续"（返回昨天连续数）
 */
export function getStreak(): { current: number; longest: number } {
  const dates = Object.keys(wordStore.dailyStats)
    .filter(d => wordStore.dailyStats[d].words > 0)
    .sort()

  if (dates.length === 0) return { current: 0, longest: 0 }

  // 当前连续（从今天或昨天开始）
  const today = todayKey()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  let current = 0
  let cursor = dates.includes(today) ? today : (dates.includes(yesterdayKey) ? yesterdayKey : null)
  if (cursor) {
    while (dates.includes(cursor)) {
      current++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().slice(0, 10)
    }
  }

  // 最长连续
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const d of dates) {
    if (prev === null) {
      run = 1
    } else {
      const pd = new Date(prev)
      pd.setDate(pd.getDate() + 1)
      if (pd.toISOString().slice(0, 10) === d) {
        run++
      } else {
        run = 1
      }
    }
    if (run > longest) longest = run
    prev = d
  }

  return { current, longest }
}

export function clearAllProgress() {
  wordStore.records.clear()
  wordStore.todayWords.clear()
  wordStore.dailyStats = {}
  wordStore.todayStudyTime = 0
  localStorage.removeItem(STATS_KEY)
}

// 持久化 dailyStats（节流 5s）
let saveTimer: number | null = null
watch(
  () => wordStore.dailyStats,
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(STATS_KEY, JSON.stringify(wordStore.dailyStats))
    }, 5000)
  },
  { deep: true }
)
