<script setup lang="ts">
/**
 * Folklore — 民俗+建筑（按 topicId 路由）
 *
 * 多合一：
 *   - dragon-dance 舞龙
 *   - chinese-food 饮食
 *   - tea 中国茶
 *   - chinese-puzzle 象棋/麻将
 *   - safety 安全教育
 *   - 后续
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type View = 'dragon' | 'food' | 'tea' | 'puzzle' | 'safety'
const currentView = computed<View>(() => {
  if (props.topicId === 'chinese-food') return 'food'
  if (props.topicId === 'chinese-tea') return 'tea'
  if (props.topicId === 'chess') return 'puzzle'
  if (props.topicId?.startsWith('safety') || props.topicId?.startsWith('fire-') || props.topicId?.startsWith('traffic-') || props.topicId?.startsWith('water-') || props.topicId?.startsWith('electric-')) return 'safety'
  return 'dragon'
})
</script>

<template>
  <div class="fol-wrap" @click.stop>
    <svg class="fol-svg" viewBox="-110 -110 220 220">
      <!-- 舞龙 -->
      <g v-if="currentView === 'dragon'">
        <!-- 龙身（多段） -->
        <g v-for="(seg, i) in 8" :key="i" :style="{ animation: `fol-sway 2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }">
          <ellipse :cx="0" :cy="20 - i * 8" :rx="10" :ry="6" :fill="i === 0 ? '#facc15' : ['#dc2626', '#facc15', '#dc2626', '#facc15', '#dc2626', '#facc15', '#dc2626', '#facc15'][i - 1]" stroke="#7c2d12" stroke-width="0.4" />
        </g>
        <!-- 龙鳞 -->
        <g v-for="(seg, i) in 8" :key="`s${i}`" :style="{ animation: `fol-sway 2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }">
          <line v-for="j in 3" :key="j" :x1="-6 + j * 4" :y1="20 - i * 8" :x2="-6 + j * 4" :y2="14 - i * 8" stroke="#7c2d12" stroke-width="0.3" />
        </g>
        <!-- 龙珠（追球） -->
        <circle cx="0" cy="40" r="6" fill="#dc2626" stroke="#7c2d12" stroke-width="0.6">
          <animate attributeName="cy" values="40;30;40" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <text x="0" y="42" text-anchor="middle" font-size="4" fill="#facc15" font-weight="700">珠</text>
        <text x="-90" y="-80" font-size="4" fill="#fde047" font-weight="700">舞龙</text>
      </g>

      <!-- 饮食（八大菜系） -->
      <g v-else-if="currentView === 'food'">
        <!-- 餐盘 8 个 -->
        <g v-for="(food, i) in [
          { x: -70, y: -40, n: '鲁', c: '#dc2626' },
          { x: -50, y: -40, n: '川', c: '#f59e0b' },
          { x: -30, y: -40, n: '粤', c: '#22c55e' },
          { x: -10, y: -40, n: '苏', c: '#3b82f6' },
          { x: 10, y: -40, n: '浙', c: '#a78bfa' },
          { x: 30, y: -40, n: '闽', c: '#ec4899' },
          { x: 50, y: -40, n: '湘', c: '#f97316' },
          { x: 70, y: -40, n: '徽', c: '#14b8a6' },
        ]" :key="i" :transform="`translate(${food.x} ${food.y})`">
          <circle r="12" :fill="food.c" stroke="#7c2d12" stroke-width="0.6">
            <animate attributeName="r" values="12;14;12" :begin="i * 0.2 + 's'" dur="2s" repeatCount="indefinite" />
          </circle>
          <text text-anchor="middle" y="3" font-size="9" fill="white" font-weight="800">{{ food.n }}</text>
        </g>
        <!-- 筷子 -->
        <g transform="translate(0 40)">
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#7c2d12" stroke-width="1.5" />
          <line x1="-30" y1="3" x2="30" y2="3" stroke="#7c2d12" stroke-width="1.5" />
        </g>
        <text x="0" y="60" text-anchor="middle" font-size="5" fill="#fbbf24" font-weight="700">八大菜系</text>
      </g>

      <!-- 茶 -->
      <g v-else-if="currentView === 'tea'">
        <!-- 茶杯 -->
        <g transform="translate(0 20)">
          <ellipse rx="40" ry="8" fill="#fde68a" stroke="#a16207" stroke-width="0.6" />
          <ellipse cx="0" cy="0" rx="35" ry="6" fill="#854d0e" />
          <!-- 茶汤 -->
          <ellipse cx="0" cy="-2" rx="32" ry="4" fill="#15803d" opacity="0.6" />
          <!-- 蒸汽 -->
          <ellipse cx="0" cy="-15" rx="8" ry="3" fill="#94a3b8" opacity="0.3">
            <animate attributeName="cy" values="-15;-30" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-5" cy="-12" rx="6" ry="2" fill="#94a3b8" opacity="0.3">
            <animate attributeName="cy" values="-12;-25" dur="3s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
          </ellipse>
        </g>
        <text x="0" y="-50" text-anchor="middle" font-size="6" fill="#22c55e" font-weight="700">🍵 中国茶</text>
      </g>

      <!-- 象棋 -->
      <g v-else-if="currentView === 'puzzle'">
        <!-- 棋盘 -->
        <rect x="-50" y="-50" width="100" height="100" fill="#fcd34d" stroke="#854d0e" stroke-width="0.8" />
        <!-- 网格 -->
        <g v-for="i in 9" :key="`v${i}`">
          <line :x1="-50 + i * 12.5" y1="-50" :x2="-50 + i * 12.5" y2="50" stroke="#854d0e" stroke-width="0.3" />
        </g>
        <g v-for="i in 9" :key="`h${i}`">
          <line x1="-50" :y1="-50 + i * 12.5" x2="50" :y2="-50 + i * 12.5" stroke="#854d0e" stroke-width="0.3" />
        </g>
        <!-- 楚河汉界 -->
        <rect x="-50" y="-6" width="100" height="12" fill="none" stroke="#854d0e" stroke-width="0.4" />
        <text x="-25" y="3" text-anchor="middle" font-size="3" fill="#854d0e" font-weight="700">楚 河</text>
        <text x="25" y="3" text-anchor="middle" font-size="3" fill="#854d0e" font-weight="700">汉 界</text>
        <!-- 棋子 -->
        <circle cx="-30" cy="-30" r="4" fill="#fef3c7" stroke="#1e293b" stroke-width="0.5" />
        <text x="-30" y="-27" text-anchor="middle" font-size="3.5" fill="#1e293b" font-weight="700">车</text>
        <circle cx="30" cy="30" r="4" fill="#854d0e" stroke="#1e293b" stroke-width="0.5" />
        <text x="30" y="33" text-anchor="middle" font-size="3.5" fill="#fef3c7" font-weight="700">马</text>
        <circle cx="0" cy="0" r="4" fill="#fde68a" stroke="#dc2626" stroke-width="0.5">
          <animate attributeName="cx" values="0;10;0;-10;0" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x="0" y="3" text-anchor="middle" font-size="3.5" fill="#dc2626" font-weight="700">将</text>
      </g>

      <!-- 安全（警示牌） -->
      <g v-else>
        <polygon points="0,-50 50,40 -50,40" fill="#facc15" stroke="#1e293b" stroke-width="1.5" />
        <text text-anchor="middle" y="20" font-size="40" fill="#1e293b" font-weight="900">!</text>
        <text x="0" y="65" text-anchor="middle" font-size="6" fill="#fde047" font-weight="800">安全提示</text>
        <!-- 闪烁 -->
        <polygon points="0,-50 50,40 -50,40" fill="none" stroke="#dc2626" stroke-width="2" opacity="0.5">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" repeatCount="indefinite" />
        </polygon>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fde047" font-weight="700">🏮 {{ currentView === 'dragon' ? '舞龙' : currentView === 'food' ? '美食' : currentView === 'tea' ? '茶' : currentView === 'puzzle' ? '象棋' : '安全' }}</text>
    </svg>

    <div class="fol-info">
      <p v-if="currentView === 'dragon'">舞龙是中国传统民俗，源自汉代，象征吉祥。</p>
      <p v-else-if="currentView === 'food'">中国八大菜系：鲁川粤苏浙闽湘徽。</p>
      <p v-else-if="currentView === 'tea'">中国茶文化有 5000 年历史，讲究"和、静、清、寂"。</p>
      <p v-else-if="currentView === 'puzzle'">象棋起源于楚汉相争，"楚河汉界"是历史典故。</p>
      <p v-else>安全教育提醒，注意身边危险。</p>
    </div>
  </div>
</template>

<style scoped>
.fol-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #7c2d12 0%, #451a03 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fol-svg { width: 100%; height: 100%; }

@keyframes fol-sway {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-4px) rotate(2deg); }
}

.fol-info {
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
