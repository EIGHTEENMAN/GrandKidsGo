<script setup lang="ts">
/**
 * TimeSpace — 时间与空间（四季形成）
 *
 * 核心：地轴倾斜 23.5° + 绕日公转
 *   - 夏至/冬至：太阳直射点在回归线
 *   - 春分/秋分：太阳直射赤道
 */
import { ref, computed } from 'vue'

const season = ref(0) // 0=春 1=夏 2=秋 3=冬
const seasons = [
  { name: '春分', color: '#22c55e', desc: '太阳直射赤道，昼夜平分' },
  { name: '夏至', color: '#facc15', desc: '太阳直射北回归线，北半球昼长夜短' },
  { name: '秋分', color: '#f97316', desc: '太阳直射赤道，昼夜平分' },
  { name: '冬至', color: '#3b82f6', desc: '太阳直射南回归线，北半球昼短夜长' },
]
</script>

<template>
  <div class="ts-wrap" @click.stop>
    <svg class="ts-svg" viewBox="-110 -110 220 220">
      <!-- 太阳光（左侧入射） -->
      <g>
        <line v-for="i in 5" :key="i" x1="-200" :y1="-50 + i * 25" x2="0" :y2="-50 + i * 25" stroke="#fde047" stroke-width="0.4" opacity="0.3" />
      </g>

      <!-- 地球（中心，倾斜 23.5°） -->
      <g>
        <g transform="rotate(23.5)">
          <circle r="18" fill="#3b82f6" stroke="#1e40af" stroke-width="0.6" />
          <!-- 大陆/海洋 -->
          <ellipse cx="-4" cy="-3" rx="6" ry="3" fill="#22c55e" />
          <ellipse cx="3" cy="4" rx="5" ry="2" fill="#22c55e" />
          <!-- 自转轴 -->
          <line x1="0" y1="-25" x2="0" y2="25" stroke="#1e293b" stroke-width="0.6" />
        </g>
        <text y="40" text-anchor="middle" font-size="5" fill="#bfdbfe" font-weight="700">地球</text>
      </g>

      <!-- 公转轨道 -->
      <circle r="0" fill="none" stroke="rgba(148, 163, 184, 0.3)" stroke-width="0.4" stroke-dasharray="2,2" />

      <!-- 4 季位置（地球周围 4 个点，显示当前位置） -->
      <g v-for="(s, i) in seasons" :key="i" :transform="`rotate(${i * 90 + season * 90}) translate(0 -50) rotate(${-(i * 90 + season * 90)})`">
        <circle r="2" fill="#facc15" />
      </g>

      <!-- 太阳直射点指示 -->
      <g :transform="`rotate(${season * 90})`">
        <line x1="0" y1="0" x2="-40" y2="0" stroke="#fde047" stroke-width="1.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </line>
        <text x="-50" y="3" text-anchor="end" font-size="4" fill="#fde047" font-weight="700">直射</text>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="seasons[season].color" font-weight="700">🌍 {{ seasons[season].name }}</text>
    </svg>

    <div class="ts-tabs">
      <button
        v-for="(s, i) in seasons"
        :key="i"
        class="ts-tab"
        :class="{ on: i === season }"
        :style="{ borderColor: i === season ? s.color : undefined, color: i === season ? s.color : undefined }"
        @click="season = i"
      >
        {{ s.name }}
      </button>
    </div>
    <transition name="ts-fade">
      <div class="ts-info" v-if="seasons[season]">
        <div class="ts-info-name">{{ seasons[season].name }}</div>
        <p class="ts-info-desc">{{ seasons[season].desc }}</p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ts-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e293b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ts-svg { width: 100%; height: 100%; }
.ts-tabs {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5;
}
.ts-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  min-width: 50px;
  backdrop-filter: blur(4px);
}
.ts-tab.on {
  background: rgba(255, 255, 255, 0.1);
}
.ts-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  color: #e2e8f0;
  z-index: 10;
  backdrop-filter: blur(8px);
}
.ts-info-name {
  font-size: 12px;
  font-weight: 800;
  color: #facc15;
  margin-bottom: 2px;
}
.ts-info-desc {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
}
.ts-fade-enter-active,
.ts-fade-leave-active { transition: opacity 0.2s; }
.ts-fade-enter-from,
.ts-fade-leave-to { opacity: 0; }
</style>
