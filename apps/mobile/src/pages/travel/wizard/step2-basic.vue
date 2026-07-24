<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { saveDraft, type WizardDraft } from '@/utils/wizard-state'
import type { ChildProfileInput } from '@/utils/travel-api'
import { track, TRACK } from '@/utils/analytics'

const LIKE_OPTIONS = ['动物', '车辆', '恐龙', '海洋', '公主', '太空', '绘本', '音乐', '运动']
const ACTIVITY_OPTIONS = ['户外', '室内', '表演', '互动', '静态参观']
const DISLIKE_OPTIONS = ['黑暗', '高处', '噪音', '陌生动物', '排队']

// S-1: 从主站 auth-service 拉真实孩子列表（SSoT = grandand.com）
interface AuthChild {
  id: string
  nickname: string
  gender?: string | null
  birthday?: string | null
  avatar?: string | null
}
const children = ref<AuthChild[]>([])
const selectedChildId = ref<string>('')
const loadingChildren = ref(true)

async function fetchChildren() {
  try {
    const res = await uni.request({
      url: 'https://grandand.com/api/user/children',
      method: 'GET',
      header: {
        Authorization: `Bearer ${uni.getStorageSync('grandkidsgo_token') ?? ''}`,
      },
    })
    const data = res.data as any
    if (data?.code === 'OK' && Array.isArray(data.data)) {
      children.value = data.data
    }
  } catch (e) {
    console.error('[wizard] fetchChildren failed', e)
  } finally {
    loadingChildren.value = false
  }
}

onMounted(() => {
  fetchChildren()
})

// 扩展字段（仅 travel-guide 本地维护）
const ageMonths = ref<number>(36)
const needNap = ref<'required' | 'optional' | 'none'>('optional')
const earlyOrLate = ref<'early_bird' | 'night_owl'>('early_bird')
const hasMotionSickness = ref(false)
const likes = ref<string[]>([])
const activities = ref<string[]>([])
const dislikes = ref<string[]>([])
const allergiesText = ref('')

function toggle(list: { value: string[] }, item: string) {
  const i = list.value.indexOf(item)
  if (i === -1) list.value.push(item)
  else list.value.splice(i, 1)
}

function isSelected(list: { value: string[] }, item: string): boolean {
  return list.value.includes(item)
}

function birthDateFromMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function goCreateChild() {
  // 无孩子时引导去主站建
  uni.showModal({
    title: '先去主站建孩子档案',
    content: '走天下的孩子档案与主站共享。先去 grandand.com 建一个，再回来选。',
    confirmText: '去主站',
    success: (r) => {
      if (r.confirm) {
        // #ifdef H5
        window.location.href = 'https://grandand.com/profile'
        // #endif
        // #ifdef MP-WEIXIN
        uni.setStorageSync('grandkidsgo_redirect_after_login', '/pages/travel/wizard/step2')
        uni.switchTab({ url: '/pages/index/index' })
        // #endif
      }
    },
  })
}

function prev() { uni.navigateBack() }

function next() {
  if (!selectedChildId.value) {
    uni.showToast({ title: children.value.length ? '请选孩子' : '主站还没有孩子档案', icon: 'none' })
    return
  }
  const picked = children.value.find(c => c.id === selectedChildId.value)
  if (!picked) {
    uni.showToast({ title: '孩子数据异常', icon: 'none' })
    return
  }
  const profile: ChildProfileInput = {
    // S-1: childId 用主站真实 UUID（auth-service 命名空间）
    childId: picked.id,
    name: picked.nickname,
    birthDate: picked.birthday || birthDateFromMonths(ageMonths.value),
    likes: likes.value,
    activities: activities.value,
    dislikes: dislikes.value,
    activeHoursPerDay: needNap.value === 'required' ? 5 : needNap.value === 'optional' ? 6 : 8,
    needNap: needNap.value,
    earlyOrLate: earlyOrLate.value,
    hasMotionSickness: hasMotionSickness.value,
    allergies: allergiesText.value.split(/[,，;；\s]+/).filter(Boolean),
    isShyWithStrangers: false,
  }
  saveDraft({ childProfile: profile })
  track(TRACK.WIZARD_STEP_COMPLETED, {
    step: 2,
    childId: picked.id,
    childAgeMonths: ageMonths.value,
    likes: likes.value,
    needNap: needNap.value,
    hasMotionSickness: hasMotionSickness.value,
  })
  uni.navigateTo({ url: '/pages/travel/wizard/step3-prefs' })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">第 2 步 · 孩子画像</text>
      <text class="hero-sub">走天下的硬步骤，没画像就不出方案</text>
    </view>

    <!-- S-1: 孩子选择（从主站拉） -->
    <view class="card">
      <text class="card-title">选孩子</text>
      <view v-if="loadingChildren" class="empty-hint">加载中…</view>
      <view v-else-if="!children.length" class="empty-block">
        <text class="empty-text">主站还没有孩子档案</text>
        <button class="btn-link" @click="goCreateChild">去主站建一个 →</button>
      </view>
      <view v-else class="child-grid">
        <view
          v-for="c in children"
          :key="c.id"
          :class="['child-card', selectedChildId === c.id ? 'child-card-on' : '']"
          @click="selectedChildId = c.id"
        >
          <view class="child-avatar">
            <text v-if="!c.avatar">{{ c.nickname?.[0] ?? '宝' }}</text>
          </view>
          <text class="child-name">{{ c.nickname }}</text>
          <text v-if="c.birthday" class="child-meta">{{ c.birthday }}</text>
        </view>
      </view>
    </view>

    <!-- 扩展字段（仅 travel-guide 维护） -->
    <view class="card">
      <text class="card-title">月龄参考</text>
      <view class="form-row">
        <view class="age-row">
          <input v-model.number="ageMonths" type="number" class="form-input age-input" />
          <text class="age-hint">月（3 岁 = 36）</text>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="card-title">作息</text>
      <view class="form-row">
        <text class="form-label">是否午休</text>
        <view class="chip-row">
          <view :class="['chip', needNap === 'required' ? 'chip-on' : '']" @click="needNap = 'required'">必须午休</view>
          <view :class="['chip', needNap === 'optional' ? 'chip-on' : '']" @click="needNap = 'optional'">可午休</view>
          <view :class="['chip', needNap === 'none' ? 'chip-on' : '']" @click="needNap = 'none'">不用午休</view>
        </view>
      </view>
      <view class="form-row">
        <text class="form-label">早起/晚起</text>
        <view class="chip-row">
          <view :class="['chip', earlyOrLate === 'early_bird' ? 'chip-on' : '']" @click="earlyOrLate = 'early_bird'">早起</view>
          <view :class="['chip', earlyOrLate === 'night_owl' ? 'chip-on' : '']" @click="earlyOrLate = 'night_owl'">晚起</view>
        </view>
      </view>
      <view class="form-row">
        <text class="form-label">是否晕车</text>
        <switch :checked="hasMotionSickness" @change="(e: any) => hasMotionSickness = e.detail.value" color="#16a34a" />
      </view>
      <view class="form-row">
        <text class="form-label">过敏</text>
        <input v-model="allergiesText" placeholder="如 芒果、海鲜（逗号分隔）" class="form-input" />
      </view>
    </view>

    <view class="card">
      <text class="card-title">喜欢的题材（多选）</text>
      <view class="chip-grid">
        <view
          v-for="item in LIKE_OPTIONS"
          :key="item"
          :class="['chip', isSelected(likes, item) ? 'chip-on' : '']"
          @click="toggle(likes, item)"
        >{{ item }}</view>
      </view>
    </view>

    <view class="card">
      <text class="card-title">喜欢的活动（多选）</text>
      <view class="chip-grid">
        <view
          v-for="item in ACTIVITY_OPTIONS"
          :key="item"
          :class="['chip', isSelected(activities, item) ? 'chip-on' : '']"
          @click="toggle(activities, item)"
        >{{ item }}</view>
      </view>
    </view>

    <view class="card">
      <text class="card-title">特别讨厌（多选）</text>
      <view class="chip-grid">
        <view
          v-for="item in DISLIKE_OPTIONS"
          :key="item"
          :class="['chip', isSelected(dislikes, item) ? 'chip-on' : '']"
          @click="toggle(dislikes, item)"
        >{{ item }}</view>
      </view>
    </view>

    <view class="footer-bar">
      <button class="btn-ghost" @click="prev">上一步</button>
      <button class="btn-primary" @click="next">下一步 · 选偏好</button>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx; padding-bottom: 220rpx; }
.hero { margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #0f172a; }
.hero-sub { display: block; font-size: 24rpx; color: #64748b; margin-top: 8rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; border: 1rpx solid #e2e8f0; }
.card-title { display: block; font-size: 30rpx; font-weight: 600; color: #0f172a; margin-bottom: 20rpx; }
.empty-hint { color: #94a3b8; font-size: 26rpx; padding: 24rpx 0; }
.empty-block { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0; gap: 16rpx; }
.empty-text { color: #64748b; font-size: 28rpx; }
.btn-link { background: transparent; color: #16a34a; border: none; font-size: 28rpx; }
.child-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.child-card { width: 200rpx; padding: 20rpx 16rpx; border: 2rpx solid #e2e8f0; border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.child-card-on { border-color: #16a34a; background: #f0fdf4; }
.child-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: linear-gradient(135deg, #fbcfe8, #fde68a); display: flex; align-items: center; justify-content: center; font-size: 36rpx; font-weight: 700; color: #0f172a; }
.child-name { font-size: 28rpx; font-weight: 600; color: #0f172a; }
.child-meta { font-size: 22rpx; color: #94a3b8; }
.form-row { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #475569; margin-bottom: 12rpx; }
.form-input { background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 12rpx; padding: 18rpx 20rpx; font-size: 28rpx; }
.age-row { display: flex; align-items: center; gap: 16rpx; }
.age-input { width: 200rpx; }
.age-hint { font-size: 24rpx; color: #94a3b8; }
.chip-row { display: flex; gap: 12rpx; flex-wrap: wrap; }
.chip-grid { display: flex; gap: 12rpx; flex-wrap: wrap; }
.chip { padding: 14rpx 24rpx; background: #f1f5f9; border-radius: 32rpx; font-size: 26rpx; color: #475569; }
.chip-on { background: #dcfce7; color: #166534; font-weight: 600; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 24rpx 32rpx 32rpx; background: #fff; border-top: 1rpx solid #e2e8f0; display: flex; gap: 16rpx; }
.btn-ghost { flex: 1; background: #f1f5f9; color: #475569; border-radius: 32rpx; padding: 26rpx 0; font-size: 28rpx; font-weight: 600; border: none; }
.btn-primary { flex: 2; background: #16a34a; color: #fff; border-radius: 32rpx; padding: 26rpx 0; font-size: 28rpx; font-weight: 600; border: none; }
</style>
