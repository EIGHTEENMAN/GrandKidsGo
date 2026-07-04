<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getActiveProfile, getLearningSummary } from '@/api/auth'

const profile = ref<any>(null)
const summary = ref<any[]>([])
const loading = ref(true)

const isParent = computed(() => profile.value?.type === 'parent' || !profile.value?.type)
const activeChild = computed(() => isParent.value ? null : profile.value)
const summaryForDisplay = computed(() => {
  if (isParent.value) return summary.value
  return summary.value.filter((c: any) => c.id === activeChild.value?.id)
})

const totalMinutes = computed(() => {
  let total = 0
  for (const child of summaryForDisplay.value) {
    for (const p of (child.progress || [])) {
      total += p.time_spent_minutes || 0
    }
  }
  return total
})

const totalHours = computed(() => Math.floor(totalMinutes.value / 60))

const subjectCount = computed(() => {
  const subjects = new Set<string>()
  for (const child of summaryForDisplay.value) {
    for (const p of (child.progress || [])) {
      if (p.items_learned > 0) subjects.add(p.subject)
    }
  }
  return subjects.size
})

const childrenCount = computed(() => summaryForDisplay.value.length)

const leastStudiedSubject = computed(() => {
  let min = Infinity
  let least = ''
  const allSubjects = ['poetry', 'classics', 'general', 'english', 'challenge']
  for (const child of summaryForDisplay.value) {
    for (const p of (child.progress || [])) {
      const idx = allSubjects.indexOf(p.subject)
      if (idx >= 0 && (p.items_learned || 0) < min) {
        min = p.items_learned || 0
        least = p.subject
      }
    }
  }
  return least || 'poetry'
})

const subjectRecommendations: Record<string, string> = {
  poetry: '今天来学一首新诗吧！📜',
  classics: '打开国学经典，读一篇智慧文章 📚',
  general: '探索通识百科，增长见识 🔭',
  english: '打开英语游戏，边玩边学单词 🎮',
  challenge: '挑战答题，测试你的知识储备 ⚡',
}

const displayName = computed(() => profile.value?.nickname || '朋友')

const mainLevel = computed(() => {
  let maxLevel = 0
  for (const child of summaryForDisplay.value) {
    if ((child.game_level || 0) > maxLevel) maxLevel = child.game_level
  }
  return maxLevel
})

const mainChallengeRank = computed(() => {
  let best = Infinity
  for (const child of summaryForDisplay.value) {
    if ((child.challenge_rank || 0) > 0 && child.challenge_rank < best) {
      best = child.challenge_rank
    }
  }
  return best < Infinity ? '#' + best : null
})

const subjectConfig = [
  { key: 'poetry', name: '诗词', icon: '📜', color: '#f59e0b', app: 'xueshici' },
  { key: 'classics', name: '国学', icon: '📚', color: '#8b5cf6', app: 'xueguoxue' },
  { key: 'general', name: '通识', icon: '🔭', color: '#06b6d4', app: 'xuetongshi' },
  { key: 'english', name: '英语', icon: '🔤', color: '#ec4899', app: 'english' },
  { key: 'challenge', name: '挑战', icon: '⚡', color: '#ef4444', app: 'tiaozhan' },
]

function getSubjectProgress(child: any, subjectKey: string) {
  return (child.progress || []).find((p: any) => p.subject === subjectKey)
}

function subjectTotal(subjectKey: string): { items: number; minutes: number; accuracy: number | null } {
  let items = 0
  let minutes = 0
  let accSum = 0
  let accCount = 0
  for (const child of summaryForDisplay.value) {
    const p = getSubjectProgress(child, subjectKey)
    if (p) {
      items += p.items_learned || 0
      minutes += p.time_spent_minutes || 0
      if (p.accuracy) { accSum += p.accuracy; accCount++ }
    }
  }
  return {
    items,
    minutes,
    accuracy: accCount > 0 ? Math.round(accSum / accCount) : null,
  }
}

function goToApp(appName: string) {
  window.location.href = 'https://' + appName + '.grandand.com'
}

function statLabel(subjectKey: string): string {
  switch (subjectKey) {
    case 'poetry': return '首'
    case 'classics': return '篇'
    case 'general': return '题'
    default: return ''
  }
}

onMounted(async () => {
  profile.value = getActiveProfile()
  if (!profile.value) {
    try {
      const raw = localStorage.getItem('grandkidsgo_user')
      if (raw) {
        const u = JSON.parse(raw)
        profile.value = { type: 'parent', id: u.id, nickname: u.nickname || u.username }
      }
    } catch {}
  }
  try {
    const res = await getLearningSummary()
    if (res.code === 'OK') summary.value = res.data
  } catch {}
  loading.value = false
})
</script>

<template>
  <div class="ld-wrap">
    <!-- Welcome Section -->
    <div class="ld-welcome animate-fadeInUp">
      <div class="ld-welcome-left">
        <div class="ld-welcome-avatar">{{ profile?.avatar || '👋' }}</div>
        <div>
          <div class="ld-welcome-greeting">欢迎回来，{{ displayName }}！</div>
          <div class="ld-welcome-stats" v-if="!loading">
            <span class="ld-stat-tag">{{ totalHours }}h 学习</span>
            <span class="ld-stat-tag">{{ subjectCount }} 科目</span>
            <span class="ld-stat-tag" v-if="subjectCount > 0">{{ childrenCount }} 孩子</span>
            <span class="ld-stat-tag" v-if="mainLevel > 0">英语 LV{{ mainLevel }}</span>
            <span class="ld-stat-tag" v-if="mainChallengeRank">挑战 {{ mainChallengeRank }}</span>
          </div>
        </div>
      </div>
      <div class="ld-welcome-right">
        <div class="ld-recommend" v-if="!loading && summaryForDisplay.length > 0">
          <span class="ld-rec-text">{{ subjectRecommendations[leastStudiedSubject] || '继续学习，加油！💪' }}</span>
        </div>
      </div>
    </div>

    <!-- Learning Progress Cards -->
    <div class="ld-subjects animate-fadeInUp" v-if="!loading">
      <div
        v-for="s in subjectConfig"
        :key="s.key"
        class="ld-subject-card"
        :class="{ 'ld-empty': subjectTotal(s.key).items === 0 }"
        @click="goToApp(s.app)"
      >
        <div class="ld-sj-icon" :style="{ backgroundColor: s.color + '18' }">
          <span>{{ s.icon }}</span>
        </div>
        <div class="ld-sj-name">{{ s.name }}</div>
        <div class="ld-sj-stat" v-if="subjectTotal(s.key).items > 0">
          <span class="ld-sj-num">{{ subjectTotal(s.key).items }}{{ statLabel(s.key) }}</span>
          <span class="ld-sj-time">{{ Math.floor(subjectTotal(s.key).minutes / 60) }}h</span>
          <span class="ld-sj-acc" v-if="subjectTotal(s.key).accuracy">{{ subjectTotal(s.key).accuracy }}%</span>
        </div>
        <div class="ld-sj-empty" v-else>未开始</div>
        <div class="ld-sj-link">
          去学习 →
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div class="ld-loading" v-if="loading">
      <p>加载中...</p>
    </div>

    <!-- Empty state -->
    <div class="ld-empty-state animate-fadeInUp" v-if="!loading && summaryForDisplay.length === 0">
      <p class="ld-empty-title">还没有学习记录</p>
      <p class="ld-empty-desc">选择一个应用开始学习吧！</p>
    </div>

    <!-- Quick Links -->
    <div class="ld-quick-links animate-fadeInUp">
      <a
        v-for="s in subjectConfig"
        :key="s.key"
        :href="'https://' + s.app + '.grandand.com'"
        class="ld-quick-link"
        :style="{ '--ld-accent': s.color }"
      >
        <span class="ld-ql-icon">{{ s.icon }}</span>
        <span class="ld-ql-name">{{ s.name }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.ld-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 0;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }

/* Welcome */
.ld-welcome {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  background: linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 18px;
  padding: 24px 28px;
  margin-bottom: 24px;
}
.ld-welcome-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.ld-welcome-avatar {
  font-size: 40px;
  line-height: 1;
}
.ld-welcome-greeting {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}
.ld-welcome-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ld-stat-tag {
  padding: 4px 12px;
  background: white;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}
.ld-welcome-right {
  flex-shrink: 0;
  max-width: 360px;
  text-align: right;
}
.ld-rec-text {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}
.ld-recommend {
  background: rgba(255,255,255,0.7);
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* Subject Cards */
.ld-subjects {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.ld-subject-card {
  background: white;
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ld-subject-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  transform: translateY(-3px);
}
.ld-subject-card.ld-empty {
  opacity: 0.55;
}
.ld-sj-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.ld-sj-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.ld-sj-stat {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
  justify-content: center;
}
.ld-sj-num { font-weight: 600; color: #0f172a; }
.ld-sj-time { color: #94a3b8; }
.ld-sj-acc { color: #16a34a; }
.ld-sj-empty {
  font-size: 12px;
  color: #94a3b8;
}
.ld-sj-link {
  font-size: 12px;
  color: #2563eb;
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.2s;
}
.ld-subject-card:hover .ld-sj-link {
  opacity: 1;
}

.ld-loading, .ld-empty-state {
  text-align: center;
  padding: 40px 20px;
}
.ld-empty-title { font-size: 16px; color: #0f172a; margin-bottom: 6px; }
.ld-empty-desc { font-size: 13px; color: #94a3b8; }

/* Quick Links */
.ld-quick-links {
  display: flex;
  gap: 10px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  justify-content: center;
}
.ld-quick-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: white;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}
.ld-quick-link:hover {
  border-color: var(--ld-accent);
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}
.ld-ql-icon { font-size: 16px; }

@media (max-width: 768px) {
  .ld-wrap { padding: 20px 16px 0; }
  .ld-welcome { flex-direction: column; gap: 14px; }
  .ld-welcome-right { max-width: 100%; text-align: left; }
  .ld-subjects { grid-template-columns: repeat(2, 1fr); }
  .ld-quick-links { justify-content: flex-start; }
}
</style>
