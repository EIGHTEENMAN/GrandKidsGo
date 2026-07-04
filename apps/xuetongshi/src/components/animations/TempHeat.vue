<script setup lang="ts">
/**
 * TempHeat — 温度与热量（分子运动速度）
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const temperature = ref(20)
const molecules = ref<{ x: number; y: number; vx: number; vy: number }[]>([])
let raf: number | null = null

function init() {
  const arr = []
  for (let i = 0; i < 24; i++) {
    arr.push({
      x: -90 + (i % 8) * 22 + (Math.random() - 0.5) * 4,
      y: -50 + Math.floor(i / 8) * 30 + (Math.random() - 0.5) * 4,
      vx: 0, vy: 0,
    })
  }
  molecules.value = arr
}

function start() {
  if (molecules.value.length === 0) init()
  const tick = () => {
    const speed = (temperature.value + 273) / 100
    molecules.value = molecules.value.map(m => {
      let { x, y, vx, vy } = m
      vx += (Math.random() - 0.5) * speed * 0.3
      vy += (Math.random() - 0.5) * speed * 0.3
      vx *= 0.95; vy *= 0.95
      x += vx; y += vy
      if (x < -90) { x = -90; vx = Math.abs(vx) }
      if (x > 90) { x = 90; vx = -Math.abs(vx) }
      if (y < -55) { y = -55; vy = Math.abs(vy) }
      if (y > 55) { y = 55; vy = -Math.abs(vy) }
      return { x, y, vx, vy }
    })
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
function stop() {
  if (raf) cancelAnimationFrame(raf); raf = null
}
onMounted(start)
onUnmounted(stop)

const stateLabel = computed(() => {
  if (temperature.value < 0) return '❄️ 固态/冰冷'
  if (temperature.value < 100) return '💧 液态/常温'
  return '💨 气态/灼热'
})
</script>

<template>
  <div class="th-wrap" @click.stop>
    <svg class="th-svg" viewBox="-110 -110 220 220">
      <!-- 容器 -->
      <rect x="-95" y="-60" width="190" height="120" fill="none" stroke="#475569" stroke-width="0.6" rx="3" stroke-dasharray="2,2" />

      <!-- 分子（按温度变色） -->
      <g v-for="(m, i) in molecules" :key="i">
        <circle
          :cx="m.x" :cy="m.y" r="3"
          :fill="temperature < 0 ? '#3b82f6' : temperature < 100 ? '#60a5fa' : '#f97316'"
        />
        <line :x1="m.x" :y1="m.y" :x2="m.x + m.vx * 2" :y2="m.y + m.vy * 2"
          stroke="#94a3b8" stroke-width="0.3" opacity="0.6" />
      </g>

      <!-- 温度计 -->
      <g transform="translate(80 -70)">
        <rect x="-2" y="-10" width="4" height="40" fill="#cbd5e1" rx="2" />
        <circle cx="0" cy="32" r="6" :fill="temperature < 0 ? '#3b82f6' : temperature < 100 ? '#dc2626' : '#f97316'" />
        <rect x="-1" :y="(40 - (temperature.value ?? 0) / 5)" width="2" height="6" fill="#7f1d1d" />
      </g>

      <text x="-100" y="-95" font-size="6" fill="#facc15" font-weight="700">🌡 温度与热量</text>
      <text x="100" y="-95" text-anchor="end" font-size="5" fill="#94a3b8" font-weight="600">{{ stateLabel }}</text>
    </svg>

    <div class="th-control">
      <label>🌡 温度</label>
      <input type="range" min="-50" max="200" v-model.number="temperature" />
      <span class="th-temp">{{ temperature }}°C</span>
    </div>
    <p class="th-hint">拖动滑块，看分子运动快慢</p>
  </div>
</template>

<style scoped>
.th-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1e3a8a 0%, #1e293b 50%, #7c2d12 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.th-svg { width: 100%; height: 100%; }
.th-control {
  position: absolute;
  bottom: 30px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.85);
  padding: 6px 10px;
  border-radius: 6px;
  z-index: 5;
  backdrop-filter: blur(4px);
}
.th-control input { flex: 1; }
.th-temp {
  font-weight: 800;
  color: #facc15;
  min-width: 50px;
  text-align: right;
}
.th-hint {
  position: absolute;
  bottom: 10px;
  left: 12px;
  right: 12px;
  margin: 0;
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  z-index: 5;
}
</style>
