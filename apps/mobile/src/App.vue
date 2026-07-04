<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLaunch, onShow, onHide, onError } from '@dcloudio/uni-app'

const isOnline = ref(true)

onLaunch(() => {
  // Sync token across apps
  const token = uni.getStorageSync('grandkidsgo_token')
  if (token) {
    console.log('[App] Auth token found, restoring state')
  }

  // Check system info for adaptive layouts
  try {
    const sysInfo = uni.getSystemInfoSync()
    if (sysInfo.safeArea) {
      uni.setStorageSync('grandkidsgo_safe_area', JSON.stringify(sysInfo.safeArea))
    }
  } catch {}

  // Network detection
  checkNetwork()
})

onShow(() => {
  checkNetwork()
})

onHide(() => {})

onError((error) => {
  console.error('[App] Global error:', error)
})

function checkNetwork() {
  try {
    uni.getNetworkType({
      success: (res) => {
        isOnline.value = res.networkType !== 'none'
      },
      fail: () => {
        isOnline.value = true // Assume online if check fails
      }
    })
  } catch {
    isOnline.value = true
  }
}
</script>

<template>
  <view class="app-root">
    <!-- Offline Banner -->
    <view class="offline-banner" v-if="!isOnline">
      <text class="offline-text">⚠️ 网络已断开，部分功能可能不可用</text>
    </view>
    <slot />
  </view>
</template>

<style>
/* Global styles */
page {
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Offline Banner */
.offline-banner {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  background: #fef2f2; padding: 16rpx; text-align: center;
  border-bottom: 1rpx solid #fecaca;
}
.offline-text { font-size: 24rpx; color: #ef4444; font-weight: 500; }

/* Global transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from {
  transform: translateY(20rpx);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(-20rpx);
  opacity: 0;
}

/* Card style */
.card {
  background: white;
  border-radius: 24rpx;
  border: 1rpx solid #e2e8f0;
}
</style>
