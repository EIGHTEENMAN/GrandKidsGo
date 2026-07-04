<script setup lang="ts">
import { computed } from 'vue'
import { useLearningData } from '../../composables/useLearningData'
import { studyStore } from '../../stores/studyStore'
import { wordStore, getStreak } from '../../stores/wordStore'
import { characterStore } from '../../stores/characterStore'
import { router } from '../../router'
import { isLoggedIn, getUser } from '@shared/composables/useAuth'
import StudyCalendar from '@shared/components/StudyCalendar.vue'

const { dailyLogs, overview } = useLearningData()
const streak = computed(() => getStreak())

const user = computed(() => isLoggedIn() ? getUser() : null)
const displayName = computed(() => {
  if (!user.value) return '小朋友'
  const u = user.value as any
  if (u.children && u.children.length > 0) {
    const active = u.children.find((c: any) => c.id === JSON.parse(localStorage.getItem('grandkidsgo_active_profile') || 'null')?.id)
    return active?.nickname || u.children[0].nickname || u.nickname || '小朋友'
  }
  return u.nickname || u.username || '小朋友'
})

function openSettings() {
  window.location.hash = '#/profile/settings'
}

function clearProgress() {
  if (confirm('确定要清除所有学习记录吗？此操作不可撤销。')) {
    wordStore.clearAllProgress()
    studyStore.clearHistory()
    characterStore.clearAll()
    alert('学习记录已清除')
  }
}
</script>

<template>
  <div class="profile-screen">
    <!-- 用户卡片 -->
    <header class="user-card">
      <div class="avatar">{{ displayName[0]?.toUpperCase() || 'Y' }}</div>
      <div class="user-info">
        <h1 class="user-name">{{ displayName }}</h1>
        <p class="user-sub">英语乐园 · 学习 {{ overview.sessionsCompleted }} 课次</p>
      </div>
    </header>

    <!-- 5 张统计卡（蓝橙绿蓝紫） -->
    <section class="stats-grid">
      <div class="stat-card stat-card--blue">
        <div class="stat-num">{{ overview.mastered }}</div>
        <div class="stat-label">已掌握</div>
      </div>
      <div class="stat-card stat-card--orange">
        <div class="stat-num">{{ overview.totalLearned }}</div>
        <div class="stat-label">学过</div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-num">{{ overview.accuracy }}%</div>
        <div class="stat-label">正确率</div>
      </div>
      <div class="stat-card stat-card--blue">
        <div class="stat-num">{{ streak.current }}</div>
        <div class="stat-label">连续天数</div>
      </div>
      <div class="stat-card stat-card--purple">
        <div class="stat-num">{{ overview.chatMinutes }}<span class="stat-unit"> 分</span></div>
        <div class="stat-label">AI 对话时长</div>
      </div>
    </section>

    <!-- 日历 -->
    <section class="calendar-section">
      <h2 class="section-title">学习日历</h2>
      <StudyCalendar :daily-logs="dailyLogs" :streak="streak" />
    </section>

    <!-- 操作入口 -->
    <section class="actions">
      <button class="action-row" @click="openSettings">
        <span class="action-label">设置</span>
        <span class="action-arrow">›</span>
      </button>
      <button class="action-row action-row--danger" @click="clearProgress">
        <span class="action-label">清除学习记录</span>
        <span class="action-arrow">›</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.profile-screen {
  padding: var(--gap-lg) 0;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-lg);
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
}

.user-name {
  font-size: var(--text-h2);
  color: var(--color-text);
  margin-bottom: 2px;
}

.user-sub {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

/* 统计 5 卡（2 行 2+1 布局） */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--gap-md);
  margin-bottom: var(--gap-lg);
}

@media (min-width: 480px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .stats-grid > :last-child {
    grid-column: 1 / -1;
  }
}

.stat-card {
  padding: var(--gap-lg);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: center;
  border-bottom: 4px solid;
}

.stat-card--blue { border-color: var(--color-primary); }
.stat-card--orange { border-color: var(--color-secondary); }
.stat-card--green { border-color: var(--color-tertiary); }
.stat-card--purple { border-color: #9b59b6; }

.stat-unit {
  font-size: var(--text-small);
  font-weight: 500;
  color: var(--color-text-sub);
  margin-left: 2px;
}

.stat-num {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
  margin-bottom: var(--gap-xs);
}

.stat-label {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

/* 日历 */
.calendar-section {
  margin-bottom: var(--gap-lg);
}

.section-title {
  font-size: var(--text-h3);
  color: var(--color-text);
  margin-bottom: var(--gap-md);
}

/* 操作 */
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap-md) var(--gap-lg);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.action-row:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.action-label {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
}

.action-row--danger .action-label {
  color: var(--color-secondary);
}

.action-arrow {
  font-size: var(--text-h3);
  color: var(--color-text-sub);
}
</style>