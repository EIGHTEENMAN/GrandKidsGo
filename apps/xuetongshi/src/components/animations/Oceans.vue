<script setup lang="ts">
/**
 * Oceans — 海洋世界（洋流+波浪+潮汐）
 */
import { ref, computed } from 'vue'

type View = 'current' | 'wave' | 'tide'
const view = ref<View>('current')
</script>

<template>
  <div class="oc-wrap" @click.stop>
    <svg class="oc-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="seaGradOC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
      </defs>

      <!-- 海面（始终显示） -->
      <rect x="-110" y="-30" width="220" height="160" fill="url(#seaGradOC)" />
      <line x1="-110" y1="-30" x2="110" y2="-30" stroke="#7dd3fc" stroke-width="1" opacity="0.6" />

      <!-- 洋流（地转偏向） -->
      <g v-if="view === 'current'">
        <!-- 主流路径：北大西洋暖流式 -->
        <path d="M -100 30 Q -50 -20 0 -30 Q 50 -20 80 30 Q 60 70 0 70 Q -50 70 -100 30 Z"
          fill="none" stroke="#fde047" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.6" />
        <!-- 洋流粒子（沿路径运动） -->
        <circle r="1.8" fill="#fde047">
          <animateMotion dur="6s" repeatCount="indefinite"
            path="M -100 30 Q -50 -20 0 -30 Q 50 -20 80 30 Q 60 70 0 70 Q -50 70 -100 30 Z" />
        </circle>
        <circle r="1.8" fill="#fde047">
          <animateMotion dur="6s" begin="2s" repeatCount="indefinite"
            path="M -100 30 Q -50 -20 0 -30 Q 50 -20 80 30 Q 60 70 0 70 Q -50 70 -100 30 Z" />
        </circle>
        <text x="-90" y="20" font-size="5" fill="#fde047" font-weight="700">洋流</text>
      </g>

      <!-- 波浪（横波式） -->
      <g v-else-if="view === 'wave'">
        <path
          :d="`M -110 -30 ` + Array.from({ length: 30 }, (_, i) => {
            const x = -110 + i * 7.5
            const y = -30 + Math.sin((x + Date.now() / 30) * 0.15) * 8
            return `L ${x} ${y}`
          }).join(' ')"
          fill="none"
          stroke="#7dd3fc"
          stroke-width="2"
        />
        <path
          :d="`M -110 -10 ` + Array.from({ length: 30 }, (_, i) => {
            const x = -110 + i * 7.5
            const y = -10 + Math.sin((x + Date.now() / 30) * 0.15 + 1) * 6
            return `L ${x} ${y}`
          }).join(' ')"
          fill="none"
          stroke="#bae6fd"
          stroke-width="1.5"
        />
        <text x="-90" y="-50" font-size="5" fill="#7dd3fc" font-weight="700">波浪 →</text>
      </g>

      <!-- 潮汐（月亮引力） -->
      <g v-else>
        <!-- 月亮（左上） -->
        <g transform="translate(-70 -70)">
          <circle r="10" fill="#cbd5e1" />
          <circle r="10" cx="-3" fill="#1e293b" />
          <text y="20" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">月亮</text>
          <!-- 引力箭头 -->
          <line x1="0" y1="0" x2="0" y2="40" stroke="#fbbf24" stroke-width="0.6" stroke-dasharray="2,2">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
          </line>
        </g>
        <!-- 涨潮（左侧隆起） -->
        <path d="M -110 -30 Q -80 -50 -50 -30" fill="none" stroke="#7dd3fc" stroke-width="2" />
        <!-- 退潮（右侧凹陷） -->
        <path d="M 50 -30 Q 80 -10 110 -30" fill="none" stroke="#7dd3fc" stroke-width="2" />
        <text x="-90" y="-50" font-size="5" fill="#fbbf24" font-weight="700">涨潮</text>
        <text x="60" y="-50" font-size="5" fill="#94a3b8" font-weight="700">退潮</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#7dd3fc" font-weight="700">🌊 {{ view === 'current' ? '洋流' : view === 'wave' ? '波浪' : '潮汐' }}</text>
    </svg>

    <div class="oc-tabs">
      <button class="oc-tab" :class="{ on: view === 'current' }" @click="view = 'current'">🌐 洋流</button>
      <button class="oc-tab" :class="{ on: view === 'wave' }" @click="view = 'wave'">🌊 波浪</button>
      <button class="oc-tab" :class="{ on: view === 'tide' }" @click="view = 'tide'">🌙 潮汐</button>
    </div>
  </div>
</template>

<style scoped>
.oc-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #0c4a6e 0%, #082f49 50%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.oc-svg { width: 100%; height: 100%; }
.oc-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.oc-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.oc-tab.on {
  background: rgba(125, 211, 252, 0.2);
  border-color: #7dd3fc;
  color: #7dd3fc;
}
</style>
