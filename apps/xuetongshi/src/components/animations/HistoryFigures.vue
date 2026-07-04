<script setup lang="ts">
/**
 * HistoryFigures — 历史人物（多合一）
 *
 * 按 topicId 路由：
 *   - confucius 孔子
 *   - li-bai 李白
 *   - zhuge-liang 诸葛亮
 *   - sima-qian 司马迁
 *   - zu-chongzhi 祖冲之
 *   - 后续扩展
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type Figure = 'confucius' | 'libai' | 'xuanzang' | 'zhuge' | 'simaqian' | 'zuchongzhi'

// 默认图（如果 topicId 没匹配）
const currentFigure = computed<Figure>(() => {
  if (props.topicId === 'libai') return 'libai'
  if (props.topicId === 'zhuge-liang') return 'zhuge'
  if (props.topicId === 'sima-qian') return 'simaqian'
  if (props.topicId === 'zu-chongzhi') return 'zuchongzhi'
  // 默认演示用：玄奘西行（最经典场景化）
  return 'xuanzang'
})
</script>

<template>
  <div class="hf-wrap" @click.stop>
    <svg class="hf-svg" viewBox="-110 -110 220 220">
      <!-- 玄奘西行（路线图） -->
      <g v-if="currentFigure === 'xuanzang'">
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#dc2626" />
            <stop offset="50%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#fbbf24" />
          </linearGradient>
        </defs>
        <!-- 地图背景（中国 → 印度） -->
        <rect x="-100" y="-80" width="200" height="160" fill="#854d0e" opacity="0.3" />
        <text x="-80" y="-65" font-size="5" fill="#cbd5e1" font-weight="700">长安</text>
        <text x="80" y="-65" text-anchor="end" font-size="5" fill="#cbd5e1" font-weight="700">天竺</text>
        <!-- 路线（弯曲） -->
        <path
          d="M -85 -55 Q -60 -20 -40 -30 Q -20 -50 0 -20 Q 20 0 40 -10 Q 60 -25 85 -55"
          fill="none"
          stroke="url(#routeGrad)"
          stroke-width="2"
          stroke-dasharray="3,1"
        />
        <!-- 玄奘（沿路线走） -->
        <g>
          <animateMotion dur="8s" repeatCount="indefinite"
            path="M -85 -55 Q -60 -20 -40 -30 Q -20 -50 0 -20 Q 20 0 40 -10 Q 60 -25 85 -55" />
          <circle r="5" fill="#dc2626" stroke="#7f1d1d" stroke-width="0.6" />
          <text text-anchor="middle" y="2" font-size="5" fill="white" font-weight="700">玄</text>
        </g>
        <!-- 站点（沿途国家） -->
        <g v-for="(stop, i) in [
          { x: -50, y: -25, name: '河西' },
          { x: -10, y: -30, name: '高昌' },
          { x: 30, y: -10, name: '龟兹' },
          { x: 60, y: -30, name: '那烂陀' },
        ]" :key="i" :transform="`translate(${stop.x} ${stop.y})`">
          <circle r="2" fill="#fbbf24" />
          <text y="-5" text-anchor="middle" font-size="3.5" fill="#fde047" font-weight="600">{{ stop.name }}</text>
        </g>
      </g>

      <!-- 孔子（杏坛讲学） -->
      <g v-else-if="currentFigure === 'confucius'">
        <!-- 杏树 -->
        <g v-for="i in 4" :key="`t${i}`" :transform="`translate(${-60 + i * 40} -60)`">
          <line x1="0" y1="0" x2="0" y2="20" stroke="#854d0e" stroke-width="1" />
          <circle cx="0" cy="-5" r="8" fill="#fca5a5" opacity="0.6" />
        </g>
        <!-- 孔子（中） -->
        <g transform="translate(0 10)">
          <circle cx="0" cy="-15" r="6" fill="#fde68a" />
          <rect x="-6" y="-9" width="12" height="20" fill="#a16207" rx="1" />
          <line x1="-6" y1="0" x2="-10" y2="15" stroke="#a16207" stroke-width="2" />
          <line x1="6" y1="0" x2="10" y2="15" stroke="#a16207" stroke-width="2" />
          <text y="20" text-anchor="middle" font-size="3.5" fill="#cbd5e1" font-weight="700">孔子</text>
        </g>
        <!-- 弟子（围绕孔子） -->
        <g v-for="(d, i) in 5" :key="`d${i}`" :transform="`rotate(${i * 72}) translate(0 30)`">
          <circle r="3" fill="#fcd34d" />
          <rect x="-2" y="3" width="4" height="6" fill="#dc2626" />
        </g>
        <!-- 飘动的竹简 -->
        <g>
          <rect x="0" y="-30" width="2" height="20" fill="#15803d">
            <animate attributeName="y" values="-30;-25;-30" dur="2s" repeatCount="indefinite" />
          </rect>
          <line x1="-4" y1="-25" x2="4" y2="-25" stroke="#15803d" stroke-width="0.4">
            <animate attributeName="y1" values="-25;-20;-25" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y2" values="-25;-20;-25" dur="2s" repeatCount="indefinite" />
          </line>
        </g>
      </g>

      <!-- 李白（举杯邀月） -->
      <g v-else-if="currentFigure === 'libai'">
        <!-- 月亮 -->
        <circle cx="-50" cy="-50" r="15" fill="#fef3c7" />
        <circle cx="-55" cy="-55" r="13" fill="#0c4a6e" />
        <!-- 月光 -->
        <line x1="-50" y1="-35" x2="-30" y2="20" stroke="#fde047" stroke-width="0.4" opacity="0.6" stroke-dasharray="2,2" />
        <!-- 李白 -->
        <g transform="translate(0 20)">
          <circle cx="0" cy="-10" r="5" fill="#fde68a" />
          <rect x="-5" y="-5" width="10" height="15" fill="#dc2626" rx="1" />
          <line x1="-5" y1="0" x2="-8" y2="10" stroke="#dc2626" stroke-width="2" />
          <line x1="5" y1="0" x2="8" y2="10" stroke="#dc2626" stroke-width="2" />
          <!-- 举起的酒杯 -->
          <g>
            <animateTransform attributeName="transform" type="rotate" values="-20 5 0; 10 5 0; -20 5 0" dur="3s" repeatCount="indefinite" />
            <line x1="5" y1="-2" x2="10" y2="-15" stroke="#dc2626" stroke-width="2" />
            <rect x="8" y="-18" width="6" height="5" fill="#facc15" stroke="#a16207" stroke-width="0.4" />
          </g>
        </g>
        <!-- 飘落的诗句（"床前明月光"） -->
        <g>
          <text font-size="6" fill="#fde047" opacity="0.8">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 60 80 Q 0 0 -50 -50" />
            床前明月光
          </text>
        </g>
      </g>

      <!-- 诸葛亮（借东风） -->
      <g v-else-if="currentFigure === 'zhuge'">
        <!-- 战船 -->
        <ellipse cx="0" cy="50" rx="80" ry="14" fill="#1e40af" />
        <rect x="-60" y="36" width="6" height="14" fill="#7c2d12" />
        <rect x="54" y="36" width="6" height="14" fill="#7c2d12" />
        <line x1="-30" y1="36" x2="-30" y2="10" stroke="#7c2d12" stroke-width="1.5" />
        <line x1="30" y1="36" x2="30" y2="10" stroke="#7c2d12" stroke-width="1.5" />
        <!-- 军旗 -->
        <path d="M -30 10 L -30 -5 L -10 -10 L -10 10 Z" fill="#dc2626" />
        <text x="-20" y="0" text-anchor="middle" font-size="3.5" fill="white" font-weight="700">蜀</text>
        <path d="M 30 10 L 30 -5 L 50 -10 L 50 10 Z" fill="#dc2626" />
        <text x="40" y="0" text-anchor="middle" font-size="3.5" fill="white" font-weight="700">蜀</text>
        <!-- 诸葛亮（船头） -->
        <g transform="translate(0 30)">
          <circle cx="0" cy="-10" r="4" fill="#fde68a" />
          <!-- 纶巾（帽子） -->
          <path d="M -4 -13 Q 0 -18 4 -13 Z" fill="#15803d" />
          <rect x="-4" y="-5" width="8" height="12" fill="#15803d" />
          <!-- 羽扇（扇动） -->
          <g>
            <animateTransform attributeName="transform" type="rotate" values="-15 4 -5; 15 4 -5; -15 4 -5" dur="2s" repeatCount="indefinite" />
            <ellipse cx="10" cy="-5" rx="4" ry="2" fill="#fcd34d" />
            <line x1="4" y1="-5" x2="6" y2="-2" stroke="#a16207" stroke-width="0.6" />
            <line x1="4" y1="-5" x2="6" y2="-8" stroke="#a16207" stroke-width="0.6" />
            <line x1="4" y1="-5" x2="6" y2="-11" stroke="#a16207" stroke-width="0.6" />
          </g>
        </g>
        <!-- 东风（向右吹） -->
        <g>
          <text v-for="i in 4" :key="i" font-size="10" fill="#bae6fd">
            <animateMotion dur="2s" :begin="i * 0.5 + 's'" repeatCount="indefinite" path="M -90 0 L 90 0" />
            💨
          </text>
        </g>
      </g>

      <!-- 司马迁（写史记） -->
      <g v-else-if="currentFigure === 'simaqian'">
        <!-- 案台 -->
        <rect x="-60" y="20" width="120" height="6" fill="#7c2d12" />
        <!-- 竹简 -->
        <g>
          <rect x="-30" y="0" width="60" height="20" fill="#fcd34d" stroke="#a16207" stroke-width="0.6" />
          <line v-for="i in 4" :key="i" x1="-26" :y1="3 + i * 4" x2="26" :y2="3 + i * 4" stroke="#a16207" stroke-width="0.3" />
        </g>
        <!-- 司马迁（俯身） -->
        <g transform="translate(0 -10)">
          <circle cx="0" cy="0" r="5" fill="#fde68a" />
          <rect x="-5" y="5" width="10" height="15" fill="#dc2626" />
          <!-- 毛笔（写字动画） -->
          <g>
            <animateTransform attributeName="transform" type="translate" values="0,0;5,-2;0,2;-5,1;0,0" dur="3s" repeatCount="indefinite" />
            <line x1="3" y1="8" x2="15" y2="5" stroke="#7c2d12" stroke-width="1.2" />
            <path d="M 15 5 L 18 3 L 18 7 Z" fill="#1e293b" />
          </g>
        </g>
        <!-- 写出的字（依次出现） -->
        <g v-for="(c, i) in ['史', '记']" :key="i" :transform="`translate(${-15 + i * 12} 12)`">
          <text text-anchor="middle" font-size="6" fill="#1e293b" font-weight="800" :opacity="i === 0 ? 1 : 0">
            {{ c }}
            <animate v-if="i === 1" attributeName="opacity" values="0;1" dur="3s" begin="1.5s" repeatCount="indefinite" fill="freeze" />
          </text>
        </g>
      </g>

      <!-- 祖冲之（算圆周率） -->
      <g v-else>
        <!-- 圆 + 割圆 -->
        <circle cx="0" cy="0" r="40" fill="none" stroke="#fbbf24" stroke-width="0.6" />
        <!-- 6 边形 → 12 边形 → 24 边形... -->
        <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#facc15" stroke-width="0.4" />
        <g>
          <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          <polygon points="20,-35 35,-20 40,0 35,20 20,35 0,40 -20,35 -35,20 -40,0 -35,-20 -20,-35 0,-40" fill="none" stroke="#fbbf24" stroke-width="0.4" />
        </g>
        <!-- π 值 -->
        <text y="60" text-anchor="middle" font-size="8" fill="#fde047" font-weight="800">π = 3.14159265...</text>
        <text x="0" y="-55" text-anchor="middle" font-size="4" fill="#facc15" font-weight="600">祖冲之（429-500）</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fde047" font-weight="700">📜 {{ currentFigure === 'xuanzang' ? '玄奘西行' : currentFigure === 'confucius' ? '孔子讲学' : currentFigure === 'libai' ? '李白' : currentFigure === 'zhuge' ? '草船借箭' : currentFigure === 'simaqian' ? '司马迁' : '祖冲之' }}</text>
    </svg>

    <div class="hf-info">
      <p v-if="currentFigure === 'xuanzang'">唐贞观三年（629 年），玄奘从长安出发，途经西域、天竺，历经 17 年取回真经。</p>
      <p v-else-if="currentFigure === 'confucius'">孔子周游列国 14 年，开创私学，有弟子 3000，贤人 72。</p>
      <p v-else-if="currentFigure === 'libai'">李白号"诗仙"，代表作《静夜思》《将进酒》。</p>
      <p v-else-if="currentFigure === 'zhuge'">赤壁之战中借东风，火烧曹军。</p>
      <p v-else-if="currentFigure === 'simaqian'">忍辱负重 13 年，写成《史记》。</p>
      <p v-else>南北朝数学家，将圆周率精确到小数点后 7 位。</p>
    </div>
  </div>
</template>

<style scoped>
.hf-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #451a03 0%, #1c1917 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hf-svg { width: 100%; height: 100%; }
.hf-info {
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
