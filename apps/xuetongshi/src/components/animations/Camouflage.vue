<script setup lang="ts">
/**
 * Camouflage — 动物伪装
 *   - 变色龙（背景色变化）
 *   - 枯叶蝶（枯叶形态）
 *   - 竹节虫（竹子形态）
 */
import { ref, computed } from 'vue'

type Mode = 'chameleon' | 'leaf' | 'stick'
const mode = ref<Mode>('chameleon')
const bgColor = ref('#22c55e') // 变色龙的当前背景
const chameleonColor = computed(() => {
  // 根据背景色反向显示（对比色）
  return bgColor.value
})
</script>

<template>
  <div class="cam-wrap" :style="{ backgroundColor: bgColor, transition: 'background-color 1s' }" @click.stop>
    <svg class="cam-svg" viewBox="-110 -110 220 220">
      <!-- 变色龙 -->
      <g v-if="mode === 'chameleon'">
        <!-- 身体 -->
        <ellipse cx="0" cy="20" rx="40" ry="15" :fill="chameleonColor" stroke="#14532d" stroke-width="0.8" />
        <!-- 头 -->
        <g transform="translate(35 5)">
          <ellipse rx="15" ry="10" :fill="chameleonColor" stroke="#14532d" stroke-width="0.8" />
          <!-- 眼睛（突出） -->
          <circle cx="5" cy="-8" r="4" fill="white" stroke="#14532d" stroke-width="0.5" />
          <circle cx="5" cy="-8" r="2" fill="#0f172a" />
          <animateMotion dur="6s" repeatCount="indefinite" path="M 0 0 L 50 0 L 50 -30 L 0 -30 Z" />
        </g>
        <!-- 尾巴（卷曲） -->
        <path d="M -40 20 Q -65 20 -70 0 Q -65 -10 -50 -10" :fill="chameleonColor" stroke="#14532d" stroke-width="0.8" />
        <!-- 脚 -->
        <ellipse cx="-20" cy="35" rx="6" ry="3" :fill="chameleonColor" />
        <ellipse cx="20" cy="35" rx="6" ry="3" :fill="chameleonColor" />
      </g>

      <!-- 枯叶蝶 -->
      <g v-else-if="mode === 'leaf'">
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-5 0 0; 5 0 0; -5 0 0" dur="2s" repeatCount="indefinite" />
          <path d="M -50 0 Q -40 -40 0 -50 Q 40 -40 50 0 Q 40 40 0 50 Q -40 40 -50 0 Z" fill="#a16207" stroke="#854d0e" stroke-width="0.8" />
          <!-- 叶脉 -->
          <line x1="-50" y1="0" x2="50" y2="0" stroke="#854d0e" stroke-width="0.4" />
          <line v-for="i in 5" :key="i" :x1="-40 + i * 20" y1="0" :x2="-30 + i * 20" y2="-25" stroke="#854d0e" stroke-width="0.3" />
          <line v-for="i in 5" :key="i" :x1="-40 + i * 20" y1="0" :x2="-30 + i * 20" y2="25" stroke="#854d0e" stroke-width="0.3" />
          <!-- 伪装"眼斑"（吓退捕食者） -->
          <circle cx="-20" cy="0" r="5" fill="#7c2d12" />
          <circle cx="-20" cy="0" r="2" fill="#0f172a" />
          <circle cx="20" cy="0" r="5" fill="#7c2d12" />
          <circle cx="20" cy="0" r="2" fill="#0f172a" />
        </g>
      </g>

      <!-- 竹节虫 -->
      <g v-else>
        <line x1="-80" y1="0" x2="80" y2="0" stroke="#15803d" stroke-width="6" stroke-linecap="round" />
        <line x1="-60" y1="0" x2="-30" y2="-25" stroke="#15803d" stroke-width="2" />
        <line x1="60" y1="0" x2="30" y2="-25" stroke="#15803d" stroke-width="2" />
        <line x1="-50" y1="0" x2="-20" y2="20" stroke="#15803d" stroke-width="2" />
        <line x1="50" y1="0" x2="20" y2="20" stroke="#15803d" stroke-width="2" />
        <!-- 身体（分段） -->
        <g>
          <animateMotion dur="8s" repeatCount="indefinite" path="M -80 0 L 80 0" />
          <rect x="-40" y="-3" width="80" height="6" fill="#22c55e" rx="2" />
          <line v-for="i in 8" :key="i" :x1="-30 + i * 9" y1="-3" :x2="-30 + i * 9" y2="3" stroke="#14532d" stroke-width="0.3" />
        </g>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fff" font-weight="700">🎭 动物伪装</text>
    </svg>

    <div class="cam-tabs">
      <button class="cam-tab" :class="{ on: mode === 'chameleon' }" @click="mode = 'chameleon'">🦎 变色龙</button>
      <button class="cam-tab" :class="{ on: mode === 'leaf' }" @click="mode = 'leaf'">🍂 枯叶蝶</button>
      <button class="cam-tab" :class="{ on: mode === 'stick' }" @click="mode = 'stick'">🎋 竹节虫</button>
    </div>
    <div v-if="mode === 'chameleon'" class="cam-color">
      <span>背景色：</span>
      <button v-for="c in ['#22c55e', '#a16207', '#3b82f6', '#dc2626']" :key="c"
        class="cam-swatch" :style="{ backgroundColor: c }" @click="bgColor = c" />
    </div>
  </div>
</template>

<style scoped>
.cam-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 1s ease;
}
.cam-svg { width: 100%; height: 100%; }
.cam-tabs {
  position: absolute;
  bottom: 36px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.cam-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #f1f5f9;
  font-size: 10px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.cam-tab.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
.cam-color {
  position: absolute;
  bottom: 8px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #f1f5f9;
  z-index: 5;
  background: rgba(15, 23, 42, 0.85);
  padding: 4px 10px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.cam-swatch {
  width: 18px;
  height: 18px;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
}
</style>
