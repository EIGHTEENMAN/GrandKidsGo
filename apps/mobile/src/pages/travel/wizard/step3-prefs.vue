<script setup lang="ts">
import { ref } from 'vue'
import { saveDraft } from '@/utils/wizard-state'
import { track, TRACK } from '@/utils/analytics'

const SPOT_TYPES = [
  { key: 'museum', label: '博物馆', emoji: '🏛️' },
  { key: 'zoo', label: '动物园', emoji: '🦒' },
  { key: 'aquarium', label: '海洋馆', emoji: '🐳' },
  { key: 'science', label: '科技馆', emoji: '🔬' },
  { key: 'park', label: '公园', emoji: '🌳' },
  { key: 'playground', label: '游乐场', emoji: '🎢' },
  { key: 'nature', label: '自然', emoji: '🏞️' },
  { key: 'history', label: '人文古迹', emoji: '🏯' },
]

const SPOT_TYPE_KEYS = SPOT_TYPES.map((s) => s.key)

const budget = ref<'economy' | 'balanced' | 'premium'>('balanced')
const types = ref<string[]>([])

const adults = ref<number>(2)
const children = ref<number>(1)

function toggleBudget(level: 'economy' | 'balanced' | 'premium') {
  budget.value = level
}

function toggleType(key: string) {
  const i = types.value.indexOf(key)
  if (i === -1) types.value.push(key)
  else types.value.splice(i, 1)
}

function isOn(key: string): boolean { return types.value.includes(key) }

function prev() { uni.navigateBack() }

function submit() {
  saveDraft({
    budgetLevel: budget.value,
    preferredSpotTypes: types.value,
    travelers: { adults: adults.value, children: children.value },
  })
  track(TRACK.WIZARD_STEP_COMPLETED, {
    step: 3,
    budgetLevel: budget.value,
    preferredSpotTypes: types.value,
    adults: adults.value,
    children: children.value,
  })
  uni.navigateTo({ url: '/pages/travel/wizard/confirm-outline' })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">第 3 步 · 你的偏好</text>
      <text class="hero-sub">三档候选就在这步里出</text>
    </view>

    <view class="card">
      <text class="card-title">家庭人数</text>
      <view class="people-row">
        <view class="people-col">
          <text class="people-label">大人</text>
          <view class="stepper">
            <view class="stepper-btn" @click="adults > 1 && (adults -= 1)">−</view>
            <text class="stepper-val">{{ adults }}</text>
            <view class="stepper-btn" @click="adults < 6 && (adults += 1)">+</view>
          </view>
        </view>
        <view class="people-col">
          <text class="people-label">小孩</text>
          <view class="stepper">
            <view class="stepper-btn" @click="children > 0 && (children -= 1)">−</view>
            <text class="stepper-val">{{ children }}</text>
            <view class="stepper-btn" @click="children < 4 && (children += 1)">+</view>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="card-title">景点类型（多选）</text>
      <view class="type-grid">
        <view
          v-for="t in SPOT_TYPES"
          :key="t.key"
          :class="['type-card', isOn(t.key) ? 'type-on' : '']"
          @click="toggleType(t.key)"
        >
          <text class="type-emoji">{{ t.emoji }}</text>
          <text class="type-label">{{ t.label }}</text>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="card-title">预算维度</text>
      <text class="card-tip">决定三档候选："省钱 / 平衡 / 舒服" 各自的成本敏感度</text>
      <view class="budget-row">
        <view
          :class="['budget-card', budget === 'economy' ? 'budget-on' : '']"
          @click="toggleBudget('economy')"
        >
          <text class="budget-title">省钱</text>
          <text class="budget-sub">公共交通 + 平价</text>
        </view>
        <view
          :class="['budget-card', budget === 'balanced' ? 'budget-on' : '']"
          @click="toggleBudget('balanced')"
        >
          <text class="budget-title">平衡</text>
          <text class="budget-sub">均衡花销</text>
        </view>
        <view
          :class="['budget-card', budget === 'premium' ? 'budget-on' : '']"
          @click="toggleBudget('premium')"
        >
          <text class="budget-title">舒服</text>
          <text class="budget-sub">舒适优先</text>
        </view>
      </view>
    </view>

    <view class="footer-bar">
      <button class="btn-ghost" @click="prev">上一步</button>
      <button class="btn-primary" @click="submit">生成三档候选</button>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx; padding-bottom: 220rpx; }
.hero { margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #0f172a; }
.hero-sub { display: block; font-size: 24rpx; color: #64748b; margin-top: 8rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; border: 1rpx solid #e2e8f0; }
.card-title { display: block; font-size: 30rpx; font-weight: 600; color: #0f172a; margin-bottom: 12rpx; }
.card-tip { display: block; font-size: 24rpx; color: #94a3b8; margin-bottom: 20rpx; }
.people-row { display: flex; gap: 24rpx; }
.people-col { flex: 1; }
.people-label { display: block; font-size: 26rpx; color: #475569; margin-bottom: 12rpx; }
.stepper { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border-radius: 32rpx; padding: 12rpx 24rpx; }
.stepper-btn { width: 60rpx; height: 60rpx; line-height: 60rpx; text-align: center; background: #fff; border-radius: 50%; font-size: 36rpx; color: #16a34a; font-weight: 700; border: 1rpx solid #e2e8f0; }
.stepper-val { font-size: 36rpx; font-weight: 600; color: #0f172a; }
.type-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12rpx; }
.type-card { background: #f1f5f9; border-radius: 16rpx; padding: 18rpx 0; text-align: center; border: 1rpx solid #e2e8f0; }
.type-on { background: #dcfce7; border-color: #16a34a; }
.type-emoji { display: block; font-size: 40rpx; }
.type-label { display: block; font-size: 22rpx; color: #475569; margin-top: 4rpx; }
.type-on .type-label { color: #166534; font-weight: 600; }
.budget-row { display: flex; gap: 12rpx; }
.budget-card { flex: 1; padding: 24rpx 8rpx; background: #f1f5f9; border-radius: 16rpx; text-align: center; border: 1rpx solid #e2e8f0; }
.budget-on { background: #dcfce7; border-color: #16a34a; }
.budget-title { display: block; font-size: 30rpx; font-weight: 600; color: #0f172a; }
.budget-on .budget-title { color: #166534; }
.budget-sub { display: block; font-size: 20rpx; color: #64748b; margin-top: 6rpx; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 24rpx 32rpx 32rpx; background: #fff; border-top: 1rpx solid #e2e8f0; display: flex; gap: 16rpx; }
.btn-ghost { flex: 1; background: #f1f5f9; color: #475569; border-radius: 32rpx; padding: 26rpx 0; font-size: 28rpx; font-weight: 600; border: none; }
.btn-primary { flex: 2; background: #16a34a; color: #fff; border-radius: 32rpx; padding: 26rpx 0; font-size: 28rpx; font-weight: 600; border: none; }
</style>
