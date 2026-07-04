<script setup lang="ts">
/**
 * Geography — 地理景点（按 topicId 路由）
 *
 * 多合一：
 *   - china-geo 中国地理（长江+黄河示意）
 *   - world-geo 世界地理
 *   - rivers-lakes 河流湖泊
 *   - mountains 山脉
 *   - volcanoes 火山（S 级已写，跳过）
 *   - polar 极地
 *   - deserts 沙漠
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type View = 'yangtze' | 'yellow' | 'amazon' | 'nile' | 'sahara' | 'everest' | 'polar' | 'greatwall'
const currentView = computed<View>(() => {
  if (props.topicId === 'rivers-lakes') return 'yangtze'
  if (props.topicId === 'world-geo') return 'amazon'
  if (props.topicId === 'deserts') return 'sahara'
  if (props.topicId === 'mountains') return 'everest'
  if (props.topicId === 'polar') return 'polar'
  return 'yellow'
})
</script>

<template>
  <div class="geo-wrap" @click.stop>
    <svg class="geo-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
        <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#a16207" />
        </linearGradient>
        <linearGradient id="saharaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="100%" stop-color="#92400e" />
        </linearGradient>
        <linearGradient id="iceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#60a5fa" />
        </linearGradient>
      </defs>

      <!-- 长江（弯曲河流 + 沿江城市） -->
      <g v-if="currentView === 'yangtze'">
        <rect x="-100" y="-80" width="200" height="160" fill="#854d0e" opacity="0.2" />
        <!-- 河流 -->
        <path d="M -90 -60 Q -60 -50 -40 -30 Q -10 -10 20 0 Q 50 10 80 30" stroke="url(#riverGrad)" stroke-width="6" fill="none" stroke-linecap="round" />
        <!-- 流动的粒子 -->
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="3s" repeatCount="indefinite" path="M -90 -60 Q -60 -50 -40 -30 Q -10 -10 20 0 Q 50 10 80 30" />
        </circle>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="3s" begin="0.7s" repeatCount="indefinite" path="M -90 -60 Q -60 -50 -40 -30 Q -10 -10 20 0 Q 50 10 80 30" />
        </circle>
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="3s" begin="1.4s" repeatCount="indefinite" path="M -90 -60 Q -60 -50 -40 -30 Q -10 -10 20 0 Q 50 10 80 30" />
        </circle>
        <!-- 沿江城市 -->
        <g v-for="(c, i) in [
          { x: -80, y: -55, name: '源头' },
          { x: -50, y: -45, name: '重庆' },
          { x: -10, y: -10, name: '武汉' },
          { x: 40, y: 5, name: '南京' },
          { x: 80, y: 30, name: '上海' },
        ]" :key="i" :transform="`translate(${c.x} ${c.y})`">
          <circle r="3" fill="#facc15" />
          <text y="-7" text-anchor="middle" font-size="4" fill="#fde047" font-weight="700">{{ c.name }}</text>
        </g>
        <text x="50" y="-60" font-size="5" fill="#7dd3fc" font-weight="700">长江（6300 km，世界第三）</text>
      </g>

      <!-- 黄河（"几"字形） -->
      <g v-else-if="currentView === 'yellow'">
        <rect x="-100" y="-80" width="200" height="160" fill="#854d0e" opacity="0.2" />
        <!-- 黄河（几字形） -->
        <path d="M -90 -60 Q -70 -50 -60 -30 Q -50 -10 -60 10 Q -70 25 -50 30 Q -30 30 -20 15 Q -10 0 10 10 Q 30 15 50 5 Q 70 0 90 20"
          stroke="url(#yellowGrad)" stroke-width="6" fill="none" stroke-linecap="round" />
        <!-- 泥沙（黄色颗粒） -->
        <circle r="1.5" fill="#a16207" opacity="0.7">
          <animateMotion dur="4s" repeatCount="indefinite" path="M -90 -60 Q -70 -50 -60 -30 Q -50 -10 -60 10 Q -70 25 -50 30 Q -30 30 -20 15 Q -10 0 10 10 Q 30 15 50 5 Q 70 0 90 20" />
        </circle>
        <circle r="1.2" fill="#a16207" opacity="0.5">
          <animateMotion dur="4s" begin="1s" repeatCount="indefinite" path="M -90 -60 Q -70 -50 -60 -30 Q -50 -10 -60 10 Q -70 25 -50 30 Q -30 30 -20 15 Q -10 0 10 10 Q 30 15 50 5 Q 70 0 90 20" />
        </circle>
        <!-- 沿黄城市 -->
        <g v-for="(c, i) in [
          { x: -75, y: -55, name: '源头' },
          { x: -55, y: 0, name: '兰州' },
          { x: -45, y: 30, name: '西安' },
          { x: 20, y: 12, name: '郑州' },
          { x: 80, y: 18, name: '入海口' },
        ]" :key="i" :transform="`translate(${c.x} ${c.y})`">
          <circle r="3" fill="#facc15" />
          <text y="-7" text-anchor="middle" font-size="4" fill="#fde047" font-weight="700">{{ c.name }}</text>
        </g>
        <text x="-95" y="-95" font-size="5" fill="#fbbf24" font-weight="700">黄河（5464 km，含沙量大）</text>
      </g>

      <!-- 亚马逊河（世界最大） -->
      <g v-else-if="currentView === 'amazon'">
        <ellipse cx="0" cy="0" rx="80" ry="50" fill="#15803d" opacity="0.4" />
        <path d="M -80 -10 Q -40 -30 0 -10 Q 40 10 80 -10" stroke="url(#riverGrad)" stroke-width="5" fill="none" stroke-linecap="round" />
        <!-- 支流（树枝状） -->
        <path d="M -50 -15 Q -45 -25 -40 -20" stroke="url(#riverGrad)" stroke-width="2" fill="none" />
        <path d="M -30 -8 Q -25 -18 -20 -15" stroke="url(#riverGrad)" stroke-width="2" fill="none" />
        <path d="M 20 -8 Q 25 -18 30 -15" stroke="url(#riverGrad)" stroke-width="2" fill="none" />
        <path d="M 50 -10 Q 55 -20 60 -15" stroke="url(#riverGrad)" stroke-width="2" fill="none" />
        <circle r="1.5" fill="#7dd3fc">
          <animateMotion dur="4s" repeatCount="indefinite" path="M -80 -10 Q -40 -30 0 -10 Q 40 10 80 -10" />
        </circle>
        <text x="0" y="40" text-anchor="middle" font-size="5" fill="#86efac" font-weight="700">亚马逊河（6400 km，世界最长）</text>
      </g>

      <!-- 撒哈拉沙漠 -->
      <g v-else-if="currentView === 'sahara'">
        <rect x="-100" y="-80" width="200" height="160" fill="url(#saharaGrad)" />
        <!-- 沙丘 -->
        <path d="M -100 30 Q -50 0 0 20 Q 50 40 100 10" fill="#fbbf24" opacity="0.7" />
        <path d="M -100 50 Q -50 25 0 40 Q 50 60 100 30" fill="#f59e0b" opacity="0.8" />
        <path d="M -100 70 Q -50 50 0 60 Q 50 75 100 55" fill="#a16207" />
        <!-- 飘动的沙粒 -->
        <circle v-for="i in 8" :key="i" r="0.8" fill="#fde68a">
          <animateMotion dur="3s" :begin="i * 0.3 + 's'" repeatCount="indefinite" path="M -100 0 Q 0 20 100 0" />
        </circle>
        <!-- 骆驼 -->
        <g transform="translate(-30 50)">
          <animateTransform attributeName="transform" type="translate" values="-30,50;30,50;-30,50" dur="10s" repeatCount="indefinite" />
          <ellipse cx="0" cy="0" rx="6" ry="3" fill="#92400e" />
          <line x1="-3" y1="3" x2="-3" y2="8" stroke="#92400e" stroke-width="0.8" />
          <line x1="3" y1="3" x2="3" y2="8" stroke="#92400e" stroke-width="0.8" />
          <ellipse cx="6" cy="-2" rx="2" ry="1.5" fill="#a16207" />
          <text y="14" text-anchor="middle" font-size="3" fill="#fde047" font-weight="700">骆驼</text>
        </g>
        <text x="0" y="-50" text-anchor="middle" font-size="5" fill="#fbbf24" font-weight="700">撒哈拉沙漠（906 万 km²）</text>
      </g>

      <!-- 珠穆朗玛峰 -->
      <g v-else-if="currentView === 'everest'">
        <rect x="-100" y="-80" width="200" height="160" fill="#0c4a6e" />
        <!-- 山峰（三角形） -->
        <polygon points="-80,80 -10,-50 80,80" fill="#475569" />
        <polygon points="-10,-50 10,-30 -25,80" fill="#1e293b" />
        <!-- 雪顶 -->
        <polygon points="-15,-45 -10,-50 -5,-45 0,-40" fill="#f1f5f9" />
        <polygon points="-8,-40 -3,-30 5,-35" fill="#f1f5f9" />
        <text x="0" y="20" text-anchor="middle" font-size="5" fill="#cbd5e1" font-weight="700">珠穆朗玛峰</text>
        <text x="0" y="32" text-anchor="middle" font-size="6" fill="#facc15" font-weight="800">8848.86 m</text>
        <!-- 飘动的云 -->
        <ellipse cx="0" cy="-20" rx="30" ry="6" fill="#cbd5e1" opacity="0.4">
          <animate attributeName="cx" values="-20;20;-20" dur="8s" repeatCount="indefinite" />
        </ellipse>
      </g>

      <!-- 极地（冰川） -->
      <g v-else-if="currentView === 'polar'">
        <rect x="-100" y="-80" width="200" height="160" fill="url(#iceGrad)" />
        <!-- 冰川（冰山） -->
        <g v-for="(ice, i) in [{x:-60, y:0}, {x:-30, y:20}, {x:20, y:-10}, {x:60, y:30}]" :key="i" :transform="`translate(${ice.x} ${ice.y})`">
          <polygon points="-12,8 0,-15 12,8" fill="#dbeafe" stroke="#60a5fa" stroke-width="0.6" />
          <line x1="-6" y1="0" x2="-2" y2="5" stroke="#60a5fa" stroke-width="0.4" />
          <line x1="2" y1="-2" x2="6" y2="3" stroke="#60a5fa" stroke-width="0.4" />
        </g>
        <!-- 飘落的雪花 -->
        <g>
          <text v-for="i in 8" :key="i" font-size="6" fill="white">
            <animateMotion :dur="4 + Math.random() * 2" :begin="i * 0.3 + 's'" repeatCount="indefinite"
              :path="`M ${-80 + i * 20} -80 L ${-80 + i * 20} 80`" />
            ❄
          </text>
        </g>
        <!-- 企鹅 -->
        <g transform="translate(-50 60)">
          <ellipse rx="5" ry="6" fill="#0f172a" />
          <ellipse rx="3" ry="4" fill="white" />
          <circle cx="0" cy="-4" r="2.5" fill="#0f172a" />
          <path d="M -1 -3 L 0 -2 L 1 -3 Z" fill="#facc15" />
        </g>
        <text x="0" y="-60" text-anchor="middle" font-size="5" fill="#dbeafe" font-weight="700">南极 / 北极 ❄</text>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#fbbf24" font-weight="700">🌍 {{ currentView === 'yangtze' ? '长江' : currentView === 'yellow' ? '黄河' : currentView === 'amazon' ? '亚马逊' : currentView === 'sahara' ? '撒哈拉' : currentView === 'everest' ? '珠峰' : '极地' }}</text>
    </svg>

    <div class="geo-info">
      <p v-if="currentView === 'yangtze'">世界第三长河，6300 公里，养育 4 亿中华儿女。</p>
      <p v-else-if="currentView === 'yellow'">中华民族母亲河，含沙量世界第一，"几"字形大拐弯。</p>
      <p v-else-if="currentView === 'amazon'">世界流量最大、流域最广的河，雨林"地球之肺"。</p>
      <p v-else-if="currentView === 'sahara'">世界最大热带沙漠，面积比美国还大。</p>
      <p v-else-if="currentView === 'everest'">世界最高峰，喜马拉雅山脉主峰。</p>
      <p v-else>地球最冷的地方，住着企鹅和北极熊。</p>
    </div>
  </div>
</template>

<style scoped>
.geo-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e293b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.geo-svg { width: 100%; height: 100%; }
.geo-info {
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
