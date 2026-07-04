<script setup lang="ts">
/**
 * Evolution — 进化与适应
 *
 * 设计：4 阶段形态渐变
 *   鱼（水中）→ 两栖（水陆）→ 爬行（陆地）→ 哺乳（多样）
 */
import { ref, computed } from 'vue'

const stage = ref(0)
const stages = [
  { name: '鱼', emoji: '🐟', color: '#3b82f6', desc: '用鳃呼吸，有鳍无肢' },
  { name: '两栖', emoji: '🐸', color: '#22c55e', desc: '幼体水栖，成体陆栖' },
  { name: '爬行', emoji: '🦎', color: '#a3a3a3', desc: '皮肤有鳞，能产卵' },
  { name: '哺乳', emoji: '🐆', color: '#f59e0b', desc: '胎生哺乳，体温恒定' },
]
</script>

<template>
  <div class="ev-wrap" @click.stop>
    <svg class="ev-svg" viewBox="-110 -110 220 220">
      <!-- 进化阶梯（4 个位置） -->
      <g v-for="(s, i) in stages" :key="i" :transform="`translate(${-80 + i * 53} 0)`">
        <!-- 阶梯块 -->
        <rect :x="-22" :y="20" width="44" height="40" :fill="i <= stage ? s.color : '#1e293b'" stroke="#475569" stroke-width="0.6" rx="4" />
        <!-- 阶梯高度递增 -->
        <rect :x="-22" :y="20 - (i + 1) * 6" width="44" height="6" :fill="i <= stage ? s.color : '#1e293b'" opacity="0.6" />

        <!-- 大 emoji -->
        <text text-anchor="middle" :y="-5" font-size="32" :opacity="i <= stage ? 1 : 0.3">{{ s.emoji }}</text>

        <!-- 标签 -->
        <text text-anchor="middle" :y="50" font-size="6" :fill="i === stage ? '#facc15' : '#cbd5e1'" font-weight="700">{{ s.name }}</text>
      </g>

      <!-- 箭头连接 -->
      <g>
        <path d="M -50 0 L 30 0" stroke="#475569" stroke-width="0.6" fill="none" marker-end="url(#arrow)" />
        <path d="M 0 0 L 80 0" stroke="#475569" stroke-width="0.6" fill="none" marker-end="url(#arrow)" opacity="0.5" />
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#475569" />
          </marker>
        </defs>
      </g>

      <text x="-100" y="-90" font-size="6" fill="#facc15" font-weight="700">🧬 进化阶梯</text>
    </svg>

    <!-- 描述卡 -->
    <transition name="ev-fade">
      <div class="ev-info" v-if="stage < stages.length">
        <div class="ev-info-name">{{ stages[stage].name }}阶段</div>
        <p class="ev-info-desc">{{ stages[stage].desc }}</p>
      </div>
    </transition>

    <div class="ev-controls">
      <button class="ev-btn" :disabled="stage === 0" @click="stage--">⏪ 上一步</button>
      <button class="ev-btn" :disabled="stage >= stages.length - 1" @click="stage++">⏩ 下一步</button>
      <button class="ev-btn ev-btn-play" @click="stage = (stage + 1) % stages.length">▶ 自动播放</button>
    </div>
  </div>
</template>

<style scoped>
.ev-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #14532d 0%, #052e16 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ev-svg { width: 100%; height: 100%; }

.ev-info {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  color: #e2e8f0;
  z-index: 10;
  backdrop-filter: blur(8px);
}
.ev-info-name {
  font-size: 12px;
  font-weight: 800;
  color: #facc15;
  margin-bottom: 2px;
}
.ev-info-desc {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
}

.ev-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.ev-btn {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.ev-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ev-btn-play {
  background: linear-gradient(135deg, #f59e0b, #dc2626);
  border: none;
  color: white;
  font-weight: 600;
}

.ev-fade-enter-active,
.ev-fade-leave-active { transition: opacity 0.2s; }
.ev-fade-enter-from,
.ev-fade-leave-to { opacity: 0; }
</style>
