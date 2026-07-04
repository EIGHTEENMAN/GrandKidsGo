<script setup lang="ts">
/**
 * LightSound — 声光电磁
 *
 * 设计：3 种波形动画
 *   - 声波：纵波（疏密相间）
 *   - 光波：横波（正弦波）
 *   - 电磁波：横波+磁场方向（XY 双向）
 */
import { ref, computed } from 'vue'

type Wave = 'sound' | 'light' | 'em'
const wave = ref<Wave>('sound')
const frequency = ref(50) // 影响波数
const amplitude = ref(30) // 影响振幅
</script>

<template>
  <div class="ls-wrap" @click.stop>
    <svg class="ls-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="wave === 'sound' ? '#fca5a5' : wave === 'light' ? '#fde047' : '#a78bfa'" />
          <stop offset="100%" :stop-color="wave === 'sound' ? '#dc2626' : wave === 'light' ? '#f59e0b' : '#7c3aed'" />
        </linearGradient>
      </defs>

      <!-- ===== 声波：纵波（疏密） ===== -->
      <g v-if="wave === 'sound'">
        <!-- 中心线 -->
        <line x1="-100" y1="0" x2="100" y2="0" stroke="#475569" stroke-width="0.4" stroke-dasharray="2,2" />
        <!-- 声波粒子（疏密变化） -->
        <g v-for="i in 20" :key="i">
          <circle
            :cx="-90 + i * 9.5"
            cy="0"
            :r="2 + Math.abs(Math.sin(i * 0.5 + Date.now() / 300)) * amplitude / 15"
            fill="url(#waveGrad)"
          />
        </g>
        <text x="-100" y="-80" font-size="5" fill="#fca5a5" font-weight="700">← 声源</text>
        <text x="100" y="-80" text-anchor="end" font-size="5" fill="#fca5a5" font-weight="700">传播方向 →</text>
      </g>

      <!-- ===== 光波：横波（正弦） ===== -->
      <g v-else-if="wave === 'light'">
        <line x1="-100" y1="0" x2="100" y2="0" stroke="#475569" stroke-width="0.4" />
        <path
          :d="`M -100 0 ` + Array.from({ length: 40 }, (_, i) => {
            const x = -100 + i * 5
            const y = Math.sin((x + Date.now() / 30) * frequency / 50) * amplitude
            return `L ${x} ${y}`
          }).join(' ')"
          fill="none"
          stroke="url(#waveGrad)"
          stroke-width="2.5"
        />
        <!-- 标记波长 -->
        <line x1="-100" y1="-80" x2="-50" y2="-80" stroke="#fde047" stroke-width="0.5" />
        <text x="-75" y="-85" text-anchor="middle" font-size="4" fill="#fde047" font-weight="600">波长 λ</text>
        <text x="-100" y="-90" font-size="5" fill="#fde047" font-weight="700">⊥ 振动方向</text>
      </g>

      <!-- ===== 电磁波：横波+磁场方向 ===== -->
      <g v-else>
        <line x1="-100" y1="0" x2="100" y2="0" stroke="#475569" stroke-width="0.4" />
        <!-- 电场 E（垂直方向） -->
        <path
          :d="`M -100 0 ` + Array.from({ length: 40 }, (_, i) => {
            const x = -100 + i * 5
            const y = Math.sin((x + Date.now() / 30) * frequency / 50) * amplitude
            return `L ${x} ${y}`
          }).join(' ')"
          fill="none"
          stroke="#a78bfa"
          stroke-width="2"
        />
        <!-- 磁场 B（水平方向） -->
        <path
          :d="`M -100 0 ` + Array.from({ length: 40 }, (_, i) => {
            const x = -100 + i * 5
            const y = Math.cos((x + Date.now() / 30) * frequency / 50) * amplitude * 0.7
            return `L ${x} ${y}`
          }).join(' ')"
          fill="none"
          stroke="#f472b6"
          stroke-width="2"
          stroke-dasharray="3,1"
        />
        <text x="-100" y="-90" font-size="5" fill="#a78bfa" font-weight="700">↕ E 电场</text>
        <text x="100" y="-90" text-anchor="end" font-size="5" fill="#f472b6" font-weight="700">↔ B 磁场 ⊥</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#cbd5e1" font-weight="700">🌊 {{ wave === 'sound' ? '声波' : wave === 'light' ? '光波' : '电磁波' }}</text>
    </svg>

    <div class="ls-tabs">
      <button class="ls-tab" :class="{ on: wave === 'sound' }" @click="wave = 'sound'">🔊 声</button>
      <button class="ls-tab" :class="{ on: wave === 'light' }" @click="wave = 'light'">💡 光</button>
      <button class="ls-tab" :class="{ on: wave === 'em' }" @click="wave = 'em'">📡 电磁</button>
    </div>
    <div class="ls-controls">
      <label>频率 {{ frequency }}Hz</label>
      <input type="range" min="20" max="100" v-model.number="frequency" />
      <label>振幅 {{ amplitude }}</label>
      <input type="range" min="10" max="50" v-model.number="amplitude" />
    </div>
  </div>
</template>

<style scoped>
.ls-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e293b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ls-svg { width: 100%; height: 100%; }
.ls-tabs {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5;
}
.ls-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.ls-tab.on {
  background: rgba(167, 139, 250, 0.2);
  border-color: #a78bfa;
  color: #c4b5fd;
}
.ls-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5;
  font-size: 9px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.85);
  padding: 6px 10px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.ls-controls input {
  width: 100%;
  height: 3px;
}
</style>
