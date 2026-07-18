<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { buildFinalParams, loadDraft, clearDraft } from '@/utils/wizard-state'
import {
  assembleOutline,
  createPlanRecord,
  type CandidateOutline,
} from '@/utils/travel-api'
import { track, TRACK } from '@/utils/analytics'

const loading = ref(true)
const errorMsg = ref('')
const draft = ref(loadDraft())
const candidates = ref<CandidateOutline[]>([])
const selectedIdx = ref<number>(0)
const userId = ref<string>('')

onMounted(async () => {
  try {
    const token = uni.getStorageSync('grandkidsgo_user')
    userId.value = (token as any)?.id ?? 'anonymous'
  } catch { /* ignore */ }

  try {
    const params = buildFinalParams(draft.value, userId.value)
    if (!params) {
      errorMsg.value = '草稿缺失：城市 / 日期 / 画像'
      loading.value = false
      return
    }
    const res = await assembleOutline(params)
    candidates.value = res.candidates ?? []
    if (candidates.value.length === 0) {
      errorMsg.value = '当前城市暂无可拼装数据，请稍后再试'
    }
  } catch (e: any) {
    errorMsg.value = e?.message ?? '拼装失败'
  } finally {
    loading.value = false
  }
})

function fmtCost(cents: number): string {
  return `¥${Math.round(cents / 100)}`
}

function fmtTimeRange(start: number, end: number): string {
  const s = `${Math.floor(start / 60).toString().padStart(2, '0')}:${(start % 60).toString().padStart(2, '0')}`
  const e = `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`
  return `${s} - ${e}`
}

function pickIdx(i: number) { selectedIdx.value = i }

async function confirm() {
  const choice = candidates.value[selectedIdx.value]
  if (!choice) {
    uni.showToast({ title: '请先选一档', icon: 'none' })
    return
  }
  try {
    const params = buildFinalParams(draft.value, userId.value)
    if (!params) throw new Error('草稿缺失')

    const childAgesMonths = (() => {
      const bd = draft.value.childProfile?.birthDate
      if (!bd) return []
      const m = Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      return [Math.max(0, m)]
    })()

    const result = await createPlanRecord({
      userId: params.userId,
      cityId: params.cityId,
      startDate: params.startDate,
      endDate: params.endDate,
      travelers: params.travelers,
      childAges: childAgesMonths,
      travelStyle: choice.style,
      status: 'confirmed',
      title: `${draft.value.cityName ?? '行程'} · ${choice.label} · ${params.startDate}`,
      timelineBlocks: choice.days,
      candidateLabel: choice.label,
    })
    if (!result.id) throw new Error('计划创建为空')
    clearDraft()
    track(TRACK.WIZARD_COMPLETED, {
      style: choice.style,
      rhythm: choice.rhythm,
      days: choice.totalDays,
      cityId: params.cityId,
      planId: result.id,
    })
    track(TRACK.PLAN_CREATED, {
      planId: result.id,
      cityId: params.cityId,
      style: choice.style,
      totalCostCents: choice.totalCostCents,
      totalDays: choice.totalDays,
    })
    uni.showToast({ title: '计划已生成', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/travel/plan-detail/index?id=${result.id}`,
      })
    }, 800)
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '计划创建失败', icon: 'none' })
  }
}

function back() {
  uni.redirectTo({ url: '/pages/travel/wizard/step1-city' })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">已生成 3 档候选</text>
      <text class="hero-sub">"省时/省钱/舒服"是维度差异，点开看每档的"为什么这么排"</text>
    </view>

    <view v-if="loading" class="status">
      <view class="loading-spinner"></view>
      <text class="status-text">引擎 A 拼装中…</text>
    </view>

    <view v-else-if="errorMsg" class="status">
      <text class="status-text">{{ errorMsg }}</text>
      <button class="btn-ghost" @click="back">返回上一步</button>
    </view>

    <view v-else>
      <view
        v-for="(c, idx) in candidates"
        :key="idx"
        :class="['candidate', selectedIdx === idx ? 'selected' : '']"
        @click="pickIdx(idx)"
      >
        <view class="candidate-head">
          <text class="candidate-label">{{ c.label }}</text>
          <view class="candidate-radio">
            <view v-if="selectedIdx === idx" class="candidate-radio-on"></view>
          </view>
        </view>
        <text class="candidate-why">{{ c.whyThisPlan }}</text>
        <view class="candidate-meta">
          <text class="meta-item">{{ c.totalDays }} 天</text>
          <text class="meta-divider">·</text>
          <text class="meta-item">{{ fmtCost(c.totalCostCents) }} 总</text>
          <text class="meta-divider">·</text>
          <text class="meta-item">每天 {{ c.totalActiveHours }}h</text>
        </view>
        <view v-if="selectedIdx === idx" class="candidate-day">
          <view v-for="day in c.days" :key="day.dayIndex" class="day-row">
            <text class="day-title">Day {{ day.dayIndex }}</text>
            <text class="day-sum">{{ day.kidFriendlySummary }}</text>
            <view class="day-blocks">
              <view
                v-for="b in day.blocks"
                :key="b.blockId"
                class="block-row"
              >
                <text class="block-time">{{ fmtTimeRange(b.startMinutes, b.endMinutes) }}</text>
                <text class="block-title">{{ b.title }}</text>
                <text v-if="b.scoreDetail" class="block-score">
                  综合 {{ Math.round(b.scoreDetail.composite * 100) }}%
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="footer-bar">
        <button class="btn-ghost" @click="back">回头调整</button>
        <button class="btn-primary" @click="confirm">采纳这档，生成我的计划</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx; padding-bottom: 220rpx; }
.hero { margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #0f172a; }
.hero-sub { display: block; font-size: 24rpx; color: #64748b; margin-top: 8rpx; }
.status { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 120rpx 0; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 6rpx solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.status-text { font-size: 28rpx; color: #94a3b8; }
.candidate { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; border: 2rpx solid #e2e8f0; }
.candidate.selected { border-color: #16a34a; background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); }
.candidate-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.candidate-label { font-size: 34rpx; font-weight: 700; color: #0f172a; }
.candidate-radio { width: 40rpx; height: 40rpx; border: 2rpx solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.candidate.selected .candidate-radio { border-color: #16a34a; }
.candidate-radio-on { width: 20rpx; height: 20rpx; border-radius: 50%; background: #16a34a; }
.candidate-why { display: block; font-size: 26rpx; color: #475569; line-height: 1.6; margin-bottom: 16rpx; }
.candidate-meta { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: #94a3b8; }
.meta-divider { color: #cbd5e1; }
.candidate-day { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx dashed #e2e8f0; }
.day-row { margin-bottom: 20rpx; }
.day-title { display: block; font-size: 28rpx; font-weight: 600; color: #16a34a; }
.day-sum { display: block; font-size: 22rpx; color: #94a3b8; margin: 4rpx 0 12rpx; }
.day-blocks { background: #f8fafc; border-radius: 12rpx; padding: 12rpx; }
.block-row { display: flex; align-items: center; gap: 12rpx; padding: 8rpx 0; }
.block-time { font-size: 22rpx; color: #16a34a; font-weight: 600; min-width: 140rpx; }
.block-title { flex: 1; font-size: 26rpx; color: #0f172a; }
.block-score { font-size: 22rpx; color: #94a3b8; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 24rpx 32rpx 32rpx; background: #fff; border-top: 1rpx solid #e2e8f0; display: flex; gap: 16rpx; }
.btn-ghost { flex: 1; background: #f1f5f9; color: #475569; border-radius: 32rpx; padding: 26rpx 0; font-size: 28rpx; font-weight: 600; border: none; }
.btn-primary { flex: 2; background: #16a34a; color: #fff; border-radius: 32rpx; padding: 26rpx 0; font-size: 28rpx; font-weight: 600; border: none; }
</style>
