<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

// PWA install prompt
const pwaInstallEvent = ref<any>(null)
const showInstallPrompt = ref(false)
const showIosTutorial = ref(false)
const isIos = ref(false)
const isStandalone = ref(false)

function isStandaloneMode() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
  } catch { return false }
}

onMounted(() => {
  isIos.value = /ipad|iphone|ipod/i.test(navigator.userAgent)
  isStandalone.value = isStandaloneMode()
  if (isStandalone.value) {
    showInstallPrompt.value = false
  } else if (isIos.value) {
    showInstallPrompt.value = true
    showIosTutorial.value = true
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pwaInstallEvent.value = e
    showInstallPrompt.value = true
    showIosTutorial.value = false
  })
  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false
    pwaInstallEvent.value = null
  })
})

function installPwa() {
  if (pwaInstallEvent.value) {
    pwaInstallEvent.value.prompt()
    pwaInstallEvent.value.userChoice.then(() => {
      pwaInstallEvent.value = null
      showInstallPrompt.value = false
    })
  }
}

function dismissInstall() {
  showInstallPrompt.value = false
}

const token = ref('')
const userInfo = ref<any>(null)

onMounted(() => {
  token.value = uni.getStorageSync('grandkidsgo_token') || ''
  const stored = uni.getStorageSync('grandkidsgo_user')
  if (stored) {
    try { userInfo.value = JSON.parse(stored) } catch {}
  }
})

onShow(() => {
  token.value = uni.getStorageSync('grandkidsgo_token') || ''
  const stored = uni.getStorageSync('grandkidsgo_user')
  if (stored) {
    try { userInfo.value = JSON.parse(stored) } catch {}
  }
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const displayName = computed(() => {
  if (!token.value || !userInfo.value) return ''
  return userInfo.value.nickname || userInfo.value.username || '朋友'
})
const avatar = computed(() => userInfo.value?.avatar || '👤')

// 4 宫格（对齐底部 tabBar 中间 4 项）— 居中大气风格
const tiles = [
  { key: 'learning',  name: '学习',   desc: '国学/诗词/英语', icon: '📚', url: '/pages/learning/index',  color: '#2563eb', gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' },
  { key: 'challenge', name: '小答答', desc: '答题闯关',       icon: '⚡', url: '/pages/challenge/index', color: '#ef4444', gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' },
  { key: 'travel',    name: '走天下', desc: '亲子旅行',       icon: '✈️', url: '/pages/travel/index',    color: '#22c55e', gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' },
  { key: 'mine',      name: '我的',   desc: '账号/收藏',       icon: '👤', url: '/pages/mine/index',      color: '#64748b', gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' },
]

function openTile(url: string) {
  uni.switchTab({ url, fail: () => uni.navigateTo({ url }) })
}
</script>

<template>
  <view class="page">
    <!-- PWA Install Prompt (Android) -->
    <view class="install-banner" v-if="showInstallPrompt && !showIosTutorial">
      <view class="install-content">
        <text class="install-icon">📲</text>
        <view class="install-texts">
          <text class="install-title">添加到主屏幕</text>
          <text class="install-desc">安装到桌面，离线也能学</text>
        </view>
      </view>
      <view class="install-actions">
        <text class="install-dismiss" @click="dismissInstall">稍后</text>
        <text class="install-btn" @click="installPwa">立即安装</text>
      </view>
    </view>

    <!-- PWA Install Tutorial (iOS Safari) -->
    <view class="install-banner ios-banner" v-if="showInstallPrompt && showIosTutorial">
      <view class="install-content">
        <text class="install-icon">📲</text>
        <view class="install-texts">
          <text class="install-title">添加到主屏幕</text>
          <text class="install-desc">点击底部的分享按钮 ⬆️，选「添加到主屏幕」</text>
        </view>
      </view>
      <text class="install-dismiss" @click="dismissInstall">知道了</text>
    </view>

    <!-- 顶部 -->
    <view class="hero">
      <view class="hero-row">
        <view class="hero-greet">
          <text class="hero-greet-text">{{ greeting }}{{ displayName ? '，' + displayName : '' }}</text>
          <text class="hero-tagline">读万卷书，行万里路</text>
        </view>
        <view v-if="token && userInfo" class="hero-avatar">{{ avatar }}</view>
      </view>
    </view>

    <!-- 4 宫格 (2x2) — 居中大气 -->
    <view class="grid">
      <view
        v-for="t in tiles"
        :key="t.key"
        class="tile"
        hover-class="tile-hover"
        @click="openTile(t.url)"
      >
        <view class="tile-icon" :style="{ background: t.gradient }">
          <text class="tile-emoji">{{ t.icon }}</text>
        </view>
        <text class="tile-name" :style="{ color: t.color }">{{ t.name }}</text>
        <text class="tile-desc">{{ t.desc }}</text>
      </view>
    </view>

    <view class="footer-spacer"></view>

    <view class="icp-footer">
      <text class="footer-copy">&copy; 2026 童慧行 &mdash; 亲子学习旅行平台</text>
      <view class="icp-links">
        <text class="icp-link-text" @tap="openUrl('https://beian.miit.gov.cn/')">闽ICP备 2026xxxxxx 号-1</text>
        <text class="icp-sep">|</text>
        <text class="icp-link-text" @tap="openUrl('https://beian.mps.gov.cn/')">🛡 闽公网安备 35000000xxxxxx 号</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const openUrl = (url) => {
  // #ifdef H5
  window.open(url, '_blank', 'noopener,noreferrer')
  // #endif
  // #ifdef MP-WEIXIN
  // 微信小程序不支持直接跳转外链，复制到剪贴板
  uni.setClipboardData({ data: url })
  // #endif
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 60%);
  padding-bottom: 40rpx;
}

/* PWA Install Banner */
.install-banner {
  margin: 24rpx 32rpx 0;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 24rpx; padding: 20rpx 24rpx;
  display: flex; align-items: center; justify-content: space-between;
  border: 1rpx solid #bfdbfe;
}
.install-content { display: flex; align-items: center; gap: 14rpx; flex: 1; min-width: 0; }
.install-icon { font-size: 36rpx; flex-shrink: 0; }
.install-texts { display: flex; flex-direction: column; min-width: 0; }
.install-title { font-size: 26rpx; font-weight: 700; color: #1e40af; }
.install-desc { font-size: 22rpx; color: #3b82f6; margin-top: 2rpx; }
.install-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.install-dismiss { font-size: 24rpx; color: #93c5fd; padding: 6rpx 12rpx; }
.install-btn {
  font-size: 24rpx; font-weight: 600; color: white;
  background: #2563eb; padding: 10rpx 24rpx; border-radius: 12rpx;
}
/* iOS 教程 banner */
.ios-banner {
  background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
  border-color: #fde047;
}
.ios-banner .install-title { color: #854d0e; }
.ios-banner .install-desc { color: #a16207; }
.ios-banner .install-dismiss { color: #ca8a04; }

/* 顶部 */
.hero {
  padding: 56rpx 40rpx 48rpx;
}
.hero-row {
  display: flex; align-items: center; justify-content: space-between;
}
.hero-greet { display: flex; flex-direction: column; gap: 10rpx; }
.hero-greet-text {
  font-size: 40rpx; font-weight: 800; color: #0f172a;
  letter-spacing: 0.5rpx;
}
.hero-tagline {
  font-size: 24rpx; color: #94a3b8; letter-spacing: 2rpx;
}
.hero-avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: #f1f5f9; display: flex; align-items: center; justify-content: center;
  font-size: 44rpx; border: 2rpx solid #e2e8f0;
}

/* 4 宫格 (2x2) — 居中大气 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28rpx;
  padding: 0 40rpx;
  max-width: 640rpx;
  margin: 0 auto;
}
.tile {
  background: white;
  border-radius: 36rpx;
  padding: 56rpx 24rpx 44rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  border: 1rpx solid #f1f5f9;
  box-shadow: 0 6rpx 24rpx rgba(15, 23, 42, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.tile-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.10);
}
.tile-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.tile-emoji {
  font-size: 64rpx;
  line-height: 1;
}
.tile-name {
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}
.tile-desc {
  font-size: 22rpx;
  color: #94a3b8;
  letter-spacing: 0.5rpx;
}

.footer-spacer { height: 40rpx; }

.icp-footer {
  padding: 24rpx 32rpx 32rpx;
  text-align: center;
  border-top: 1rpx solid #e2e8f0;
  margin-top: 24rpx;
}
.footer-copy {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-bottom: 12rpx;
}
.icp-links {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  font-size: 20rpx;
  color: #94a3b8;
}
.icp-link-text {
  color: #94a3b8;
}
.icp-sep {
  color: #cbd5e1;
}
</style>