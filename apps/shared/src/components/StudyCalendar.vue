<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  dailyLogs: { date: string; subjects: Record<string, { items: number; minutes: number }> }[]
  streak: { current: number; longest: number }
}>()

const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

// Build a lookup for daily activity
const activityMap = computed(() => {
  const map: Record<string, number> = {}
  props.dailyLogs.forEach(d => {
    const total = Object.values(d.subjects).reduce((s, v) => s + v.items, 0)
    map[d.date] = total
  })
  return map
})

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Day of week: 0=Sun, 1=Mon, ...
  let startDow = firstDay.getDay()
  // Convert to Mon=0 ... Sun=6
  startDow = startDow === 0 ? 6 : startDow - 1

  const days: { date: string; day: number; activity: number; isCurrentMonth: boolean }[] = []

  // Previous month padding
  const prevLastDay = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLastDay - i
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // But this is previous month...
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const dateStr2 = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr2, day: d, activity: 0, isCurrentMonth: false })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      date: dateStr,
      day: d,
      activity: activityMap.value[dateStr] || 0,
      isCurrentMonth: true,
    })
  }

  // Next month padding to complete the grid (6 rows x 7 cols = 42)
  const remaining = 42 - days.length
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  for (let d = 1; d <= remaining; d++) {
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, day: d, activity: 0, isCurrentMonth: false })
  }

  return days
})

// Activity level for coloring
function activityLevel(n: number): number {
  if (n === 0) return 0
  if (n <= 2) return 1
  if (n <= 5) return 2
  return 3
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const isCurrentMonth = computed(() => {
  const now = new Date()
  return currentMonth.value === now.getMonth() && currentYear.value === now.getFullYear()
})

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="sc-calendar">
    <div class="sc-header">
      <button class="sc-nav" @click="prevMonth">‹</button>
      <span class="sc-month-title">{{ currentYear }}年{{ monthNames[currentMonth] }}</span>
      <button class="sc-nav" @click="nextMonth" :disabled="isCurrentMonth">›</button>
    </div>

    <div class="sc-grid">
      <div v-for="wd in weekDays" :key="wd" class="sc-weekday">{{ wd }}</div>
      <div
        v-for="(day, i) in calendarDays"
        :key="i"
        class="sc-day"
        :class="{
          'sc-day-dim': !day.isCurrentMonth,
          'sc-day-today': day.date === today(),
          [`sc-level-${activityLevel(day.activity)}`]: true,
        }"
        :title="day.date + (day.activity > 0 ? ` · ${day.activity}项` : '')"
      >{{ day.day }}</div>
    </div>

    <!-- Streak -->
    <div class="sc-streak">
      <div class="sc-streak-item">
        <span class="sc-streak-num">{{ streak.current }}</span>
        <span class="sc-streak-label">当前连续</span>
      </div>
      <div class="sc-streak-item">
        <span class="sc-streak-num">{{ streak.longest }}</span>
        <span class="sc-streak-label">最长连续</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="sc-legend">
      <span class="sc-legend-label">少</span>
      <span class="sc-legend-cell sc-level-0"></span>
      <span class="sc-legend-cell sc-level-1"></span>
      <span class="sc-legend-cell sc-level-2"></span>
      <span class="sc-legend-cell sc-level-3"></span>
      <span class="sc-legend-label">多</span>
    </div>
  </div>
</template>

<style scoped>
.sc-calendar {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.sc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sc-nav {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.sc-nav:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
.sc-nav:disabled { opacity: 0.3; cursor: default; }
.sc-month-title { font-size: 15px; font-weight: 600; color: #0f172a; }

.sc-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.sc-weekday {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  padding: 4px 0;
  font-weight: 500;
}
.sc-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-radius: 6px;
  color: #334155;
  transition: background 0.15s;
}
.sc-day-dim { color: #cbd5e1; }
.sc-day-today { font-weight: 700; }
.sc-level-0 { background: #f1f5f9; }
.sc-level-1 { background: #dbeafe; }
.sc-level-2 { background: #93c5fd; }
.sc-level-3 { background: #2563eb; color: #fff; }

.sc-streak {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}
.sc-streak-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.sc-streak-num {
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
}
.sc-streak-label {
  font-size: 12px;
  color: #94a3b8;
}

.sc-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  justify-content: center;
}
.sc-legend-label { font-size: 11px; color: #94a3b8; }
.sc-legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
</style>
