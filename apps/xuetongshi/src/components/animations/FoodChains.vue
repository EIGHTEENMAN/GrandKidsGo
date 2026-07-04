<script setup lang="ts">
/**
 * FoodChains — 食物链
 *
 * 设计：4 级能量流动
 *   草（生产者）→ 兔（初级消费者）→ 狐（二级）→ 狼（三级）
 *   能量逐级递减
 */
import { ref, computed } from 'vue'

const links = [
  { name: '草', emoji: '🌱', level: '生产者', energy: 100, color: '#22c55e' },
  { name: '兔', emoji: '🐇', level: '初级消费者', energy: 50, color: '#a3a3a3' },
  { name: '狐', emoji: '🦊', level: '二级消费者', energy: 25, color: '#f97316' },
  { name: '狼', emoji: '🐺', level: '三级消费者', energy: 10, color: '#78716c' },
]
</script>

<template>
  <div class="fc-wrap" @click.stop>
    <svg class="fc-svg" viewBox="-110 -110 220 220">
      <!-- 能量金字塔背景 -->
      <g>
        <polygon points="-90,80 90,80 70,40 -70,40" fill="#1e293b" stroke="#475569" stroke-width="0.6" />
        <polygon points="-70,40 70,40 50,-20 -50,-20" fill="#1e293b" stroke="#475569" stroke-width="0.6" />
        <polygon points="-50,-20 50,-20 30,-70 -30,-70" fill="#1e293b" stroke="#475569" stroke-width="0.6" />
        <polygon points="-30,-70 30,-70 10,-95 -10,-95" fill="#1e293b" stroke="#475569" stroke-width="0.6" />
      </g>

      <!-- 4 级生物 + 能量柱 -->
      <g v-for="(link, i) in links" :key="i" :transform="`translate(${i % 2 === 0 ? -50 : 50} ${60 - i * 50})`">
        <!-- 能量条 -->
        <rect :x="-20" :y="-12" width="40" height="6" fill="#1e293b" stroke="#475569" stroke-width="0.4" rx="3" />
        <rect :x="-20" :y="-12" :width="40 * link.energy / 100" height="6" :fill="link.color" rx="3" />

        <!-- emoji -->
        <text text-anchor="middle" y="0" font-size="28">{{ link.emoji }}</text>
        <text text-anchor="middle" y="14" font-size="5" :fill="link.color" font-weight="700">{{ link.name }}</text>
        <text text-anchor="middle" y="22" font-size="4" fill="#94a3b8">{{ link.level }}</text>
        <text text-anchor="middle" y="30" font-size="4" fill="#facc15" font-weight="700">{{ link.energy }}% 能量</text>
      </g>

      <!-- 能量流动箭头 -->
      <g>
        <circle r="2" fill="#fbbf24">
          <animateMotion dur="3s" repeatCount="indefinite" path="M -50 60 L 50 60" />
        </circle>
        <circle r="2" fill="#fbbf24">
          <animateMotion dur="3s" begin="0.5s" repeatCount="indefinite" path="M -50 60 L 50 60" />
        </circle>
        <circle r="2" fill="#fbbf24">
          <animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M -50 60 L 50 60" />
        </circle>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#facc15" font-weight="700">🌿 食物链</text>
    </svg>

    <div class="fc-info">
      <div class="fc-info-title">能量流动规律</div>
      <p>每级只有 <strong style="color: #facc15">10-20%</strong> 能量传递给下一级，80% 在呼吸/运动中消耗。</p>
      <p style="color: #94a3b8; font-size: 9px; margin-top: 4px">所以狼比草少得多——生态塔尖最稀有。</p>
    </div>
  </div>
</template>

<style scoped>
.fc-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #14532d 0%, #052e16 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fc-svg { width: 100%; height: 100%; }

.fc-info {
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
.fc-info-title {
  font-size: 12px;
  font-weight: 800;
  color: #facc15;
  margin-bottom: 4px;
}
</style>
