<script setup lang="ts">
/**
 * SolarSystem — 太阳系行星轨道动画（SVG 版）
 *
 * 实现：
 * - 单一 SVG 视口，行星用 <g> + transform-origin: center + animateTransform 绕中心旋转
 * - 8 大行星按真实相对距离缩放（容器归一化）
 * - 公转周期按"水星 4s = 1 实际年"等比压缩
 * - 交互：点击行星显示该行星的数据卡
 * - 性能：纯 SVG 动画，移动端无压力
 */
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    speed?: number
    showLabels?: boolean
  }>(),
  { speed: 1, showLabels: true }
)

interface Planet {
  id: string
  name: string
  zh: string
  color: string
  /** 距日相对距离（0-1，1=视口半径） */
  orbit: number
  /** 公转周期（秒） */
  period: number
  /** 行星半径（SVG 单位） */
  size: number
  fact: string
}

const planets: Planet[] = [
  { id: 'mercury', name: 'Mercury', zh: '水星', color: '#a3a3a3', orbit: 0.18, period: 4, size: 3, fact: '离太阳最近，白天 430℃，晚上 -180℃' },
  { id: 'venus', name: 'Venus', zh: '金星', color: '#fcd34d', orbit: 0.26, period: 7, size: 4.5, fact: '太阳系最热的行星，表面 460℃' },
  { id: 'earth', name: 'Earth', zh: '地球', color: '#3b82f6', orbit: 0.36, period: 10, size: 5, fact: '我们的家，71% 被水覆盖' },
  { id: 'mars', name: 'Mars', zh: '火星', color: '#dc2626', orbit: 0.46, period: 15, size: 4, fact: '红色行星，有太阳系最大的山' },
  { id: 'jupiter', name: 'Jupiter', zh: '木星', color: '#fb923c', orbit: 0.60, period: 40, size: 10, fact: '太阳系最大的行星，能装下 1300 个地球' },
  { id: 'saturn', name: 'Saturn', zh: '土星', color: '#fde68a', orbit: 0.76, period: 60, size: 8.5, fact: '有壮观的土星环，由冰和岩石组成' },
  { id: 'uranus', name: 'Uranus', zh: '天王星', color: '#5eead4', orbit: 0.90, period: 90, size: 6, fact: '侧着身子转，像在"滚"着走' },
  { id: 'neptune', name: 'Neptune', zh: '海王星', color: '#60a5fa', orbit: 1.02, period: 120, size: 5.5, fact: '太阳系最远，风速可达 2100 km/h' },
]

const selected = ref<Planet | null>(null)
const showOrbits = ref(true)

/** 视口中心（100 单位半径） */
const VIEW_RADIUS = 100

/** 把 orbit 0-1 换算成 SVG 半径 */
const orbitRadius = (o: number) => o * VIEW_RADIUS

function selectPlanet(p: Planet) {
  selected.value = selected.value?.id === p.id ? null : p
}

function duration(period: number) {
  return `${period / props.speed}s`
}
</script>

<template>
  <div class="ss-wrap" @click.stop>
    <svg
      class="ss-svg"
      :viewBox="`-${VIEW_RADIUS + 8} -${VIEW_RADIUS + 8} ${(VIEW_RADIUS + 8) * 2} ${(VIEW_RADIUS + 8) * 2}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- 太阳 -->
      <g class="ss-sun">
        <circle r="8" fill="#facc15" opacity="0.3">
          <animate attributeName="r" values="8;14;8" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle r="6" fill="url(#sunGrad)" />
        <defs>
          <radialGradient id="sunGrad">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="60%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#f59e0b" />
          </radialGradient>
        </defs>
      </g>

      <!-- 轨道线（静态） -->
      <g v-if="showOrbits">
        <circle
          v-for="p in planets"
          :key="`ring-${p.id}`"
          :r="orbitRadius(p.orbit)"
          fill="none"
          stroke="rgba(148, 163, 184, 0.25)"
          stroke-width="0.2"
          stroke-dasharray="2,2"
        />
      </g>

      <!-- 行星（每颗用嵌套 g：外层定位 + 内层旋转） -->
      <g
        v-for="p in planets"
        :key="p.id"
        :transform="`translate(${orbitRadius(p.orbit)} 0)`"
      >
        <!-- 内层 g 旋转：旋转中心用 g 局部坐标 (-r, 0)，对应外层定位前的 SVG 全局 (0, 0) 即太阳 -->
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            :from="`0 ${-orbitRadius(p.orbit)} 0`"
            :to="`360 ${-orbitRadius(p.orbit)} 0`"
            :dur="duration(p.period)"
            repeatCount="indefinite"
          />
          <circle
            :r="p.size"
            :fill="p.color"
            :stroke="selected?.id === p.id ? '#facc15' : 'rgba(255,255,255,0.3)'"
            :stroke-width="selected?.id === p.id ? 0.6 : 0.2"
            class="ss-planet"
            @click.stop="selectPlanet(p)"
          >
            <title>{{ p.zh }}</title>
          </circle>
          <text
            v-if="showLabels"
            :y="-p.size - 2"
            text-anchor="middle"
            font-size="3.5"
            fill="rgba(255,255,255,0.75)"
            font-weight="600"
            class="ss-label"
          >
            {{ p.zh }}
          </text>
        </g>
      </g>
    </svg>

    <!-- 选中信息卡 -->
    <transition name="ss-fade">
      <div v-if="selected" class="ss-info">
        <button class="ss-info-close" @click="selected = null">×</button>
        <div class="ss-info-zh">{{ selected.zh }}</div>
        <div class="ss-info-en">{{ selected.name }}</div>
        <p class="ss-info-fact">{{ selected.fact }}</p>
        <div class="ss-info-meta">
          公转周期：{{ selected.period }}s（实际 {{ Math.round(selected.period / 4 * 88) }} 天 - {{ Math.round(selected.period / 4 * 165) }} 年）
        </div>
      </div>
    </transition>

    <!-- 控制条 -->
    <div class="ss-controls">
      <button
        class="ss-ctrl"
        :class="{ on: showOrbits }"
        @click="showOrbits = !showOrbits"
        title="显示/隐藏轨道"
      >
        ⭕ 轨道
      </button>
    </div>
  </div>
</template>

<style scoped>
.ss-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ss-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

/* 关键：行星 g 容器绕中心旋转 */
@keyframes ss-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ss-planet {
  cursor: pointer;
  transition: r 0.2s;
}
.ss-planet:hover {
  filter: brightness(1.3);
}

.ss-label {
  pointer-events: none;
  user-select: none;
}

/* 信息卡 */
.ss-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 14px 18px;
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.ss-info-close {
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
.ss-info-zh {
  font-size: 16px;
  font-weight: 800;
  color: #facc15;
}
.ss-info-en {
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 1px;
  margin-top: 2px;
}
.ss-info-fact {
  margin: 8px 0 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
}
.ss-info-meta {
  font-size: 10px;
  color: #64748b;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding-top: 6px;
}

/* 控制条 - 左下角，避开 ⏸ 按钮 */
.ss-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  gap: 6px;
}
.ss-ctrl {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.ss-ctrl.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}

.ss-fade-enter-active,
.ss-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.ss-fade-enter-from,
.ss-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
