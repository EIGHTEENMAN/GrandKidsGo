<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)
const scrollThreshold = 400

function onScroll() {
  visible.value = window.scrollY > scrollThreshold
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <view
    class="scroll-to-top"
    :class="{ visible }"
    @click="scrollToTop"
  >
    <text class="icon">↑</text>
  </view>
</template>

<style scoped>
.scroll-to-top {
  position: fixed; bottom: 100rpx; right: 32rpx; z-index: 100;
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: white;
  border: 1rpx solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
  opacity: 0; transform: translateY(24rpx);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}
.scroll-to-top.visible {
  opacity: 1; transform: translateY(0);
  pointer-events: auto;
}
.icon { font-size: 32rpx; color: #64748b; font-weight: 700; }
</style>
