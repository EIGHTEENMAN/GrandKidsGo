<script setup lang="ts">
// 走天下勋章墙（mobile，v2.0）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第八节 + 附录 C
// - 按稀有度排序（钻石 > 金 > 银 > 铜）
// - 分类切换
// - 显示等级总分
// - 显示兑换积分入口（占位，待 Wave 4 实现）

import { ref, onMounted, computed } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'

interface BadgeItem {
  badgeId: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'bronze' | 'silver' | 'gold' | 'diamond'
  tier: number
  seasonalTag?: string | null
  hiddenFlag: boolean
  obtainedAt: string
  shareScope: string
  exchanged: boolean
  exchangeablePoints: number
}

interface Summary {
  total: number
  byRarity: Record<string, number>
  byCategory: Record<string, number>
  totalScore: number
  totalExchangeablePoints: number
}

const items = ref<BadgeItem[]>([])
const summary = ref<Summary | null>(null)
const loading = ref(true)
const errMsg = ref('')
const activeCategory = ref<string>('全部')

function authHeaders(): Record<string, string> {
  const t = uni.getStorageSync('grandkidsgo_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const RARITY_META: Record<string, { label: string; color: string; gradient: string; emoji: string }> = {
  bronze:   { label: '铜', color: '#a16207', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', emoji: '🥉' },
  silver:   { label: '银', color: '#475569', gradient: 'linear-gradient(135deg, #f1f5f9, #cbd5e1)', emoji: '🥈' },
  gold:     { label: '金', color: '#ca8a04', gradient: 'linear-gradient(135deg, #fef3c7, #fbbf24)', emoji: '🥇' },
  diamond:  { label: '钻', color: '#1e40af', gradient: 'linear-gradient(135deg, #dbeafe, #93c5fd)', emoji: '💎' },
}

const filtered = computed(() => {
  if (activeCategory.value === '全部') return items.value
  return items.value.filter(b => b.category === activeCategory.value)
})

const categories = computed(() => {
  const set = new Set<string>(['全部'])
  for (const b of items.value) set.add(b.category)
  return Array.from(set)
})

onMounted(async () => {
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/user/travel-badges`,
      method: 'GET',
      header: authHeaders(),
    })
    const d = res.data as any
    if (d?.error) {
      errMsg.value = d.error.message ?? '加载失败'
    } else {
      items.value = d?.items ?? []
      summary.value = d?.summary ?? null
    }
  } catch {
    errMsg.value = '网络错误'
  } finally {
    loading.value = false
  }
})

function goStore() {
  uni.showToast({ title: '主站商城: store.grandand.com', icon: 'none' })
}

async function exchangeBadge(b: BadgeItem) {
  const ok = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认兑换',
      content: `将「${b.name}」兑换为 +${b.exchangeablePoints} 积分？\n（每枚勋章只能兑换一次）`,
      success: (r) => resolve(r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!ok) return

  try {
    uni.showLoading({ title: '兑换中…' })
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/badges/${b.badgeId}/exchange`,
      method: 'POST',
      header: { ...authHeaders() },
    })
    uni.hideLoading()
    const d = res.data as any
    if (d?.ok) {
      uni.showModal({
        title: '兑换成功',
        content: `+${d.pointsAwarded} 积分已到主站账户，余额 ${d.pointsBalance} 分`,
        showCancel: false,
      })
      // 局部更新
      const it = items.value.find((x) => x.badgeId === b.badgeId)
      if (it) {
        it.exchanged = true
        it.exchangeablePoints = 0
      }
      // 重算 summary
      if (summary.value) {
        summary.value.totalExchangeablePoints = items.value
          .filter((x) => !x.exchanged)
          .reduce((s, x) => s + x.exchangeablePoints, 0)
      }
    } else {
      uni.showToast({ title: d?.error?.message ?? '兑换失败', icon: 'none' })
    }
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">走天下勋章</text>
      <text class="hero-sub">妈妈视角的亲子出行勋章墙 · v2.0</text>
    </view>

    <!-- 等级总览 -->
    <view v-if="summary" class="summary-card">
      <view class="summary-head">
        <view class="level">
          <text class="level-num">{{ summary.totalScore }}</text>
          <text class="level-label">等级分</text>
        </view>
        <view class="rarity-bar">
          <view v-for="r in ['diamond', 'gold', 'silver', 'bronze']" :key="r" class="rarity-pill" :style="{ background: RARITY_META[r].gradient, color: RARITY_META[r].color }">
            <text class="rarity-emoji">{{ RARITY_META[r].emoji }}</text>
            <text class="rarity-num">{{ summary.byRarity[r] || 0 }}</text>
          </view>
        </view>
      </view>
      <view class="exchange-hint" v-if="summary.totalExchangeablePoints > 0">
        💎 当前可兑换积分：<text class="exchange-num">{{ summary.totalExchangeablePoints }}</text>
        （Wave 4 上线后开放）
      </view>
    </view>

    <!-- 分类切换 -->
    <scroll-view scroll-x class="category-bar" v-if="items.length > 0">
      <view
        v-for="c in categories"
        :key="c"
        class="category-tab"
        :class="{ active: activeCategory === c }"
        @click="activeCategory = c">
        <text>{{ c }}</text>
        <text v-if="c !== '全部' && summary?.byCategory[c]" class="category-count">{{ summary.byCategory[c] }}</text>
      </view>
    </scroll-view>

    <view v-if="loading" class="loading">
      <text class="loading-text">加载中…</text>
    </view>

    <view v-else-if="errMsg" class="error">
      <text class="error-text">{{ errMsg }}</text>
    </view>

    <view v-else-if="items.length === 0" class="empty">
      <text class="empty-hint">还没拿到勋章</text>
      <text class="empty-sub">完成第一次出行 + 发布攻略后自动获得</text>
    </view>

    <view v-else class="badge-grid">
      <view
        v-for="b in filtered"
        :key="b.badgeId"
        class="badge-card"
        :class="[`rarity-${b.rarity}`, { exchanged: b.exchanged }]"
        :style="{ background: RARITY_META[b.rarity].gradient }">
        <text class="badge-icon">{{ b.icon }}</text>
        <text class="badge-name">{{ b.name }}</text>
        <text class="badge-desc">{{ b.description }}</text>
        <view class="badge-foot">
          <text class="badge-rarity" :style="{ color: RARITY_META[b.rarity].color }">
            {{ RARITY_META[b.rarity].emoji }}{{ RARITY_META[b.rarity].label }}
          </text>
          <text v-if="b.exchanged" class="badge-exchanged-tag">已兑换</text>
          <text v-else-if="b.hiddenFlag" class="badge-hidden-tag">隐藏解锁</text>
          <text class="badge-date">{{ b.obtainedAt.slice(0, 10) }}</text>
        </view>
        <view v-if="!b.exchanged" class="exchange-btn" @click="exchangeBadge(b)">
          <text class="exchange-btn-text">💎 兑换 +{{ b.exchangeablePoints }} 分</text>
        </view>
        <view v-else class="exchange-btn exchanged" @click="goStore">
          <text class="exchange-btn-text">去商城使用</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx; min-height: 100vh; }
.hero { margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #0f172a; }
.hero-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }

/* 等级总览 */
.summary-card {
  background: linear-gradient(135deg, #f0f9ff, #fff);
  border: 1rpx solid #bae6fd; border-radius: 20rpx;
  padding: 24rpx; margin-bottom: 24rpx;
}
.summary-head { display: flex; align-items: center; gap: 16rpx; }
.level { display: flex; flex-direction: column; align-items: center; padding: 12rpx 20rpx; background: #fff; border-radius: 14rpx; min-width: 110rpx; }
.level-num { font-size: 40rpx; font-weight: 800; color: #2563eb; line-height: 1; }
.level-label { font-size: 20rpx; color: #64748b; margin-top: 4rpx; }
.rarity-bar { display: flex; gap: 8rpx; flex: 1; }
.rarity-pill { display: flex; align-items: center; gap: 4rpx; padding: 10rpx 14rpx; border-radius: 10rpx; flex: 1; justify-content: center; }
.rarity-emoji { font-size: 24rpx; }
.rarity-num { font-size: 24rpx; font-weight: 700; }
.exchange-hint { font-size: 22rpx; color: #64748b; margin-top: 12rpx; text-align: center; }
.exchange-num { color: #ea580c; font-weight: 700; }

/* 分类切换 */
.category-bar { white-space: nowrap; margin-bottom: 20rpx; }
.category-tab { display: inline-block; padding: 12rpx 24rpx; margin-right: 8rpx; border-radius: 24rpx; background: #f1f5f9; font-size: 24rpx; color: #475569; }
.category-tab.active { background: #2563eb; color: #fff; font-weight: 600; }
.category-count { display: inline-block; margin-left: 6rpx; padding: 0 8rpx; background: rgba(0,0,0,0.1); border-radius: 8rpx; font-size: 20rpx; }
.category-tab.active .category-count { background: rgba(255,255,255,0.25); }

/* 加载/错误/空状态 */
.loading, .error, .empty { padding: 80rpx 32rpx; text-align: center; }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.error-text { font-size: 26rpx; color: #ef4444; }
.empty-hint { display: block; font-size: 30rpx; color: #64748b; font-weight: 600; }
.empty-sub { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }

/* 勋章卡片 */
.badge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.badge-card { border-radius: 20rpx; padding: 28rpx 20rpx; border: 1rpx solid rgba(0,0,0,0.04); text-align: center; position: relative; overflow: hidden; }
.badge-card.rarity-gold { border-color: #fbbf24; box-shadow: 0 4rpx 12rpx rgba(251, 191, 36, 0.15); }
.badge-card.rarity-diamond { border-color: #93c5fd; box-shadow: 0 4rpx 16rpx rgba(147, 197, 253, 0.25); }
.badge-card.exchanged { opacity: 0.55; filter: grayscale(0.6); }
.badge-icon { display: block; font-size: 64rpx; margin-bottom: 12rpx; }
.badge-name { display: block; font-size: 28rpx; font-weight: 700; color: #0f172a; }
.badge-desc { display: block; font-size: 22rpx; color: #475569; margin-top: 8rpx; line-height: 1.5; min-height: 60rpx; }
.badge-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; padding-top: 12rpx; border-top: 1rpx solid rgba(0,0,0,0.05); }
.badge-rarity { font-size: 22rpx; font-weight: 700; }
.badge-date { font-size: 20rpx; color: #94a3b8; }
.badge-exchanged-tag, .badge-hidden-tag { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx; }
.badge-exchanged-tag { background: #f1f5f9; color: #94a3b8; }
.badge-hidden-tag { background: #fef3c7; color: #b45309; }

.exchange-btn { margin-top: 14rpx; padding: 12rpx 0; background: linear-gradient(135deg, #f59e0b, #ea580c); border-radius: 12rpx; text-align: center; }
.exchange-btn.exchanged { background: linear-gradient(135deg, #94a3b8, #64748b); }
.exchange-btn-text { font-size: 24rpx; color: #fff; font-weight: 700; }
</style>
