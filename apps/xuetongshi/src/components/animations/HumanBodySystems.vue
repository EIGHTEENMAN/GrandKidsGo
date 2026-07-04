<script setup lang="ts">
/**
 * HumanBodySystems — 人体循环/呼吸/消化
 *
 * 按 sectionId 自动选择动画：
 *   - hb1 → 骨骼系统
 *   - hb2 → 肌肉系统
 *   - hb3 → 血液循环
 *   - hb4 → 呼吸系统
 *   - hb5 → 消化系统
 *   - hb6 → 大脑与神经
 *   - hb7 → 五种感官
 *   - hb8 → 皮肤毛发
 *   - hb9 → 免疫系统
 *
 * SVG animateTransform 模式（同 SolarSystem）
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type Mode = 'skeleton' | 'muscle' | 'circulatory' | 'respiratory' | 'digestive' | 'brain' | 'senses' | 'skin' | 'immune'
const mode = computed<Mode>(() => {
  if (props.topicId === 'hb1') return 'skeleton'
  if (props.topicId === 'hb2') return 'muscle'
  if (props.topicId === 'hb3') return 'circulatory'
  if (props.topicId === 'hb4') return 'respiratory'
  if (props.topicId === 'hb5') return 'digestive'
  if (props.topicId === 'hb6') return 'brain'
  if (props.topicId === 'hb7') return 'senses'
  if (props.topicId === 'hb8') return 'skin'
  if (props.topicId === 'hb9') return 'immune'
  return 'skeleton'
})

const selected = ref<string | null>(null)
const facts: Record<Mode, string> = {
  skeleton: '成人有 206 块骨头，婴儿有 300 多块。',
  muscle: '人体有 600 多块肌肉，最大的是臀大肌。',
  circulatory: '心脏每天跳动约 100,000 次，泵出 7,600 升血液。',
  respiratory: '成人每分钟呼吸 12-20 次，每天约 22,000 次。',
  digestive: '食物从嘴到排出需要约 24-72 小时。',
  brain: '大脑有 860 亿个神经元，每秒处理 100 万条信号。',
  senses: '人有 5 种感官：视觉、听觉、触觉、嗅觉、味觉。',
  skin: '皮肤是人体最大的器官，面积约 2 平方米。',
  immune: '白细胞每天能消灭 100 亿个入侵的细菌。',
}
</script>

<template>
  <div class="hbs-wrap" @click.stop>
    <!-- 骨骼系统 -->
    <svg v-if="mode === 'skeleton'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 头颅 -->
      <circle cx="0" cy="-70" r="20" fill="none" stroke="#f1f5f9" stroke-width="2" />
      <ellipse cx="0" cy="-70" rx="6" ry="3" fill="#0f172a" />
      <circle cx="-7" cy="-72" r="2" fill="#0f172a" />
      <circle cx="7" cy="-72" r="2" fill="#0f172a" />
      <line x1="-3" y1="-65" x2="3" y2="-65" stroke="#f1f5f9" stroke-width="1" />

      <!-- 脊椎 -->
      <g v-for="i in 12" :key="i">
        <ellipse :cx="Math.sin(i * 0.5) * 3" :cy="-45 + i * 6" rx="5" ry="2.5" fill="none" stroke="#f1f5f9" stroke-width="1" />
      </g>

      <!-- 肋骨（左右各 5 根） -->
      <g v-for="i in 5" :key="`r${i}`">
        <path :d="`M -3 ${-30 + i * 8} Q -15 ${-30 + i * 8} -25 ${-20 + i * 8}`" fill="none" stroke="#f1f5f9" stroke-width="1.2" />
        <path :d="`M 3 ${-30 + i * 8} Q 15 ${-30 + i * 8} 25 ${-20 + i * 8}`" fill="none" stroke="#f1f5f9" stroke-width="1.2" />
      </g>

      <!-- 骨盆 -->
      <ellipse cx="0" cy="35" rx="20" ry="10" fill="none" stroke="#f1f5f9" stroke-width="1.5" />

      <!-- 手臂（可动关节） -->
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-15 30 -10; 25 30 -10; -15 30 -10" dur="3s" repeatCount="indefinite" />
        <line x1="30" y1="-10" x2="30" y2="20" stroke="#f1f5f9" stroke-width="3" />
        <circle cx="30" cy="20" r="3" fill="#94a3b8" />
        <line x1="30" y1="20" x2="35" y2="40" stroke="#f1f5f9" stroke-width="2.5" />
        <circle cx="35" cy="40" r="2.5" fill="#94a3b8" />
        <!-- 手指（5 根） -->
        <line v-for="i in 5" :key="`fl${i}`" :x1="35" :y1="40" :x2="30 + i" y2="48" stroke="#f1f5f9" stroke-width="0.8" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="15 -30 -10; -25 -30 -10; 15 -30 -10" dur="3s" repeatCount="indefinite" />
        <line x1="-30" y1="-10" x2="-30" y2="20" stroke="#f1f5f9" stroke-width="3" />
        <circle cx="-30" cy="20" r="3" fill="#94a3b8" />
        <line x1="-30" y1="20" x2="-35" y2="40" stroke="#f1f5f9" stroke-width="2.5" />
        <circle cx="-35" cy="40" r="2.5" fill="#94a3b8" />
        <line v-for="i in 5" :key="`fr${i}`" :x1="-35" :y1="40" :x2="-30 - i" y2="48" stroke="#f1f5f9" stroke-width="0.8" />
      </g>

      <!-- 腿（髋/膝/踝） -->
      <g>
        <line x1="-10" y1="42" x2="-10" y2="65" stroke="#f1f5f9" stroke-width="3" />
        <circle cx="-10" cy="65" r="3" fill="#94a3b8" />
        <line x1="-10" y1="65" x2="-10" y2="90" stroke="#f1f5f9" stroke-width="2.5" />
      </g>
      <g>
        <line x1="10" y1="42" x2="10" y2="65" stroke="#f1f5f9" stroke-width="3" />
        <circle cx="10" cy="65" r="3" fill="#94a3b8" />
        <line x1="10" y1="65" x2="10" y2="90" stroke="#f1f5f9" stroke-width="2.5" />
      </g>

      <text x="-100" y="-95" font-size="6" fill="#f1f5f9" font-weight="700">🦴 骨骼系统</text>
    </svg>

    <!-- 肌肉系统 -->
    <svg v-else-if="mode === 'muscle'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 二头肌（收缩/舒张） -->
      <g>
        <ellipse cx="30" cy="10" rx="8" ry="20" fill="#dc2626">
          <animate attributeName="ry" values="20;25;20" dur="2s" repeatCount="indefinite" />
        </ellipse>
        <text x="48" y="15" font-size="4" fill="#fca5a5" font-weight="700">二头肌</text>
        <!-- 三头肌（反向） -->
        <ellipse cx="30" cy="-5" rx="6" ry="14" fill="#7f1d1d">
          <animate attributeName="ry" values="14;10;14" dur="2s" repeatCount="indefinite" />
        </ellipse>
      </g>
      <g>
        <ellipse cx="-30" cy="10" rx="8" ry="20" fill="#dc2626">
          <animate attributeName="ry" values="20;25;20" dur="2s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="-30" cy="-5" rx="6" ry="14" fill="#7f1d1d">
          <animate attributeName="ry" values="14;10;14" dur="2s" repeatCount="indefinite" />
        </ellipse>
      </g>

      <!-- 胸肌（呼吸起伏） -->
      <ellipse cx="0" cy="0" rx="30" ry="20" fill="#dc2626">
        <animate attributeName="ry" values="20;22;20" dur="3s" repeatCount="indefinite" />
      </ellipse>
      <line x1="0" y1="0" x2="0" y2="20" stroke="#7f1d1d" stroke-width="0.6" />

      <!-- 腹肌（6 块） -->
      <g v-for="row in 2" :key="row">
        <g v-for="col in 3" :key="col">
          <rect
            :x="-12 + col * 8"
            :y="22 + row * 10"
            width="6"
            height="8"
            fill="#b91c1c"
            stroke="#7f1d1d"
            stroke-width="0.3"
            rx="1"
          />
        </g>
      </g>

      <!-- 大腿股四头肌 -->
      <ellipse cx="-10" cy="55" rx="10" ry="18" fill="#dc2626">
        <animate attributeName="ry" values="18;22;18" dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="10" cy="55" rx="10" ry="18" fill="#dc2626">
        <animate attributeName="ry" values="18;22;18" dur="2.5s" repeatCount="indefinite" />
      </ellipse>

      <text x="-100" y="-95" font-size="6" fill="#fca5a5" font-weight="700">💪 肌肉系统</text>
    </svg>

    <!-- 大脑与神经 -->
    <svg v-else-if="mode === 'brain'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 头颅轮廓（虚线） -->
      <circle cx="0" cy="-30" r="40" fill="none" stroke="#475569" stroke-width="0.6" stroke-dasharray="2,2" opacity="0.5" />

      <!-- 大脑（左半球） -->
      <path d="M -30 -50 Q -40 -30 -35 -10 Q -25 5 -10 0 Q -5 -20 -10 -40 Q -20 -55 -30 -50 Z"
        fill="#f9a8d4" stroke="#be185d" stroke-width="0.8" />
      <!-- 右半球 -->
      <path d="M 30 -50 Q 40 -30 35 -10 Q 25 5 10 0 Q 5 -20 10 -40 Q 20 -55 30 -50 Z"
        fill="#f9a8d4" stroke="#be185d" stroke-width="0.8" />
      <!-- 大脑纹路 -->
      <path v-for="i in 6" :key="`ll${i}`" :d="`M ${-25 + i * 3} -45 Q ${-22 + i * 3} -30 ${-20 + i * 3} -10`" fill="none" stroke="#be185d" stroke-width="0.4" />
      <path v-for="i in 6" :key="`lr${i}`" :d="`M ${25 - i * 3} -45 Q ${22 - i * 3} -30 ${20 - i * 3} -10`" fill="none" stroke="#be185d" stroke-width="0.4" />

      <!-- 神经突触放电（粒子从大脑发出到身体） -->
      <g>
        <circle r="2" fill="#facc15">
          <animateMotion dur="2s" repeatCount="indefinite" path="M 0 -30 Q 0 0 0 60" />
        </circle>
        <circle r="1.5" fill="#facc15">
          <animateMotion dur="2s" begin="0.4s" repeatCount="indefinite" path="M -10 0 Q -30 30 -60 60" />
        </circle>
        <circle r="1.5" fill="#facc15">
          <animateMotion dur="2s" begin="0.8s" repeatCount="indefinite" path="M 10 0 Q 30 30 60 60" />
        </circle>
        <circle r="1.5" fill="#facc15">
          <animateMotion dur="2s" begin="1.2s" repeatCount="indefinite" path="M 0 -30 Q 0 0 0 60" />
        </circle>
        <circle r="1.5" fill="#facc15">
          <animateMotion dur="2s" begin="1.6s" repeatCount="indefinite" path="M -10 0 Q -30 30 -60 60" />
        </circle>
      </g>

      <!-- 神经纤维（向下） -->
      <line x1="-20" y1="5" x2="-30" y2="80" stroke="#facc15" stroke-width="0.6" stroke-dasharray="2,2" />
      <line x1="20" y1="5" x2="30" y2="80" stroke="#facc15" stroke-width="0.6" stroke-dasharray="2,2" />
      <line x1="0" y1="5" x2="0" y2="80" stroke="#facc15" stroke-width="0.6" stroke-dasharray="2,2" />

      <text x="-100" y="-95" font-size="6" fill="#f9a8d4" font-weight="700">🧠 大脑神经</text>
    </svg>

    <!-- 五种感官 -->
    <svg v-else-if="mode === 'senses'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 5 个感官图标（环绕头部轮廓） -->
      <circle cx="0" cy="0" r="32" fill="none" stroke="#475569" stroke-width="0.4" stroke-dasharray="2,2" opacity="0.5" />

      <!-- 视觉（眼） -->
      <g transform="translate(0 -55)">
        <circle r="10" fill="#f1f5f9" stroke="#1e293b" stroke-width="1" />
        <circle r="5" fill="#3b82f6" />
        <circle r="2" fill="#0f172a" />
        <text y="18" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">视觉</text>
        <!-- 视觉信号到脑 -->
        <line x1="0" y1="10" x2="0" y2="50" stroke="#3b82f6" stroke-width="0.6" stroke-dasharray="2,2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </line>
      </g>
      <!-- 听觉（耳） -->
      <g transform="translate(50 -25)">
        <path d="M 0 0 Q 5 -5 5 0 Q 5 6 0 8 Q -3 6 -3 0 Z" fill="#fca5a5" />
        <text y="20" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">听觉</text>
        <line x1="-5" y1="4" x2="-50" y2="30" stroke="#fca5a5" stroke-width="0.6" stroke-dasharray="2,2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin="0.4s" repeatCount="indefinite" />
        </line>
        <!-- 声波 -->
        <path d="M -15 0 Q -20 -5 -25 0" fill="none" stroke="#fca5a5" stroke-width="0.6">
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.8s" repeatCount="indefinite" />
        </path>
      </g>
      <!-- 触觉（手） -->
      <g transform="translate(40 35)">
        <path d="M 0 -6 L 0 4 M 0 -6 L -2 -8 M 0 -6 L 2 -8 M 4 -4 L 4 4 M 4 -4 L 6 -4 M -4 -4 L -4 4 M -4 -4 L -6 -4" stroke="#fbbf24" stroke-width="1" fill="none" />
        <circle r="4" fill="#fbbf24" />
        <text y="20" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">触觉</text>
        <line x1="0" y1="0" x2="-30" y2="0" stroke="#fbbf24" stroke-width="0.6" stroke-dasharray="2,2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin="0.8s" repeatCount="indefinite" />
        </line>
      </g>
      <!-- 嗅觉（鼻） -->
      <g transform="translate(-40 35)">
        <path d="M -3 -4 L -3 0 Q -3 4 0 6 L 3 4 L 3 0 L 3 -4 Z" fill="#a78bfa" />
        <text y="20" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">嗅觉</text>
        <line x1="0" y1="2" x2="30" y2="0" stroke="#a78bfa" stroke-width="0.6" stroke-dasharray="2,2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin="1.2s" repeatCount="indefinite" />
        </line>
      </g>
      <!-- 味觉（嘴） -->
      <g transform="translate(-50 -25)">
        <ellipse rx="6" ry="3" fill="#dc2626" />
        <ellipse rx="4" ry="1.5" fill="#7f1d1d" />
        <text y="18" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">味觉</text>
        <line x1="5" y1="0" x2="50" y2="30" stroke="#dc2626" stroke-width="0.6" stroke-dasharray="2,2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin="1.6s" repeatCount="indefinite" />
        </line>
      </g>

      <!-- 中心大脑 -->
      <circle r="14" fill="#f9a8d4" stroke="#be185d" stroke-width="0.8" />
      <text y="3" text-anchor="middle" font-size="4" fill="#831843" font-weight="700">大脑</text>

      <text x="-100" y="-95" font-size="6" fill="#f9a8d4" font-weight="700">👁 五种感官</text>
    </svg>

    <!-- 皮肤毛发 -->
    <svg v-else-if="mode === 'skin'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 皮肤剖面（多层） -->
      <rect x="-80" y="-10" width="160" height="6" fill="#fde68a" />
      <text x="-85" y="-5" text-anchor="end" font-size="3.5" fill="#fbbf24" font-weight="700">表皮</text>
      <rect x="-80" y="-4" width="160" height="10" fill="#fcd34d" />
      <text x="-85" y="3" text-anchor="end" font-size="3.5" fill="#fbbf24" font-weight="700">真皮</text>
      <rect x="-80" y="6" width="160" height="14" fill="#f59e0b" />
      <text x="-85" y="16" text-anchor="end" font-size="3.5" fill="#fbbf24" font-weight="700">皮下</text>

      <!-- 汗腺 -->
      <line x1="-50" y1="-2" x2="-50" y2="14" stroke="#3b82f6" stroke-width="1" />
      <circle cx="-50" cy="-2" r="1.5" fill="#3b82f6" />
      <!-- 汗滴出来 -->
      <circle cx="-50" cy="-6" r="1" fill="#60a5fa" opacity="0.7">
        <animate attributeName="cy" values="-6;-15;-6" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
      </circle>

      <!-- 毛囊（毛发） -->
      <g v-for="i in 6" :key="i" :transform="`translate(${-60 + i * 24} 0)`">
        <line x1="0" y1="-4" x2="0" y2="-30" stroke="#854d0e" stroke-width="0.6" />
        <ellipse cx="0" cy="2" rx="3" ry="4" fill="#a16207" />
        <!-- 毛长出来 -->
        <line x1="0" y1="-30" x2="0" y2="-50" stroke="#854d0e" stroke-width="0.6">
          <animate attributeName="y2" values="-30;-50;-30" dur="4s" repeatCount="indefinite" />
        </line>
      </g>

      <!-- 感受器（点状） -->
      <circle v-for="i in 5" :key="`r${i}`" :cx="-30 + i * 15" cy="0" r="1.5" fill="#7c3aed">
        <animate attributeName="r" values="1.5;3;1.5" :begin="i * 0.3 + 's'" dur="2s" repeatCount="indefinite" />
      </circle>

      <text x="-100" y="-95" font-size="6" fill="#fbbf24" font-weight="700">🧴 皮肤毛发</text>
    </svg>

    <!-- 免疫系统 -->
    <svg v-else-if="mode === 'immune'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 血管（背景） -->
      <ellipse rx="80" ry="20" fill="none" stroke="#dc2626" stroke-width="3" opacity="0.4" />
      <ellipse rx="60" ry="14" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.4" />

      <!-- 病毒（入侵者） -->
      <g v-for="i in 5" :key="`v${i}`" :transform="`translate(${-60 + i * 30} ${Math.sin(i) * 20})`">
        <circle r="4" fill="#7c3aed" opacity="0.8">
          <animate attributeName="r" values="4;5;4" dur="1s" repeatCount="indefinite" />
        </circle>
        <circle v-for="spike in 6" :key="spike" :cx="Math.cos(spike) * 5" :cy="Math.sin(spike) * 5" r="0.8" fill="#7c3aed" />
        <text y="-8" text-anchor="middle" font-size="3" fill="#c4b5fd" font-weight="700">病毒</text>
      </g>

      <!-- 白细胞（移动+吞噬） -->
      <g>
        <circle r="6" fill="#f1f5f9" stroke="#475569" stroke-width="0.6" />
        <circle r="3" fill="#475569" />
        <text y="2" text-anchor="middle" font-size="3" fill="#1e293b" font-weight="700">白</text>
        <animateMotion dur="4s" repeatCount="indefinite"
          path="M -80 0 Q -40 -20 0 0 Q 40 20 80 0" />
      </g>
      <g>
        <circle r="5" fill="#f1f5f9" stroke="#475569" stroke-width="0.5" />
        <circle r="2.5" fill="#475569" />
        <text y="1.5" text-anchor="middle" font-size="2.5" fill="#1e293b" font-weight="700">白</text>
        <animateMotion dur="3.5s" begin="1s" repeatCount="indefinite"
          path="M 80 0 Q 40 20 0 0 Q -40 -20 -80 0" />
      </g>
      <g>
        <circle r="5" fill="#f1f5f9" stroke="#475569" stroke-width="0.5" />
        <circle r="2.5" fill="#475569" />
        <text y="1.5" text-anchor="middle" font-size="2.5" fill="#1e293b" font-weight="700">白</text>
        <animateMotion dur="5s" begin="2s" repeatCount="indefinite"
          path="M 0 30 Q 30 0 0 -30 Q -30 0 0 30" />
      </g>

      <!-- 抗体（Y 形） -->
      <g v-for="i in 4" :key="`a${i}`" :transform="`translate(${-30 + i * 20} -50)`">
        <path d="M 0 0 L 0 -8 M 0 -8 L -4 -12 M 0 -8 L 4 -12" stroke="#facc15" stroke-width="1" fill="none" />
      </g>

      <text x="-100" y="-95" font-size="6" fill="#c4b5fd" font-weight="700">🛡 免疫系统</text>
    </svg>

    <!-- 血液循环 -->
    <svg v-if="mode === 'circulatory'" class="hbs-svg" viewBox="-110 -110 220 220">
      <defs>
        <radialGradient id="heartGrad">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="100%" stop-color="#be123c" />
        </radialGradient>
      </defs>

      <!-- 心脏（中央，搏动） -->
      <g>
        <circle r="14" fill="#fecdd3" opacity="0.4">
          <animate attributeName="r" values="14;18;14" dur="0.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="0.9s" repeatCount="indefinite" />
        </circle>
        <g>
          <animateTransform attributeName="transform" type="scale" values="1;1.15;1" dur="0.9s" repeatCount="indefinite" additive="sum" />
          <!-- 简化的心形：两个圆+一个三角 -->
          <path d="M 0 -3 C -8 -10 -16 -3 0 10 C 16 -3 8 -10 0 -3 Z" fill="url(#heartGrad)" stroke="#9f1239" stroke-width="0.5" />
        </g>
        <text y="22" text-anchor="middle" font-size="5" fill="#e2e8f0" font-weight="700">心脏</text>
      </g>

      <!-- 4 个循环：左肺/右肺/上身/下身 -->
      <g v-for="(loop, i) in [
        { x: -50, y: -50, label: '肺部', color: '#60a5fa' },
        { x: 50, y: -50, label: '头部', color: '#34d399' },
        { x: -50, y: 50, label: '下肢', color: '#fbbf24' },
        { x: 50, y: 50, label: '腹腔', color: '#a78bfa' },
      ]" :key="i" :transform="`translate(${loop.x} ${loop.y})`">
        <circle r="14" :fill="loop.color" opacity="0.25" />
        <text text-anchor="middle" dominant-baseline="central" font-size="5" fill="#f1f5f9" font-weight="700">{{ loop.label }}</text>
      </g>

      <!-- 流动的红细胞粒子 -->
      <g>
        <circle r="3" fill="#dc2626" cx="20" cy="0">
          <animateMotion dur="3s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#dc2626" cx="0" cy="0" opacity="0.7">
          <animateMotion dur="3s" begin="0.5s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#dc2626" cx="0" cy="0" opacity="0.7">
          <animateMotion dur="3s" begin="1s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#60a5fa" cx="0" cy="0" opacity="0.6">
          <animateMotion dur="3s" begin="0.25s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#60a5fa" cx="0" cy="0" opacity="0.6">
          <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
      </g>

      <!-- 标题 -->
      <text x="-100" y="-95" font-size="6" fill="#fca5a5" font-weight="700">🔴 含氧血液</text>
      <text x="60" y="-95" font-size="6" fill="#93c5fd" font-weight="700">🔵 缺氧血液</text>
    </svg>

    <!-- 呼吸系统 -->
    <svg v-else-if="mode === 'respiratory'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 膈肌（底部，伸缩） -->
      <g>
        <path d="M -90 60 Q 0 80 90 60 L 90 80 L -90 80 Z" fill="#fda4af" stroke="#9f1239" stroke-width="0.6">
          <animate attributeName="d" dur="4s" repeatCount="indefinite"
            values="M -90 60 Q 0 80 90 60 L 90 80 L -90 80 Z;
                    M -90 50 Q 0 70 90 50 L 90 70 L -90 70 Z;
                    M -90 60 Q 0 80 90 60 L 90 80 L -90 80 Z" />
        </path>
        <text y="92" text-anchor="middle" font-size="5" fill="#fecdd3" font-weight="700">膈肌</text>
      </g>

      <!-- 双肺（左右，扩张收缩） -->
      <g>
        <animateTransform attributeName="transform" type="scale" values="1;1.12;1" dur="4s" repeatCount="indefinite" additive="sum" />
        <!-- 左肺 -->
        <ellipse cx="-30" cy="-10" rx="22" ry="35" fill="#fca5a5" opacity="0.8" stroke="#dc2626" stroke-width="0.8" />
        <ellipse cx="-30" cy="-10" rx="14" ry="25" fill="#fecaca" opacity="0.6" />
        <!-- 右肺 -->
        <ellipse cx="30" cy="-10" rx="22" ry="35" fill="#fca5a5" opacity="0.8" stroke="#dc2626" stroke-width="0.8" />
        <ellipse cx="30" cy="-10" rx="14" ry="25" fill="#fecaca" opacity="0.6" />
        <!-- 气管 -->
        <rect x="-3" y="-50" width="6" height="35" fill="#94a3b8" />
        <text y="-58" text-anchor="middle" font-size="5" fill="#cbd5e1" font-weight="700">气管</text>
        <text x="-30" y="35" text-anchor="middle" font-size="5" fill="#7f1d1d" font-weight="700">左肺</text>
        <text x="30" y="35" text-anchor="middle" font-size="5" fill="#7f1d1d" font-weight="700">右肺</text>
      </g>

      <!-- 进出气体粒子 -->
      <g>
        <circle r="2" fill="#60a5fa" cx="0" cy="-100" opacity="0.6">
          <animate attributeName="cy" values="-100;-50" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#60a5fa" cx="-3" cy="-100" opacity="0.5">
          <animate attributeName="cy" values="-100;-50" dur="4s" begin="0.4s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#f1f5f9" cx="0" cy="-50" opacity="0.5">
          <animate attributeName="cy" values="-50;-100" dur="4s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#f1f5f9" cx="3" cy="-50" opacity="0.5">
          <animate attributeName="cy" values="-50;-100" dur="4s" begin="2.4s" repeatCount="indefinite" />
        </circle>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#e2e8f0" font-weight="700">💨 呼吸系统</text>
    </svg>

    <!-- 消化系统 -->
    <svg v-else class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 嘴 → 食道 → 胃 → 小肠 → 大肠 -->
      <g>
        <!-- 嘴 -->
        <ellipse cx="0" cy="-95" rx="8" ry="3" fill="#dc2626" />
        <text y="-103" text-anchor="middle" font-size="4" fill="#fecaca" font-weight="700">嘴</text>
        <!-- 食道 -->
        <rect x="-2.5" y="-90" width="5" height="25" fill="#fda4af" />
        <!-- 胃（左侧） -->
        <path d="M -25 -65 Q -45 -55 -35 -30 Q -10 -25 -5 -45 Z" fill="#fb7185" stroke="#9f1239" stroke-width="0.6" />
        <text x="-25" y="-50" text-anchor="middle" font-size="4" fill="#fff" font-weight="700">胃</text>
        <!-- 小肠（盘曲） -->
        <g>
          <path d="M -25 -10 Q -50 0 -40 20 Q -10 30 -20 50 Q 0 60 10 40 Q 25 25 5 5"
            stroke="#fb923c" stroke-width="6" fill="none" stroke-linecap="round" />
          <text x="-25" y="20" text-anchor="middle" font-size="4" fill="#7c2d12" font-weight="700">小肠</text>
        </g>
        <!-- 大肠（外框） -->
        <path d="M -70 -10 Q -85 30 -50 70 Q 30 90 70 70 Q 85 30 70 -10 Q 50 0 50 30 Q 30 50 0 50 Q -30 50 -50 30 Q -50 0 -70 -10"
          stroke="#fcd34d" stroke-width="8" fill="none" stroke-linecap="round" />
        <text x="65" y="60" text-anchor="middle" font-size="4" fill="#78350f" font-weight="700">大肠</text>
      </g>

      <!-- 食物颗粒沿食道→胃→小肠移动 -->
      <circle r="3" fill="#a16207">
        <animateMotion dur="6s" repeatCount="indefinite"
          path="M 0 -95 L 0 -65 Q -25 -50 -25 -30 Q -40 0 -20 30 Q 0 50 30 60" />
      </circle>
      <circle r="2.5" fill="#a16207">
        <animateMotion dur="6s" begin="1s" repeatCount="indefinite"
          path="M 0 -95 L 0 -65 Q -25 -50 -25 -30 Q -40 0 -20 30 Q 0 50 30 60" />
      </circle>
      <circle r="2.5" fill="#a16207">
        <animateMotion dur="6s" begin="2.5s" repeatCount="indefinite"
          path="M 0 -95 L 0 -65 Q -25 -50 -25 -30 Q -40 0 -20 30 Q 0 50 30 60" />
      </circle>

      <text x="-100" y="-95" font-size="6" fill="#fbbf24" font-weight="700">🍎 消化系统</text>
    </svg>

    <!-- 信息卡 -->
    <transition name="hbs-fade">
      <div v-if="selected" class="hbs-info">
        <button class="hbs-info-close" @click="selected = null">×</button>
        <p class="hbs-info-fact">{{ facts[mode] }}</p>
      </div>
    </transition>

    <!-- 控制条 -->
    <div class="hbs-controls">
      <button
        class="hbs-ctrl"
        @click="selected = 'fact'"
        title="查看小知识"
      >
        💡 知识
      </button>
    </div>
  </div>
</template>

<style scoped>
.hbs-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #4c0519 0%, #1c0707 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hbs-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.hbs-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 14px 18px;
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.hbs-info-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.hbs-info-fact {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
}

.hbs-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
}
.hbs-ctrl {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.hbs-ctrl:hover {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}

.hbs-fade-enter-active,
.hbs-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.hbs-fade-enter-from,
.hbs-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
