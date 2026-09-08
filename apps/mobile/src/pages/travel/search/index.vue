<script setup lang="ts">
// 攻略搜索结果页
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十三节第五条
import { ref, computed, onMounted } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'
import { track, TRACK } from '@/utils/analytics'

// 搜索历史
const HISTORY_KEY = 'grandkidsgo_travel_search_history'
const HISTORY_MAX = 6
const searchHistory = ref<string[]>([])
const showHistory = ref(false)

function loadHistory() {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    if (raw) searchHistory.value = JSON.parse(raw)
  } catch {}
}

function saveToHistory(q: string) {
  const trimmed = q.trim()
  if (!trimmed) return
  const list = searchHistory.value.filter(s => s !== trimmed)
  list.unshift(trimmed)
  searchHistory.value = list.slice(0, HISTORY_MAX)
  try { uni.setStorageSync(HISTORY_KEY, JSON.stringify(searchHistory.value)) } catch {}
}

function clearHistory() {
  searchHistory.value = []
  try { uni.removeStorageSync(HISTORY_KEY) } catch {}
}

function pickHistory(q: string) {
  keyword.value = q
  showHistory.value = false
  doSearch(q)
}

loadHistory()

interface SearchItem {
  type: 'guide' | 'city' | 'spot' | 'restaurant' | 'hotel'
  id: string
  title: string
  subtitle?: string
  matchScore?: number
}

const keyword = ref<string>('')
const items = ref<SearchItem[]>([])
const loading = ref(false)
const errMsg = ref<string>('')
const activeFilter = ref<'all' | 'guide' | 'city' | 'spot' | 'restaurant' | 'hotel'>('all')

function authHeaders(): Record<string, string> {
  const token = uni.getStorageSync('grandkidsgo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function doSearch(q: string) {
  if (!q.trim()) {
    items.value = []
    return
  }
  showHistory.value = false
  saveToHistory(q)
  loading.value = true
  errMsg.value = ''
  try {
    const params: Record<string, string> = { q }
    if (activeFilter.value !== 'all') params.pr = activeFilter.value
    const query = new URLSearchParams(params).toString()
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/guides/search?${query}`,
      method: 'GET',
      header: authHeaders(),
    })
    const d = res.data as any
    if (d?.error) {
      errMsg.value = d.error.message ?? '搜索失败'
    } else {
      items.value = d?.items ?? []
    }
  } catch {
    errMsg.value = '网络错误'
  } finally {
    loading.value = false
  }
}

function applyFilter(t: typeof activeFilter.value) {
  activeFilter.value = t
  if (keyword.value.trim()) doSearch(keyword.value)
}

function onInput(e: any) {
  keyword.value = e.detail.value
}

function onConfirm() {
  doSearch(keyword.value)
}

function emojiFor(type: SearchItem['type']): string {
  if (type === 'guide') return '🗺️'
  if (type === 'city') return '🏙️'
  if (type === 'spot') return '🎯'
  if (type === 'restaurant') return '🍽️'
  if (type === 'hotel') return '🏨'
  return '📍'
}

function openItem(it: SearchItem) {
  track(TRACK.SEARCH_RESULT_CLICKED, {
    type: it.type,
    id: it.id,
    title: it.title,
    afterFilter: activeFilter.value,
  })
  if (it.type === 'guide') {
    uni.navigateTo({ url: `/pages/travel/guide-detail/index?id=${it.id}` })
    return
  }
  // v1 简化：城市/景点/餐厅/酒店暂未做详情页，先弹 toast
  uni.showToast({
    title: `${it.title} 详情页 v1 暂未上线`,
    icon: 'none',
  })
}

// 初始化：从 home/search 输入跳转带过来的关键词
const pages = getCurrentPages() as any[]
const initOpt = pages[pages.length - 1]?.options ?? {}
if (typeof initOpt.q === 'string' && initOpt.q.length > 0) {
  keyword.value = initOpt.q
  doSearch(initOpt.q)
}

const counts = computed(() => {
  const c: Record<string, number> = { all: items.value.length }
  for (const it of items.value) c[it.type] = (c[it.type] ?? 0) + 1
  return c
})
</script>

<template>
  <view class="page">
    <view class="search-row">
      <input
        :value="keyword"
        @input="onInput"
        @focus="showHistory = true"
        @blur="setTimeout(() => showHistory = false, 200)"
        @confirm="onConfirm"
        placeholder="搜目的地、景点、餐厅、攻略"
        class="search-input"
        confirm-type="search"
      />
      <text class="search-btn" @click="onConfirm">搜索</text>
    </view>

    <!-- Search History Dropdown -->
    <view v-if="showHistory && !keyword && searchHistory.length > 0" class="history-dropdown">
      <view class="history-header">
        <text class="history-title">最近搜索</text>
        <text class="history-clear" @mousedown="clearHistory">清空</text>
      </view>
      <view class="history-list">
        <view v-for="item in searchHistory" :key="item" class="history-item" @mousedown="pickHistory(item)">
          <text class="history-icon">🕐</text>
          <text class="history-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-x class="filter-row">
      <view
        v-for="t in (['all','guide','city','spot','restaurant','hotel'] as const)"
        :key="t"
        :class="['filter-chip', activeFilter === t ? 'filter-on' : '']"
        @click="applyFilter(t)"
      >
        <text class="filter-text">
          {{ t === 'all' ? '全部' : t === 'guide' ? '攻略' : t === 'city' ? '城市' : t === 'spot' ? '景点' : t === 'restaurant' ? '餐厅' : '酒店' }}
          ({{ counts[t] ?? 0 }})
        </text>
      </view>
    </scroll-view>

    <view v-if="loading" class="loading">
      <text class="loading-text">搜索中…</text>
    </view>

    <view v-else-if="errMsg" class="error">
      <text class="error-text">{{ errMsg }}</text>
    </view>

    <view v-else-if="keyword && items.length === 0" class="empty">
      <text class="empty-hint">没找到匹配的结果</text>
      <text class="empty-sub">换个关键词试试</text>
    </view>

    <view v-else class="result-list">
      <view
        v-for="it in items.filter((x) => activeFilter === 'all' || x.type === activeFilter)"
        :key="`${it.type}-${it.id}`"
        class="result-row"
        @click="openItem(it)"
      >
        <text class="result-emoji">{{ emojiFor(it.type) }}</text>
        <view class="result-main">
          <text class="result-title">{{ it.title }}</text>
          <text v-if="it.subtitle" class="result-subtitle">{{ it.subtitle }}</text>
        </view>
        <text class="result-tag">{{ it.type }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx 28rpx; min-height: 100vh; }
.search-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; position: relative; }
.search-input { flex: 1; background: #fff; border: 1rpx solid #e2e8f0; border-radius: 32rpx; padding: 18rpx 24rpx; font-size: 28rpx; }

.history-dropdown {
  background: white; border: 1rpx solid #e2e8f0; border-radius: 20rpx;
  margin-bottom: 16rpx; padding: 8rpx 0;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
}
.history-header { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 24rpx 4rpx; }
.history-title { font-size: 22rpx; color: #94a3b8; }
.history-clear { font-size: 22rpx; color: #2563eb; padding: 4rpx 8rpx; }
.history-list { display: flex; flex-direction: column; }
.history-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; }
.history-item:active { background: #f8fafc; }
.history-icon { font-size: 24rpx; color: #94a3b8; }
.history-text { font-size: 26rpx; color: #0f172a; }
.search-btn { font-size: 28rpx; color: #16a34a; font-weight: 600; padding: 0 12rpx; }
.filter-row { white-space: nowrap; padding-bottom: 24rpx; }
.filter-chip { display: inline-block; padding: 12rpx 24rpx; margin-right: 12rpx; background: #f1f5f9; border-radius: 32rpx; }
.filter-on { background: #dcfce7; }
.filter-text { font-size: 24rpx; color: #475569; }
.filter-on .filter-text { color: #166534; font-weight: 600; }
.loading, .error, .empty { padding: 80rpx 32rpx; text-align: center; }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.error-text { font-size: 26rpx; color: #ef4444; }
.empty-hint { display: block; font-size: 28rpx; color: #64748b; font-weight: 600; }
.empty-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }
.result-list { display: flex; flex-direction: column; gap: 12rpx; }
.result-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #e2e8f0; }
.result-emoji { font-size: 36rpx; width: 60rpx; text-align: center; }
.result-main { flex: 1; }
.result-title { display: block; font-size: 28rpx; color: #0f172a; font-weight: 600; }
.result-subtitle { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 6rpx; }
.result-tag { font-size: 22rpx; color: #16a34a; background: #dcfce7; padding: 6rpx 16rpx; border-radius: 16rpx; }
</style>
