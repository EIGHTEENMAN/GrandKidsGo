<script setup lang="ts">
/**
 * BasicCircuits — 电路基础
 *   - 电池+灯泡+开关，电流方向粒子
 */
import { ref, computed } from 'vue'

const switchOn = ref(true)
</script>

<template>
  <div class="bc-wrap" @click.stop>
    <svg class="bc-svg" viewBox="-110 -110 220 220">
      <defs>
        <radialGradient id="bulbGrad">
          <stop offset="0%" :stop-color="switchOn ? '#fde047' : '#475569'" />
          <stop offset="100%"" :stop-color="switchOn ? '#facc15' : '#1e293b'" />
        </radialGradient>
      </defs>

      <!-- 电路图 -->
      <!-- 电池（左侧） -->
      <g transform="translate(-70 0)">
        <rect x="-15" y="-15" width="30" height="30" fill="#1e293b" stroke="#64748b" stroke-width="0.6" />
        <line x1="-6" y1="-6" x2="-6" y2="6" stroke="#dc2626" stroke-width="2" />
        <line x1="6" y1="-10" x2="6" y2="10" stroke="#3b82f6" stroke-width="2" />
        <text y="-22" text-anchor="middle" font-size="5" fill="#cbd5e1" font-weight="700">电池</text>
        <text y="-6" font-size="4" fill="#fca5a5" font-weight="700">+</text>
        <text y="14" font-size="4" fill="#93c5fd" font-weight="700">-</text>
      </g>

      <!-- 开关（上） -->
      <g transform="translate(0 -50)">
        <circle cx="-15" cy="0" r="3" fill="#475569" />
        <circle cx="15" cy="0" r="3" fill="#475569" />
        <line x1="-15" y1="0" :x2="switchOn ? 15 : 5" :y2="switchOn ? 0 : -8" stroke="#fbbf24" stroke-width="2" />
        <circle r="8" fill="none" :stroke="switchOn ? '#facc15' : '#475569'" stroke-width="0.8" />
        <text y="-15" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">开关</text>
      </g>

      <!-- 灯泡（右侧） -->
      <g transform="translate(70 0)">
        <circle r="18" fill="url(#bulbGrad)" />
        <path d="M -10 14 L -8 22 L 8 22 L 10 14 Z" fill="#94a3b8" />
        <circle r="3" fill="#1e293b" />
        <text y="-22" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">灯泡</text>
        <!-- 发光效果 -->
        <circle v-if="switchOn" r="30" fill="none" stroke="#fde047" stroke-width="0.6" opacity="0.5">
          <animate attributeName="r" values="22;32;22" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>

      <!-- 导线（连接） -->
      <line x1="-55" y1="0" x2="-15" y2="0" stroke="#dc2626" stroke-width="1.5" />
      <line x1="-70" y1="15" x2="-70" y2="50" stroke="#dc2626" stroke-width="1.5" />
      <line x1="-70" y1="50" x2="0" y2="50" stroke="#dc2626" stroke-width="1.5" />
      <line x1="0" y1="50" x2="0" y2="-42" stroke="#dc2626" stroke-width="1.5" />
      <line x1="0" y1="-50" x2="70" y2="-50" stroke="#dc2626" stroke-width="1.5" />
      <line x1="70" y1="-50" x2="70" y2="-18" stroke="#dc2626" stroke-width="1.5" />

      <line x1="70" y1="18" x2="70" y2="60" stroke="#3b82f6" stroke-width="1.5" />
      <line x1="70" y1="60" x2="-70" y2="60" stroke="#3b82f6" stroke-width="1.5" />
      <line x1="-70" y1="60" x2="-70" y2="15" stroke="#3b82f6" stroke-width="1.5" />

      <!-- 流动的电流粒子 -->
      <g v-if="switchOn">
        <circle r="1.5" fill="#fbbf24">
          <animateMotion dur="2.5s" repeatCount="indefinite"
            path="M -55 0 L 0 0 L 0 -50 L 70 -50 L 70 -18" />
        </circle>
        <circle r="1.5" fill="#fbbf24">
          <animateMotion dur="2.5s" begin="0.5s" repeatCount="indefinite"
            path="M -55 0 L 0 0 L 0 -50 L 70 -50 L 70 -18" />
        </circle>
        <circle r="1.5" fill="#fbbf24">
          <animateMotion dur="2.5s" begin="1.0s" repeatCount="indefinite"
            path="M -55 0 L 0 0 L 0 -50 L 70 -50 L 70 -18" />
        </circle>
        <circle r="1.5" fill="#fbbf24">
          <animateMotion dur="2.5s" begin="1.5s" repeatCount="indefinite"
            path="M -55 0 L 0 0 L 0 -50 L 70 -50 L 70 -18" />
        </circle>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="switchOn ? '#fde047' : '#64748b'" font-weight="700">⚡ 电路</text>
    </svg>

    <div class="bc-controls">
      <button class="bc-btn" :class="{ on: switchOn }" @click="switchOn = !switchOn">
        {{ switchOn ? '🔌 关闭' : '⚡ 打开' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.bc-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #422006 0%, #1c0a02 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bc-svg { width: 100%; height: 100%; }
.bc-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 5;
}
.bc-btn {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.bc-btn.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
