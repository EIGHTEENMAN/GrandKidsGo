import { wordStore, WordRecord } from "../stores/wordStore"

const STORAGE_KEY = "ultraman_english_data"

interface SavedData {
  version: number
  records: [number, WordRecord][]
  player: { score: number; monstersKilled: number; correctCount: number; wrongCount: number }
  lastStudyDate: string
  todayStudyTime: number
}

export function saveToStorage() {
  const data: SavedData = {
    version: 1,
    records: Array.from(wordStore.records.entries()),
    player: {
      score: 0, // will be synced from player store in App.vue
      monstersKilled: 0,
      correctCount: 0,
      wrongCount: 0,
    },
    lastStudyDate: wordStore.lastStudyDate,
    todayStudyTime: wordStore.todayStudyTime,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* storage full */ }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data: SavedData = JSON.parse(raw)
    if (data.records) {
      wordStore.records = new Map(data.records)
    }
    if (data.lastStudyDate) wordStore.lastStudyDate = data.lastStudyDate
    if (data.todayStudyTime) wordStore.todayStudyTime = data.todayStudyTime
    // Reset today stats if new day
    const today = new Date().toDateString()
    if (wordStore.lastStudyDate !== today) {
      wordStore.todayStudyTime = 0
      wordStore.todayWords.clear()
    }
  } catch { /* ignore corrupt data */ }
}

export function updateStudyTime(seconds: number) {
  wordStore.todayStudyTime += seconds
  saveToStorage()
}
