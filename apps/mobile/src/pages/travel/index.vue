<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'
import { track, TRACK } from '@/utils/analytics'

interface FeedItem {
  id: string
  title: string
  coverImage: string | null
  cityName: string | null
  days: number | null
  tags: string[]
  stats: { view: number; save: number; like: number }
  publishedAt: string | null
  author: { id: string | null; nickname: string; avatar: string | null }
  score?: number
}

interface HotBadge {
  rank: number
  name: string
  icon: string
  rarity: string
  category: string
  description: string
  unlockCount: number
}

const RARITY_STYLE: Record<string, string> = {
  bronze: 'background:#a16207;',
  silver: 'background:#475569;',
  gold: 'background:#ca8a04;',
  diamond: 'background:#1e40af;',
}

const loaded = ref(false)
const isLoggedIn = ref(false)
const items = ref<FeedItem[]>([])
const errMsg = ref<string>('')
const hotBadges = ref<HotBadge[]>([])

function authHeaders(): Record<string, string> {
  const token = uni.getStorageSync('grandkidsgo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadFeed() {
  try {
    const [feedRes, badgeRes] = await Promise.all([
      uni.request({
        url: `${TRAVEL_API_BASE.value}/api/guides/feed`,
        method: 'GET',
        header: authHeaders(),
      }),
      uni.request({
        url: `${TRAVEL_API_BASE.value}/api/guides/hot-badges`,
        method: 'GET',
      }),
    ])
    const d = feedRes.data as any
    if (d?.error) {
      errMsg.value = d.error.message ?? '加载失败'
    } else {
      items.value = d?.items ?? []
    }
    const bd = badgeRes.data as any
    if (bd?.items?.length) {
      hotBadges.value = bd.items
    }
    track(TRACK.GUIDE_FEED_VIEWED, {
      itemCount: items.value.length,
      hotBadgeCount: hotBadges.value.length,
      hasError: !!errMsg.value,
    })
  } catch {
    errMsg.value = '网络错误'
    track(TRACK.GUIDE_FEED_VIEWED, { hasError: true })
  } finally {
    loaded.value = true
  }
}

onMounted(() => {
  isLoggedIn.value = !!uni.getStorageSync('grandkidsgo_token')
  loadFeed()
})

function openWizard() {
  track(TRACK.WIZARD_STEP_COMPLETED, { step: 0, entry: 'home_fab' })
  uni.navigateTo({ url: '/pages/travel/wizard/step1-city' })
}

function goSearch() {
  track(TRACK.SEARCH_QUERY_SUBMITTED, { entry: 'home_search_box' })
  uni.navigateTo({ url: '/pages/travel/search/index' })
}

function goBadges() {
  uni.navigateTo({ url: '/pages/travel/badges/index' })
}

function openGuide(id: string) {
  track(TRACK.GUIDE_DETAIL_VIEWED, { guideId: id, source: 'home_feed' })
  uni.navigateTo({ url: `/pages/travel/guide-detail/index?id=${id}` })
}

function showLoginTip() {
  uni.showToast({ title: '请先登录主站账号', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view v-if="!loaded" class="loading-overlay">
      <view class="spinner"></view>
      <text class="loading-text">加载走天下…</text>
    </view>

    <view class="header">
      <text class="header-title">走天下</text>
      <text class="header-sub">孩子说好才是真的好</text>
    </view>

    <view class="search-bar" @click="goSearch">
      <text class="search-placeholder">🔍 搜目的地 / 景点 / 餐厅</text>
    </view>

    <view class="status-banner" v-if="!isLoggedIn">
      <text class="banner-text">登录后才能收藏 + 生成我的计划</text>
    </view>

    <view class="quick-grid">
      <view class="quick-card" @click="isLoggedIn ? openGuide('demo-1') : showLoginTip()">
        <text class="quick-emoji">🔥</text>
        <text class="quick-label">本周热门</text>
      </view>
      <view class="quick-card" @click="showLoginTip">
        <text class="quick-emoji">✨</text>
        <text class="quick-label">相似感受</text>
      </view>
      <view class="quick-card" @click="goBadges">
        <text class="quick-emoji">🏆</text>
        <text class="quick-label">勋章</text>
      </view>
      <view class="quick-card" @click="showLoginTip">
        <text class="quick-emoji">📚</text>
        <text class="quick-label">我的计划</text>
      </view>
    </view>

    <!-- v2.0 今日热门勋章 -->
    <view v-if="hotBadges.length > 0" class="hot-badges">
      <text class="hot-badges-title">🔥 本周热门勋章</text>
      <view class="hot-badges-row">
        <view
          v-for="b in hotBadges"
          :key="b.name"
          class="hot-badge-item"
          @click="goBadges"
        >
          <text class="hot-badge-icon">{{ b.icon }}</text>
          <text class="hot-badge-name">{{ b.name }}</text>
          <text class="hot-badge-count">{{ b.unlockCount }} 人获得</text>
        </view>
      </view>
    </view>

    <view v-if="errMsg" class="error">
      <text class="error-text">攻略流加载失败：{{ errMsg }}</text>
      <text class="error-hint">（API 不可达属于演示阶段预期；走天下 v1.5 默认接 travel.grandand.com）</text>
    </view>

    <view v-else-if="items.length === 0 && loaded" class="empty">
      <text class="empty-hint">还没有发布的攻略</text>
      <text class="empty-sub">妈妈先完成一次出行 + 发布一篇，就会出现在这里</text>
    </view>

    <view v-else class="feed">
      <view
        v-for="g in items"
        :key="g.id"
        class="guide-card"
        @click="openGuide(g.id)"
      >
        <view class="cover">
          <text v-if="!g.coverImage" class="cover-emoji">🗺️</text>
          <text class="cover-dest">{{ g.cityName ?? '目的地' }}</text>
          <text v-if="g.days" class="cover-meta">{{ g.days }} 天</text>
        </view>
        <text class="card-title">{{ g.title }}</text>
        <view class="card-meta">
          <text class="card-author">{{ g.author.nickname }}</text>
          <text class="card-stats">👍 {{ g.stats.like }}  ⭐ {{ g.stats.save }}</text>
        </view>
      </view>
    </view>

    <view class="fab" @click="openWizard">
      <text class="fab-text">我也要做计划</text>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx 200rpx; position: relative; min-height: 100vh; }
.loading-overlay { position: fixed; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; gap: 20rpx; }
.spinner { width: 48rpx; height: 48rpx; border: 4rpx solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.header { margin-bottom: 24rpx; }
.header-title { display: block; font-size: 56rpx; font-weight: 800; color: #0f172a; }
.header-sub { display: block; font-size: 26rpx; color: #64748b; margin-top: 8rpx; }
.status-banner { background: #fef3c7; border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.banner-text { font-size: 24rpx; color: #92400e; }
.search-bar { background: #fff; border: 1rpx solid #e2e8f0; border-radius: 32rpx; padding: 24rpx; margin-bottom: 24rpx; }
.search-placeholder { font-size: 28rpx; color: #94a3b8; }
.quick-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16rpx; margin-bottom: 32rpx; }
.quick-card { background: #fff; border-radius: 20rpx; padding: 28rpx 8rpx; text-align: center; border: 1rpx solid #e2e8f0; }
.quick-emoji { display: block; font-size: 40rpx; }
.quick-label { display: block; font-size: 22rpx; color: #475569; margin-top: 8rpx; }

/* v2.0 热门勋章 */
.hot-badges { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: 20rpx; padding: 24rpx; margin-bottom: 28rpx; border: 1rpx solid #fde68a; }
.hot-badges-title { display: block; font-size: 24rpx; font-weight: 600; color: #92400e; margin-bottom: 16rpx; }
.hot-badges-row { display: flex; gap: 12rpx; }
.hot-badge-item { flex: 1; background: #fff; border-radius: 14rpx; padding: 16rpx 8rpx; text-align: center; border: 1rpx solid #fef3c7; }
.hot-badge-icon { display: block; font-size: 40rpx; }
.hot-badge-name { display: block; font-size: 20rpx; font-weight: 600; color: #0f172a; margin-top: 6rpx; }
.hot-badge-count { display: block; font-size: 18rpx; color: #92400e; margin-top: 4rpx; }

.error { background: #fef2f2; border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; border: 1rpx solid #fecaca; }
.error-text { display: block; font-size: 26rpx; color: #dc2626; font-weight: 600; }
.error-hint { display: block; font-size: 22rpx; color: #7f1d1d; margin-top: 8rpx; }
.empty { background: #fff; border-radius: 20rpx; padding: 64rpx 32rpx; text-align: center; border: 1rpx dashed #cbd5e1; margin-bottom: 24rpx; }
.empty-hint { display: block; font-size: 30rpx; font-weight: 600; color: #64748b; }
.empty-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 12rpx; }
.feed { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.guide-card { background: #fff; border-radius: 20rpx; overflow: hidden; border: 1rpx solid #e2e8f0; }
.cover { height: 280rpx; background: linear-gradient(135deg, #16a34a, #0ea5e9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.cover-emoji { font-size: 56rpx; }
.cover-dest { font-size: 28rpx; font-weight: 600; color: #fff; }
.cover-meta { font-size: 22rpx; color: rgba(255,255,255,0.85); }
.card-title { display: block; font-size: 24rpx; font-weight: 600; color: #0f172a; padding: 16rpx; line-height: 1.4; min-height: 100rpx; }
.card-meta { display: flex; justify-content: space-between; padding: 0 16rpx 16rpx; }
.card-author { font-size: 22rpx; color: #64748b; }
.card-stats { font-size: 22rpx; color: #94a3b8; }
.fab { position: fixed; right: 32rpx; bottom: 32rpx; background: #16a34a; color: #fff; padding: 24rpx 32rpx; border-radius: 32rpx; box-shadow: 0 8rpx 24rpx rgba(22, 163, 74, 0.4); }
.fab-text { font-size: 28rpx; font-weight: 600; color: #fff; }
</style>
