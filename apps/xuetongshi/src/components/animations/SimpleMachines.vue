<script setup lang="ts">
/**
 * SimpleMachines — 简单机械（4 种 Tab 切换）
 *   - 杠杆、滑轮、斜面、齿轮
 */
import { ref } from 'vue'

type Mode = 'lever' | 'pulley' | 'incline' | 'gear'
const mode = ref<Mode>('lever')

const effort = ref(20)
const load = ref(60)
const ratio = computed(() => (load.value / effort.value).toFixed(1))
</script>

<template>
  <div class="sm-wrap" @click.stop>
    <svg class="sm-svg" viewBox="-110 -110 220 220">
      <!-- 杠杆 -->
      <g v-if="mode === 'lever'">
        <line x1="-100" y1="60" x2="100" y2="60" stroke="#a16207" stroke-width="6" stroke-linecap="round" />
        <polygon points="0,60 -5,75 5,75" fill="#a16207" />
        <circle cx="-60" cy="0" r="6" fill="#dc2626">
          <animate attributeName="cy" values="0;15;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="0" r="4" fill="#3b82f6">
          <animate attributeName="cy" values="0;5;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="-60" y="-12" text-anchor="middle" font-size="5" fill="#fca5a5" font-weight="700">用力 {{ effort }}N</text>
        <text x="60" y="-12" text-anchor="middle" font-size="5" fill="#93c5fd" font-weight="700">重物 {{ load }}N</text>
        <text x="0" y="85" text-anchor="middle" font-size="5" fill="#fbbf24" font-weight="700">省力倍数 {{ ratio }}x</text>
      </g>

      <!-- 滑轮 -->
      <g v-else-if="mode === 'pulley'">
        <rect x="-3" y="-80" width="6" height="20" fill="#475569" />
        <line x1="0" y1="-60" x2="0" y2="40" stroke="#1e293b" stroke-width="2" />
        <circle cx="0" cy="-40" r="20" fill="none" stroke="#a16207" stroke-width="4" />
        <line x1="-20" y1="-40" x2="20" y2="-40" stroke="#94a3b8" stroke-width="1.5" />
        <circle cx="0" cy="40" r="8" fill="#3b82f6">
          <animate attributeName="cy" values="40;20;40" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <text y="60" text-anchor="middle" font-size="5" fill="#93c5fd" font-weight="700">重物 {{ load }}N</text>
        <text y="-100" text-anchor="middle" font-size="5" fill="#fbbf24" font-weight="700">动滑轮 省力</text>
      </g>

      <!-- 斜面 -->
      <g v-else-if="mode === 'incline'">
        <polygon points="-80,80 80,80 80,-50" fill="#78716c" stroke="#1c1917" stroke-width="0.8" />
        <circle cx="-40" cy="55" r="6" fill="#dc2626">
          <animateTransform attributeName="transform" type="translate" values="-40,55; 40,-15; -40,55" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x="-80" y="-50" font-size="5" fill="#fde047" font-weight="700">斜面</text>
        <text x="0" y="95" text-anchor="middle" font-size="5" fill="#fbbf24" font-weight="700">省力 {{ ratio }}x</text>
      </g>

      <!-- 齿轮 -->
      <g v-else>
        <g transform="translate(-30 0)">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="3s" repeatCount="indefinite" additive="sum" />
          <circle r="22" fill="none" stroke="#a16207" stroke-width="3" />
          <circle r="6" fill="#1c1917" />
          <g v-for="i in 8" :key="i" :transform="`rotate(${i * 45})`">
            <rect x="20" y="-2" width="6" height="4" fill="#a16207" />
          </g>
        </g>
        <g transform="translate(40 0)">
          <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="3s" repeatCount="indefinite" additive="sum" />
          <circle r="13" fill="none" stroke="#fbbf24" stroke-width="3" />
          <circle r="4" fill="#1c1917" />
          <g v-for="i in 6" :key="i" :transform="`rotate(${i * 60})`">
            <rect x="12" y="-1.5" width="4" height="3" fill="#fbbf24" />
          </g>
        </g>
        <text x="0" y="50" text-anchor="middle" font-size="5" fill="#fbbf24" font-weight="700">齿轮传动</text>
      </g>
    </svg>

    <!-- Tab 切换 -->
    <div class="sm-tabs">
      <button
        v-for="t in (['lever', 'pulley', 'incline', 'gear'] as Mode[])"
        :key="t"
        class="sm-tab"
        :class="{ on: mode === t }"
        @click="mode = t"
      >
        {{ t === 'lever' ? '⚖️ 杠杆' : t === 'pulley' ? '🪝 滑轮' : t === 'incline' ? '📐 斜面' : '⚙️ 齿轮' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.sm-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #78350f 0%, #451a03 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sm-svg { width: 100%; height: 100%; }
.sm-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.sm-tab {
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
.sm-tab.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
