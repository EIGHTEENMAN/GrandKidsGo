<script setup lang="ts">
// Wizard 步骤进度条（1/4、2/4、3/4 + 4 个圆点）
defineProps<{
  current: number // 1, 2, 3, 4
  total: number
  steps: string[] // 每步标题
}>()
</script>

<template>
  <view class="wizard-progress">
    <view class="wp-text">
      <text class="wp-current">第 {{ current }} 步</text>
      <text class="wp-divider">/</text>
      <text class="wp-total">共 {{ total }} 步</text>
    </view>
    <view class="wp-dots">
      <view v-for="(label, i) in steps" :key="i" class="wp-dot"
        :class="(i + 1) <= current ? 'wp-dot-done' : (i + 1) === current + 1 ? 'wp-dot-next' : ''">
        <text v-if="(i + 1) < current" class="wp-dot-check">✓</text>
        <text v-else class="wp-dot-num">{{ i + 1 }}</text>
      </view>
    </view>
    <view class="wp-labels">
      <text v-for="(label, i) in steps" :key="i" class="wp-label"
        :class="(i + 1) === current ? 'wp-label-active' : ''">{{ label }}</text>
    </view>
  </view>
</template>

<style scoped>
.wizard-progress {
  padding: 20rpx 32rpx 0;
}
.wp-text { font-size: 22rpx; color: #94a3b8; margin-bottom: 16rpx; }
.wp-current { color: #2563eb; font-weight: 700; font-size: 26rpx; }
.wp-divider { color: #cbd5e1; margin: 0 4rpx; }
.wp-total { color: #64748b; }

.wp-dots {
  display: flex; align-items: center; justify-content: space-between;
  position: relative;
  padding: 0 32rpx;
}
.wp-dots::before {
  content: ''; position: absolute; left: 60rpx; right: 60rpx; top: 50%;
  height: 2rpx; background: #e2e8f0; transform: translateY(-50%);
  z-index: 0;
}
.wp-dot {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: white; border: 2rpx solid #e2e8f0;
  color: #94a3b8; font-size: 24rpx; font-weight: 600;
  position: relative; z-index: 1;
  transition: all 0.3s ease;
}
.wp-dot-done { background: #2563eb; border-color: #2563eb; color: white; }
.wp-dot-next { background: #dbeafe; border-color: #3b82f6; color: #1e40af; }

.wp-labels {
  display: flex; justify-content: space-between;
  padding: 12rpx 24rpx 0;
}
.wp-label { font-size: 20rpx; color: #94a3b8; flex: 1; text-align: center; }
.wp-label-active { color: #2563eb; font-weight: 600; }
</style>