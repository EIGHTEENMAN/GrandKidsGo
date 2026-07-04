<script setup lang="ts">
/**
 * Transport — 交通技术（车/船/飞机/高铁 速度对比）
 */
import { ref, computed } from 'vue'

const vehicles = [
  { name: '步行', emoji: '🚶', speed: 5, color: '#a3a3a3', desc: '约 5 km/h' },
  { name: '自行车', emoji: '🚴', speed: 25, color: '#22c55e', desc: '约 25 km/h' },
  { name: '汽车', emoji: '🚗', speed: 80, color: '#3b82f6', desc: '约 80 km/h' },
  { name: '高铁', emoji: '🚄', speed: 300, color: '#facc15', desc: '约 300 km/h' },
  { name: '飞机', emoji: '✈️', speed: 800, color: '#a78bfa', desc: '约 800 km/h' },
  { name: '火箭', emoji: '🚀', speed: 28000, color: '#dc2626', desc: '约 28000 km/h' },
]

const maxSpeed = computed(() => Math.max(...vehicles.map(v => v.speed)))
</script>

<template>
  <div class="tr-wrap" @click.stop>
    <svg class="tr-svg" viewBox="-110 -110 220 220">
      <!-- 起点线 -->
      <line x1="-100" y1="50" x2="100" y2="50" stroke="#facc15" stroke-width="0.6" stroke-dasharray="2,2" />
      <!-- 速度条 -->
      <g v-for="(v, i) in vehicles" :key="i" :transform="`translate(${-100} ${-70 + i * 18})`">
        <!-- 标签 -->
        <text x="0" y="3" font-size="9" :fill="v.color" font-weight="700">{{ v.emoji }} {{ v.name }}</text>
        <!-- 速度条背景 -->
        <rect x="40" y="-4" width="100" height="6" fill="#1e293b" stroke="#475569" stroke-width="0.3" rx="2" />
        <!-- 速度条填充（按速度） -->
        <rect x="40" y="-4" :width="(v.speed / maxSpeed) * 100" height="6" :fill="v.color" rx="2" />
        <!-- 速度数字 -->
        <text x="148" y="3" font-size="6" fill="#cbd5e1" font-weight="600">{{ v.speed }}</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#facc15" font-weight="700">🚗 速度对比 (km/h)</text>
    </svg>

    <div class="tr-info">
      <div class="tr-info-title">💡 你知道吗？</div>
      <p>从步行到火箭，速度差 <strong>5600 倍</strong>！人类花了 5000 年才从 5 km/h 走到 800 km/h。</p>
    </div>
  </div>
</template>

<style scoped>
.tr-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #0c4a6e 0%, #082f49 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tr-svg { width: 100%; height: 100%; }
.tr-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  color: #e2e8f0;
  z-index: 10;
  font-size: 11px;
  line-height: 1.4;
  backdrop-filter: blur(8px);
}
.tr-info-title {
  font-size: 12px;
  font-weight: 800;
  color: #facc15;
  margin-bottom: 4px;
}
.tr-info strong {
  color: #facc15;
}
</style>
