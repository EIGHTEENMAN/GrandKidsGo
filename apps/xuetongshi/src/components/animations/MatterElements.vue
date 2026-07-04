<script setup lang="ts">
/**
 * AtomsMolecules — 物质三态 + 原子分子
 *
 * 设计：3 态对比 + 切换
 *   - 固态：分子紧密振动
 *   - 液态：分子松散流动
 *   - 气态：分子自由飞散
 */
import { ref, computed } from 'vue'

type State = 'solid' | 'liquid' | 'gas'
const state = ref<State>('solid')
const temperature = ref(20) // 影响振动幅度

interface Molecule { x: number; y: number; vx: number; vy: number }

const molecules = ref<Molecule[]>([])
let raf: number | null = null
function start() {
  if (raf) return
  // 初始化 18 个分子
  if (molecules.value.length === 0) {
    const arr: Molecule[] = []
    for (let i = 0; i < 18; i++) {
      arr.push({
        x: -90 + (i % 6) * 36 + Math.random() * 4 - 2,
        y: -60 + Math.floor(i / 6) * 40 + Math.random() * 4 - 2,
        vx: 0, vy: 0,
      })
    }
    molecules.value = arr
  }
  const tick = () => {
    const speed = (temperature.value + 100) / 100
    molecules.value = molecules.value.map((m) => {
      let { x, y, vx, vy } = m
      if (state.value === 'solid') {
        // 在原位小幅振动
        vx = (Math.random() - 0.5) * speed * 0.2
        vy = (Math.random() - 0.5) * speed * 0.2
        x = Math.max(-90, Math.min(90, x + vx))
        y = Math.max(-60, Math.min(60, y + vy))
      } else if (state.value === 'liquid') {
        // 自由流动（容器内）
        vx += (Math.random() - 0.5) * speed * 0.1
        vy += (Math.random() - 0.5) * speed * 0.1
        vx *= 0.95; vy *= 0.95
        x += vx; y += vy
        if (x < -85) { x = -85; vx = -vx }
        if (x > 85) { x = 85; vx = -vx }
        if (y < -55) { y = -55; vy = -vy }
        if (y > 55) { y = 55; vy = -vy }
      } else {
        // 自由飞散（边界无限）
        vx += (Math.random() - 0.5) * speed * 0.3
        vy += (Math.random() - 0.5) * speed * 0.3
        x += vx; y += vy
        // 飞太远就拉回来
        if (Math.abs(x) > 95 || Math.abs(y) > 65) {
          x = (Math.random() - 0.5) * 60
          y = (Math.random() - 0.5) * 40
          vx = (Math.random() - 0.5) * speed * 0.5
          vy = (Math.random() - 0.5) * speed * 0.5
        }
      }
      return { x, y, vx, vy }
    })
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = null
}
import { onMounted, onUnmounted } from 'vue'
onMounted(start)
onUnmounted(stop)
</script>

<template>
  <div class="am-wrap" @click.stop>
    <svg class="am-svg" viewBox="-110 -110 220 220">
      <!-- 容器框 -->
      <rect x="-100" y="-70" width="200" height="140" fill="none" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.4" />

      <!-- 分子 -->
      <g v-for="(m, i) in molecules" :key="i">
        <circle :cx="m.x" :cy="m.y" r="4" fill="#60a5fa" opacity="0.85" />
        <line :x1="m.x" :y1="m.y" :x2="m.x + m.vx * 3" :y2="m.y + m.vy * 3" stroke="#3b82f6" stroke-width="0.4" opacity="0.5" />
      </g>

      <text x="-100" y="-95" font-size="6" fill="#93c5fd" font-weight="700">⚛️ 物质三态</text>
      <text x="80" y="-95" text-anchor="end" font-size="6" :fill="state === 'solid' ? '#60a5fa' : state === 'liquid' ? '#3b82f6' : '#a78bfa'" font-weight="700">
        {{ state === 'solid' ? '🧊 固态' : state === 'liquid' ? '💧 液态' : '💨 气态' }}
      </text>
    </svg>

    <div class="am-tabs">
      <button class="am-tab" :class="{ on: state === 'solid' }" @click="state = 'solid'">🧊 固态</button>
      <button class="am-tab" :class="{ on: state === 'liquid' }" @click="state = 'liquid'">💧 液态</button>
      <button class="am-tab" :class="{ on: state === 'gas' }" @click="state = 'gas'">💨 气态</button>
    </div>
    <div class="am-temp">
      <label>温度</label>
      <input type="range" min="-100" max="200" v-model.number="temperature" />
      <span>{{ temperature }}°C</span>
    </div>
  </div>
</template>

<style scoped>
.am-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e3a8a 0%, #0c0a4a 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.am-svg { width: 100%; height: 100%; }
.am-tabs {
  position: absolute;
  bottom: 40px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.am-tab {
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
.am-tab.on {
  background: rgba(96, 165, 250, 0.2);
  border-color: #60a5fa;
  color: #93c5fd;
}
.am-temp {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 5;
  font-size: 10px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.85);
  padding: 4px 10px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.am-temp input { flex: 1; height: 3px; }
</style>
