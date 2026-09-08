<script setup lang="ts">
// 通用骨架屏卡片（带闪烁动画）
defineProps<{ rows?: number }>()
</script>

<template>
  <view class="skeleton">
    <view v-for="i in (rows || 3)" :key="i" class="skel-row">
      <view class="skel-icon" />
      <view class="skel-content">
        <view class="skel-line skel-line-title" />
        <view class="skel-line skel-line-sub" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.skeleton { padding: 0 32rpx; }
.skel-row {
  display: flex; align-items: center; gap: 16rpx;
  padding: 24rpx 20rpx; margin-bottom: 12rpx;
  background: white; border-radius: 18rpx;
  border: 1rpx solid #f1f5f9;
}
.skel-icon {
  width: 56rpx; height: 56rpx; border-radius: 14rpx;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%; flex-shrink: 0;
  animation: shimmer 1.4s ease-in-out infinite;
}
.skel-content { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.skel-line {
  height: 18rpx; border-radius: 6rpx;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.skel-line-title { width: 60%; height: 22rpx; }
.skel-line-sub { width: 40%; height: 16rpx; }
.skel-row:nth-child(2) .skel-icon { animation-delay: 0.1s; }
.skel-row:nth-child(3) .skel-icon { animation-delay: 0.2s; }
.skel-row:nth-child(2) .skel-line { animation-delay: 0.1s; }
.skel-row:nth-child(3) .skel-line { animation-delay: 0.2s; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>