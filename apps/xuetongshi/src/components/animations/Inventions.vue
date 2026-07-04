<script setup lang="ts">
/**
 * Inventions — 古代四大发明
 *   - 造纸术 / 活字印刷 / 火药 / 指南针
 */
import { ref } from 'vue'

const inventions = [
  {
    id: 'paper',
    name: '造纸术',
    en: 'Paper',
    year: '公元 105 年',
    by: '蔡伦',
    emoji: '📜',
    color: '#fbbf24',
    bg: 'linear-gradient(135deg, #451a03, #78350f)',
    desc: '把树皮、麻头等原料浸泡、捣烂、抄成薄片晾干。',
  },
  {
    id: 'print',
    name: '活字印刷',
    en: 'Movable Type',
    year: '公元 1041-1048 年',
    by: '毕昇',
    emoji: '🖨',
    color: '#a16207',
    bg: 'linear-gradient(135deg, #451a03, #92400e)',
    desc: '用胶泥刻字模，按需排版印刷，比雕版快得多。',
  },
  {
    id: 'gunpowder',
    name: '火药',
    en: 'Gunpowder',
    year: '唐代',
    by: '炼丹术士',
    emoji: '💥',
    color: '#dc2626',
    bg: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
    desc: '硝石+硫磺+木炭按比例混合，能剧烈燃烧爆炸。',
  },
  {
    id: 'compass',
    name: '指南针',
    en: 'Compass',
    year: '战国时期',
    by: '司南',
    emoji: '🧭',
    color: '#3b82f6',
    bg: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
    desc: '磁石磨成勺形，放在光滑铜盘上，勺柄指南。',
  },
]

const currentIndex = ref(0)
const current = ref(inventions[0])
</script>

<template>
  <div class="inv-wrap" @click.stop :style="{ background: current.bg, transition: 'background 0.6s' }">
    <svg class="inv-svg" viewBox="-110 -110 220 220">
      <defs>
        <radialGradient id="fireGrad">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#dc2626" />
        </radialGradient>
      </defs>

      <!-- 造纸术 -->
      <g v-if="current.id === 'paper'">
        <!-- 竹帘抄纸 -->
        <rect x="-60" y="-20" width="120" height="40" fill="none" stroke="#a16207" stroke-width="1.2" />
        <line v-for="i in 12" :key="i" :x1="-60 + i * 10" y1="-20" x2="-60 + i * 10" y2="20" stroke="#a16207" stroke-width="0.4" />
        <!-- 纸浆 -->
        <rect x="-60" y="-20" width="120" height="40" fill="#fcd34d" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.6;0.4" dur="2s" repeatCount="indefinite" />
        </rect>
        <!-- 水槽 -->
        <rect x="-70" y="20" width="140" height="30" fill="#3b82f6" opacity="0.5" />
        <!-- 抄纸动作 -->
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,15;0,0" dur="3s" repeatCount="indefinite" />
          <rect x="-60" y="-20" width="120" height="40" fill="none" stroke="#854d0e" stroke-width="2" />
        </g>
      </g>

      <!-- 活字印刷 -->
      <g v-else-if="current.id === 'print'">
        <!-- 字模格子 -->
        <g v-for="row in 4" :key="`r${row}`">
          <g v-for="col in 6" :key="`c${col}`" :transform="`translate(${-50 + col * 16} ${-30 + row * 16})`">
            <rect width="12" height="12" fill="#fcd34d" stroke="#a16207" stroke-width="0.4" />
            <text x="6" y="9" text-anchor="middle" font-size="6" :fill="current.color" font-weight="800">字</text>
          </g>
        </g>
        <!-- 墨刷 -->
        <g>
          <animateTransform attributeName="transform" type="translate" values="-50,-50;50,-50;-50,-50" dur="3s" repeatCount="indefinite" />
          <rect x="-8" y="0" width="16" height="3" fill="#1e293b" />
          <rect x="-2" y="3" width="4" height="10" fill="#a16207" />
        </g>
        <!-- 印出来的纸 -->
        <rect x="-50" y="40" width="100" height="20" fill="#fef3c7" stroke="#a16207" stroke-width="0.6">
          <animate attributeName="opacity" values="0;1;1" dur="3s" repeatCount="indefinite" />
        </rect>
      </g>

      <!-- 火药 -->
      <g v-else-if="current.id === 'gunpowder'">
        <!-- 炼丹炉 -->
        <rect x="-25" y="-10" width="50" height="40" fill="#475569" stroke="#1e293b" stroke-width="0.8" rx="2" />
        <rect x="-30" y="-15" width="60" height="6" fill="#64748b" />
        <ellipse cx="0" cy="-15" rx="20" ry="3" fill="#1e293b" />
        <!-- 火苗 -->
        <g>
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
          <path d="M -8 -15 Q 0 -30 8 -15 Q 5 -20 0 -22 Q -5 -20 -8 -15 Z" fill="url(#fireGrad)" />
        </g>
        <!-- 烟 -->
        <ellipse cx="0" cy="-30" rx="14" ry="6" fill="#9ca3af" opacity="0.4">
          <animate attributeName="cy" values="-30;-50" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0" dur="3s" repeatCount="indefinite" />
        </ellipse>
        <!-- 爆炸火花 -->
        <circle v-for="i in 8" :key="i" r="1.5" :fill="i % 2 === 0 ? '#fde047' : '#f97316'">
          <animateMotion dur="2s" repeatCount="indefinite" :path="`M 0 -20 L ${Math.cos(i * 0.785) * 40} ${-20 + Math.sin(i * 0.785) * 40}`" />
        </circle>
      </g>

      <!-- 指南针 -->
      <g v-else>
        <!-- 底盘（铜盘） -->
        <circle r="55" fill="#a16207" stroke="#854d0e" stroke-width="1" />
        <circle r="50" fill="none" stroke="#451a03" stroke-width="0.6" />
        <!-- 24 向 -->
        <line v-for="i in 24" :key="i" :x1="0" :y1="-50" :x2="0" :y2="-46"
          :transform="`rotate(${i * 15})`" stroke="#1e293b" stroke-width="0.4" />
        <!-- N/S/E/W -->
        <text y="-38" text-anchor="middle" font-size="6" fill="#dc2626" font-weight="800">N</text>
        <text y="42" text-anchor="middle" font-size="6" fill="#1e293b" font-weight="800">S</text>
        <text x="-40" y="3" text-anchor="middle" font-size="6" fill="#1e293b" font-weight="800">W</text>
        <text x="40" y="3" text-anchor="middle" font-size="6" fill="#1e293b" font-weight="800">E</text>
        <!-- 磁勺 -->
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-10;10;-10" dur="3s" repeatCount="indefinite" />
          <path d="M 0 -20 Q -5 -10 -5 5 Q 0 8 5 5 Q 5 -10 0 -20 Z" fill="#1e293b" stroke="#facc15" stroke-width="0.6" />
          <circle cx="0" cy="-10" r="2" fill="#facc15" />
        </g>
        <!-- 中心 -->
        <circle r="2" fill="#1e293b" />
      </g>

      <text x="-100" y="-95" font-size="6" :fill="current.color" font-weight="700">{{ current.emoji }} {{ current.name }}</text>
    </svg>

    <!-- 信息卡 -->
    <div class="inv-info">
      <div class="inv-info-row">
        <span class="inv-info-year">{{ current.year }}</span>
        <span class="inv-info-by">{{ current.by }}</span>
      </div>
      <p class="inv-info-desc">{{ current.desc }}</p>
    </div>

    <!-- 切换按钮 -->
    <div class="inv-tabs">
      <button
        v-for="(inv, i) in inventions"
        :key="inv.id"
        class="inv-tab"
        :class="{ on: currentIndex === i }"
        :style="{ borderColor: currentIndex === i ? inv.color : undefined, color: currentIndex === i ? inv.color : undefined }"
        @click="currentIndex = i; current = inventions[i]"
      >
        {{ inv.emoji }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.inv-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.6s;
}
.inv-svg { width: 100%; height: 100%; }

.inv-info {
  position: absolute;
  bottom: 50px;
  left: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  color: #f1f5f9;
  z-index: 10;
  backdrop-filter: blur(8px);
}
.inv-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 4px;
}
.inv-info-year {
  color: #facc15;
  font-weight: 700;
}
.inv-info-by {
  color: #cbd5e1;
}
.inv-info-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
}

.inv-tabs {
  position: absolute;
  bottom: 8px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.inv-tab {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.inv-tab.on {
  background: rgba(255, 255, 255, 0.1);
}
</style>
