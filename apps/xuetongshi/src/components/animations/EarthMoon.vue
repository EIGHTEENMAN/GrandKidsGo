<script setup lang="ts">
/**
 * EarthMoon — 地月公转 + 月相变化
 *
 * 设计：
 *   - 中心地球（带轴倾斜）
 *   - 月球绕地球 360° 旋转
 *   - 旁边展示当前月相大图（同步更新）
 *   - 点击月相名字切换
 */
import { ref, computed } from 'vue'

interface Phase {
  id: string
  name: string
  /** 月球在轨道上的角度（度） */
  angle: number
  /** 月相阴影（0-1，0=满月 1=新月） */
  shadow: number
  fact: string
}

const phases: Phase[] = [
  { id: 'new', name: '新月', angle: 0, shadow: 1, fact: '月亮朝向地球的一面完全黑暗，看不见。' },
  { id: 'waxing-crescent', name: '蛾眉月', angle: 45, shadow: 0.75, fact: '月亮开始变亮，像弯弯的眉毛。' },
  { id: 'first-quarter', name: '上弦月', angle: 90, shadow: 0.5, fact: '月亮一半亮一半暗，是"半"月亮。' },
  { id: 'waxing-gibbous', name: '盈凸月', angle: 135, shadow: 0.25, fact: '亮面越来越大，快要变圆了。' },
  { id: 'full', name: '满月', angle: 180, shadow: 0, fact: '月亮整夜明亮，象征团圆。' },
  { id: 'waning-gibbous', name: '亏凸月', angle: 225, shadow: 0.25, fact: '满月后开始变暗。' },
  { id: 'last-quarter', name: '下弦月', angle: 270, shadow: 0.5, fact: '又是半月，但亮面在另一侧。' },
  { id: 'waning-crescent', name: '残月', angle: 315, shadow: 0.75, fact: '只剩一弯月牙，快要消失了。' },
]

const currentIndex = ref(4) // 默认满月
const current = computed(() => phases[currentIndex.value])

/** 月球在轨道上的实时位置（自动旋转演示） */
const autoMode = ref(true)
const autoRotation = ref(0)
let raf: number | null = null
function startAuto() {
  if (raf) return
  const tick = () => {
    if (autoMode.value) {
      autoRotation.value = (autoRotation.value + 0.3) % 360
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
function stopAuto() {
  if (raf) cancelAnimationFrame(raf)
  raf = null
}
import { onMounted, onUnmounted } from 'vue'
onMounted(startAuto)
onUnmounted(stopAuto)

function selectPhase(i: number) {
  currentIndex.value = i
  autoMode.value = false
}
</script>

<template>
  <div class="em-wrap" @click.stop>
    <svg class="em-svg" viewBox="-110 -110 220 220">
      <!-- 太阳光（左侧入射） -->
      <g>
        <line x1="-200" y1="0" x2="-100" y2="0" stroke="#fde047" stroke-width="0.5" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="-200" y1="-30" x2="-100" y2="-15" stroke="#fde047" stroke-width="0.5" opacity="0.3" />
        <line x1="-200" y1="30" x2="-100" y2="15" stroke="#fde047" stroke-width="0.5" opacity="0.3" />
        <text x="-100" y="8" font-size="6" fill="#fde047" font-weight="700">☀ 太阳光</text>
      </g>

      <!-- 地球（中心，倾斜 23.5°） -->
      <g>
        <circle r="14" fill="url(#earthGrad)" />
        <ellipse cx="-3" cy="-2" rx="6" ry="3" fill="#22c55e" opacity="0.8" />
        <ellipse cx="3" cy="3" rx="5" ry="2" fill="#22c55e" opacity="0.6" />
        <defs>
          <radialGradient id="earthGrad">
            <stop offset="0%" stop-color="#60a5fa" />
            <stop offset="100%" stop-color="#1e40af" />
          </radialGradient>
        </defs>
        <text y="28" text-anchor="middle" font-size="5" fill="#bfdbfe" font-weight="700">地球</text>
      </g>

      <!-- 月球轨道（虚线） -->
      <circle r="60" fill="none" stroke="rgba(148, 163, 184, 0.3)" stroke-width="0.4" stroke-dasharray="2,2" />

      <!-- 月球（绕地球转，实时显示当前月相） -->
      <g :transform="`rotate(${autoRotation})`">
        <g transform="translate(60 0)">
          <!-- 月球主体：被太阳光照亮一半 -->
          <circle r="6" fill="#94a3b8" />
          <!-- 月相阴影（基于当前 phase 的 shadow 值） -->
          <circle r="6" fill="#020617">
            <animate attributeName="cx" :values="`${-6 * (1 - 2 * (current.shadow - 0.5))}`" dur="0.1s" fill="freeze" />
          </circle>
          <text y="-12" text-anchor="middle" font-size="4" fill="#e2e8f0" font-weight="700">月球</text>
        </g>
      </g>

      <!-- 当前月相大图（右上角） -->
      <g transform="translate(80 -80)">
        <circle r="14" fill="#0f172a" stroke="#475569" stroke-width="0.5" />
        <!-- 亮面 -->
        <circle r="14" fill="#f1f5f9" />
        <!-- 阴影部分 -->
        <ellipse
          :cx="14 * (1 - 2 * (current.shadow - 0.5))"
          cy="0"
          :rx="14 * Math.abs(1 - 2 * (current.shadow - 0.5))"
          ry="14"
          fill="#0f172a"
        />
        <text y="22" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">当前月相</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fde047" font-weight="700">🌍 地月系统</text>
    </svg>

    <!-- 月相选择器（底部 8 个） -->
    <div class="em-phases">
      <button
        v-for="(p, i) in phases"
        :key="p.id"
        class="em-phase"
        :class="{ 'em-phase-active': i === currentIndex }"
        @click="selectPhase(i)"
        :title="p.name"
      >
        <svg viewBox="-10 -10 20 20" class="em-phase-svg">
          <circle r="9" fill="#f1f5f9" />
          <ellipse
            :cx="9 * (1 - 2 * (p.shadow - 0.5))"
            cy="0"
            :rx="9 * Math.abs(1 - 2 * (p.shadow - 0.5))"
            ry="9"
            fill="#0f172a"
          />
        </svg>
        <span class="em-phase-name">{{ p.name }}</span>
      </button>
    </div>

    <!-- 信息卡 -->
    <transition name="em-fade">
      <div class="em-info">
        <div class="em-info-name">{{ current.name }}</div>
        <p class="em-info-fact">{{ current.fact }}</p>
        <div class="em-info-mode">
          <button class="em-mode-btn" :class="{ on: autoMode }" @click="autoMode = !autoMode">
            {{ autoMode ? '⏸ 暂停自动' : '▶ 自动演示' }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.em-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #0c0a4a 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.em-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.em-phases {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  justify-content: space-between;
  z-index: 5;
  pointer-events: auto;
}
.em-phase {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 4px 2px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  backdrop-filter: blur(4px);
  flex: 1;
  max-width: 60px;
  transition: all 0.2s;
}
.em-phase:hover {
  background: rgba(15, 23, 42, 0.9);
  transform: translateY(-2px);
}
.em-phase-active {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
}
.em-phase-svg {
  width: 22px;
  height: 22px;
}
.em-phase-name {
  font-size: 8px;
  color: #cbd5e1;
  white-space: nowrap;
}

.em-info {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  z-index: 10;
  min-width: 180px;
  max-width: 240px;
}
.em-info-name {
  font-size: 14px;
  font-weight: 800;
  color: #facc15;
  margin-bottom: 4px;
}
.em-info-fact {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
  color: #e2e8f0;
}
.em-mode-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 9px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.em-mode-btn.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}

.em-fade-enter-active,
.em-fade-leave-active {
  transition: opacity 0.2s;
}
.em-fade-enter-from,
.em-fade-leave-to {
  opacity: 0;
}
</style>
