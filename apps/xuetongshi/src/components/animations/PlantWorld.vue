<script setup lang="ts">
/**
 * PlantWorld — 植物光合作用
 *
 * 设计：太阳+叶子+CO2+O2 粒子循环
 */
import { ref, computed } from 'vue'

const step = ref(0) // 0=白天 1=夜晚
</script>

<template>
  <div class="pw-wrap" @click.stop>
    <svg class="pw-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#86efac" />
          <stop offset="100%" stop-color="#15803d" />
        </linearGradient>
      </defs>

      <!-- 太阳（白天显示） -->
      <g v-if="step === 0" transform="translate(-70 -70)">
        <circle r="14" fill="#fde047" opacity="0.4">
          <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle r="10" fill="#facc15" />
        <!-- 光线到叶子 -->
        <line x1="10" y1="10" x2="60" y2="60" stroke="#fde047" stroke-width="0.8" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
        </line>
        <line x1="15" y1="5" x2="65" y2="55" stroke="#fde047" stroke-width="0.6" opacity="0.4" />
      </g>

      <!-- 月亮（夜晚显示） -->
      <g v-else transform="translate(-70 -70)">
        <circle r="10" fill="#cbd5e1" />
        <circle r="10" cx="-3" fill="#1e293b" />
      </g>

      <!-- 大叶子（中心） -->
      <g transform="translate(0 20)">
        <ellipse rx="40" ry="22" fill="url(#leafGrad)" stroke="#14532d" stroke-width="0.8" />
        <!-- 叶脉 -->
        <line x1="-40" y1="0" x2="40" y2="0" stroke="#14532d" stroke-width="0.4" />
        <line v-for="i in 6" :key="i" :x1="-30 + i * 10" y1="0" :x2="-25 + i * 10" y2="-15" stroke="#14532d" stroke-width="0.3" />
        <line v-for="i in 6" :key="i" :x1="-30 + i * 10" y1="0" :x2="-25 + i * 10" y2="15" stroke="#14532d" stroke-width="0.3" />
        <text text-anchor="middle" y="4" font-size="6" fill="#fff" font-weight="700">叶绿体</text>
      </g>

      <!-- 茎 -->
      <rect x="-1.5" y="42" width="3" height="40" fill="#15803d" />
      <!-- 根（地下） -->
      <g transform="translate(0 82)">
        <path d="M 0 0 Q -5 10 -10 18" stroke="#a16207" stroke-width="1.5" fill="none" />
        <path d="M 0 0 Q 5 12 12 20" stroke="#a16207" stroke-width="1.5" fill="none" />
        <path d="M 0 0 Q -2 15 0 22" stroke="#a16207" stroke-width="1.5" fill="none" />
      </g>

      <!-- 地面 -->
      <line x1="-100" y1="82" x2="100" y2="82" stroke="#a16207" stroke-width="0.8" />
      <line x1="-100" y1="85" x2="100" y2="85" stroke="#854d0e" stroke-width="0.4" />

      <!-- CO2 粒子（被叶子吸收，向上飞） -->
      <g v-if="step === 0">
        <text r="2" font-size="14">
          <animateMotion dur="3s" repeatCount="indefinite" path="M -70 80 Q -40 50 0 30" />
        </text>
        <text font-size="10" fill="#64748b">
          <animateMotion dur="3s" repeatCount="indefinite" path="M -70 80 Q -40 50 0 30" />
          💨
        </text>
        <text font-size="10" fill="#64748b">
          <animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M -70 80 Q -40 50 0 30" />
          💨
        </text>
      </g>

      <!-- O2 粒子（叶子释放，向上飞） -->
      <g>
        <text font-size="10" fill="#bae6fd">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 0 20 Q 20 -20 60 -60" />
          💨
        </text>
        <text font-size="10" fill="#bae6fd">
          <animateMotion dur="4s" begin="1.3s" repeatCount="indefinite" path="M 0 20 Q 20 -20 60 -60" />
          💨
        </text>
        <text font-size="10" fill="#bae6fd">
          <animateMotion dur="4s" begin="2.6s" repeatCount="indefinite" path="M 0 20 Q 20 -20 60 -60" />
          💨
        </text>
      </g>

      <!-- H2O 从根吸收向上 -->
      <g v-if="step === 0">
        <text font-size="9" fill="#7dd3fc">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M 12 100 Q 5 60 0 20" />
          💧
        </text>
        <text font-size="9" fill="#7dd3fc">
          <animateMotion dur="2.5s" begin="1s" repeatCount="indefinite" path="M -10 100 Q -5 60 0 20" />
          💧
        </text>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="step === 0 ? '#facc15' : '#cbd5e1'" font-weight="700">🌿 {{ step === 0 ? '光合作用（白天）' : '呼吸作用（夜晚）' }}</text>
    </svg>

    <div class="pw-tabs">
      <button class="pw-tab" :class="{ on: step === 0 }" @click="step = 0">☀️ 白天</button>
      <button class="pw-tab" :class="{ on: step === 1 }" @click="step = 1">🌙 夜晚</button>
    </div>
  </div>
</template>

<style scoped>
.pw-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #bae6fd 0%, #facc15 50%, #84cc16 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pw-svg { width: 100%; height: 100%; }
.pw-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.pw-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 11px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.pw-tab.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
