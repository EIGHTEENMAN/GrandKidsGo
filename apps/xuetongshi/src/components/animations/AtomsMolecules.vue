<script setup lang="ts">
/**
 * AtomsMolecules — 原子结构（电子绕核）
 *
 * 设计：原子核 + 2 轨道 + 电子绕行
 * 点击切换不同元素（H/He/C/O）
 */
import { ref, computed } from 'vue'

interface Element {
  id: string
  name: string
  zh: string
  protons: number
  neutrons: number
  electrons: number
  color: string
}

const elements: Element[] = [
  { id: 'h', name: 'Hydrogen', zh: '氢', protons: 1, neutrons: 0, electrons: 1, color: '#ef4444' },
  { id: 'he', name: 'Helium', zh: '氦', protons: 2, neutrons: 2, electrons: 2, color: '#fbbf24' },
  { id: 'c', name: 'Carbon', zh: '碳', protons: 6, neutrons: 6, electrons: 6, color: '#64748b' },
  { id: 'o', name: 'Oxygen', zh: '氧', protons: 8, neutrons: 8, electrons: 8, color: '#3b82f6' },
]

const currentIndex = ref(0)
const current = computed(() => elements[currentIndex.value])

function next() {
  currentIndex.value = (currentIndex.value + 1) % elements.length
}
</script>

<template>
  <div class="at-wrap" @click.stop>
    <svg class="at-svg" viewBox="-110 -110 220 220">
      <!-- 原子核（中心） -->
      <g>
        <circle r="14" :fill="current.color" opacity="0.3">
          <animate attributeName="r" values="14;17;14" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle r="11" :fill="current.color" />
        <!-- 质子 + 中子（点状） -->
        <g>
          <circle v-for="i in current.protons" :key="`p${i}`" :cx="Math.cos(i * 1.7) * 6" :cy="Math.sin(i * 1.7) * 6" r="1.5" fill="#fecaca" />
          <circle v-for="i in current.neutrons" :key="`n${i}`" :cx="Math.cos(i * 1.7 + 0.5) * 6" :cy="Math.sin(i * 1.7 + 0.5) * 6" r="1.5" fill="#94a3b8" />
        </g>
      </g>

      <!-- 轨道 + 电子 -->
      <g v-for="orbit in [40, 70]" :key="`o${orbit}`" v-show="current.electrons > (orbit === 40 ? 0 : 1)">
        <ellipse :rx="orbit" :ry="orbit * 0.6" fill="none" stroke="rgba(148, 163, 184, 0.3)" stroke-width="0.4" stroke-dasharray="2,2" />
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            :to="orbit === 40 ? '360' : '-360'"
            :dur="orbit === 40 ? '3s' : '5s'"
            repeatCount="indefinite"
          />
          <circle :cx="orbit" :cy="0" r="3" fill="#60a5fa" stroke="#1e3a8a" stroke-width="0.5" />
        </g>
        <g v-if="current.electrons > 2 && orbit === 70">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="180"
            to="540"
            dur="5s"
            repeatCount="indefinite"
          />
          <circle :cx="orbit" :cy="0" r="3" fill="#60a5fa" stroke="#1e3a8a" stroke-width="0.5" />
        </g>
      </g>

      <!-- 元素信息 -->
      <text x="0" y="-90" text-anchor="middle" font-size="12" fill="#f8fafc" font-weight="800">{{ current.zh }}</text>
      <text x="0" y="-75" text-anchor="middle" font-size="5" :fill="current.color" font-weight="600">{{ current.name }}</text>

      <text x="-95" y="-95" font-size="5" fill="#94a3b8" font-weight="700">⚛️ 原子结构</text>
    </svg>

    <!-- 信息卡 -->
    <div class="at-info">
      <div class="at-info-row">
        <span>质子</span>
        <span class="at-num">{{ current.protons }}</span>
      </div>
      <div class="at-info-row">
        <span>中子</span>
        <span class="at-num">{{ current.neutrons }}</span>
      </div>
      <div class="at-info-row">
        <span>电子</span>
        <span class="at-num">{{ current.electrons }}</span>
      </div>
      <button class="at-next" @click="next">🔄 下一元素</button>
    </div>
  </div>
</template>

<style scoped>
.at-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.at-svg { width: 100%; height: 100%; }

.at-info {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  color: #e2e8f0;
  z-index: 10;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 100px;
  backdrop-filter: blur(8px);
}
.at-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.at-num {
  font-weight: 800;
  color: #facc15;
  font-size: 12px;
}
.at-next {
  margin-top: 4px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  border: none;
  color: white;
  font-size: 9px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
