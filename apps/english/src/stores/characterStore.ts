import { reactive, watch } from 'vue'

/**
 * characterStore — AI 朋友自定义名字 + 历史会话
 *
 * - customNames: { [characterId]: 用户起的名字 }
 * - chatHistory: { [characterId]: Message[] } — 最多保留 50 条
 */

const STORAGE_KEY = 'english_character_data'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface PersistedState {
  customNames: Record<string, string>
  chatHistory: Record<string, ChatMessage[]>
  lastCharacterId: string | null
  totalChatMs: number  // 累计 AI 对话总时长（毫秒），跨所有角色
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { customNames: {}, chatHistory: {}, lastCharacterId: null, totalChatMs: 0 }
    const parsed = JSON.parse(raw)
    return {
      customNames: parsed.customNames || {},
      chatHistory: parsed.chatHistory || {},
      lastCharacterId: parsed.lastCharacterId || null,
      totalChatMs: typeof parsed.totalChatMs === 'number' ? parsed.totalChatMs : 0
    }
  } catch {
    return { customNames: {}, chatHistory: {}, lastCharacterId: null, totalChatMs: 0 }
  }
}

const initial = load()

// 当前对话会话：进入 ChatPanel 时 start，卸载时 end 累加到 totalChatMs
let currentSessionStart: number | null = null
let currentSessionCharacter: string | null = null

export const characterStore = reactive({
  customNames: initial.customNames,
  chatHistory: initial.chatHistory,
  lastCharacterId: initial.lastCharacterId,
  totalChatMs: initial.totalChatMs,

  /** 获取显示名（用户自定义名 → 角色默认名） */
  getDisplayName(characterId: string, defaultName: string): string {
    return this.customNames[characterId] || defaultName
  },

  setCustomName(characterId: string, name: string) {
    if (!name || !name.trim()) {
      delete this.customNames[characterId]
    } else {
      this.customNames[characterId] = name.trim().slice(0, 10)
    }
  },

  hasCustomName(characterId: string): boolean {
    return !!this.customNames[characterId]
  },

  getHistory(characterId: string): ChatMessage[] {
    return this.chatHistory[characterId] || []
  },

  addMessage(characterId: string, msg: ChatMessage) {
    if (!this.chatHistory[characterId]) this.chatHistory[characterId] = []
    this.chatHistory[characterId].push(msg)
    // 保留最近 50 条
    if (this.chatHistory[characterId].length > 50) {
      this.chatHistory[characterId] = this.chatHistory[characterId].slice(-50)
    }
    this.lastCharacterId = characterId
  },

  clearHistory(characterId: string) {
    delete this.chatHistory[characterId]
  },

  setLastCharacterId(id: string) {
    this.lastCharacterId = id
  },

  /** 进入 ChatPanel 时调用 — 记录会话开始时间 */
  startChatSession(characterId: string) {
    currentSessionStart = Date.now()
    currentSessionCharacter = characterId
  },

  /** 离开 ChatPanel 时调用 — 累加会话时长到 totalChatMs */
  endChatSession(characterId: string) {
    if (currentSessionStart !== null && currentSessionCharacter === characterId) {
      const delta = Date.now() - currentSessionStart
      // 防呆：单次会话超过 2 小时不计入（防止挂机）
      if (delta > 0 && delta < 2 * 60 * 60 * 1000) {
        this.totalChatMs += delta
      }
      currentSessionStart = null
      currentSessionCharacter = null
    }
  },

  /** 清空累计时长（清除学习记录时一起清） */
  clearAll() {
    this.totalChatMs = 0
  }
})

// 自动持久化（5s 节流）
let saveTimer: number | null = null
watch(
  () => ({
    customNames: { ...characterStore.customNames },
    chatHistory: JSON.parse(JSON.stringify(characterStore.chatHistory)),
    lastCharacterId: characterStore.lastCharacterId,
    totalChatMs: characterStore.totalChatMs
  }),
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        customNames: characterStore.customNames,
        chatHistory: characterStore.chatHistory,
        lastCharacterId: characterStore.lastCharacterId,
        totalChatMs: characterStore.totalChatMs
      }))
    }, 5000)
  },
  { deep: true }
)