<script setup lang="ts">
/**
 * VolcanoEarthquake — 火山与地震
 *
 * 设计：
 *   - 俯视板块（两块互相挤压）
 *   - 岩浆从地底上升
 *   - 火山喷发（岩浆四溅）
 *   - 地震波纹
 */
import { ref, computed } from 'vue'

const mode = ref<'volcano' | 'quake'>('volcano')
</script>

<template>
  <div class="ve-wrap" @click.stop>
    <svg class="ve-svg" viewBox="-110 -110 220 220">
      <defs>
        <radialGradient id="magmaGrad">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#dc2626" />
        </radialGradient>
        <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#78716c" />
          <stop offset="100%" stop-color="#1c1917" />
        </linearGradient>
      </defs>

      <!-- ====== 火山模式 ====== -->
      <g v-if="mode === 'volcano'">
        <!-- 地壳背景 -->
        <rect x="-110" y="-110" width="220" height="220" fill="#451a03" />
        <rect x="-110" y="40" width="220" height="70" fill="url(#rockGrad)" />

        <!-- 火山口（中心） -->
        <g transform="translate(0 30)">
          <!-- 火山外形 -->
          <path d="M -45 50 L -22 -10 Q 0 -25 22 -10 L 45 50 Z" fill="#44403c" stroke="#1c1917" stroke-width="0.8" />
          <!-- 顶部岩浆池 -->
          <ellipse cx="0" cy="-10" rx="22" ry="4" fill="url(#magmaGrad)">
            <animate attributeName="ry" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <!-- 喷发的岩浆粒子 -->
          <circle r="2" fill="#f97316">
            <animateMotion dur="2s" repeatCount="indefinite"
              path="M 0 -10 Q 5 -30 10 -50 Q 15 -60 5 -65" />
            <animate attributeName="opacity" values="1;1;0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#dc2626">
            <animateMotion dur="2s" begin="0.3s" repeatCount="indefinite"
              path="M 0 -10 Q -5 -35 -15 -55 Q -20 -65 -10 -68" />
            <animate attributeName="opacity" values="1;1;0" dur="2s" begin="0.3s" repeatCount="indefinite" />
          </circle>
          <circle r="1.5" fill="#fde047">
            <animateMotion dur="2s" begin="0.6s" repeatCount="indefinite"
              path="M 0 -10 Q 0 -50 0 -75" />
            <animate attributeName="opacity" values="1;1;0" dur="2s" begin="0.6s" repeatCount="indefinite" />
          </circle>
          <circle r="1.5" fill="#f97316">
            <animateMotion dur="2s" begin="0.9s" repeatCount="indefinite"
              path="M 0 -10 Q 8 -40 20 -55" />
            <animate attributeName="opacity" values="1;1;0" dur="2s" begin="0.9s" repeatCount="indefinite" />
          </circle>
          <!-- 烟 -->
          <ellipse cx="0" cy="-70" rx="14" ry="6" fill="#6b7280" opacity="0.6">
            <animate attributeName="cy" values="-70;-90" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-5" cy="-85" rx="10" ry="5" fill="#9ca3af" opacity="0.4">
            <animate attributeName="cy" values="-85;-105" dur="3s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
          </ellipse>
        </g>

        <!-- 地下岩浆库（地壳下） -->
        <g>
          <ellipse cx="0" cy="80" rx="50" ry="14" fill="url(#magmaGrad)" opacity="0.8">
            <animate attributeName="ry" values="14;17;14" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <!-- 岩浆上升的"管道" -->
          <line x1="0" y1="68" x2="0" y2="32" stroke="#dc2626" stroke-width="3" opacity="0.7" />
          <circle r="1.5" fill="#fde047">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 0 68 L 0 32" />
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>

        <text x="-100" y="-95" font-size="6" fill="#fde047" font-weight="700">🌋 火山喷发</text>
      </g>

      <!-- ====== 地震模式 ====== -->
      <g v-else>
        <!-- 地面 -->
        <rect x="-110" y="40" width="220" height="70" fill="#44403c" />
        <line x1="-110" y1="40" x2="110" y2="40" stroke="#1c1917" stroke-width="1" />

        <!-- 震源（地下） -->
        <g transform="translate(0 60)">
          <circle r="6" fill="#facc15">
            <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text y="20" text-anchor="middle" font-size="4" fill="#fde047" font-weight="700">震源</text>
        </g>

        <!-- P 波（纵波，向外） -->
        <circle r="0" fill="none" stroke="#3b82f6" stroke-width="1.5">
          <animate attributeName="r" values="0;100" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle r="0" fill="none" stroke="#3b82f6" stroke-width="1.5">
          <animate attributeName="r" values="0;100" dur="2s" begin="0.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
        </circle>

        <!-- 城市（地面，会抖） -->
        <g :transform="`translate(0 ${Math.sin(Date.now() / 100) * 1.5})`">
          <rect x="-80" y="20" width="14" height="20" fill="#1e293b" stroke="#475569" stroke-width="0.5" />
          <rect x="-62" y="14" width="16" height="26" fill="#1e293b" stroke="#475569" stroke-width="0.5" />
          <rect x="-42" y="22" width="12" height="18" fill="#1e293b" stroke="#475569" stroke-width="0.5" />
          <rect x="40" y="18" width="14" height="22" fill="#1e293b" stroke="#475569" stroke-width="0.5" />
          <rect x="58" y="14" width="16" height="26" fill="#1e293b" stroke="#475569" stroke-width="0.5" />
          <rect x="78" y="22" width="12" height="18" fill="#1e293b" stroke="#475569" stroke-width="0.5" />
          <text y="55" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">城市</text>
        </g>

        <text x="-100" y="-95" font-size="6" fill="#3b82f6" font-weight="700">🌍 地震波</text>
      </g>
    </svg>

    <!-- 模式切换 -->
    <div class="ve-controls">
      <button
        class="ve-ctrl"
        :class="{ on: mode === 'volcano' }"
        @click="mode = 'volcano'"
      >🌋 火山</button>
      <button
        class="ve-ctrl"
        :class="{ on: mode === 'quake' }"
        @click="mode = 'quake'"
      >🌍 地震</button>
    </div>
  </div>
</template>

<style scoped>
.ve-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #7c2d12 0%, #1c1917 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ve-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.ve-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
  z-index: 5;
}
.ve-ctrl {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.ve-ctrl.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
