<script setup lang="ts">
import { ref, onMounted } from 'vue'

const travelUrl = ref('https://travel.grandand.com')
const loaded = ref(false)

onMounted(() => {
  const token = uni.getStorageSync('grandkidsgo_token')
  if (token) {
    travelUrl.value = `https://travel.grandand.com?grandkidsgo_token=${token}`
  }
})

function onLoaded() {
  loaded.value = true
}
</script>

<template>
  <view class="page">
    <view class="loading-overlay" v-if="!loaded">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>
    <web-view :src="travelUrl" @load="onLoaded" />
  </view>
</template>

<style scoped>
.page { flex: 1; height: 100%; position: relative; }
.loading-overlay {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f8fafc; gap: 20rpx;
}
.loading-spinner {
  width: 48rpx; height: 48rpx; border: 4rpx solid #e2e8f0;
  border-top-color: #22c55e; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #94a3b8; }
</style>
