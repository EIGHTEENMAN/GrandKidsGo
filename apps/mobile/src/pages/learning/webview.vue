<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { trackBrowse } from '@/stores/history'

const title = ref('')
const url = ref('')
const loaded = ref(false)
const hasError = ref(false)

onLoad((params) => {
  title.value = params?.title || ''
  let targetUrl = params?.url || ''

  // Track browsing history
  if (title.value) {
    const type = targetUrl.includes('xueshici') ? 'poem'
      : targetUrl.includes('xueguoxue') ? 'classic'
      : targetUrl.includes('xuetongshi') ? 'topic'
      : targetUrl.includes('english') ? 'english'
      : 'other'
    trackBrowse({
      id: targetUrl,
      title: title.value,
      subtitle: type === 'poem' ? '诗词' : type === 'classic' ? '国学' : type === 'topic' ? '通识' : '',
      type,
      url: targetUrl,
    })
  }

  // Inject auth token for SSO
  const token = uni.getStorageSync('grandkidsgo_token')
  if (token && targetUrl) {
    const sep = targetUrl.includes('?') ? '&' : '?'
    targetUrl += `${sep}grandkidsgo_token=${token}`
  }
  url.value = targetUrl
})

function onLoaded() {
  loaded.value = true
  hasError.value = false
}

function onError() {
  loaded.value = true
  hasError.value = true
}

function retry() {
  if (!url.value) return
  loaded.value = false
  hasError.value = false
  // Force reload by toggling src
  const currentUrl = url.value
  url.value = ''
  setTimeout(() => { url.value = currentUrl }, 50)
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="webview-page">
    <!-- Custom Header -->
    <view class="header" v-if="title">
      <view class="back-btn" @click="goBack">
        <text>‹</text>
      </view>
      <text class="header-title">{{ title }}</text>
      <view class="header-right" />
    </view>

    <!-- Loading Overlay -->
    <view class="loading-overlay" v-if="!loaded">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Error State -->
    <view class="error-state" v-if="hasError">
      <text class="error-icon">⚠️</text>
      <text class="error-text">页面加载失败</text>
      <text class="error-desc">请检查网络连接后重试</text>
      <button class="retry-btn" @click="retry">重新加载</button>
    </view>

    <!-- WebView -->
    <web-view
      v-if="url && !hasError"
      :src="url"
      @load="onLoaded"
      @error="onError"
    />
  </view>
</template>

<style scoped>
.webview-page {
  flex: 1; height: 100%; position: relative;
  display: flex; flex-direction: column;
}

/* Custom Header */
.header {
  display: flex; align-items: center; padding: 20rpx 24rpx;
  background: white; border-bottom: 1rpx solid #e2e8f0;
  flex-shrink: 0; z-index: 20;
}
.back-btn {
  font-size: 40rpx; color: #64748b; padding: 8rpx 16rpx;
  margin-right: 16rpx;
}
.header-title {
  flex: 1; font-size: 30rpx; font-weight: 600; color: #0f172a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.header-right { width: 56rpx; }

/* Loading */
.loading-overlay {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f8fafc; gap: 20rpx;
}
.loading-spinner {
  width: 48rpx; height: 48rpx; border: 4rpx solid #e2e8f0;
  border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #94a3b8; }

/* Error */
.error-state {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f8fafc; gap: 12rpx; padding: 60rpx;
}
.error-icon { font-size: 64rpx; margin-bottom: 12rpx; }
.error-text { font-size: 30rpx; font-weight: 600; color: #0f172a; }
.error-desc { font-size: 24rpx; color: #94a3b8; margin-bottom: 20rpx; }
.retry-btn {
  padding: 20rpx 48rpx; background: #2563eb; color: white;
  border-radius: 16rpx; font-size: 26rpx; font-weight: 500;
}
</style>
