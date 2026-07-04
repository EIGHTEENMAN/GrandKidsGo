<script setup lang="ts">
/**
 * WaterCycle — 水循环
 *
 * 设计：4 个阶段形成闭合回路
 *   1. 蒸发：海洋→大气（水滴上升）
 *   2. 凝结：水汽→云
 *   3. 降水：云→陆地（雨滴下落）
 *   4. 径流：陆地→海洋（水流汇聚）
 */
import { ref, computed } from 'vue'

interface Stage {
  id: string
  name: string
  fact: string
}

const stages: Stage[] = [
  { id: 'evap', name: '蒸发', fact: '太阳的热量让海水变成水蒸气，飘到空中。' },
  { id: 'cond', name: '凝结', fact: '高空冷空气让水蒸气凝成小水滴，形成云。' },
  { id: 'prec', name: '降水', fact: '云里水滴越来越大，落下来就是雨或雪。' },
  { id: 'flow', name: '径流', fact: '雨水汇入河流，最终流回大海。' },
]

const activeStage = ref<number | null>(null)
</script>

<template>
  <div class="wc-wrap" @click.stop>
    <svg class="wc-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e3a8a" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
      </defs>

      <!-- 天空背景 -->
      <rect x="-110" y="-110" width="220" height="130" fill="url(#skyGrad)" opacity="0.3" />

      <!-- 太阳 -->
      <g transform="translate(-80 -80)">
        <circle r="14" fill="#fef08a" opacity="0.3">
          <animate attributeName="r" values="14;18;14" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle r="10" fill="url(#sunGrad2)" />
        <defs>
          <radialGradient id="sunGrad2">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="100%" stop-color="#f59e0b" />
          </radialGradient>
        </defs>
        <text y="22" text-anchor="middle" font-size="5" fill="#fde047" font-weight="700">太阳</text>
      </g>

      <!-- 海洋（底部） -->
      <g>
        <rect x="-110" y="30" width="220" height="80" fill="url(#seaGrad)" />
        <!-- 海浪 -->
        <path d="M -110 30 Q -90 25 -70 30 T -30 30 T 10 30 T 50 30 T 90 30 T 110 30" stroke="#7dd3fc" stroke-width="1" fill="none" opacity="0.7">
          <animate attributeName="d" dur="4s" repeatCount="indefinite"
            values="M -110 30 Q -90 25 -70 30 T -30 30 T 10 30 T 50 30 T 90 30 T 110 30;
                    M -110 30 Q -90 35 -70 30 T -30 30 T 10 30 T 50 30 T 90 30 T 110 30;
                    M -110 30 Q -90 25 -70 30 T -30 30 T 10 30 T 50 30 T 90 30 T 110 30" />
        </path>
        <text y="100" text-anchor="middle" font-size="6" fill="#bae6fd" font-weight="700">海洋</text>
      </g>

      <!-- 云 -->
      <g transform="translate(0 -50)">
        <ellipse cx="-12" cy="0" rx="14" ry="6" fill="#94a3b8" />
        <ellipse cx="0" cy="-3" rx="16" ry="8" fill="#cbd5e1" />
        <ellipse cx="14" cy="0" rx="14" ry="6" fill="#94a3b8" />
        <text y="14" text-anchor="middle" font-size="5" fill="#e2e8f0" font-weight="700">云</text>
      </g>

      <!-- 山（右侧） -->
      <g transform="translate(70 30)">
        <path d="M 0 0 L -20 0 L 0 -40 L 20 0 Z" fill="#475569" stroke="#1e293b" stroke-width="0.5" />
        <path d="M 0 -40 L -8 -28 L 0 -22 L 8 -28 Z" fill="#f1f5f9" />
      </g>

      <!-- === 4 个粒子循环 === -->
      <!-- 蒸发：海洋→云（上升水滴） -->
      <g>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="3s" repeatCount="indefinite" path="M -60 35 Q -50 0 -30 -50" />
          <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="3s" begin="0.7s" repeatCount="indefinite" path="M -60 35 Q -50 0 -30 -50" />
          <animate attributeName="opacity" values="0;1;1;0" dur="3s" begin="0.7s" repeatCount="indefinite" />
        </circle>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite" path="M -60 35 Q -50 0 -30 -50" />
          <animate attributeName="opacity" values="0;1;1;0" dur="3s" begin="1.5s" repeatCount="indefinite" />
        </circle>
      </g>

      <!-- 凝结：云在山顶形成（视觉上已经在云位置） -->
      <g>
        <circle r="1.5" fill="#bae6fd">
          <animateMotion dur="4s" begin="0.5s" repeatCount="indefinite" path="M -25 -50 Q 30 -50 50 -50" />
        </circle>
      </g>

      <!-- 降水：云→陆地（雨滴下落） -->
      <g>
        <line x1="20" y1="-42" x2="20" y2="-32" stroke="#60a5fa" stroke-width="0.8">
          <animate attributeName="y1" values="-42;-32" dur="0.6s" repeatCount="indefinite" />
          <animate attributeName="y2" values="-32;-22" dur="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="25" y1="-42" x2="25" y2="-32" stroke="#60a5fa" stroke-width="0.8">
          <animate attributeName="y1" values="-42;-32" dur="0.6s" begin="0.15s" repeatCount="indefinite" />
          <animate attributeName="y2" values="-32;-22" dur="0.6s" begin="0.15s" repeatCount="indefinite" />
        </line>
        <line x1="30" y1="-42" x2="30" y2="-32" stroke="#60a5fa" stroke-width="0.8">
          <animate attributeName="y1" values="-42;-32" dur="0.6s" begin="0.3s" repeatCount="indefinite" />
          <animate attributeName="y2" values="-32;-22" dur="0.6s" begin="0.3s" repeatCount="indefinite" />
        </line>
        <line x1="35" y1="-42" x2="35" y2="-32" stroke="#60a5fa" stroke-width="0.8">
          <animate attributeName="y1" values="-42;-32" dur="0.6s" begin="0.45s" repeatCount="indefinite" />
          <animate attributeName="y2" values="-32;-22" dur="0.6s" begin="0.45s" repeatCount="indefinite" />
        </line>
      </g>

      <!-- 径流：山顶→海洋（沿地面流动） -->
      <g>
        <circle r="1.5" fill="#38bdf8">
          <animateMotion dur="4s" begin="2s" repeatCount="indefinite" path="M 70 20 Q 80 30 60 35 Q 0 38 -40 35" />
          <animate attributeName="opacity" values="0;1;1;0" dur="4s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle r="1.5" fill="#38bdf8">
          <animateMotion dur="4s" begin="3s" repeatCount="indefinite" path="M 70 20 Q 80 30 60 35 Q 0 38 -40 35" />
          <animate attributeName="opacity" values="0;1;1;0" dur="4s" begin="3s" repeatCount="indefinite" />
        </circle>
      </g>

      <!-- 阶段标签（4 个角） -->
      <g class="wc-stage" transform="translate(-80 60)">
        <circle r="11" :fill="activeStage === 0 ? '#facc15' : '#0c4a6e'" :stroke="activeStage === 0 ? '#fde047' : '#475569'" stroke-width="0.6" @click.stop="activeStage = activeStage === 0 ? null : 0" style="cursor: pointer" />
        <text text-anchor="middle" dominant-baseline="central" font-size="4" fill="white" font-weight="700">蒸发</text>
      </g>
      <g class="wc-stage" transform="translate(0 -70)">
        <circle r="11" :fill="activeStage === 1 ? '#facc15' : '#1e3a8a'" :stroke="activeStage === 1 ? '#fde047' : '#475569'" stroke-width="0.6" @click.stop="activeStage = activeStage === 1 ? null : 1" style="cursor: pointer" />
        <text text-anchor="middle" dominant-baseline="central" font-size="4" fill="white" font-weight="700">凝结</text>
      </g>
      <g class="wc-stage" transform="translate(50 60)">
        <circle r="11" :fill="activeStage === 2 ? '#facc15' : '#0c4a6e'" :stroke="activeStage === 2 ? '#fde047' : '#475569'" stroke-width="0.6" @click.stop="activeStage = activeStage === 2 ? null : 2" style="cursor: pointer" />
        <text text-anchor="middle" dominant-baseline="central" font-size="4" fill="white" font-weight="700">降水</text>
      </g>
      <g class="wc-stage" transform="translate(80 60)">
        <circle r="11" :fill="activeStage === 3 ? '#facc15' : '#0c4a6e'" :stroke="activeStage === 3 ? '#fde047' : '#475569'" stroke-width="0.6" @click.stop="activeStage = activeStage === 3 ? null : 3" style="cursor: pointer" />
        <text text-anchor="middle" dominant-baseline="central" font-size="4" fill="white" font-weight="700">径流</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#bae6fd" font-weight="700">💧 水循环</text>
    </svg>

    <!-- 信息卡 -->
    <transition name="wc-fade">
      <div v-if="activeStage !== null" class="wc-info">
        <button class="wc-info-close" @click="activeStage = null">×</button>
        <div class="wc-info-name">{{ stages[activeStage].name }}</div>
        <p class="wc-info-fact">{{ stages[activeStage].fact }}</p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.wc-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at top, #0c4a6e 0%, #082f49 50%, #0c1a4a 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wc-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.wc-info {
  position: absolute;
  bottom: 14px;
  left: 14px;
  right: 14px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.wc-info-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.wc-info-name {
  font-size: 14px;
  font-weight: 800;
  color: #7dd3fc;
  margin-bottom: 4px;
}
.wc-info-fact {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
}

.wc-fade-enter-active,
.wc-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.wc-fade-enter-from,
.wc-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
