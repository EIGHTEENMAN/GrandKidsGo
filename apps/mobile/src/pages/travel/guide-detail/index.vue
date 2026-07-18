<script setup lang="ts">
// 攻略详情页（mobile）
// 详见 项目建设方案/走天下实施方案-v1.5.md 第十三节第六条 + 第四节细节（四件套：kidHook/花费清单/时间线含午休/避坑三条）

import { ref, onMounted } from 'vue'
import { TRAVEL_API_BASE } from '@/utils/travel-api'
import {
  shareToWeixinFriend,
  shareToWeixinTimeline,
  shareToXiaohongshu,
} from '@/utils/share'
import { track, TRACK } from '@/utils/analytics'

interface GuideDetail {
  id: string
  title: string
  coverImages: string[]
  contentHtml: string
  city?: { id: string; name: string }
  days: number | null
  childAges: number[]
  tags: string[]
  stats: { view: number; save: number; like: number }
  publishedAt: string | null
  author: { id: string | null; nickname: string; avatar: string | null }
  sourcePlan: any
}

const guide = ref<GuideDetail | null>(null)
const guideId = ref<string>('')
const loaded = ref(false)
const errMsg = ref<string>('')
const isSaved = ref(false)
const isLiked = ref(false)

function authHeaders(): Record<string, string> {
  const token = uni.getStorageSync('grandkidsgo_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadGuide(id: string) {
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/guides/${id}`,
      method: 'GET',
      header: authHeaders(),
    })
    const d = res.data as any
    if (d?.error) {
      errMsg.value = d.error.message ?? '加载失败'
      return
    }
    guide.value = d as GuideDetail
    track(TRACK.GUIDE_DETAIL_VIEWED, {
      guideId: id,
      author: d.author?.nickname,
      days: d.days,
      cityId: d.city?.id,
    })
  } catch {
    errMsg.value = '网络错误'
  } finally {
    loaded.value = true
  }
}

onMounted(() => {
  const pages = getCurrentPages() as any[]
  const cur = pages[pages.length - 1]
  const opt = cur?.options ?? {}
  guideId.value = opt.id ?? ''
  if (guideId.value) loadGuide(guideId.value)
})

async function toggleSave() {
  if (!guide.value) return
  track(TRACK.GUIDE_SAVE_CLICKED, { guideId: guide.value.id, currentState: isSaved.value })
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/guides/${guide.value.id}/save`,
      method: 'POST',
      header: authHeaders(),
    })
    const d = res.data as any
    if (d?.isSaved !== undefined) {
      isSaved.value = d.isSaved
      track(TRACK.GUIDE_SAVE_STATE_CHANGED, {
        guideId: guide.value.id,
        newState: d.isSaved,
      })
      uni.showToast({ title: d.isSaved ? '已收藏' : '已取消收藏', icon: 'none' })
    } else {
      uni.showToast({ title: '请先登录', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function toggleLike() {
  if (!guide.value) return
  track(TRACK.GUIDE_LIKE_CLICKED, { guideId: guide.value.id, currentState: isLiked.value })
  try {
    const res = await uni.request({
      url: `${TRAVEL_API_BASE.value}/api/guides/${guide.value.id}/like`,
      method: 'POST',
      header: authHeaders(),
    })
    const d = res.data as any
    if (d?.isLiked !== undefined) {
      isLiked.value = d.isLiked
      track(TRACK.GUIDE_LIKE_STATE_CHANGED, {
        guideId: guide.value.id,
        newState: d.isLiked,
      })
      uni.showToast({ title: d.isLiked ? '已点赞' : '已取消', icon: 'none' })
    } else {
      uni.showToast({ title: '请先登录', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function oneClickFork() {
  if (!guide.value) return
  uni.showLoading({ title: '生成我的版本…' })
  const src = guide.value.sourcePlan
  const cityId = src?.cityId ?? guide.value.city?.id ?? ''
  const childAges = src?.childAges ?? guide.value.childAges ?? []
  setTimeout(() => {
    uni.hideLoading()
    uni.redirectTo({
      url: `/pages/travel/wizard/step1-city?from_guide=${guide.value!.id}`,
    })
  }, 600)
}

const shareSheetOpen = ref(false)
function buildSharePayload() {
  if (!guide.value) return null
  return {
    title: guide.value.title,
    desc: `${guide.value.city?.name ?? '走天下'} · ${guide.value.days ?? 0} 天 · ${guide.value.tags.join(' / ') || '亲子攻略'}`,
    link: `https://travel.grandand.com/guides/${guide.value.id}`,
    imageUrl: guide.value.coverImages?.[0],
  }
}

function onShareClick() {
  if (!buildSharePayload()) return
  shareSheetOpen.value = true
}

async function doShare(target: 'wx' | 'timeline' | 'xhs') {
  const p = buildSharePayload()
  if (!p || !guide.value) return
  shareSheetOpen.value = false
  track(TRACK.GUIDE_SHARE_EXTERNAL_CLICKED, {
    guideId: guide.value.id,
    target,
  })
  let success = false
  if (target === 'wx') success = await shareToWeixinFriend(p)
  if (target === 'timeline') success = await shareToWeixinTimeline(p)
  if (target === 'xhs') success = await shareToXiaohongshu(p)
  if (success) {
    track(TRACK.GUIDE_SHARE_EXTERNAL_COMPLETED, {
      guideId: guide.value.id,
      target,
    })
  }
}
</script>

<template>
  <view class="page">
    <view v-if="!loaded" class="loading">
      <view class="spinner"></view>
      <text class="loading-text">加载攻略…</text>
    </view>
    <view v-else-if="errMsg" class="error">
      <text class="error-text">{{ errMsg }}</text>
    </view>
    <template v-else-if="guide">
      <view class="cover-area">
        <view class="cover-share" @click="onShareClick">
          <text class="cover-share-text">↗ 分享</text>
        </view>
        <view class="cover-placeholder">
          <text class="cover-emoji">🗺️</text>
          <text class="cover-dest">{{ guide.city?.name }}</text>
          <text v-if="guide.days" class="cover-days">{{ guide.days }} 天</text>
        </view>
      </view>

      <view class="body">
        <text class="guide-title">{{ guide.title }}</text>
        <view class="author-row">
          <view class="author-avatar"><text class="avatar-text">{{ guide.author.nickname.charAt(0) }}</text></view>
          <text class="author-name">{{ guide.author.nickname }}</text>
          <text v-if="guide.publishedAt" class="publish-date">{{ guide.publishedAt.slice(0, 10) }}</text>
        </view>

        <view class="tags-row" v-if="guide.tags.length > 0">
          <view v-for="t in guide.tags" :key="t" class="tag">
            <text class="tag-text">#{{ t }}</text>
          </view>
        </view>

        <view class="stats-row">
          <text class="stat-item">👁 {{ guide.stats.view }}</text>
          <text class="stat-item">⭐ {{ guide.stats.save }}</text>
          <text class="stat-item">👍 {{ guide.stats.like }}</text>
        </view>

        <view class="content">
          <rich-text :nodes="guide.contentHtml" />
        </view>

        <view class="cta-spacer"></view>
      </view>

      <view class="action-bar">
        <view class="action-btn" @click="toggleSave">
          <text :class="['action-text', isSaved ? 'action-active' : '']">{{ isSaved ? '✓ 已收藏' : '☆ 收藏' }}</text>
        </view>
        <view class="action-btn" @click="toggleLike">
          <text :class="['action-text', isLiked ? 'action-active' : '']">{{ isLiked ? '♥ 已赞' : '♡ 点赞' }}</text>
        </view>
        <view class="action-btn action-fork" @click="oneClickFork">
          <text class="action-fork-text">一键生成我的版本</text>
        </view>
      </view>
    </template>

    <!-- 分享 sheet -->
    <view v-if="shareSheetOpen" class="share-mask" @click="shareSheetOpen = false">
      <view class="share-sheet" @click.stop>
        <text class="share-title">分享到</text>
        <view class="share-row">
          <view class="share-cell" @click="doShare('wx')">
            <text class="share-cell-icon">💬</text>
            <text class="share-cell-label">微信好友</text>
          </view>
          <view class="share-cell" @click="doShare('timeline')">
            <text class="share-cell-icon">📱</text>
            <text class="share-cell-label">朋友圈</text>
          </view>
          <view class="share-cell" @click="doShare('xhs')">
            <text class="share-cell-icon">📕</text>
            <text class="share-cell-label">小红书</text>
          </view>
        </view>
        <view class="share-cancel" @click="shareSheetOpen = false">
          <text class="share-cancel-text">取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { display: flex; flex-direction: column; min-height: 100vh; padding-bottom: 140rpx; }
.loading, .error { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 200rpx 0; }
.spinner { width: 56rpx; height: 56rpx; border: 4rpx solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #94a3b8; }
.error-text { font-size: 28rpx; color: #ef4444; }
.cover-area { padding: 32rpx 28rpx 16rpx; position: relative; }
.cover-share { position: absolute; right: 48rpx; top: 48rpx; background: rgba(0,0,0,0.4); padding: 12rpx 24rpx; border-radius: 32rpx; z-index: 2; }
.cover-share-text { font-size: 24rpx; color: #fff; }
.cover-placeholder { height: 360rpx; background: linear-gradient(135deg, #16a34a, #0ea5e9); border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; }
.cover-emoji { font-size: 88rpx; }
.cover-dest { font-size: 48rpx; font-weight: 700; color: #fff; }
.cover-days { font-size: 24rpx; color: rgba(255,255,255,0.85); }
.body { padding: 24rpx 28rpx; }
.guide-title { display: block; font-size: 36rpx; font-weight: 700; color: #0f172a; line-height: 1.5; margin-bottom: 24rpx; }
.author-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.author-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #16a34a; display: flex; align-items: center; justify-content: center; }
.avatar-text { color: #fff; font-size: 30rpx; font-weight: 700; }
.author-name { flex: 1; font-size: 28rpx; color: #0f172a; font-weight: 500; }
.publish-date { font-size: 22rpx; color: #94a3b8; }
.tags-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 20rpx; }
.tag { padding: 8rpx 20rpx; background: #dcfce7; border-radius: 24rpx; }
.tag-text { font-size: 24rpx; color: #166534; }
.stats-row { display: flex; gap: 32rpx; padding: 20rpx 0; border-top: 1rpx solid #e2e8f0; border-bottom: 1rpx solid #e2e8f0; margin-bottom: 28rpx; }
.stat-item { font-size: 24rpx; color: #64748b; }
.content { font-size: 28rpx; color: #1e293b; line-height: 1.8; }
.cta-spacer { height: 32rpx; }

.action-bar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #e2e8f0; gap: 12rpx; }
.action-btn { flex: 1; padding: 24rpx 0; background: #f1f5f9; border-radius: 24rpx; text-align: center; }
.action-text { font-size: 26rpx; color: #475569; font-weight: 500; }
.action-active { color: #16a34a; font-weight: 700; }
.action-fork { background: #16a34a; flex: 2; }
.action-fork-text { color: #fff; font-size: 28rpx; font-weight: 600; }

.share-mask { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 100; display: flex; align-items: flex-end; }
.share-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 48rpx; }
.share-title { display: block; font-size: 28rpx; color: #64748b; text-align: center; margin-bottom: 32rpx; }
.share-row { display: flex; justify-content: space-around; padding: 24rpx 0; }
.share-cell { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; }
.share-cell-icon { font-size: 56rpx; }
.share-cell-label { font-size: 22rpx; color: #475569; }
.share-cancel { margin-top: 24rpx; padding: 24rpx 0; background: #f1f5f9; border-radius: 16rpx; text-align: center; }
.share-cancel-text { font-size: 28rpx; color: #475569; }
</style>
