import { reactive, watch } from 'vue'

/**
 * studyStore — 学习会话状态
 * - currentSession: 进行中的学习会话（无则表示空闲）
 * - lastSession: 上次完成的会话（用于"续聊"引导）
 * - sessionsCompleted: 累计完成数
 */

const STORAGE_KEY = 'english_study_session'

export interface SessionRecord {
  themeId: string
  themeName: string
  stage: number
  words: string[]           // 学习的单词列表（小写）
  wordMeanings: string[]    // 对应中文释义
  correct: number
  total: number
  startedAt: number
  completedAt: number
}

interface PersistedState {
  lastSession: SessionRecord | null
  sessionsCompleted: number
}

function loadFromStorage(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lastSession: null, sessionsCompleted: 0 }
    const parsed = JSON.parse(raw)
    return {
      lastSession: parsed.lastSession || null,
      sessionsCompleted: parsed.sessionsCompleted || 0
    }
  } catch {
    return { lastSession: null, sessionsCompleted: 0 }
  }
}

const initial = loadFromStorage()

export const studyStore = reactive({
  currentSession: null as {
    themeId: string
    themeName: string
    stage: number
    wordIds: number[]
    currentIndex: number
    correct: number
    startedAt: number
  } | null,

  lastSession: initial.lastSession,
  sessionsCompleted: initial.sessionsCompleted,

  startSession(themeId: string, themeName: string, stage: number, wordIds: number[]) {
    this.currentSession = {
      themeId,
      themeName,
      stage,
      wordIds,
      currentIndex: 0,
      correct: 0,
      startedAt: Date.now()
    }
  },

  recordAnswer(correct: boolean) {
    if (this.currentSession && correct) this.currentSession.correct++
  },

  nextWord() {
    if (this.currentSession) this.currentSession.currentIndex++
  },

  completeSession(words: { word: string, meaning: string }[], correct: number) {
    if (!this.currentSession) return
    const now = Date.now()
    const s = this.currentSession
    this.lastSession = {
      themeId: s.themeId,
      themeName: s.themeName,
      stage: s.stage,
      words: words.map(w => w.word.toLowerCase()),
      wordMeanings: words.map(w => w.meaning),
      correct,
      total: words.length,
      startedAt: s.startedAt,
      completedAt: now
    }
    this.sessionsCompleted++
    this.currentSession = null
  },

  cancelSession() {
    this.currentSession = null
  },

  clearHistory() {
    this.lastSession = null
    this.sessionsCompleted = 0
  }
})

// 自动持久化（节流到 5s）
let saveTimer: number | null = null
watch(
  () => ({ lastSession: studyStore.lastSession, sessionsCompleted: studyStore.sessionsCompleted }),
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        lastSession: studyStore.lastSession,
        sessionsCompleted: studyStore.sessionsCompleted
      }))
    }, 5000)
  },
  { deep: true }
)