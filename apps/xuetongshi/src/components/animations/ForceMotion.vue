<script setup lang="ts">
/**
 * ForceMotion — 力与运动（抛物线+重力）
 *
 * 设计：发射小球，根据"重力强度"看抛物线轨迹
 */
import { ref, computed } from 'vue'

const angle = ref(45)
const speed = ref(50)
const gravity = ref(9.8)

// 抛物线轨迹点
const trajectory = computed(() => {
  const rad = (angle.value * Math.PI) / 180
  const vx = speed.value * Math.cos(rad) / 4
  const vy = speed.value * Math.sin(rad) / 4
  const points: string[] = []
  for (let t = 0; t <= 100; t += 2) {
    const x = vx * t
    const y = vy * t - 0.5 * (gravity.value / 4) * t * t
    if (y < -80) break
    points.push(`${x},${-y}`)
  }
  return points.join(' ')
})

const currentT = ref(0)
let raf: number | null = null
const animating = ref(false)
function animate() {
  if (animating.value) return
  animating.value = true
  currentT.value = 0
  const start = performance.now()
  const tick = (now: number) => {
    const elapsed = (now - start) / 50
    if (elapsed > 100) {
      animating.value = false
      return
    }
    currentT.value = elapsed
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
</script>

<template>
  <div class="fm-wrap" @click.stop>
    <svg class="fm-svg" viewBox="-110 -110 220 220">
      <!-- 地面 -->
      <line x1="-100" y1="80" x2="100" y2="80" stroke="#94a3b8" stroke-width="0.6" />
      <!-- 发射器 -->
      <g transform="translate(-80 80)">
        <circle r="6" fill="#475569" />
        <line x1="0" y1="0" :x2="Math.cos(angle * Math.PI / 180) * 14" :y2="-Math.sin(angle * Math.PI / 180) * 14" stroke="#dc2626" stroke-width="2" />
      </g>
      <!-- 抛物线轨迹 -->
      <polyline :points="trajectory" fill="none" stroke="#facc15" stroke-width="0.6" stroke-dasharray="2,1" opacity="0.6" />
      <!-- 飞行中的球 -->
      <circle
        v-if="animating"
        :cx="(speed * Math.cos(angle * Math.PI / 180) / 4) * currentT"
        :cy="80 - (speed * Math.sin(angle * Math.PI / 180) / 4) * currentT + 0.5 * (gravity / 4) * currentT * currentT"
        r="3"
        fill="#facc15"
      />
      <text x="-100" y="-95" font-size="6" fill="#facc15" font-weight="700">🎯 力与运动</text>
    </svg>

    <!-- 控制面板 -->
    <div class="fm-controls">
      <button class="fm-go" @click="animate">🚀 发射</button>
      <div class="fm-slider">
        <label>角度 {{ angle }}°</label>
        <input type="range" min="10" max="80" v-model.number="angle" />
      </div>
      <div class="fm-slider">
        <label>速度 {{ speed }}</label>
        <input type="range" min="20" max="100" v-model.number="speed" />
      </div>
      <div class="fm-slider">
        <label>重力 {{ gravity }}</label>
        <input type="range" min="1" max="30" step="0.1" v-model.number="gravity" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fm-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #064e3b 0%, #022c22 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fm-svg { width: 100%; height: 100%; }
.fm-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 5;
  background: rgba(15, 23, 42, 0.85);
  padding: 8px 10px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}
.fm-go {
  background: linear-gradient(135deg, #f59e0b, #dc2626);
  border: none;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.fm-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #cbd5e1;
}
.fm-slider label { min-width: 60px; }
.fm-slider input {
  flex: 1;
  height: 4px;
  background: #1e293b;
  border-radius: 2px;
  -webkit-appearance: none;
}
.fm-slider input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #facc15;
  border-radius: 50%;
  cursor: pointer;
}
</style>
