<script setup lang="ts">
/**
 * Communication — 通信技术
 *   - 手机 → 基站（电磁波）
 *   - 基站 → 卫星
 *   - 5G 信号
 */
import { ref } from 'vue'

const view = ref<'phone' | 'satellite' | '5g'>('phone')
</script>

<template>
  <div class="cm-wrap" @click.stop>
    <svg class="cm-svg" viewBox="-110 -110 220 220">
      <defs>
        <radialGradient id="5gGrad">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- 手机 ↔ 基站 -->
      <g v-if="view === 'phone'">
        <!-- 手机（左下） -->
        <g transform="translate(-70 50)">
          <rect x="-8" y="-12" width="16" height="24" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.8" />
          <rect x="-6" y="-10" width="12" height="18" fill="#3b82f6" />
          <circle cx="0" cy="6" r="1" fill="#475569" />
          <text y="-18" text-anchor="middle" font-size="4" fill="#cbd5e1" font-weight="700">手机</text>
        </g>
        <!-- 基站（右上） -->
        <g transform="translate(70 -50)">
          <rect x="-5" y="0" width="10" height="20" fill="#475569" />
          <line x1="-3" y1="0" x2="-3" y2="-15" stroke="#475569" stroke-width="0.6" />
          <line x1="3" y1="0" x2="3" y2="-15" stroke="#475569" stroke-width="0.6" />
          <!-- 扇形天线 -->
          <path d="M -15 -25 L 0 -35 L 15 -25 Z" fill="url(#5gGrad)" />
          <line x1="-15" y1="-25" x2="15" y2="-25" stroke="#facc15" stroke-width="0.6" />
          <text y="-40" text-anchor="middle" font-size="4" fill="#facc15" font-weight="700">基站</text>
        </g>
        <!-- 电磁波（横波双向） -->
        <line x1="-58" y1="50" x2="55" y2="-50" stroke="#94a3b8" stroke-width="0.4" stroke-dasharray="2,2" opacity="0.6" />
        <!-- 移动的电磁波粒子 -->
        <g v-for="i in 5" :key="i">
          <text font-size="9" fill="#3b82f6">
            <animateMotion dur="2s" begin="i * 0.4 + 's'" repeatCount="indefinite"
              path="M -70 50 L 70 -50" />
            📶
          </text>
        </g>
        <g v-for="i in 5" :key="`b${i}`">
          <text font-size="9" fill="#a78bfa">
            <animateMotion dur="2s" begin="i * 0.4 + 's'" repeatCount="indefinite"
              path="M 70 -50 L -70 50" />
            📶
          </text>
        </g>
      </g>

      <!-- 卫星通信 -->
      <g v-else-if="view === 'satellite'">
        <!-- 地球（底部） -->
        <ellipse cx="0" cy="80" rx="100" ry="20" fill="#1e3a8a" stroke="#3b82f6" stroke-width="0.6" />
        <!-- 卫星轨道 -->
        <ellipse rx="80" ry="20" fill="none" stroke="#475569" stroke-width="0.4" stroke-dasharray="2,2" />
        <!-- 卫星 -->
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
          <rect x="-5" y="-3" width="10" height="6" fill="#94a3b8" />
          <rect x="-12" y="-1" width="5" height="2" fill="#facc15" />
          <rect x="7" y="-1" width="5" height="2" fill="#facc15" />
        </g>
        <!-- 卫星 → 地球信号 -->
        <line x1="60" y1="0" x2="40" y2="60" stroke="#facc15" stroke-width="0.6" stroke-dasharray="2,2">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
        </line>
        <!-- 地面接收站 -->
        <g transform="translate(40 60)">
          <rect x="-3" y="-8" width="6" height="8" fill="#475569" />
          <line x1="0" y1="-8" x2="0" y2="-14" stroke="#475569" stroke-width="0.6" />
          <circle cx="0" cy="-15" r="1.5" fill="#facc15">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>

      <!-- 5G 网络 -->
      <g v-else>
        <!-- 5G 信号塔（中心） -->
        <g transform="translate(0 0)">
          <rect x="-3" y="0" width="6" height="50" fill="#475569" />
          <line x1="-3" y1="0" x2="0" y2="-15" stroke="#475569" stroke-width="0.6" />
          <line x1="3" y1="0" x2="0" y2="-15" stroke="#475569" stroke-width="0.6" />
          <!-- 5G 标签 -->
          <text y="-20" text-anchor="middle" font-size="10" fill="#3b82f6" font-weight="800">5G</text>
          <!-- 多重信号波 -->
          <circle r="20" fill="none" stroke="#3b82f6" stroke-width="0.8" opacity="0.6">
            <animate attributeName="r" values="20;80;20" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="20" fill="none" stroke="#3b82f6" stroke-width="0.6" opacity="0.5">
            <animate attributeName="r" values="20;80;20" dur="3s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" begin="1s" repeatCount="indefinite" />
          </circle>
        </g>
        <!-- 周围 6 个设备 -->
        <g v-for="(d, i) in [{x:60,y:-40,t:'📱'},{x:80,y:20,t:'💻'},{x:30,y:60,t:'🚗'},{x:-30,y:60,t:'⌚'},{x:-80,y:20,t:'📺'},{x:-60,y:-40,t:'🏠'}]" :key="i" :transform="`translate(${d.x} ${d.y})`">
          <text text-anchor="middle" y="2" font-size="16">{{ d.t }}</text>
          <text text-anchor="middle" y="16" font-size="4" fill="#94a3b8" font-weight="600">设备</text>
        </g>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#3b82f6" font-weight="700">📡 {{ view === 'phone' ? '手机信号' : view === 'satellite' ? '卫星通信' : '5G 网络' }}</text>
    </svg>

    <div class="cm-tabs">
      <button class="cm-tab" :class="{ on: view === 'phone' }" @click="view = 'phone'">📱 手机</button>
      <button class="cm-tab" :class="{ on: view === 'satellite' }" @click="view = 'satellite'">🛰 卫星</button>
      <button class="cm-tab" :class="{ on: view === '5g' }" @click="view = '5g'">📶 5G</button>
    </div>
  </div>
</template>

<style scoped>
.cm-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e3a8a 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cm-svg { width: 100%; height: 100%; }
.cm-tabs {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  justify-content: center;
}
.cm-tab {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  backdrop-filter: blur(4px);
}
.cm-tab.on {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #93c5fd;
}
</style>
