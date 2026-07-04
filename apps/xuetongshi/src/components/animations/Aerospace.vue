<script setup lang="ts">
/**
 * Aerospace — 航空航天（火箭发射+卫星轨道）
 */
import { ref, computed } from 'vue'

const phase = ref<'launch' | 'orbit' | 'docking'>('launch')
</script>

<template>
  <div class="ae-wrap" @click.stop>
    <svg class="ae-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="rocketGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fef3c7" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
        <radialGradient id="flameGrad">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#dc2626" />
        </radialGradient>
      </defs>

      <!-- 星空 -->
      <g>
        <circle v-for="i in 30" :key="i"
          :cx="Math.cos(i * 1.2) * 95"
          :cy="Math.sin(i * 1.2) * 95"
          r="0.5"
          fill="#f1f5f9"
        />
      </g>

      <!-- 发射模式 -->
      <g v-if="phase === 'launch'">
        <!-- 地球（底部） -->
        <ellipse cx="0" cy="100" rx="120" ry="20" fill="#1e3a8a" opacity="0.7" />
        <ellipse cx="0" cy="100" rx="120" ry="20" fill="none" stroke="#3b82f6" stroke-width="0.6" />

        <!-- 火箭 -->
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,60; 0,20" dur="4s" repeatCount="indefinite" />
          <!-- 主体 -->
          <path d="M -8 0 L 8 0 L 6 30 L -6 30 Z" fill="url(#rocketGrad)" stroke="#1e293b" stroke-width="0.5" />
          <!-- 头 -->
          <path d="M -8 0 Q 0 -16 8 0 Z" fill="#fca5a5" />
          <!-- 窗 -->
          <circle cx="0" cy="6" r="2" fill="#1e3a8a" />
          <!-- 尾翼 -->
          <path d="M -8 25 L -14 30 L -8 30 Z" fill="#475569" />
          <path d="M 8 25 L 14 30 L 8 30 Z" fill="#475569" />
          <!-- 火焰 -->
          <path d="M -6 30 Q -3 50 0 60 Q 3 50 6 30 Z" fill="url(#flameGrad)">
            <animate attributeName="d" dur="0.3s" repeatCount="indefinite"
              values="M -6 30 Q -3 50 0 60 Q 3 50 6 30 Z;
                      M -6 30 Q -3 45 0 55 Q 3 45 6 30 Z;
                      M -6 30 Q -3 50 0 60 Q 3 50 6 30 Z" />
          </path>
        </g>
      </g>

      <!-- 卫星轨道模式 -->
      <g v-else-if="phase === 'orbit'">
        <!-- 地球 -->
        <circle r="30" fill="url(#earthGrad2)" />
        <ellipse cx="-8" cy="-5" rx="10" ry="4" fill="#22c55e" opacity="0.7" />
        <ellipse cx="6" cy="6" rx="8" ry="3" fill="#22c55e" opacity="0.5" />
        <defs>
          <radialGradient id="earthGrad2">
            <stop offset="0%" stop-color="#60a5fa" />
            <stop offset="100%" stop-color="#1e40af" />
          </radialGradient>
        </defs>

        <!-- 轨道 -->
        <ellipse rx="80" ry="30" fill="none" stroke="#475569" stroke-width="0.4" stroke-dasharray="2,2" />

        <!-- 卫星 -->
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
          <rect x="-3" y="-3" width="6" height="6" fill="#facc15" />
          <rect x="-12" y="-1" width="6" height="2" fill="#3b82f6" />
          <rect x="6" y="-1" width="6" height="2" fill="#3b82f6" />
        </g>
      </g>

      <!-- 空间站对接模式 -->
      <g v-else>
        <!-- 空间站 -->
        <g transform="translate(-30 0)">
          <rect x="-15" y="-5" width="30" height="10" fill="#cbd5e1" />
          <rect x="-3" y="-2" width="6" height="4" fill="#1e3a8a" />
          <line x1="-25" y1="0" x2="-15" y2="0" stroke="#94a3b8" stroke-width="1" />
          <line x1="15" y1="0" x2="25" y2="0" stroke="#94a3b8" stroke-width="1" />
          <rect x="-30" y="-8" width="4" height="16" fill="#3b82f6" />
          <rect x="26" y="-8" width="4" height="16" fill="#3b82f6" />
        </g>

        <!-- 对接飞船（动画接近） -->
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="60,0; -10,0" dur="5s" repeatCount="indefinite" />
          <path d="M -10 -3 L 8 0 L -10 3 Z" fill="#fca5a5" stroke="#1e293b" stroke-width="0.5" />
          <path d="M -10 -3 L -16 -4 L -16 4 L -10 3 Z" fill="#94a3b8" />
        </g>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fde047" font-weight="700">🚀 航空航天</text>
    </svg>

    <!-- 阶段切换 -->
    <div class="ae-tabs">
      <button class="ae-tab" :class="{ on: phase === 'launch' }" @click="phase = 'launch'">🚀 发射</button>
      <button class="ae-tab" :class="{ on: phase === 'orbit' }" @click="phase = 'orbit'">🛰 卫星</button>
      <button class="ae-tab" :class="{ on: phase === 'docking' }" @click="phase = 'docking'">🛸 对接</button>
    </div>
  </div>
</template>

<style scoped>
.ae-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e3a8a 0%, #0c1a4a 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ae-svg { width: 100%; height: 100%; }
.ae-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.ae-tab {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  flex: 1;
}
.ae-tab.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
