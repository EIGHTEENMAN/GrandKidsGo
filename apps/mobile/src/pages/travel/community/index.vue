<script setup lang="ts">
// 走天下社区动态（mobile，v2.0）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 C
// - 双 tab：关注流 / 全部流
// - 3 类动态：badge_unlocked / guide_published / trip_completed
// - 隐私：用户在 TravelPrivacySetting 关闭 allowCommunityFeed → 动态不公开

import { ref, onMounted } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'

const SCOPES: { key: 'follow' | 'all'; label: string }[] = [
  { key: 'follow', label: '关注流' },
  { key: 'all', label: '全部' },
]

const TYPE_META: Record<string, { emoji: string; color: string; label: string }> = {
  badge_unlocked:   { emoji: '🏅', color: '#f59e0b', label: '勋章' },
  guide_published:  { emoji: '📝', color: '#2563eb', label: '攻略' },
  trip_completed:   { emoji: '✈️', color: '#16a34a', label: '出行' },
}

const activeScope = ref<'follow' | 'all'>('all')
const items = ref<any[]>([])
const loading = ref(false)
const errMsg = ref('')

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/feed/activities?scope=${activeScope.value}&limit=30`,
      method: 'GET',
      header: { 'x-debug-user-id': uni.getStorageSync('grandkidsgo_user')?.id ?? '169060b8-5deb-4244-83b7-1ceeb415474b' },
    })
    const d = res.data as any
    if (d?.error) {
      errMsg.value = d.error.message ?? '加载失败'
      items.value = []
    } else {
      items.value = d?.items ?? []
    }
  } catch {
    errMsg.value = '网络错误'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function switchScope(s: 'follow' | 'all') { activeScope.value = s; load() }

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} 天前`
  return iso.slice(0, 10)
}

function firstChar(name: string | null | undefined): string {
  if (!name) return '?'
  // 取中文字符的首字
  return name.charAt(0)
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">走天下社区</text>
      <text class="hero-sub">勋章 · 攻略 · 出行</text>
    </view>

    <!-- 双 tab -->
    <view class="scope-tabs">
      <view
        v-for="s in SCOPES"
        :key="s.key"
        class="scope-tab"
        :class="{ active: activeScope === s.key }"
        @click="switchScope(s.key)">
        <text>{{ s.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text class="loading-text">加载中…</text>
    </view>
    <view v-else-if="errMsg" class="error">
      <text class="error-text">{{ errMsg }}</text>
    </view>
    <view v-else-if="items.length === 0" class="empty">
      <text class="empty-hint">{{ activeScope === 'follow' ? '还没关注任何人' : '社区暂无动态' }}</text>
      <text v-if="activeScope === 'follow'" class="empty-sub">去排行榜找找感兴趣的妈妈 👀</text>
    </view>

    <view v-else class="feed-list">
      <view
        v-for="it in items"
        :key="it.id"
        class="feed-item">
        <view class="feed-head">
          <view class="avatar" :style="{ background: TYPE_META[it.type]?.color ?? '#475569' }">
            <text class="avatar-text">{{ firstChar(it.author.nickname) }}</text>
          </view>
          <view class="head-meta">
            <text class="head-name">{{ it.author.nickname }}</text>
            <text class="head-time">{{ relativeTime(it.createdAt) }}</text>
          </view>
          <view class="type-tag" :style="{ background: TYPE_META[it.type]?.color ?? '#475569' }">
            <text class="type-emoji">{{ TYPE_META[it.type]?.emoji ?? '·' }}</text>
            <text class="type-label">{{ TYPE_META[it.type]?.label ?? it.type }}</text>
          </view>
        </view>
        <view class="feed-body">
          <text class="feed-text">{{ it.content.text }}</text>
        </view>
        <view class="feed-foot">
          <text class="foot-action">💬 评论</text>
          <text class="foot-action">⭐ 收藏</text>
          <text class="foot-action">↗ 分享</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; min-height: 100vh; background: #f8fafc; }
.hero { padding: 16rpx 0 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }

.scope-tabs { display: flex; gap: 4rpx; background: #f1f5f9; border-radius: 12rpx; padding: 4rpx; margin-bottom: 16rpx; }
.scope-tab { flex: 1; text-align: center; padding: 14rpx; border-radius: 10rpx; font-size: 26rpx; color: #64748b; font-weight: 600; }
.scope-tab.active { background: #fff; color: #2563eb; font-weight: 700; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.06); }

.loading, .error, .empty { padding: 80rpx 32rpx; text-align: center; }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.error-text { font-size: 26rpx; color: #ef4444; }
.empty-hint { display: block; font-size: 30rpx; color: #64748b; font-weight: 600; }
.empty-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }

.feed-list { display: flex; flex-direction: column; gap: 16rpx; }
.feed-item { background: #fff; border-radius: 16rpx; padding: 20rpx; border: 1rpx solid #e2e8f0; }
.feed-head { display: flex; align-items: center; gap: 12rpx; }
.avatar { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; flex-shrink: 0; }
.avatar-text { font-size: 28rpx; }
.head-meta { flex: 1; min-width: 0; }
.head-name { display: block; font-size: 26rpx; font-weight: 600; color: #0f172a; }
.head-time { display: block; font-size: 20rpx; color: #94a3b8; margin-top: 2rpx; }
.type-tag { display: flex; align-items: center; gap: 4rpx; padding: 6rpx 14rpx; border-radius: 14rpx; }
.type-emoji { font-size: 20rpx; }
.type-label { font-size: 20rpx; color: #fff; font-weight: 600; }

.feed-body { padding: 16rpx 0 12rpx; }
.feed-text { font-size: 28rpx; color: #1e293b; line-height: 1.6; }

.feed-foot { display: flex; gap: 24rpx; padding-top: 12rpx; border-top: 1rpx solid #f1f5f9; }
.foot-action { font-size: 22rpx; color: #64748b; }
</style>
