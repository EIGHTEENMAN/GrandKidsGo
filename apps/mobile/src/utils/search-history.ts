/**
 * 搜索历史通用工具（localStorage 持久化）
 * 用法：const history = useSearchHistory('my_search_history_key', 5)
 */

import { ref } from 'vue'

export function useSearchHistory(storageKey: string, maxItems = 5) {
  const history = ref<string[]>([])

  function load() {
    try {
      const raw = uni.getStorageSync(storageKey)
      if (raw) history.value = JSON.parse(raw)
    } catch {}
  }

  function save(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    const list = history.value.filter(s => s !== trimmed)
    list.unshift(trimmed)
    history.value = list.slice(0, maxItems)
    try { uni.setStorageSync(storageKey, JSON.stringify(history.value)) } catch {}
  }

  function clear() {
    history.value = []
    try { uni.removeStorageSync(storageKey) } catch {}
  }

  function pick(q: string) {
    history.value = [q, ...history.value.filter(s => s !== q)].slice(0, maxItems)
  }

  load()
  return { history, save, clear, pick }
}