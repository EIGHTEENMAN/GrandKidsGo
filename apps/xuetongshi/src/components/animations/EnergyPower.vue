<script setup lang="ts">
/**
 * EnergyPower — 能量与能源（水/风/太阳）
 *   - 3 种能源：水流/风/光 → 发电
 */
import { ref, computed } from 'vue'

type Source = 'water' | 'wind' | 'solar'
const source = ref<Source>('water')
</script>

<template>
  <div class="ep-wrap" @click.stop>
    <svg class="ep-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="waterEP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
      </defs>

      <!-- 公共：发电机 + 灯泡 -->
      <g transform="translate(60 0)">
        <rect x="-12" y="-12" width="24" height="24" fill="#475569" stroke="#1e293b" stroke-width="0.6" rx="2" />
        <text text-anchor="middle" y="3" font-size="4" fill="#facc15" font-weight="700">发电机</text>
        <!-- 连接到灯泡 -->
        <line x1="12" y1="0" x2="40" y2="0" stroke="#facc15" stroke-width="1.2" />
        <!-- 灯泡 -->
        <circle cx="55" r="10" fill="#fde047">
          <animate attributeName="fill" values="#fde047;#fef08a;#fde047" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="55" r="20" fill="none" stroke="#fde047" stroke-width="0.5" opacity="0.5">
          <animate attributeName="r" values="14;22;14" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <rect x="50" y="10" width="10" height="6" fill="#94a3b8" />
      </g>

      <!-- 水电模式 -->
      <g v-if="source === 'water'">
        <!-- 水库（左上） -->
        <path d="M -100 60 L -100 -40 L -50 -40 L -50 60 Z" fill="url(#waterEP)" />
        <path d="M -100 -40 Q -90 -45 -80 -40 T -60 -40" stroke="#7dd3fc" stroke-width="1" fill="none">
          <animate attributeName="d" dur="2s" repeatCount="indefinite"
            values="M -100 -40 Q -90 -45 -80 -40 T -60 -40;
                    M -100 -40 Q -90 -35 -80 -40 T -60 -40;
                    M -100 -40 Q -90 -45 -80 -40 T -60 -40" />
        </path>
        <!-- 水流（水库→水轮机） -->
        <line x1="-50" y1="0" x2="-20" y2="0" stroke="#3b82f6" stroke-width="3" />
        <!-- 水流粒子 -->
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="1s" repeatCount="indefinite" path="M -50 0 L -20 0" />
        </circle>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="1s" begin="0.3s" repeatCount="indefinite" path="M -50 0 L -20 0" />
        </circle>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="1s" begin="0.6s" repeatCount="indefinite" path="M -50 0 L -20 0" />
        </circle>
        <!-- 水轮机 -->
        <g transform="translate(-10 0)">
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.5s" repeatCount="indefinite" additive="sum" />
            <circle r="14" fill="none" stroke="#a16207" stroke-width="2" />
            <g v-for="i in 6" :key="i" :transform="`rotate(${i * 60})`">
              <path d="M 0 0 L 14 0 L 12 -4 L 0 -2 Z" fill="#a16207" />
            </g>
            <circle r="3" fill="#854d0e" />
          </g>
        </g>
      </g>

      <!-- 风能模式 -->
      <g v-else-if="source === 'wind'">
        <!-- 风车 -->
        <g transform="translate(-30 0)">
          <line x1="0" y1="14" x2="0" y2="80" stroke="#94a3b8" stroke-width="2" />
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s" repeatCount="indefinite" additive="sum" />
            <g v-for="i in 3" :key="i" :transform="`rotate(${i * 120})`">
              <path d="M 0 0 L 35 -8 L 35 0 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="0.4" />
            </g>
            <circle r="4" fill="#475569" />
          </g>
        </g>
        <!-- 风吹粒子 -->
        <text v-for="i in 4" :key="i" font-size="10" fill="#94a3b8"
          :y="Math.sin(i * 1.5) * 20"
          :x="-100 + i * 15">
          💨
        </text>
      </g>

      <!-- 太阳能模式 -->
      <g v-else>
        <!-- 太阳（左上） -->
        <g transform="translate(-50 -50)">
          <circle r="14" fill="#fde047" opacity="0.4">
            <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="10" fill="#facc15" />
          <!-- 光线到板子 -->
          <line v-for="i in 4" :key="i"
            :x1="Math.cos(i * 1.5) * 12"
            :y1="Math.sin(i * 1.5) * 12"
            x2="20" y2="40"
            stroke="#fde047" stroke-width="0.6" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" :begin="i * 0.3 + 's'" dur="2s" repeatCount="indefinite" />
          </line>
        </g>
        <!-- 太阳能板 -->
        <g transform="translate(-15 5)">
          <rect width="35" height="30" fill="#1e3a8a" stroke="#3b82f6" stroke-width="0.6" />
          <line v-for="i in 3" :key="i" :x1="0" :y1="i * 10" x2="35" :y2="i * 10" stroke="#3b82f6" stroke-width="0.3" />
          <line v-for="i in 2" :key="i" :x1="i * 12" y1="0" :x2="i * 12" y2="30" stroke="#3b82f6" stroke-width="0.3" />
        </g>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="source === 'water' ? '#7dd3fc' : source === 'wind' ? '#cbd5e1' : '#facc15'" font-weight="700">⚡ {{ source === 'water' ? '水能' : source === 'wind' ? '风能' : '太阳能' }}</text>
    </svg>

    <div class="ep-tabs">
      <button class="ep-tab" :class="{ on: source === 'water' }" @click="source = 'water'">💧 水能</button>
      <button class="ep-tab" :class="{ on: source === 'wind' }" @click="source = 'wind'">💨 风能</button>
      <button class="ep-tab" :class="{ on: source === 'solar' }" @click="source = 'solar'">☀️ 太阳能</button>
    </div>
  </div>
</template>

<style scoped>
.ep-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e293b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ep-svg { width: 100%; height: 100%; }
.ep-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.ep-tab {
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
.ep-tab.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
