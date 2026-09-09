<script setup lang="ts">
import { onMounted } from 'vue'
import { getAppRanking } from '@/stores/progress'

const apps = [
  { name: '学国学', desc: '经典启蒙，明智修身', icon: '📚', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' },
  { name: '学诗词', desc: '唐诗宋词，古韵童声', icon: '📜', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
  { name: '学通识', desc: '天文地理，万物百科', icon: '🔭', color: '#06b6d4', gradient: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)' },
  { name: '学英语', desc: '趣味单词，自然拼读', icon: '🔤', color: '#ec4899', gradient: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' },
]

const routeMap: Record<string, string> = {
  '学诗词': '/pages/shici/index',
  '学国学': '/pages/guoxue/index',
  '学通识': '/pages/tongshi/index',
  '学英语': '/pages/english/index',
}

function openApp(name: string) {
  uni.navigateTo({ url: routeMap[name] })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">童慧行</text>
      <text class="hero-desc">读万卷书，行万里路</text>
    </view>

    <view class="grid">
      <view
        v-for="app in apps"
        :key="app.name"
        class="card"
        hover-class="card-hover"
        @click="openApp(app.name)"
      >
        <view class="card-icon" :style="{ background: app.gradient }">
          <text class="card-emoji">{{ app.icon }}</text>
        </view>
        <text class="card-name" :style="{ color: app.color }">{{ app.name }}</text>
        <text class="card-desc">{{ app.desc }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  padding-bottom: 60rpx;
}

/* Hero — 居中大气 */
.hero {
  padding: 64rpx 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.hero-title {
  font-size: 44rpx;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 1rpx;
}
.hero-desc {
  font-size: 26rpx;
  color: #94a3b8;
  letter-spacing: 3rpx;
}

/* 4 宫格 2x2 — 居中 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28rpx;
  padding: 0 40rpx;
  max-width: 640rpx;
  margin: 0 auto;
}
.card {
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
.card-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.10);
}
.card-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.card-emoji {
  font-size: 64rpx;
  line-height: 1;
}
.card-name {
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}
.card-desc {
  font-size: 22rpx;
  color: #94a3b8;
  letter-spacing: 0.5rpx;
}
</style>