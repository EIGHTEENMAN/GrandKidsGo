<script setup lang="ts">
/**
 * Computers — 计算机与互联网
 *   - CPU 0/1 二进制跳动
 *   - 数据包在网络中流动
 *   - 互联网架构图（终端→路由器→服务器）
 */
import { ref } from 'vue'

// 4 状态：cpu / packet / network / binary
const view = ref<'cpu' | 'packet' | 'network' | 'binary'>('cpu')
const binaryInput = ref(42)
const binaryOut = computed(() => binaryInput.value.toString(2).padStart(8, '0'))
</script>

<template>
  <div class="cp-wrap" @click.stop>
    <svg class="cp-svg" viewBox="-110 -110 220 220">
      <defs>
        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>

      <!-- CPU 模式 -->
      <g v-if="view === 'cpu'">
        <!-- CPU 方块 -->
        <rect x="-30" y="-30" width="60" height="60" fill="url(#cpuGrad)" stroke="#475569" stroke-width="1" rx="4" />
        <text y="-2" text-anchor="middle" font-size="5" fill="#facc15" font-weight="700">CPU</text>
        <!-- 针脚 -->
        <g v-for="i in 5" :key="`t${i}`">
          <line :x1="-25 + i * 12" y1="-30" :x2="-25 + i * 12" y2="-38" stroke="#94a3b8" stroke-width="1" />
          <line :x1="-25 + i * 12" y1="30" :x2="-25 + i * 12" y2="38" stroke="#94a3b8" stroke-width="1" />
          <line x1="-30" :y1="-25 + i * 12" x2="-38" :y2="-25 + i * 12" stroke="#94a3b8" stroke-width="1" />
          <line x1="30" :y1="-25 + i * 12" x2="38" :y2="-25 + i * 12" stroke="#94a3b8" stroke-width="1" />
        </g>
        <!-- 内部电路（0/1 跳动） -->
        <g>
          <rect x="-15" y="6" width="6" height="6" fill="#22c55e">
            <animate attributeName="fill" values="#22c55e;#dc2626;#22c55e" dur="0.5s" repeatCount="indefinite" />
          </rect>
          <rect x="-4" y="6" width="6" height="6" fill="#dc2626">
            <animate attributeName="fill" values="#dc2626;#22c55e;#dc2626" dur="0.5s" repeatCount="indefinite" />
          </rect>
          <rect x="7" y="6" width="6" height="6" fill="#22c55e">
            <animate attributeName="fill" values="#22c55e;#dc2626;#22c55e" dur="0.4s" repeatCount="indefinite" />
          </rect>
          <text y="22" text-anchor="middle" font-size="4" fill="#22c55e" font-weight="700">0 1 0 1</text>
        </g>
        <!-- 数据流（输入） -->
        <g>
          <text font-size="9" fill="#60a5fa">
            <animateMotion dur="2s" repeatCount="indefinite" path="M -100 0 L -30 0" />
            📊
          </text>
        </g>
      </g>

      <!-- 二进制模式 -->
      <g v-else-if="view === 'binary'">
        <text y="-50" text-anchor="middle" font-size="8" fill="#facc15" font-weight="700">十进制 → 二进制</text>
        <text y="-15" text-anchor="middle" font-size="20" fill="#22c55e" font-weight="800">{{ binaryInput }}</text>
        <text y="0" text-anchor="middle" font-size="4" fill="#94a3b8">↓</text>
        <text y="30" text-anchor="middle" font-size="14" fill="#60a5fa" font-weight="700" font-family="monospace">{{ binaryOut }}</text>
        <!-- 8 个 0/1 格子（按二进制位） -->
        <g v-for="(b, i) in binaryOut" :key="i" :transform="`translate(${-50 + i * 14} 50)`">
          <rect width="10" height="14" fill="#1e293b" stroke="#475569" stroke-width="0.4" rx="1" />
          <text x="5" y="11" text-anchor="middle" font-size="9" :fill="b === '1' ? '#22c55e' : '#64748b'" font-weight="700" font-family="monospace">{{ b }}</text>
        </g>
      </g>

      <!-- 数据包模式 -->
      <g v-else-if="view === 'packet'">
        <!-- 网络节点 -->
        <circle v-for="(n, i) in [{x:-80,y:-40},{x:80,y:-40},{x:0,y:0},{x:-80,y:40},{x:80,y:40}]" :key="i" :cx="n.x" :cy="n.y" r="6" fill="#3b82f6" stroke="#1e3a8a" stroke-width="0.6" />
        <!-- 连接线 -->
        <g stroke="#475569" stroke-width="0.6" stroke-dasharray="2,2">
          <line x1="-80" y1="-40" x2="0" y2="0" />
          <line x1="80" y1="-40" x2="0" y2="0" />
          <line x1="-80" y1="40" x2="0" y2="0" />
          <line x1="80" y1="40" x2="0" y2="0" />
        </g>
        <!-- 数据包（5 个粒子在节点间跳跃） -->
        <circle r="3" fill="#facc15" stroke="#a16207" stroke-width="0.4">
          <animateMotion dur="3s" repeatCount="indefinite" path="M -80 -40 L 0 0 L 80 40" />
        </circle>
        <circle r="3" fill="#facc15" stroke="#a16207" stroke-width="0.4">
          <animateMotion dur="3s" begin="0.6s" repeatCount="indefinite" path="M 80 -40 L 0 0 L -80 40" />
        </circle>
        <circle r="3" fill="#facc15" stroke="#a16207" stroke-width="0.4">
          <animateMotion dur="2.5s" begin="1.2s" repeatCount="indefinite" path="M 0 0 L 80 -40 L 0 0" />
        </circle>
      </g>

      <!-- 网络架构模式 -->
      <g v-else>
        <!-- 你（终端） -->
        <g transform="translate(-80 0)">
          <rect x="-8" y="-6" width="16" height="12" fill="#475569" rx="1" />
          <rect x="-10" y="6" width="20" height="2" fill="#475569" />
          <text y="-12" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">你的设备</text>
        </g>
        <!-- 路由器 -->
        <g transform="translate(0 0)">
          <rect x="-8" y="-5" width="16" height="10" fill="#22c55e" rx="1" />
          <circle cx="-4" cy="0" r="1" fill="#facc15" />
          <circle cx="0" cy="0" r="1" fill="#facc15">
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="4" cy="0" r="1" fill="#facc15" />
          <text y="-12" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">路由器</text>
        </g>
        <!-- 服务器集群 -->
        <g transform="translate(80 0)">
          <rect x="-10" y="-12" width="20" height="24" fill="#3b82f6" rx="1" />
          <line x1="-8" y1="-6" x2="8" y2="-6" stroke="#facc15" stroke-width="0.4" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#facc15" stroke-width="0.4" />
          <line x1="-8" y1="6" x2="8" y2="6" stroke="#facc15" stroke-width="0.4" />
          <text y="-18" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">服务器</text>
        </g>
        <!-- 连接线（脉冲） -->
        <line x1="-70" y1="0" x2="-10" y2="0" stroke="#94a3b8" stroke-width="0.6" />
        <line x1="10" y1="0" x2="70" y2="0" stroke="#94a3b8" stroke-width="0.6" />
        <circle r="2" fill="#facc15">
          <animateMotion dur="1.5s" repeatCount="indefinite" path="M -70 0 L 70 0" />
        </circle>
        <circle r="2" fill="#facc15">
          <animateMotion dur="1.5s" begin="0.7s" repeatCount="indefinite" path="M 70 0 L -70 0" />
        </circle>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#22c55e" font-weight="700">💻 {{ view === 'cpu' ? 'CPU' : view === 'binary' ? '二进制' : view === 'packet' ? '数据包' : '网络架构' }}</text>
    </svg>

    <div class="cp-tabs">
      <button class="cp-tab" :class="{ on: view === 'cpu' }" @click="view = 'cpu'">🔲 CPU</button>
      <button class="cp-tab" :class="{ on: view === 'binary' }" @click="view = 'binary'">01 二进制</button>
      <button class="cp-tab" :class="{ on: view === 'packet' }" @click="view = 'packet'">📦 数据包</button>
      <button class="cp-tab" :class="{ on: view === 'network' }" @click="view = 'network'">🌐 架构</button>
    </div>
    <div v-if="view === 'binary'" class="cp-input">
      <label>数字</label>
      <input type="range" min="0" max="255" v-model.number="binaryInput" />
      <span>{{ binaryInput }}</span>
    </div>
  </div>
</template>

<style scoped>
.cp-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e293b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cp-svg { width: 100%; height: 100%; }
.cp-tabs {
  position: absolute;
  bottom: 36px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.cp-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 9px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.cp-tab.on {
  background: rgba(34, 197, 94, 0.2);
  border-color: #22c55e;
  color: #22c55e;
}
.cp-input {
  position: absolute;
  bottom: 8px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.85);
  padding: 4px 10px;
  border-radius: 6px;
  z-index: 5;
  backdrop-filter: blur(4px);
}
.cp-input input { flex: 1; }
.cp-input span { color: #facc15; font-weight: 700; min-width: 30px; text-align: right; }
</style>
