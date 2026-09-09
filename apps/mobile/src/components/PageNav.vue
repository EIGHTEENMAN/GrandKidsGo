<script setup lang="ts">
defineProps<{
  title?: string
  /** 是否显示标题（默认 true） */
  showTitle?: boolean
}>()

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<template>
  <view class="page-nav">
    <view class="page-nav-back" @click="goBack" hover-class="back-hover">
      <text class="back-arrow">‹</text>
    </view>
    <view class="page-nav-title" v-if="showTitle !== false && title">
      <text>{{ title }}</text>
    </view>
  </view>
</template>

<style scoped>
.page-nav {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
  background: white;
  border-bottom: 1rpx solid #f1f5f9;
}
.page-nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8rpx;
}
.back-arrow {
  font-size: 56rpx;
  font-weight: 300;
  color: #0f172a;
  line-height: 1;
}
.back-hover {
  opacity: 0.5;
}
.page-nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  margin-right: 68rpx; /* 平衡左侧返回按钮宽度 */
}
</style>