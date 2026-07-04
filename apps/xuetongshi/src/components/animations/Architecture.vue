<script setup lang="ts">
/**
 * Architecture — 建筑奇观（按 topicId 路由）
 *
 * 多合一：
 *   - architecture 建筑艺术
 *   - chinese-painting 留白
 *   - ceramic 陶瓷
 *   - architecture-art 建筑艺术
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type Building = 'greatwall' | 'forbidden' | 'pyramid' | 'taj' | 'pantheon' | 'parthenon' | 'pottery' | 'temple'
const currentBuilding = computed<Building>(() => {
  if (props.topicId === 'ceramic-art') return 'pottery'
  if (props.topicId === 'architecture-art') return 'temple'
  return 'greatwall'
})
</script>

<template>
  <div class="arc-wrap" @click.stop>
    <svg class="arc-svg" viewBox="-110 -110 220 220">
      <!-- 长城（烽火台） -->
      <g v-if="currentBuilding === 'greatwall'">
        <rect x="-100" y="-80" width="200" height="160" fill="#1e3a8a" opacity="0.3" />
        <!-- 远山 -->
        <path d="M -100 0 Q -50 -40 0 -20 Q 50 0 100 -30" fill="none" stroke="#475569" stroke-width="0.6" />
        <!-- 长城主体（沿山脊） -->
        <path d="M -100 30 Q -50 -10 0 0 Q 50 20 100 0 L 100 35 Q 50 55 0 35 Q -50 25 -100 45 Z"
          fill="#854d0e" stroke="#451a03" stroke-width="0.6" />
        <!-- 烽火台 -->
        <g v-for="(t, i) in [-70, -25, 25, 70]" :key="i" :transform="`translate(${t} ${i % 2 === 0 ? -10 : 10})`">
          <rect x="-5" y="-15" width="10" height="15" fill="#a16207" stroke="#451a03" stroke-width="0.4" />
          <rect x="-7" y="-20" width="14" height="6" fill="#854d0e" />
          <!-- 垛口 -->
          <rect v-for="j in 3" :key="j" :x="-5 + (j - 1) * 4" y="-15" width="2" height="3" fill="#451a03" />
        </g>
        <!-- 飘动的云 -->
        <ellipse cx="0" cy="-50" rx="20" ry="5" fill="#cbd5e1" opacity="0.3">
          <animate attributeName="cx" values="-30;30;-30" dur="10s" repeatCount="indefinite" />
        </ellipse>
        <text x="0" y="80" text-anchor="middle" font-size="5" fill="#a16207" font-weight="700">万里长城（21000 km）</text>
      </g>

      <!-- 故宫 -->
      <g v-else-if="currentBuilding === 'forbidden'">
        <rect x="-80" y="-50" width="160" height="100" fill="#fde68a" opacity="0.2" />
        <!-- 城墙 -->
        <rect x="-80" y="20" width="160" height="30" fill="#dc2626" stroke="#7c2d12" stroke-width="0.6" />
        <!-- 主殿（三大殿） -->
        <g v-for="(h, i) in 3" :key="i" :transform="`translate(${-50 + i * 50} -10)`">
          <!-- 屋顶（曲线型） -->
          <path d="M -22 0 Q 0 -25 22 0 Z" fill="#facc15" stroke="#7c2d12" stroke-width="0.6" />
          <rect x="-22" y="0" width="44" height="20" fill="#dc2626" />
          <rect x="-18" y="20" width="36" height="6" fill="#a16207" />
          <!-- 柱子 -->
          <line x1="-15" y1="6" x2="-15" y2="20" stroke="#7c2d12" stroke-width="0.5" />
          <line x1="0" y1="6" x2="0" y2="20" stroke="#7c2d12" stroke-width="0.5" />
          <line x1="15" y1="6" x2="15" y2="20" stroke="#7c2d12" stroke-width="0.5" />
        </g>
        <text x="0" y="80" text-anchor="middle" font-size="5" fill="#dc2626" font-weight="700">故宫（红墙黄瓦）</text>
      </g>

      <!-- 金字塔 -->
      <g v-else-if="currentBuilding === 'pyramid'">
        <rect x="-100" y="-20" width="200" height="100" fill="#fef3c7" />
        <rect x="-100" y="20" width="200" height="60" fill="#fde68a" />
        <!-- 金字塔 -->
        <polygon points="-60,40 0,-50 60,40" fill="#a16207" stroke="#451a03" stroke-width="0.6" />
        <!-- 石块纹理 -->
        <line v-for="i in 5" :key="i" :x1="-50 + i * 20" y1="40" :x2="0" y2="-50" stroke="#451a03" stroke-width="0.3" />
        <line v-for="i in 5" :key="i" :x1="50 - i * 20" y1="40" :x2="0" y2="-50" stroke="#451a03" stroke-width="0.3" />
        <!-- 阳光 -->
        <line x1="-80" y1="-60" x2="0" y2="-30" stroke="#facc15" stroke-width="0.6">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </line>
        <text x="0" y="70" text-anchor="middle" font-size="5" fill="#92400e" font-weight="700">金字塔（古埃及）</text>
      </g>

      <!-- 泰姬陵 -->
      <g v-else-if="currentBuilding === 'taj'">
        <rect x="-100" y="-50" width="200" height="100" fill="#fdf2f8" />
        <!-- 主体 -->
        <rect x="-30" y="-20" width="60" height="60" fill="white" stroke="#a16207" stroke-width="0.6" />
        <!-- 圆顶 -->
        <ellipse cx="0" cy="-30" rx="20" ry="15" fill="white" stroke="#a16207" stroke-width="0.6" />
        <ellipse cx="0" cy="-50" rx="3" ry="8" fill="#facc15" />
        <!-- 4 个尖塔 -->
        <rect v-for="(t, i) in [-50, -20, 20, 50]" :key="i" :x="t - 2" y="-10" width="4" height="50" fill="white" stroke="#a16207" stroke-width="0.4" />
        <polygon v-for="(t, i) in [-50, -20, 20, 50]" :key="`p${i}`" :points="`${t - 2},-10 ${t + 2},-10 ${t},-20`" fill="#facc15" />
        <!-- 倒影（水池） -->
        <rect x="-100" y="40" width="200" height="10" fill="#7dd3fc" opacity="0.4" />
        <text x="0" y="70" text-anchor="middle" font-size="5" fill="#be185d" font-weight="700">泰姬陵（印度）</text>
      </g>

      <!-- 陶瓷（拉坯） -->
      <g v-else-if="currentBuilding === 'pottery'">
        <!-- 拉坯机 -->
        <rect x="-50" y="30" width="100" height="20" fill="#7c2d12" />
        <ellipse cx="0" cy="30" rx="50" ry="5" fill="#92400e" />
        <!-- 泥团（拉坯中旋转） -->
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="3s" repeatCount="indefinite" />
          <path d="M -25 30 L -20 -10 Q -20 -15 0 -15 Q 20 -15 20 -10 L 25 30 Z" fill="#a16207" stroke="#7c2d12" stroke-width="0.6" />
          <line v-for="i in 4" :key="i" x1="-22" :y1="-5 + i * 8" x2="22" :y2="-5 + i * 8" stroke="#7c2d12" stroke-width="0.4" />
        </g>
        <!-- 师傅的手 -->
        <g>
          <ellipse cx="-30" cy="0" rx="6" ry="3" fill="#fde68a" />
          <ellipse cx="30" cy="0" rx="6" ry="3" fill="#fde68a" />
        </g>
        <text x="0" y="70" text-anchor="middle" font-size="5" fill="#92400e" font-weight="700">陶瓷拉坯</text>
      </g>

      <!-- 通用建筑（亭台楼阁） -->
      <g v-else>
        <rect x="-50" y="0" width="100" height="50" fill="#dc2626" />
        <!-- 飞檐 -->
        <path d="M -60 0 Q 0 -35 60 0 Z" fill="#facc15" stroke="#7c2d12" stroke-width="0.6" />
        <path d="M -55 -5 Q 0 -28 55 -5" fill="#dc2626" stroke="#7c2d12" stroke-width="0.4" />
        <!-- 柱 -->
        <line x1="-40" y1="0" x2="-40" y2="50" stroke="#7c2d12" stroke-width="0.6" />
        <line x1="40" y1="0" x2="40" y2="50" stroke="#7c2d12" stroke-width="0.6" />
        <!-- 灯笼 -->
        <ellipse cx="0" cy="20" rx="4" ry="6" fill="#dc2626" />
        <line x1="0" y1="14" x2="0" y2="0" stroke="#7c2d12" stroke-width="0.4" />
        <text x="0" y="70" text-anchor="middle" font-size="5" fill="#dc2626" font-weight="700">古建筑（飞檐+红柱）</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fde047" font-weight="700">🏯 {{ currentBuilding === 'greatwall' ? '长城' : currentBuilding === 'forbidden' ? '故宫' : currentBuilding === 'pyramid' ? '金字塔' : currentBuilding === 'taj' ? '泰姬陵' : currentBuilding === 'pottery' ? '陶瓷' : '古建筑' }}</text>
    </svg>

    <div class="arc-info">
      <p v-if="currentBuilding === 'greatwall'">万里长城，人类史上最伟大的工程之一。</p>
      <p v-else-if="currentBuilding === 'forbidden'">明清两朝皇宫，红墙黄瓦彰显皇权。</p>
      <p v-else-if="currentBuilding === 'pyramid'">古埃及法老陵墓，4500 年屹立不倒。</p>
      <p v-else-if="currentBuilding === 'taj'">印度莫卧儿皇帝为爱妃所建，永恒爱情的象征。</p>
      <p v-else-if="currentBuilding === 'pottery'">手工拉坯，中国传统陶瓷工艺。</p>
      <p v-else>中国古代建筑讲究"飞檐翘角"。</p>
    </div>
  </div>
</template>

<style scoped>
.arc-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1e293b 0%, #451a03 50%, #1c1917 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.arc-svg { width: 100%; height: 100%; }
.arc-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  color: #fde047;
  z-index: 10;
  font-size: 11px;
  line-height: 1.4;
  backdrop-filter: blur(8px);
}
</style>
