<script setup lang="ts">
/**
 * Robots — 机器人（关节转动+传感器感知+决策）
 */
import { ref, computed } from 'vue'

const sensing = ref(false)
</script>

<template>
  <div class="rb-wrap" @click.stop>
    <svg class="rb-svg" viewBox="-110 -110 220 220">
      <!-- 机器人主体 -->
      <g transform="translate(0 10)">
        <!-- 头 -->
        <rect x="-20" y="-50" width="40" height="30" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="0.8" />
        <!-- 天线 -->
        <line x1="0" y1="-50" x2="0" y2="-60" stroke="#475569" stroke-width="1.2" />
        <circle cx="0" cy="-62" r="3" :fill="sensing ? '#facc15' : '#475569'">
          <animate v-if="sensing" attributeName="r" values="3;5;3" dur="0.8s" repeatCount="indefinite" />
        </circle>
        <!-- 眼睛 -->
        <circle cx="-8" cy="-38" r="3" :fill="sensing ? '#facc15' : '#1e3a8a'" />
        <circle cx="8" cy="-38" r="3" :fill="sensing ? '#facc15' : '#1e3a8a'" />
        <!-- 嘴（LED 灯） -->
        <rect x="-8" y="-28" width="16" height="2" fill="#22c55e" />
        <!-- 身体 -->
        <rect x="-25" y="-20" width="50" height="40" rx="4" fill="#64748b" stroke="#334155" stroke-width="0.8" />
        <!-- 胸灯（心跳） -->
        <circle cx="0" cy="-2" r="3" fill="#dc2626">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </circle>
        <!-- 屏幕显示文字 -->
        <text x="0" y="8" text-anchor="middle" font-size="3.5" fill="#94a3b8" font-family="monospace">A.I. ONLINE</text>

        <!-- 左臂（关节活动） -->
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-10 25 0; 30 25 0; -10 25 0" dur="3s" repeatCount="indefinite" />
          <rect x="22" y="-15" width="6" height="20" fill="#475569" />
          <circle cx="25" cy="5" r="3" fill="#334155" />
          <rect x="22" y="5" width="6" height="15" fill="#475569" />
        </g>
        <!-- 右臂 -->
        <g>
          <animateTransform attributeName="transform" type="rotate" values="10 -25 0; -30 -25 0; 10 -25 0" dur="3s" repeatCount="indefinite" />
          <rect x="-28" y="-15" width="6" height="20" fill="#475569" />
          <circle cx="-25" cy="5" r="3" fill="#334155" />
          <rect x="-28" y="5" width="6" height="15" fill="#475569" />
        </g>
        <!-- 双腿 -->
        <rect x="-12" y="20" width="8" height="20" fill="#475569" />
        <rect x="4" y="20" width="8" height="20" fill="#475569" />
        <!-- 脚（轮子） -->
        <circle cx="-8" cy="44" r="5" fill="#1e293b" stroke="#475569" stroke-width="0.6" />
        <circle cx="8" cy="44" r="5" fill="#1e293b" stroke="#475569" stroke-width="0.6" />
      </g>

      <!-- 传感器扫描波（开启感知时） -->
      <g v-if="sensing">
        <circle cx="0" cy="0" r="20" fill="none" stroke="#facc15" stroke-width="0.6" opacity="0.7">
          <animate attributeName="r" values="20;90;20" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="0" cy="0" r="20" fill="none" stroke="#facc15" stroke-width="0.4" opacity="0.5">
          <animate attributeName="r" values="20;90;20" dur="2s" begin="0.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" begin="0.5s" repeatCount="indefinite" />
        </circle>
      </g>

      <!-- 障碍物（感知到后闪红） -->
      <g transform="translate(70 50)">
        <rect x="-6" y="-6" width="12" height="12" fill="#dc2626" :opacity="sensing ? 0.8 : 0.3" rx="2">
          <animate v-if="sensing" attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
        </rect>
        <text text-anchor="middle" y="20" font-size="4" fill="#fca5a5" font-weight="700">障碍</text>
      </g>

      <text x="-100" y="-95" font-size="6" :fill="sensing ? '#facc15' : '#94a3b8'" font-weight="700">🤖 {{ sensing ? '感知中...' : '机器人' }}</text>
    </svg>

    <div class="rb-controls">
      <button class="rb-btn" :class="{ on: sensing }" @click="sensing = !sensing">
        {{ sensing ? '👁 关闭感知' : '👁 启动感知' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.rb-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e293b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rb-svg { width: 100%; height: 100%; }
.rb-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: center;
  z-index: 5;
}
.rb-btn {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 8px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.rb-btn.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}
</style>
