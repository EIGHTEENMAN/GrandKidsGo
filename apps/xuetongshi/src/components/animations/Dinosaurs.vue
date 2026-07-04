<script setup lang="ts">
/**
 * Dinosaurs — 恐龙世界
 *   - 多种恐龙走跑+切换
 */
import { ref, computed } from 'vue'

interface Dino {
  id: string
  name: string
  zh: string
  body: string
  fact: string
  speed: number
}

const dinos: Dino[] = [
  { id: 't-rex', name: 'T-Rex', zh: '霸王龙', body: '#dc2626', fact: '最大的肉食恐龙，咬合力是狮子 10 倍', speed: 6 },
  { id: 'tri', name: 'Triceratops', zh: '三角龙', body: '#a16207', fact: '三只大角是它的防御武器', speed: 9 },
  { id: 'raptor', name: 'Velociraptor', zh: '迅猛龙', body: '#7c2d12', fact: '聪明敏捷，群体捕猎', speed: 4 },
  { id: 'long-neck', name: 'Brachiosaurus', zh: '腕龙', body: '#15803d', fact: '长脖子能吃到树顶的叶子', speed: 14 },
  { id: 'ptera', name: 'Pteranodon', zh: '翼龙', body: '#1e40af', fact: '会飞的爬行动物，翼展达 7 米', speed: 5 },
]

const currentIndex = ref(0)
const current = computed(() => dinos[currentIndex.value])

function next() {
  currentIndex.value = (currentIndex.value + 1) % dinos.length
}
</script>

<template>
  <div class="dn-wrap" @click.stop>
    <svg class="dn-svg" viewBox="-110 -110 220 220">
      <!-- 远景：火山+云 -->
      <ellipse cx="-70" cy="-60" rx="20" ry="14" fill="#78716c" />
      <ellipse cx="-60" cy="-65" rx="18" ry="12" fill="#a8a29e" />
      <ellipse cx="0" cy="-80" rx="22" ry="8" fill="#94a3b8" />
      <ellipse cx="8" cy="-83" rx="18" ry="6" fill="#cbd5e1" />

      <!-- 地面 -->
      <rect x="-110" y="60" width="220" height="50" fill="#854d0e" />
      <line x1="-110" y1="60" x2="110" y2="60" stroke="#451a03" stroke-width="1" />

      <!-- 草 -->
      <g v-for="i in 12" :key="i" :transform="`translate(${-100 + i * 18} 60)`">
        <line x1="0" y1="0" x2="0" y2="-4" stroke="#65a30d" stroke-width="0.6" />
      </g>

      <!-- 恐龙主体（按 current 切换） -->
      <g v-if="current.id === 't-rex'">
        <!-- 霸王龙：大头+短前肢+大尾巴 -->
        <g :style="{ animation: `dn-walk-${current.speed}s linear infinite` }">
          <!-- 身体 -->
          <ellipse cx="0" cy="40" rx="35" ry="20" :fill="current.body" />
          <!-- 头 -->
          <g transform="translate(35 25)">
            <path d="M 0 0 L 22 -5 L 25 5 L 22 12 L 0 8 Z" :fill="current.body" />
            <circle cx="14" cy="-2" r="1.5" fill="#fef3c7" />
            <path d="M 18 5 L 28 4 L 28 7 L 18 8 Z" fill="#fef3c7" />
            <path d="M 19 6 L 19 7 M 22 6 L 22 7 M 25 6 L 25 7" stroke="#dc2626" stroke-width="0.5" />
          </g>
          <!-- 短前肢 -->
          <line x1="20" y1="35" x2="22" y2="48" :stroke="current.body" stroke-width="3" stroke-linecap="round" />
          <line x1="25" y1="35" x2="27" y2="48" :stroke="current.body" stroke-width="3" stroke-linecap="round" />
          <!-- 大腿 -->
          <line x1="-10" y1="55" x2="-15" y2="80" :stroke="current.body" stroke-width="6" stroke-linecap="round" />
          <line x1="10" y1="55" x2="15" y2="80" :stroke="current.body" stroke-width="6" stroke-linecap="round" />
          <!-- 尾巴 -->
          <path d="M -30 40 Q -55 30 -70 45 Q -65 50 -50 48 Q -35 48 -30 45" :fill="current.body" />
        </g>
      </g>

      <g v-else-if="current.id === 'tri'">
        <!-- 三角龙：盾牌头+三只角 -->
        <g :style="{ animation: `dn-walk-${current.speed}s linear infinite` }">
          <ellipse cx="0" cy="40" rx="40" ry="18" :fill="current.body" />
          <!-- 头盾 -->
          <path d="M 35 35 Q 50 20 60 35 Q 50 50 35 45 Z" :fill="current.body" />
          <!-- 三只角 -->
          <path d="M 40 25 L 50 15 L 45 30 Z" fill="#fef3c7" />
          <path d="M 50 28 L 60 20 L 55 35 Z" fill="#fef3c7" />
          <path d="M 28 32 L 22 22 L 32 30 Z" fill="#fef3c7" />
          <!-- 嘴（鹦鹉嘴） -->
          <path d="M 35 45 L 50 50 L 35 52 Z" :fill="current.body" />
          <!-- 腿 -->
          <line x1="-15" y1="55" x2="-18" y2="80" :stroke="current.body" stroke-width="6" stroke-linecap="round" />
          <line x1="15" y1="55" x2="18" y2="80" :stroke="current.body" stroke-width="6" stroke-linecap="round" />
          <!-- 尾巴 -->
          <path d="M -38 40 Q -60 35 -65 45" stroke-width="6" stroke-linecap="round" fill="none" :stroke="current.body" />
        </g>
      </g>

      <g v-else-if="current.id === 'long-neck'">
        <!-- 腕龙：长脖子+长尾 -->
        <g :style="{ animation: `dn-walk-${current.speed}s linear infinite` }">
          <ellipse cx="0" cy="45" rx="45" ry="20" :fill="current.body" />
          <!-- 长脖子 -->
          <path d="M 30 35 Q 40 0 50 -40 Q 52 -45 48 -45 Q 42 -10 32 30" :fill="current.body" />
          <!-- 小头 -->
          <circle cx="48" cy="-46" r="5" :fill="current.body" />
          <!-- 腿（柱子腿） -->
          <rect x="-25" y="55" width="8" height="25" :fill="current.body" />
          <rect x="20" y="55" width="8" height="25" :fill="current.body" />
          <!-- 长尾巴 -->
          <path d="M -45 40 Q -60 35 -70 50" stroke-width="4" fill="none" :stroke="current.body" />
        </g>
      </g>

      <g v-else-if="current.id === 'ptera'">
        <!-- 翼龙：翅膀展开 -->
        <g :style="{ animation: `dn-fly-${current.speed}s linear infinite` }">
          <!-- 翅膀（左） -->
          <path d="M 0 0 Q -40 -30 -70 -10 Q -50 -5 -30 0 Q -10 0 0 5 Z" :fill="current.body" opacity="0.85" />
          <!-- 翅膀（右） -->
          <path d="M 0 0 Q 40 -30 70 -10 Q 50 -5 30 0 Q 10 0 0 5 Z" :fill="current.body" opacity="0.85" />
          <!-- 身体 -->
          <ellipse cx="0" cy="5" rx="6" ry="3" :fill="current.body" />
          <!-- 头+嘴 -->
          <circle cx="0" cy="-2" r="4" :fill="current.body" />
          <path d="M 4 -2 L 16 0 L 4 2 Z" :fill="current.body" />
        </g>
      </g>

      <g v-else>
        <!-- 迅猛龙：双足+长尾 -->
        <g :style="{ animation: `dn-walk-${current.speed}s linear infinite` }">
          <ellipse cx="0" cy="45" rx="22" ry="10" :fill="current.body" />
          <ellipse cx="20" cy="40" rx="10" ry="6" :fill="current.body" />
          <!-- 爪 -->
          <path d="M 28 42 L 35 38 L 35 44" :stroke="current.body" stroke-width="1" fill="none" />
          <line x1="-5" y1="55" x2="-10" y2="80" :stroke="current.body" stroke-width="4" stroke-linecap="round" />
          <line x1="10" y1="55" x2="15" y2="80" :stroke="current.body" stroke-width="4" stroke-linecap="round" />
          <line x1="22" y1="45" x2="25" y2="55" :stroke="current.body" stroke-width="2" stroke-linecap="round" />
          <path d="M -20 45 Q -45 40 -55 50" stroke-width="4" fill="none" :stroke="current.body" stroke-linecap="round" />
        </g>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="current.body" font-weight="700">🦖 {{ current.zh }}</text>
    </svg>

    <!-- 知识卡 -->
    <div class="dn-info">
      <div class="dn-info-zh">{{ current.zh }}</div>
      <p class="dn-info-fact">{{ current.fact }}</p>
      <button class="dn-next" @click="next">🦴 下一只</button>
    </div>
  </div>
</template>

<style scoped>
.dn-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #fef3c7 0%, #fed7aa 40%, #92400e 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dn-svg { width: 100%; height: 100%; }

@keyframes dn-walk-4s { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.5px) } }
@keyframes dn-walk-5s { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.5px) } }
@keyframes dn-walk-6s { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.5px) } }
@keyframes dn-walk-9s { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.5px) } }
@keyframes dn-walk-14s { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.5px) } }
@keyframes dn-fly-5s { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }

.dn-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 10px 14px;
  color: #fef3c7;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.dn-info-zh {
  font-size: 14px;
  font-weight: 800;
  color: #fde047;
}
.dn-info-fact {
  margin: 4px 0 8px;
  font-size: 11px;
  line-height: 1.4;
}
.dn-next {
  background: linear-gradient(135deg, #f59e0b, #dc2626);
  border: none;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
