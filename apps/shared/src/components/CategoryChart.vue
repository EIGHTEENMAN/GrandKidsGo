<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  subjectSummary: {
    subject: string
    items_learned: number
    time_spent_minutes: number
    accuracy: number
  }[]
}>()

const subjectLabels: Record<string, string> = {
  poetry: '诗词',
  classics: '国学',
  general: '通识',
  english: '英语',
  challenge: '挑战',
}

const subjectColors: Record<string, string> = {
  poetry: '#2563eb',
  classics: '#7c3aed',
  general: '#059669',
  english: '#d97706',
  challenge: '#dc2626',
}

const totalItems = computed(() => props.subjectSummary.reduce((s, p) => s + p.items_learned, 0))
const totalMinutes = computed(() => props.subjectSummary.reduce((s, p) => s + p.time_spent_minutes, 0))

const conicGradient = computed(() => {
  if (totalItems.value === 0) return 'conic-gradient(#f1f5f9 0deg, #f1f5f9 360deg)'
  const segments: string[] = []
  let cumulative = 0
  props.subjectSummary.forEach(p => {
    const pct = p.items_learned / totalItems.value
    if (pct === 0) return
    const startDeg = cumulative * 360
    const endDeg = (cumulative + pct) * 360
    segments.push(`${subjectColors[p.subject] || '#94a3b8'} ${startDeg}deg ${endDeg}deg`)
    cumulative += pct
  })
  if (segments.length === 0) return 'conic-gradient(#f1f5f9 0deg, #f1f5f9 360deg)'
  return `conic-gradient(${segments.join(', ')})`
})

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}
</script>

<template>
  <div class="cc-chart">
    <div class="cc-header">学习分布</div>

    <div v-if="totalItems === 0" class="cc-empty">
      暂无学习数据，开始学习吧！
    </div>

    <template v-else>
      <div class="cc-body">
        <div class="cc-donut-wrap">
          <div class="cc-donut" :style="{ background: conicGradient }">
            <div class="cc-donut-hole">
              <div class="cc-donut-total">{{ totalItems }}</div>
              <div class="cc-donut-label">总项数</div>
            </div>
          </div>
        </div>

        <div class="cc-legend">
          <div v-for="item in subjectSummary" :key="item.subject" class="cc-legend-item">
            <span class="cc-dot" :style="{ background: subjectColors[item.subject] }"></span>
            <span class="cc-legend-name">{{ subjectLabels[item.subject] || item.subject }}</span>
            <span class="cc-legend-count">{{ item.items_learned }}</span>
            <span class="cc-legend-pct">{{ totalItems > 0 ? Math.round(item.items_learned / totalItems * 100) : 0 }}%</span>
          </div>
        </div>
      </div>

      <div class="cc-footer">
        <div class="cc-stat">
          <span class="cc-stat-num">{{ totalItems }}</span>
          <span class="cc-stat-label">学习内容</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-num">{{ formatTime(totalMinutes) }}</span>
          <span class="cc-stat-label">学习时长</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cc-chart {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.cc-header {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 14px;
}
.cc-empty {
  text-align: center;
  padding: 30px 0;
  color: #94a3b8;
  font-size: 14px;
}
.cc-body {
  display: flex;
  gap: 20px;
  align-items: center;
}
.cc-donut-wrap {
  flex-shrink: 0;
}
.cc-donut {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cc-donut-hole {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.cc-donut-total {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}
.cc-donut-label {
  font-size: 10px;
  color: #94a3b8;
}
.cc-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cc-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.cc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cc-legend-name { color: #334155; min-width: 2em; }
.cc-legend-count { margin-left: auto; color: #0f172a; font-weight: 600; }
.cc-legend-pct { color: #94a3b8; width: 3em; text-align: right; }
.cc-footer {
  display: flex;
  gap: 20px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}
.cc-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.cc-stat-num { font-size: 16px; font-weight: 700; color: #2563eb; }
.cc-stat-label { font-size: 12px; color: #94a3b8; }
</style>
