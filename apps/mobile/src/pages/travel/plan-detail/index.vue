<script setup lang="ts">
// 计划详情页（出行中 v1.5 多维度结构化记录）
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十四节
import { ref, onMounted, computed } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'
import { track, TRACK } from '@/utils/analytics'

interface TimelineBlock {
  blockId: string
  kind: 'spot' | 'restaurant' | 'park' | 'playground' | 'hotel' | 'transit' | 'rest'
  startMinutes: number
  endMinutes: number
  title: string
  kidHook?: string
  notes?: string
  spotId?: string
  restReason?: string
}

interface TimelineDay {
  dayIndex: number
  date: string
  theme: string
  blocks: TimelineBlock[]
  kidFriendlySummary: string
}

interface PlanDetail {
  id: string
  title: string
  status: string
  cityName?: string
  startDate: string
  endDate: string
  timelineBlocks: TimelineDay[]
}

const planId = ref<string>('')
const plan = ref<PlanDetail | null>(null)
const expandedDay = ref<number>(1)
const ratingModalOpen = ref(false)
const ratingBlockId = ref<string>('')
const ratingBlockTitle = ref<string>('')

// v1.5 多维度字段
const rPhysical = ref<'满电' | '正常' | '略疲' | '累趴'>('正常')
const rEmotion = ref<'兴奋' | '平静' | '无聊' | '烦躁' | '哭闹'>('兴奋')
const rStay = ref<number | null>(null)
const rReturn = ref<'要求再来' | '可再来' | '不愿再来'>('要求再来')
const rCryingMin = ref<number>(0)
const savingRating = ref(false)

function authHeaders(): Record<string, string> {
  const token = uni.getStorageSync('grandkidsgo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadPlan(id: string) {
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/plans/${id}`,
      method: 'GET',
      header: authHeaders(),
    })
    const d = res.data as any
    if (d?.error) {
      uni.showToast({ title: d.error.message ?? '加载失败', icon: 'none' })
      return
    }
    plan.value = d as PlanDetail
  } catch (e) {
    plan.value = {
      id,
      title: '本地草稿计划',
      status: 'draft',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      timelineBlocks: [],
    }
  }
}

onMounted(() => {
  const pages = getCurrentPages() as any[]
  const cur = pages[pages.length - 1]
  const opt = cur?.options ?? {}
  planId.value = opt.id ?? ''
  if (planId.value) loadPlan(planId.value)
})

function fmtTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`
}

function openRating(block: TimelineBlock) {
  ratingBlockId.value = block.blockId
  ratingBlockTitle.value = block.title
  rStay.value = null
  rCryingMin.value = 0
  ratingModalOpen.value = true
}

async function submitRating() {
  if (!plan.value) return
  savingRating.value = true
  try {
    const cryEpisodes = rCryingMin.value > 0
      ? [{ start: new Date().toISOString(), durationMin: rCryingMin.value }]
      : []
    const ratingPayload = {
      spotId: ratingBlockId.value,
      childId: 'self',
      physicalState: rPhysical.value,
      emotionalPeak: rEmotion.value,
      stayDurationMinutes: rStay.value ?? 0,
      willingnessToReturn: rReturn.value,
      cryEpisodes,
      childAgeAtVisit: null,
      linkedMediaIds: [],
    }
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/plans/${plan.value.id}/ratings`,
      method: 'POST',
      header: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: ratingPayload,
    })
    const d = res.data as any
    if (d?.error) {
      uni.showToast({ title: d.error.message ?? '提交失败', icon: 'none' })
    } else {
      track(TRACK.PLAN_RATING_CREATED, {
        planId: plan.value.id,
        spotId: ratingBlockId.value,
        physicalState: rPhysical.value,
        emotionalPeak: rEmotion.value,
        stayDurationMinutes: rStay.value,
        willingnessToReturn: rReturn.value,
      })
      uni.showToast({ title: '已记录孩子感受', icon: 'success' })
      ratingModalOpen.value = false
    }
  } catch {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    savingRating.value = false
  }
}

const phaseLabel = computed(() => {
  if (!plan.value) return ''
  if (plan.value.status === 'active') return '出行中'
  if (plan.value.status === 'completed') return '已完成'
  return '未出发'
})
</script>

<template>
  <view class="page">
    <view v-if="!plan" class="loading">
      <view class="spinner"></view>
      <text class="loading-text">加载计划…</text>
    </view>

    <template v-else>
      <view class="hero">
        <text class="hero-title">{{ plan.title }}</text>
        <text class="hero-meta">{{ phaseLabel }} · {{ plan.startDate }} ~ {{ plan.endDate }}</text>
      </view>

      <view class="hint">
        <text class="hint-text">v1.5 孩子真实感受时间线：刚结束时间块，点对应块记一笔。</text>
      </view>

      <view
        v-for="day in plan.timelineBlocks ?? []"
        :key="day.dayIndex"
        class="day-card"
      >
        <view class="day-head" @click="expandedDay === day.dayIndex ? (expandedDay = -1) : (expandedDay = day.dayIndex)">
          <text class="day-title">Day {{ day.dayIndex }}</text>
          <text class="day-date">{{ day.date }}</text>
        </view>
        <view v-if="expandedDay === day.dayIndex" class="day-body">
          <text class="day-theme">{{ day.theme }}</text>
          <text class="day-summary">{{ day.kidFriendlySummary }}</text>
          <view
            v-for="b in day.blocks"
            :key="b.blockId"
            :class="['block-row', b.kind === 'rest' ? 'block-rest' : '']"
            @click="b.kind === 'spot' && openRating(b)"
          >
            <view class="block-time">
              <text class="block-time-val">{{ fmtTime(b.startMinutes) }} - {{ fmtTime(b.endMinutes) }}</text>
            </view>
            <view class="block-main">
              <text class="block-title">{{ b.title }}</text>
              <text v-if="b.kidHook" class="block-kidhook">{{ b.kidHook }}</text>
            </view>
            <view class="block-action">
              <text v-if="b.kind === 'spot'" class="block-action-text">记感受</text>
              <text v-else-if="b.kind === 'rest'" class="block-action-text rest">休息</text>
            </view>
          </view>
        </view>
      </view>

      <view class="footer-note">
        <text class="footer-note-text">完成出行后，点这里发布攻略，AI 会按孩子状态写（v1.5 第十五节）</text>
        <button class="btn-primary" @click="uni.showToast({ title: '发布攻略路由待 #15 上线', icon: 'none' })">发布攻略</button>
      </view>
    </template>

    <!-- v1.5 多维度结构化评分 modal -->
    <view v-if="ratingModalOpen" class="modal-mask" @click="ratingModalOpen = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">记一笔 · {{ ratingBlockTitle }}</text>

        <view class="modal-section">
          <text class="modal-label">体力状态</text>
          <view class="chip-row">
            <view :class="['chip', rPhysical === '满电' ? 'chip-on' : '']" @click="rPhysical = '满电'">满电</view>
            <view :class="['chip', rPhysical === '正常' ? 'chip-on' : '']" @click="rPhysical = '正常'">正常</view>
            <view :class="['chip', rPhysical === '略疲' ? 'chip-on' : '']" @click="rPhysical = '略疲'">略疲</view>
            <view :class="['chip', rPhysical === '累趴' ? 'chip-on' : '']" @click="rPhysical = '累趴'">累趴</view>
          </view>
        </view>

        <view class="modal-section">
          <text class="modal-label">情绪高点</text>
          <view class="chip-row">
            <view :class="['chip', rEmotion === '兴奋' ? 'chip-on' : '']" @click="rEmotion = '兴奋'">兴奋</view>
            <view :class="['chip', rEmotion === '平静' ? 'chip-on' : '']" @click="rEmotion = '平静'">平静</view>
            <view :class="['chip', rEmotion === '无聊' ? 'chip-on' : '']" @click="rEmotion = '无聊'">无聊</view>
            <view :class="['chip', rEmotion === '烦躁' ? 'chip-on' : '']" @click="rEmotion = '烦躁'">烦躁</view>
            <view :class="['chip', rEmotion === '哭闹' ? 'chip-on' : '']" @click="rEmotion = '哭闹'">哭闹</view>
          </view>
        </view>

        <view class="modal-section">
          <text class="modal-label">实际停留（分钟）</text>
          <input v-model.number="rStay" type="number" placeholder="如 50" class="modal-input" />
        </view>

        <view class="modal-section">
          <text class="modal-label">再来意愿</text>
          <view class="chip-row">
            <view :class="['chip', rReturn === '要求再来' ? 'chip-on' : '']" @click="rReturn = '要求再来'">要求再来</view>
            <view :class="['chip', rReturn === '可再来' ? 'chip-on' : '']" @click="rReturn = '可再来'">可再来</view>
            <view :class="['chip', rReturn === '不愿再来' ? 'chip-on' : '']" @click="rReturn = '不愿再来'">不愿再来</view>
          </view>
        </view>

        <view class="modal-section">
          <text class="modal-label">哭闹（分钟，0 跳过）</text>
          <input v-model.number="rCryingMin" type="number" class="modal-input" />
        </view>

        <view class="modal-actions">
          <button class="btn-ghost" @click="ratingModalOpen = false">取消</button>
          <button class="btn-primary" :disabled="savingRating" @click="submitRating">{{ savingRating ? '提交中…' : '保存' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx; padding-bottom: 240rpx; min-height: 100%; }
.loading { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 200rpx 0; }
.spinner { width: 56rpx; height: 56rpx; border: 4rpx solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.hero { margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #0f172a; }
.hero-meta { display: block; font-size: 24rpx; color: #64748b; margin-top: 8rpx; }
.hint { background: #fef9c3; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 24rpx; }
.hint-text { font-size: 24rpx; color: #854d0e; line-height: 1.6; }
.day-card { background: #fff; border-radius: 20rpx; margin-bottom: 16rpx; border: 1rpx solid #e2e8f0; overflow: hidden; }
.day-head { display: flex; justify-content: space-between; align-items: center; padding: 28rpx; background: #f8fafc; }
.day-title { font-size: 30rpx; font-weight: 700; color: #16a34a; }
.day-date { font-size: 24rpx; color: #94a3b8; }
.day-body { padding: 24rpx 28rpx; }
.day-theme { display: block; font-size: 26rpx; color: #0f172a; font-weight: 600; margin-bottom: 8rpx; }
.day-summary { display: block; font-size: 22rpx; color: #94a3b8; margin-bottom: 16rpx; }
.block-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; border-bottom: 1rpx dashed #e2e8f0; }
.block-row:last-child { border-bottom: none; }
.block-row.block-rest { opacity: 0.75; }
.block-time { width: 200rpx; }
.block-time-val { font-size: 24rpx; color: #16a34a; font-weight: 600; }
.block-main { flex: 1; }
.block-title { display: block; font-size: 28rpx; color: #0f172a; font-weight: 500; }
.block-kidhook { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }
.block-action { width: 100rpx; text-align: right; }
.block-action-text { font-size: 24rpx; color: #16a34a; font-weight: 600; }
.block-action-text.rest { color: #94a3b8; font-weight: 400; }
.footer-note { background: #fff; border-radius: 20rpx; padding: 32rpx; text-align: center; border: 1rpx solid #e2e8f0; }
.footer-note-text { display: block; font-size: 24rpx; color: #64748b; margin-bottom: 20rpx; }
.btn-primary { background: #16a34a; color: #fff; border-radius: 32rpx; padding: 24rpx 0; font-size: 28rpx; font-weight: 600; border: none; width: 100%; }
.btn-ghost { flex: 1; background: #f1f5f9; color: #475569; border-radius: 32rpx; padding: 24rpx 0; font-size: 28rpx; font-weight: 600; border: none; }

.modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
.modal-card { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 48rpx; max-height: 80vh; overflow-y: auto; }
.modal-title { display: block; font-size: 32rpx; font-weight: 700; color: #0f172a; margin-bottom: 28rpx; }
.modal-section { margin-bottom: 24rpx; }
.modal-label { display: block; font-size: 26rpx; color: #475569; margin-bottom: 12rpx; }
.modal-input { background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 12rpx; padding: 18rpx 20rpx; font-size: 28rpx; width: 100%; }
.chip-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { padding: 14rpx 24rpx; background: #f1f5f9; border-radius: 32rpx; font-size: 26rpx; color: #475569; }
.chip-on { background: #dcfce7; color: #166534; font-weight: 600; }
.modal-actions { display: flex; gap: 16rpx; margin-top: 32rpx; }
.modal-actions .btn-primary { flex: 2; }
</style>
