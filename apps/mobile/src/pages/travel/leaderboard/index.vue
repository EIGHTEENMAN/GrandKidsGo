<script setup lang="ts">
// 走天下排行榜（mobile，v2.0）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 B
// - 4 类榜 × 3 个时间维度
// - 隐私：脱敏孩子月龄为"宝宝 {N} 月"
// - "按周匿名"开关（v2.0 隐私跃迁第三条）

import { ref, onMounted, computed } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'

type Scope = 'mom' | 'child' | 'city' | 'guide'
type Period = 'week' | 'month' | 'all'

const SCOPES: { key: Scope; label: string; emoji: string }[] = [
  { key: 'mom',   label: '妈妈榜', emoji: '👩' },
  { key: 'child', label: '孩子榜', emoji: '🧒' },
  { key: 'city',  label: '城市榜', emoji: '🏙️' },
  { key: 'guide', label: '攻略榜', emoji: '📝' },
]

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',  label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all',   label: '总榜' },
]

const activeScope = ref<Scope>('mom')
const activePeriod = ref<Period>('week')
const items = ref<any[]>([])
const loading = ref(false)
const errMsg = ref('')
const capturedAt = ref<string | null>(null)
const weeklyAnonymous = ref(false)

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/leaderboard/${activeScope.value}?period=${activePeriod.value}`,
      method: 'GET',
      header: { 'x-debug-user-id': uni.getStorageSync('grandkidsgo_user')?.id ?? '169060b8-5deb-4244-83b7-1ceeb415474b' },
    })
    const d = res.data as any
    if (d?.error) {
      errMsg.value = d.error.message ?? '加载失败'
      items.value = []
    } else {
      items.value = d?.items ?? []
      capturedAt.value = d?.capturedAt ?? null
    }
  } catch {
    errMsg.value = '网络错误'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function switchScope(s: Scope) { activeScope.value = s; load() }
function switchPeriod(p: Period) { activePeriod.value = p; load() }

const RANK_BADGES: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
function rankBadge(r: number) { return RANK_BADGES[r] ?? `#${r}` }
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">走天下排行榜</text>
      <text class="hero-sub">孩子真实感受分 · 隐私脱敏展示</text>
    </view>

    <!-- Scope tabs -->
    <scroll-view scroll-x class="scope-tabs">
      <view
        v-for="s in SCOPES"
        :key="s.key"
        class="scope-tab"
        :class="{ active: activeScope === s.key }"
        @click="switchScope(s.key)">
        <text class="scope-emoji">{{ s.emoji }}</text>
        <text class="scope-label">{{ s.label }}</text>
      </view>
    </scroll-view>

    <!-- Period switcher -->
    <view class="period-bar">
      <view
        v-for="p in PERIODS"
        :key="p.key"
        class="period-tab"
        :class="{ active: activePeriod === p.key }"
        @click="switchPeriod(p.key)">
        <text>{{ p.label }}</text>
      </view>
    </view>

    <!-- Privacy toggle -->
    <view class="privacy-row">
      <text class="privacy-text">🛡️ 按周匿名（不参与本周公开榜）</text>
      <switch :checked="weeklyAnonymous" @change="weeklyAnonymous = $event.detail.value" color="#16a34a" />
    </view>

    <!-- Loading / error / empty -->
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中…</text>
    </view>
    <view v-else-if="errMsg" class="error">
      <text class="error-text">{{ errMsg }}</text>
    </view>
    <view v-else-if="items.length === 0" class="empty">
      <text class="empty-hint">榜单暂无数据</text>
      <text class="empty-sub">{{ activePeriod }} 还没人上榜</text>
    </view>

    <!-- Items list -->
    <view v-else class="lb-list">
      <view
        v-for="it in items"
        :key="it.rank"
        class="lb-row"
        :class="{ top3: it.rank <= 3 }">
        <view class="lb-rank" :class="`rank-${it.rank}`">
          <text class="rank-text">{{ rankBadge(it.rank) }}</text>
        </view>
        <view class="lb-main">
          <view class="lb-line1">
            <text v-if="activeScope === 'child'" class="lb-title">{{ it.childLabel || '宝宝' }}</text>
            <text v-else-if="activeScope === 'city'" class="lb-title">{{ it.cityName }}</text>
            <text v-else-if="activeScope === 'guide'" class="lb-title">{{ it.title }}</text>
            <text v-else class="lb-title">{{ it.nickname || '童慧行用户' }}</text>
          </view>
          <view class="lb-line2">
            <text v-if="activeScope === 'mom'" class="lb-stat">
              {{ it.badgeCount }} 勋章 · {{ it.guideCount }} 攻略 · {{ it.cityCount }} 城市
            </text>
            <text v-else-if="activeScope === 'child'" class="lb-stat">
              真实感受分 {{ it.feelingScoreAvg }} · {{ it.cityCount }} 城市
            </text>
            <text v-else-if="activeScope === 'city'" class="lb-stat">
              {{ it.tripCount }} 次出行 · 平均 {{ it.feelingScoreAvg }} 分
            </text>
            <text v-else-if="activeScope === 'guide'" class="lb-stat">
              真实感受 {{ it.feelingContribution }} · 收藏 {{ it.saveCount }} · 点赞 {{ it.likeCount }}
            </text>
          </view>
        </view>
        <view class="lb-score">
          <text class="score-num">{{ it.score }}</text>
          <text class="score-label">分</text>
        </view>
      </view>
    </view>

    <view v-if="capturedAt" class="footer">
      <text class="footer-text">快照时间：{{ capturedAt.slice(0, 16).replace('T', ' ') }}</text>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx 24rpx 80rpx; min-height: 100vh; background: #f8fafc; }
.hero { padding: 16rpx 0 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }

.scope-tabs { white-space: nowrap; margin-bottom: 16rpx; }
.scope-tab { display: inline-flex; align-items: center; gap: 6rpx; padding: 14rpx 24rpx; margin-right: 8rpx; background: #fff; border-radius: 32rpx; border: 1rpx solid #e2e8f0; }
.scope-tab.active { background: #2563eb; border-color: #2563eb; }
.scope-tab.active .scope-label { color: #fff; }
.scope-emoji { font-size: 28rpx; }
.scope-label { font-size: 26rpx; color: #475569; font-weight: 600; }

.period-bar { display: flex; gap: 4rpx; background: #f1f5f9; border-radius: 12rpx; padding: 4rpx; margin-bottom: 16rpx; }
.period-tab { flex: 1; text-align: center; padding: 12rpx; border-radius: 10rpx; font-size: 24rpx; color: #64748b; }
.period-tab.active { background: #fff; color: #2563eb; font-weight: 700; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.06); }

.privacy-row { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 20rpx; background: #fef3c7; border-radius: 12rpx; margin-bottom: 20rpx; }
.privacy-text { font-size: 22rpx; color: #92400e; }

.loading, .error, .empty { padding: 80rpx 32rpx; text-align: center; }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.error-text { font-size: 26rpx; color: #ef4444; }
.empty-hint { display: block; font-size: 30rpx; color: #64748b; font-weight: 600; }
.empty-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }

.lb-list { display: flex; flex-direction: column; gap: 12rpx; }
.lb-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; border: 1rpx solid #e2e8f0; }
.lb-row.top3 { background: linear-gradient(135deg, #fef3c7, #fff); border-color: #fde68a; }
.lb-rank { width: 64rpx; text-align: center; flex-shrink: 0; }
.rank-text { font-size: 32rpx; font-weight: 800; color: #475569; }
.rank-1 .rank-text, .rank-2 .rank-text, .rank-3 .rank-text { font-size: 40rpx; }
.lb-main { flex: 1; min-width: 0; }
.lb-title { display: block; font-size: 28rpx; font-weight: 700; color: #0f172a; line-height: 1.4; }
.lb-line2 { margin-top: 6rpx; }
.lb-stat { font-size: 22rpx; color: #64748b; }
.lb-score { display: flex; align-items: baseline; gap: 4rpx; }
.score-num { font-size: 36rpx; font-weight: 800; color: #f59e0b; line-height: 1; }
.score-label { font-size: 18rpx; color: #94a3b8; }

.footer { text-align: center; padding: 24rpx 0; }
.footer-text { font-size: 20rpx; color: #cbd5e1; }
</style>
