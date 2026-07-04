<script setup lang="ts">
/**
 * Arts — 艺术（按 topicId 路由）
 *
 * 多合一：
 *   - calligraphy 书法
 *   - chinese-painting 中国画
 *   - music 音乐
 *   - drama 戏曲
 *   - sculpture 雕塑
 *   - 中国传统戏曲 chinese-opera
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type Art = 'calligraphy' | 'painting' | 'music' | 'opera' | 'sculpture' | 'opera2'
const currentArt = computed<Art>(() => {
  if (props.topicId === 'chinese-painting') return 'painting'
  if (props.topicId === 'music-world') return 'music'
  if (props.topicId === 'dance-drama') return 'opera'
  if (props.topicId === 'sculpture-art') return 'sculpture'
  if (props.topicId === 'chinese-opera') return 'opera2'
  return 'calligraphy'
})
</script>

<template>
  <div class="ar-wrap" @click.stop>
    <svg class="ar-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="inkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>

      <!-- 书法：毛笔写"书"字 -->
      <g v-if="currentArt === 'calligraphy'">
        <!-- 宣纸 -->
        <rect x="-80" y="-50" width="160" height="100" fill="#fef3c7" stroke="#d97706" stroke-width="0.6" />
        <!-- 印章 -->
        <rect x="60" y="35" width="14" height="14" fill="#dc2626" />
        <text x="67" y="46" text-anchor="middle" font-size="6" fill="white" font-weight="700">印</text>

        <!-- 毛笔 -->
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="-50,-30;-30,-10;0,10;20,-20;30,0;20,30;-30,30;-50,-30" dur="6s" repeatCount="indefinite" />
          <line x1="0" y1="0" x2="15" y2="-10" stroke="#7c2d12" stroke-width="2" stroke-linecap="round" />
          <ellipse cx="17" cy="-12" rx="4" ry="2" fill="#0f172a" />
        </g>

        <!-- 写出的"书"字（笔触依次出现） -->
        <g v-for="(stroke, i) in [
          { d: 'M -20 -25 L -20 25', w: 4, delay: 0 },
          { d: 'M -25 0 L 5 0', w: 2, delay: 0.6 },
          { d: 'M 0 -20 Q 15 0 5 25', w: 3, delay: 1.2 },
          { d: 'M 20 -25 L 20 25', w: 3, delay: 1.8 },
          { d: 'M 25 -20 L 40 -5', w: 2, delay: 2.4 },
          { d: 'M 25 5 L 40 20', w: 2, delay: 3.0 },
        ]" :key="i">
          <path :d="stroke.d" stroke="#0f172a" :stroke-width="stroke.w" fill="none" stroke-linecap="round">
            <animate attributeName="stroke-dasharray" from="0 100" to="100 0" :begin="stroke.delay + 's'" dur="0.5s" fill="freeze" repeatCount="indefinite" />
          </path>
        </g>
      </g>

      <!-- 中国画：山水 -->
      <g v-else-if="currentArt === 'painting'">
        <rect x="-100" y="-80" width="200" height="160" fill="#fef3c7" />
        <!-- 远山 -->
        <path d="M -100 30 Q -60 -20 -20 0 Q 20 20 60 -10 Q 90 -20 100 30 Z" fill="#94a3b8" opacity="0.5" />
        <!-- 近山 -->
        <path d="M -100 60 Q -50 10 0 30 Q 50 50 100 20 L 100 80 L -100 80 Z" fill="#475569" />
        <!-- 瀑布 -->
        <line x1="20" y1="0" x2="20" y2="40" stroke="#7dd3fc" stroke-width="2" opacity="0.6">
          <animate attributeName="y2" values="40;45;40" dur="2s" repeatCount="indefinite" />
        </line>
        <!-- 松树 -->
        <g transform="translate(-60 50)">
          <line x1="0" y1="0" x2="0" y2="-20" stroke="#854d0e" stroke-width="1.2" />
          <ellipse cx="0" cy="-25" rx="8" ry="4" fill="#15803d" />
          <ellipse cx="0" cy="-20" rx="6" ry="3" fill="#22c55e" />
        </g>
        <!-- 印章 -->
        <rect x="65" y="40" width="12" height="12" fill="#dc2626" />
        <text x="71" y="49" text-anchor="middle" font-size="5" fill="white" font-weight="700">印</text>
      </g>

      <!-- 音乐：古琴/笛子 -->
      <g v-else-if="currentArt === 'music'">
        <rect x="-80" y="-20" width="160" height="40" fill="#fef3c7" stroke="#a16207" stroke-width="0.6" />
        <!-- 琴弦 -->
        <g v-for="i in 7" :key="i">
          <line :x1="-60 + i * 20" y1="-15" :x2="-60 + i * 20" y2="15" stroke="#a16207" stroke-width="0.4">
            <animate attributeName="opacity" values="0.3;1;0.3" :begin="i * 0.1 + 's'" dur="1s" repeatCount="indefinite" />
          </line>
        </g>
        <!-- 音符（飘出） -->
        <g>
          <text v-for="i in 4" :key="i" font-size="10" :fill="['#facc15', '#a78bfa', '#34d399', '#fb923c'][i - 1]">
            <animateMotion dur="3s" :begin="i * 0.7 + 's'" repeatCount="indefinite" path="M -50 0 Q 0 -50 50 -80" />
            ♪
          </text>
        </g>
        <text x="0" y="40" text-anchor="middle" font-size="4" fill="#854d0e" font-weight="700">古琴</text>
      </g>

      <!-- 戏曲：脸谱/动作 -->
      <g v-else-if="currentArt === 'opera' || currentArt === 'opera2'">
        <!-- 脸谱 -->
        <g transform="translate(0 0)">
          <circle r="35" fill="#fef3c7" stroke="#1e293b" stroke-width="1" />
          <!-- 左红 -->
          <path d="M -25 -10 Q -30 0 -25 15" fill="#dc2626" />
          <!-- 右白 -->
          <path d="M 25 -10 Q 30 0 25 15" fill="white" />
          <!-- 眼睛 -->
          <ellipse cx="-12" cy="-5" rx="6" ry="3" fill="white" stroke="#0f172a" stroke-width="0.6" />
          <circle cx="-12" cy="-5" r="2" fill="#0f172a" />
          <ellipse cx="12" cy="-5" rx="6" ry="3" fill="white" stroke="#0f172a" stroke-width="0.6" />
          <circle cx="12" cy="-5" r="2" fill="#0f172a" />
          <!-- 眉毛 -->
          <path d="M -20 -15 L -8 -10" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
          <path d="M 20 -15 L 8 -10" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
          <!-- 嘴 -->
          <path d="M -10 18 Q 0 25 10 18" stroke="#dc2626" stroke-width="2" fill="none" />
        </g>
        <!-- 头饰（抖动） -->
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,-2;0,2;0,-2" dur="0.5s" repeatCount="indefinite" />
          <circle cx="-15" cy="-35" r="3" fill="#facc15" />
          <circle cx="15" cy="-35" r="3" fill="#facc15" />
          <circle cx="0" cy="-40" r="4" fill="#dc2626" />
        </g>
      </g>

      <!-- 雕塑：兵马俑 -->
      <g v-else>
        <!-- 身体 -->
        <g transform="translate(0 0)">
          <ellipse cx="0" cy="40" rx="20" ry="10" fill="#92400e" />
          <rect x="-15" y="-20" width="30" height="40" fill="#a16207" />
          <!-- 头 -->
          <circle cx="0" cy="-30" r="10" fill="#854d0e" />
          <!-- 盔甲纹理 -->
          <line v-for="i in 4" :key="i" x1="-12" :y1="-15 + i * 10" x2="12" :y2="-15 + i * 10" stroke="#451a03" stroke-width="0.4" />
          <!-- 武器（长矛） -->
          <line x1="20" y1="-25" x2="20" y2="35" stroke="#94a3b8" stroke-width="1" />
          <polygon points="20,-30 17,-25 23,-25" fill="#1e293b" />
        </g>
        <text x="0" y="80" text-anchor="middle" font-size="4" fill="#92400e" font-weight="700">兵马俑</text>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="currentArt === 'calligraphy' ? '#0f172a' : currentArt === 'painting' ? '#15803d' : currentArt === 'music' ? '#facc15' : currentArt === 'sculpture' ? '#92400e' : '#dc2626'" font-weight="700">
        🎨 {{ currentArt === 'calligraphy' ? '书法' : currentArt === 'painting' ? '中国画' : currentArt === 'music' ? '民乐' : currentArt === 'sculpture' ? '雕塑' : '戏曲' }}
      </text>
    </svg>

    <div class="ar-info">
      <p v-if="currentArt === 'calligraphy'">毛笔书写"书"字，6 个笔触依次出现。</p>
      <p v-else-if="currentArt === 'painting'">中国画讲究"留白"，山水、瀑布、远山近景。</p>
      <p v-else-if="currentArt === 'music'">古琴 7 弦，弹奏时琴弦振动，音符飘出。</p>
      <p v-else-if="currentArt === 'sculpture'">秦始皇兵马俑，2000 年前的大型陶俑艺术。</p>
      <p v-else>京剧脸谱，红白配色代表忠勇角色。</p>
    </div>
  </div>
</template>

<style scoped>
.ar-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #451a03 0%, #1c1917 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ar-svg { width: 100%; height: 100%; }
.ar-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  color: #f1f5f9;
  z-index: 10;
  font-size: 11px;
  line-height: 1.4;
  backdrop-filter: blur(8px);
}
</style>
