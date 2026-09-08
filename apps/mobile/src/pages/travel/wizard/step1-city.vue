<script setup lang="ts">
import { ref, computed } from 'vue'
import { fetchCityOptions } from '@/utils/travel-api'
import { saveDraft, loadDraft, clearDraft, todayISO, addDaysISO } from '@/utils/wizard-state'
import { track, TRACK } from '@/utils/analytics'
import WizardProgress from '@/components/WizardProgress.vue'

const cities = ref<Array<{ id: string; name: string }>>([])
const selectedId = ref<string>('')
const keyword = ref('')
const startDate = ref<string>(todayISO())
const endDate = ref<string>(addDaysISO(todayISO(), 2))

const draft = loadDraft()
selectedId.value = draft.cityId ?? 'city-beijing'
startDate.value = draft.startDate ?? todayISO()
endDate.value = draft.endDate ?? addDaysISO(todayISO(), 2)

// 检测是否有真实草稿（不只是默认值）
const hasDraft = computed(() => {
  return Boolean(draft.cityId && draft.startDate && draft.childProfile)
})

function clearAndStart() {
  clearDraft()
  selectedId.value = 'city-beijing'
  startDate.value = todayISO()
  endDate.value = addDaysISO(todayISO(), 2)
  hasDraft.value = false
}

async function init() {
  try {
    cities.value = await fetchCityOptions()
  } catch {
    cities.value = [
      { id: 'city-beijing', name: '北京' },
      { id: 'city-shanghai', name: '上海' },
      { id: 'city-guangzhou', name: '广州' },
    ]
  }
}

function pickCity(id: string) {
  selectedId.value = id
}

function onStartDate(e: any) {
  startDate.value = e.detail.value
  if (new Date(endDate.value) < new Date(startDate.value)) {
    endDate.value = startDate.value
  }
}

function onEndDate(e: any) {
  endDate.value = e.detail.value
}

function next() {
  if (!selectedId.value) {
    uni.showToast({ title: '请选目的地', icon: 'none' })
    return
  }
  track(TRACK.WIZARD_STEP_COMPLETED, { step: 1, cityId: selectedId.value, startDate: startDate.value, endDate: endDate.value })
  saveDraft({
    cityId: selectedId.value,
    cityName: cities.value.find((c) => c.id === selectedId.value)?.name ?? '',
    startDate: startDate.value,
    endDate: endDate.value,
  })
  uni.navigateTo({ url: '/pages/travel/wizard/step2-basic' })
}

init()
defineExpose({ pickCity })
</script>

<template>
  <view class="page">
    <WizardProgress :current="1" :total="4" :steps="['选目的地', '孩子画像', '偏好', '生成方案']" />

    <!-- Draft Resume Banner -->
    <view v-if="hasDraft" class="draft-banner">
      <view class="draft-icon">📋</view>
      <view class="draft-content">
        <text class="draft-title">检测到上次的旅行计划</text>
        <text class="draft-desc">{{ draft.cityName || draft.cityId }} · {{ draft.startDate }} ~ {{ draft.endDate }}</text>
      </view>
      <text class="draft-clear" @click="clearAndStart">重新开始</text>
    </view>

    <view class="hero">
      <text class="hero-title">第 1 步 · 选目的地</text>
      <text class="hero-sub">先定个地方，再聊孩子</text>
    </view>

    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索城市（如 北京 / 上海）" class="input" />
    </view>

    <view class="section">
      <text class="section-title">三城首站</text>
      <view class="city-grid">
        <view
          v-for="c in cities.filter((c) => c.name.includes(keyword || ''))"
          :key="c.id"
          :class="['city-card', selectedId === c.id ? 'selected' : '']"
          @click="pickCity(c.id)"
        >
          <text class="city-name">{{ c.name }}</text>
          <text class="city-tag">{{ selectedId === c.id ? '已选 ✓' : '点击选择' }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">出行日期</text>
      <view class="date-row">
        <view class="date-box">
          <text class="date-label">出发</text>
          <picker mode="date" :value="startDate" @change="onStartDate" class="date-picker">
            <text class="date-value">{{ startDate }}</text>
          </picker>
        </view>
        <text class="date-arrow">→</text>
        <view class="date-box">
          <text class="date-label">返程</text>
          <picker mode="date" :value="endDate" @change="onEndDate" class="date-picker">
            <text class="date-value">{{ endDate }}</text>
          </picker>
        </view>
      </view>
    </view>

    <view class="footer-bar">
      <button class="btn-primary" @click="next">下一步 · 填画像</button>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 32rpx 28rpx; padding-bottom: 200rpx; }
.hero { margin-bottom: 24rpx; }

/* Draft Banner */
.draft-banner {
  margin: -8rpx 0 20rpx; padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16rpx; border: 1rpx solid #fcd34d;
  display: flex; align-items: center; gap: 12rpx;
}
.draft-icon { font-size: 32rpx; }
.draft-content { flex: 1; min-width: 0; }
.draft-title { font-size: 24rpx; font-weight: 600; color: #92400e; display: block; }
.draft-desc { font-size: 22rpx; color: #b45309; margin-top: 4rpx; display: block; }
.draft-clear {
  font-size: 22rpx; color: #d97706; padding: 6rpx 14rpx;
  background: white; border-radius: 12rpx;
  border: 1rpx solid #fcd34d; flex-shrink: 0;
}
.hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #0f172a; }
.hero-sub { display: block; font-size: 26rpx; color: #64748b; margin-top: 8rpx; }
.search-bar { margin-bottom: 24rpx; }
.input { background: #fff; border: 1rpx solid #e2e8f0; border-radius: 16rpx; padding: 20rpx; font-size: 28rpx; }
.section { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-title { display: block; font-size: 28rpx; font-weight: 600; color: #0f172a; margin-bottom: 20rpx; }
.city-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.city-card { width: calc((100% - 32rpx) / 3); padding: 24rpx 0; background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 16rpx; text-align: center; }
.city-card.selected { background: #16a34a; border-color: #16a34a; }
.city-name { display: block; font-size: 30rpx; font-weight: 600; color: #0f172a; }
.city-card.selected .city-name { color: #fff; }
.city-tag { display: block; font-size: 22rpx; color: #64748b; margin-top: 8rpx; }
.city-card.selected .city-tag { color: rgba(255,255,255,0.85); }
.date-row { display: flex; align-items: center; gap: 16rpx; }
.date-box { flex: 1; }
.date-label { display: block; font-size: 24rpx; color: #64748b; margin-bottom: 8rpx; }
.date-picker { background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 12rpx; padding: 20rpx; display: block; }
.date-value { font-size: 28rpx; color: #0f172a; }
.date-arrow { font-size: 32rpx; color: #94a3b8; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 24rpx 32rpx 32rpx; background: #fff; border-top: 1rpx solid #e2e8f0; }
.btn-primary { background: #16a34a; color: #fff; border-radius: 32rpx; padding: 28rpx 0; font-size: 30rpx; font-weight: 600; border: none; }
</style>
