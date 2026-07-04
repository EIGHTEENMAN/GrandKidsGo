import { ref, computed } from 'vue'

interface StatsState {
  openedIds: string[]
  readIds: string[]
}

function loadState(key: string): StatsState {
  try {
    const d = localStorage.getItem(key)
    return d ? JSON.parse(d) : { openedIds: [], readIds: [] }
  } catch {
    return { openedIds: [], readIds: [] }
  }
}

function saveState(key: string, state: StatsState) {
  localStorage.setItem(key, JSON.stringify(state))
}

export function useLearningStats(storageKey: string) {
  const stateKey = storageKey + '_stats'
  const raw = ref<StatsState>(loadState(stateKey))

  const openedCount = computed(() => raw.value.openedIds.length)
  const readCount = computed(() => raw.value.readIds.length)

  function markOpened(id: string) {
    if (!raw.value.openedIds.includes(id)) {
      raw.value.openedIds.push(id)
      saveState(stateKey, raw.value)
    }
  }

  function markRead(id: string) {
    if (!raw.value.readIds.includes(id)) {
      raw.value.readIds.push(id)
      saveState(stateKey, raw.value)
    }
  }

  return { openedCount, readCount, markOpened, markRead }
}
