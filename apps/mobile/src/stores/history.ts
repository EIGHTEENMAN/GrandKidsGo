// Content browsing history using uni storage

const STORAGE_KEY = 'grandkidsgo_browse_history'

export interface BrowseRecord {
  id: string
  title: string
  subtitle: string // author, source, or summary
  type: 'poem' | 'classic' | 'topic' | 'english' | 'other'
  url: string
  timestamp: number
}

function load(): BrowseRecord[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function save(records: BrowseRecord[]) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(records))
}

export function trackBrowse(record: {
  id?: string
  title: string
  subtitle?: string
  type: BrowseRecord['type']
  url?: string
}) {
  const records = load()
  const timestamp = Date.now()
  const id = record.id || timestamp.toString()

  // Remove duplicate (same id) if exists
  const filtered = records.filter(r => r.id !== id)

  // Add to front
  const entry: BrowseRecord = {
    id,
    title: record.title,
    subtitle: record.subtitle || '',
    type: record.type,
    url: record.url || '',
    timestamp,
  }
  filtered.unshift(entry)

  // Keep max 50 records
  save(filtered.slice(0, 50))
}

export function getBrowseHistory(limit = 10): BrowseRecord[] {
  return load().slice(0, limit)
}

export function clearBrowseHistory() {
  uni.setStorageSync(STORAGE_KEY, '[]')
}

export function getRecentByType(type: BrowseRecord['type'], limit = 5): BrowseRecord[] {
  return load().filter(r => r.type === type).slice(0, limit)
}
