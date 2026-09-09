<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

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

// 4 宫格（对齐底部 tabBar 中间 4 项）
const tiles = [
  { key: 'learning',  name: '学习',   desc: '国学/诗词/英语', icon: '📚', url: '/pages/learning/index',  color: '#2563eb' },
  { key: 'challenge', name: '小答答', desc: '答题闯关',       icon: '⚡', url: '/pages/challenge/index', color: '#ef4444' },
  { key: 'travel',    name: '走天下', desc: '亲子旅行',       icon: '✈️', url: '/pages/travel/index',    color: '#22c55e' },
  { key: 'mine',      name: '我的',   desc: '账号/收藏',       icon: '👤', url: '/pages/mine/index',      color: '#64748b' },
]

function openTile(url: string) {
  // 学习 / 小答答 / 走天下 / 我的 都是 switchTab；4 宫格全部用 switchTab 保险
  uni.switchTab({ url, fail: () => uni.navigateTo({ url }) })
}
</script>

<template>
  <view class="page">
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

    <!-- 4 宫格 (2x2) -->
    <view class="grid">
      <view
        v-for="t in tiles"
        :key="t.key"
        class="tile"
        hover-class="tile-hover"
        @click="openTile(t.url)"
      >
        <view class="tile-icon" :style="{ background: t.color + '14' }">
          <text class="tile-emoji" :style="{ color: t.color }">{{ t.icon }}</text>
        </view>
        <view class="tile-info">
          <text class="tile-name" :style="{ color: t.color }">{{ t.name }}</text>
          <text class="tile-desc">{{ t.desc }}</text>
        </view>
      </view>
    </view>

    <view class="footer-spacer"></view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 60%);
  padding-bottom: 40rpx;
}

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

/* 4 宫格 (2x2) */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 0 32rpx;
}
.tile {
  background: white;
  border-radius: 32rpx;
  padding: 36rpx 28rpx;
  display: flex; align-items: center; gap: 20rpx;
  border: 1rpx solid #f1f5f9;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.tile-hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
}
.tile-icon {
  width: 96rpx; height: 96rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tile-emoji {
  font-size: 48rpx; line-height: 1;
}
.tile-info { display: flex; flex-direction: column; gap: 6rpx; flex: 1; min-width: 0; }
.tile-name {
  font-size: 30rpx; font-weight: 700; letter-spacing: 1rpx;
}
.tile-desc {
  font-size: 22rpx; color: #94a3b8; letter-spacing: 0.5rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.footer-spacer { height: 40rpx; }
</style>