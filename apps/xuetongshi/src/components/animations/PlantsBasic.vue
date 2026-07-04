<script setup lang="ts">
/**
 * PlantsBasic — 植物六大器官（根/茎/叶/花/果实/种子）
 *   - 6 个 Tab 切换
 *   - 种子发芽过程动画
 */
import { ref, computed } from 'vue'

const organ = ref<'root' | 'stem' | 'leaf' | 'flower' | 'fruit' | 'seed'>('root')
</script>

<template>
  <div class="pb-wrap" @click.stop>
    <svg class="pb-svg" viewBox="-110 -110 220 220">
      <!-- 地面线 -->
      <line x1="-100" y1="0" x2="100" y2="0" stroke="#a16207" stroke-width="0.8" />
      <line x1="-100" y1="3" x2="100" y2="3" stroke="#854d0e" stroke-width="0.4" />

      <!-- 通用茎（始终显示） -->
      <rect x="-1.5" y="-40" width="3" height="40" fill="#15803d" />

      <!-- 根（地下） -->
      <g v-if="organ === 'root'">
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,2;0,-2;0,2" dur="3s" repeatCount="indefinite" />
          <path d="M 0 0 Q -8 10 -15 18" stroke="#a16207" stroke-width="1.5" fill="none" />
          <path d="M 0 0 Q 8 12 18 20" stroke="#a16207" stroke-width="1.5" fill="none" />
          <path d="M 0 0 Q -2 18 0 25" stroke="#a16207" stroke-width="1.5" fill="none" />
          <path d="M 0 0 Q 4 8 8 12" stroke="#a16207" stroke-width="1.2" fill="none" />
          <path d="M 0 0 Q -4 8 -8 12" stroke="#a16207" stroke-width="1.2" fill="none" />
          <!-- 根尖 -->
          <circle cx="-15" cy="18" r="1.5" fill="#facc15" opacity="0.6" />
          <circle cx="18" cy="20" r="1.5" fill="#facc15" opacity="0.6" />
        </g>
      </g>

      <!-- 茎（特写） -->
      <g v-else-if="organ === 'stem'">
        <rect x="-1.5" y="-40" width="3" height="40" fill="#15803d" />
        <line x1="-1.5" y1="-30" x2="1.5" y2="-30" stroke="#86efac" stroke-width="0.4" />
        <line x1="-1.5" y1="-20" x2="1.5" y2="-20" stroke="#86efac" stroke-width="0.4" />
        <line x1="-1.5" y1="-10" x2="1.5" y2="-10" stroke="#86efac" stroke-width="0.4" />
        <!-- 水分向上运输 -->
        <text v-for="i in 4" :key="`w${i}`" font-size="8" fill="#7dd3fc">
          <animateMotion dur="2s" :begin="i * 0.5 + 's'" repeatCount="indefinite" path="M 0 0 L 0 -40" />
          💧
        </text>
        <text y="-50" text-anchor="middle" font-size="6" fill="#15803d" font-weight="700">茎</text>
      </g>

      <!-- 叶 -->
      <g v-else-if="organ === 'leaf'">
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-3 0 0; 3 0 0; -3 0 0" dur="3s" repeatCount="indefinite" />
          <ellipse cx="-20" cy="-25" rx="14" ry="7" fill="url(#leafGrad2)" stroke="#14532d" stroke-width="0.6" transform="rotate(-30 -20 -25)" />
          <ellipse cx="20" cy="-25" rx="14" ry="7" fill="url(#leafGrad2)" stroke="#14532d" stroke-width="0.6" transform="rotate(30 20 -25)" />
        </g>
        <defs>
          <linearGradient id="leafGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#86efac" />
            <stop offset="100%" stop-color="#15803d" />
          </linearGradient>
        </defs>
      </g>

      <!-- 花 -->
      <g v-else-if="organ === 'flower'">
        <g>
          <animateTransform attributeName="transform" type="scale" values="1;1.05;1" dur="2s" repeatCount="indefinite" additive="sum" />
          <ellipse v-for="i in 6" :key="`p${i}`" :cx="Math.cos(i) * 8" :cy="-50 + Math.sin(i) * 8" rx="6" ry="3" :fill="i % 2 === 0 ? '#f9a8d4' : '#fb7185'" :transform="`rotate(${i * 60} 0 -50)`" />
          <circle cx="0" cy="-50" r="4" fill="#facc15" />
        </g>
      </g>

      <!-- 果实 -->
      <g v-else-if="organ === 'fruit'">
        <g>
          <animateTransform attributeName="transform" type="scale" values="0.9;1.05;0.9" dur="2s" repeatCount="indefinite" additive="sum" />
          <circle cx="-15" cy="-35" r="8" fill="#dc2626" />
          <circle cx="15" cy="-35" r="8" fill="#dc2626" />
          <circle cx="0" cy="-25" r="8" fill="#dc2626" />
          <line x1="-15" y1="-43" x2="-15" y2="-50" stroke="#15803d" stroke-width="0.6" />
          <line x1="15" y1="-43" x2="15" y2="-50" stroke="#15803d" stroke-width="0.6" />
        </g>
      </g>

      <!-- 种子发芽 -->
      <g v-else>
        <ellipse cx="0" cy="5" rx="8" ry="3" fill="#a16207" />
        <!-- 芽长出来 -->
        <g>
          <animateTransform attributeName="transform" type="scale" values="0.3;1.2;1" dur="4s" repeatCount="indefinite" additive="sum" />
          <line x1="0" y1="3" x2="0" y2="-20" stroke="#22c55e" stroke-width="1.5" />
          <ellipse cx="-3" cy="-18" rx="3" ry="1.5" fill="#86efac" transform="rotate(-30 -3 -18)" />
          <ellipse cx="3" cy="-15" rx="3" ry="1.5" fill="#86efac" transform="rotate(30 3 -15)" />
        </g>
        <text y="15" text-anchor="middle" font-size="5" fill="#854d0e" font-weight="700">种子 → 幼苗</text>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="organ === 'root' ? '#a16207' : organ === 'stem' ? '#15803d' : organ === 'leaf' ? '#22c55e' : organ === 'flower' ? '#f9a8d4' : organ === 'fruit' ? '#dc2626' : '#86efac'" font-weight="700">
        🌱 {{ organ === 'root' ? '根' : organ === 'stem' ? '茎' : organ === 'leaf' ? '叶' : organ === 'flower' ? '花' : organ === 'fruit' ? '果实' : '种子发芽' }}
      </text>
    </svg>

    <div class="pb-tabs">
      <button
        v-for="o in (['root', 'stem', 'leaf', 'flower', 'fruit', 'seed'] as const)"
        :key="o"
        class="pb-tab"
        :class="{ on: organ === o }"
        @click="organ = o"
      >
        {{ o === 'root' ? '根' : o === 'stem' ? '茎' : o === 'leaf' ? '叶' : o === 'flower' ? '花' : o === 'fruit' ? '果' : '种' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pb-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #86efac 0%, #fef3c7 60%, #a16207 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pb-svg { width: 100%; height: 100%; }
.pb-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.pb-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.pb-tab.on {
  background: rgba(34, 197, 94, 0.2);
  border-color: #22c55e;
  color: #22c55e;
}
</style>
