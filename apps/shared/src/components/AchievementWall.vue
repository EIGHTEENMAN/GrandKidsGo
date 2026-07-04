<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  subjectSummary: { subject: string; items_learned: number; time_spent_minutes: number; accuracy: number }[]
  streak: { current: number; longest: number }
  totals: { items: number; minutes: number }
}>()

interface Achievement {
  id: string
  icon: string
  name: string
  desc: string
  check: () => boolean
}

const achievements: Achievement[] = [
  {
    id: 'first_read',
    icon: '📖',
    name: '初次阅读',
    desc: '完成第一次内容阅读',
    check: () => props.totals.items >= 1,
  },
  {
    id: 'streak_3',
    icon: '🔥',
    name: '坚持三天',
    desc: '连续学习3天',
    check: () => props.streak.current >= 3 || props.streak.longest >= 3,
  },
  {
    id: 'streak_7',
    icon: '⭐',
    name: '一周好习惯',
    desc: '连续学习7天',
    check: () => props.streak.current >= 7 || props.streak.longest >= 7,
  },
  {
    id: 'streak_30',
    icon: '💪',
    name: '坚持不懈',
    desc: '累计学习满30天',
    check: () => props.streak.longest >= 30,
  },
  {
    id: 'items_50',
    icon: '🎯',
    name: '小有成就',
    desc: '累计学习50项内容',
    check: () => props.totals.items >= 50,
  },
  {
    id: 'items_200',
    icon: '📚',
    name: '学富五车',
    desc: '累计学习200项内容',
    check: () => props.totals.items >= 200,
  },
  {
    id: 'items_500',
    icon: '🏆',
    name: '博学多才',
    desc: '累计学习500项内容',
    check: () => props.totals.items >= 500,
  },
  {
    id: 'items_1000',
    icon: '👑',
    name: '学习王者',
    desc: '累计学习1000项内容',
    check: () => props.totals.items >= 1000,
  },
  {
    id: 'hour_1',
    icon: '⏰',
    name: '学习一小时',
    desc: '累计学习60分钟',
    check: () => props.totals.minutes >= 60,
  },
  {
    id: 'hour_5',
    icon: '🕐',
    name: '学习五小时',
    desc: '累计学习300分钟',
    check: () => props.totals.minutes >= 300,
  },
  {
    id: 'subject_poetry',
    icon: '📝',
    name: '诗词入门',
    desc: '学习10篇诗词内容',
    check: () => {
      const s = props.subjectSummary.find(s => s.subject === 'poetry')
      return s ? s.items_learned >= 10 : false
    },
  },
  {
    id: 'subject_classics',
    icon: '🏛️',
    name: '国学入门',
    desc: '学习10篇国学内容',
    check: () => {
      const s = props.subjectSummary.find(s => s.subject === 'classics')
      return s ? s.items_learned >= 10 : false
    },
  },
  {
    id: 'subject_general',
    icon: '🌍',
    name: '通识入门',
    desc: '学习10篇通识内容',
    check: () => {
      const s = props.subjectSummary.find(s => s.subject === 'general')
      return s ? s.items_learned >= 10 : false
    },
  },
  {
    id: 'all_subjects',
    icon: '🦸',
    name: '全能学霸',
    desc: '所有科目都学过',
    check: () => {
      const subjects = new Set(props.subjectSummary.filter(s => s.items_learned > 0).map(s => s.subject))
      return subjects.has('poetry') && subjects.has('classics') && subjects.has('general')
    },
  },
]

const unlockedCount = computed(() => achievements.filter(a => a.check()).length)
const totalCount = achievements.length
</script>

<template>
  <div class="aw-wall">
    <div class="aw-header">
      <span>成就墙</span>
      <span class="aw-progress">{{ unlockedCount }}/{{ totalCount }}</span>
    </div>

    <div class="aw-grid">
      <div
        v-for="a in achievements"
        :key="a.id"
        class="aw-badge"
        :class="{ 'aw-locked': !a.check() }"
        :title="a.check() ? a.desc : '未解锁: ' + a.desc"
      >
        <div class="aw-icon">{{ a.check() ? a.icon : '🔒' }}</div>
        <div class="aw-name">{{ a.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aw-wall {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.aw-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 14px;
}
.aw-progress {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}
.aw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 10px;
}
.aw-badge {
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  transition: all 0.15s;
  cursor: default;
}
.aw-badge.aw-locked {
  opacity: 0.4;
}
.aw-badge:not(.aw-locked) {
  background: #f0f9ff;
}
.aw-icon {
  font-size: 26px;
  line-height: 1.2;
  margin-bottom: 4px;
}
.aw-name {
  font-size: 10px;
  color: #475569;
  line-height: 1.2;
}
.aw-locked .aw-name {
  color: #94a3b8;
}
</style>
