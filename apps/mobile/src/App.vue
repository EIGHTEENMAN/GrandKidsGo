<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onLaunch, onShow, onHide, onError } from '@dcloudio/uni-app'

const isOnline = ref(true)
let onlineHandler: (() => void) | null = null
let offlineHandler: (() => void) | null = null

// iOS Safari 输入失焦后页面不滚动回原位的修复
const isIosDevice = /ipad|iphone|ipod/i.test(navigator?.userAgent || '')
function handleBlurFix(e: FocusEvent) {
  if (!isIosDevice) return
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    // 短暂延迟确保键盘已收起
    setTimeout(() => {
      try {
        const el = document.activeElement as HTMLElement
        el && el.blur()
        window.scrollTo({ top: document.body.scrollTop, behavior: 'instant' as ScrollBehavior })
      } catch {}
    }, 100)
  }
}

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

  // Network detection (initial)
  checkNetwork()

  // 监听浏览器原生 online/offline 事件（H5 PWA 实时响应网络切换）
  if (typeof window !== 'undefined') {
    isOnline.value = navigator.onLine !== false
    onlineHandler = () => { isOnline.value = true }
    offlineHandler = () => { isOnline.value = false }
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)

    // iOS Safari 输入失焦滚动修复
    document.addEventListener('blur', handleBlurFix, true)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    document.removeEventListener('blur', handleBlurFix, true)
  }
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
        if (typeof navigator !== 'undefined') {
          isOnline.value = navigator.onLine !== false
        }
      }
    })
  } catch {
    if (typeof navigator !== 'undefined') {
      isOnline.value = navigator.onLine !== false
    }
  }
}

function retryNetwork() {
  checkNetwork()
}
</script>

<template>
  <view class="app-root">
    <!-- Offline Banner -->
    <view class="offline-banner" v-if="!isOnline">
      <text class="offline-icon">📡</text>
      <text class="offline-text">当前离线，部分功能可能不可用</text>
      <text class="offline-retry" @click="retryNetwork">重试</text>
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
  background: #fef2f2; padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #fecaca;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  animation: offlineSlideDown 0.3s ease;
}
.offline-icon { font-size: 28rpx; }
.offline-text { font-size: 24rpx; color: #b91c1c; font-weight: 500; }
.offline-retry {
  font-size: 22rpx; color: #dc2626; padding: 4rpx 12rpx;
  border: 1rpx solid #fecaca; border-radius: 8rpx; background: white;
}
@keyframes offlineSlideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

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
