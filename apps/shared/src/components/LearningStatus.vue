<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ close: [] }>()
const learningData = ref<any[]>([])
const loading = ref(true)

function getToken() { return sessionStorage.getItem('grandkidsgo_token') }

function subjectIcon(subject: string): string {
  const icons: Record<string, string> = { poetry: '📜', classics: '📚', general: '🔬', english: '⭐', challenge: '🏆' }
  return icons[subject] || '📖'
}

function subjectName(subject: string): string {
  const names: Record<string, string> = { poetry: '诗词', classics: '国学', general: '通识', english: '英语', challenge: '挑战' }
  return names[subject] || subject
}

function subjectStat(p: any): string {
  const parts: string[] = []
  if (p.items_learned) parts.push(p.items_learned + (p.subject === 'poetry' ? '首' : p.subject === 'general' ? '题' : '篇'))
  if (p.time_spent_minutes) parts.push(Math.floor(p.time_spent_minutes / 60) + 'h')
  if (p.accuracy) parts.push(p.accuracy + '%')
  return parts.join(' · ') || '学习中'
}

function missingSubjects(progress: any[]): string[] {
  const existing = new Set((progress || []).map((p: any) => p.subject))
  return ['poetry', 'classics', 'general', 'english', 'challenge'].filter(s => !existing.has(s))
}

async function loadData() {
  loading.value = true
  try {
    const res = await fetch('/api/user/learning-progress/summary', {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
    const d = await res.json()
    if (d.code === 'OK') learningData.value = d.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

onMounted(loadData)
</script>

<template>
  <div class="ls-panel">
    <div class="ls-header">
      <span>📊 学习情况</span>
      <button class="ls-close" @click="emit('close')">✕</button>
    </div>
    <div class="ls-body">
      <div v-if="loading" class="ls-loading">加载中...</div>
      <div v-else-if="learningData.length === 0" class="ls-empty">还没有学习记录</div>
      <template v-else>
        <div v-for="child in learningData" :key="child.id" class="ls-child">
          <div class="ls-child-name">
            {{ child.avatar || '👤' }} {{ child.nickname }}
            <span class="ls-total">⏱ {{ Math.floor((child.progress || []).reduce((s: number, p: any) => s + (p.time_spent_minutes || 0), 0) / 60) }}h</span>
          </div>
          <div class="ls-subjects">
            <div v-for="p in child.progress" :key="p.subject" class="ls-subject">
              <span class="ls-sj-icon">{{ subjectIcon(p.subject) }}</span>
              <span class="ls-sj-name">{{ subjectName(p.subject) }}</span>
              <span class="ls-sj-stat">{{ subjectStat(p) }}</span>
            </div>
            <div v-for="s in missingSubjects(child.progress)" :key="s" class="ls-subject ls-subject-empty">
              <span class="ls-sj-icon">{{ subjectIcon(s) }}</span>
              <span class="ls-sj-name">{{ subjectName(s) }}</span>
              <span class="ls-sj-stat">未开始</span>
            </div>
          </div>
          <div class="ls-game" v-if="child.game_level || child.challenge_points">
            <span v-if="child.game_level">⭐ 英语 LV {{ child.game_level }}</span>
            <span v-if="child.challenge_points">🏆 挑战 #{{ child.challenge_rank || '?' }} · {{ child.challenge_points }}分</span>
          </div>
        </div>
      </template>
    </div>
    <div class="ls-footer">
      <a href="https://grandand.com/profile" class="ls-link">查看完整个人中心 →</a>
    </div>
  </div>
</template>

<style scoped>
.ls-panel {
  background: #fff; border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  width: 420px; max-width: 90vw;
  max-height: 70vh; display: flex; flex-direction: column;
  animation: slideDown 0.2s ease-out;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.ls-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
  font-size: 16px; font-weight: 600; color: #0f172a;
}
.ls-close {
  background: none; border: none; font-size: 16px;
  cursor: pointer; color: #94a3b8; padding: 4px;
}
.ls-close:hover { color: #475569; }
.ls-body { overflow-y: auto; flex: 1; padding: 12px 20px; }
.ls-loading, .ls-empty { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; }
.ls-child { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
.ls-child:last-child { border-bottom: none; }
.ls-child-name {
  font-size: 14px; font-weight: 600; color: #0f172a;
  display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
}
.ls-total { font-size: 12px; font-weight: 400; color: #94a3b8; margin-left: auto; }
.ls-subjects { display: flex; flex-direction: column; gap: 4px; }
.ls-subject { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; padding: 2px 0; }
.ls-subject-empty { opacity: 0.5; }
.ls-sj-icon { font-size: 14px; }
.ls-sj-name { flex: 1; }
.ls-sj-stat { font-size: 12px; color: #64748b; }
.ls-game {
  display: flex; gap: 12px; margin-top: 6px;
  font-size: 12px; color: #64748b; background: #f8fafc;
  padding: 6px 10px; border-radius: 8px;
}
.ls-footer {
  padding: 12px 20px; border-top: 1px solid #f1f5f9; text-align: center;
}
.ls-link { font-size: 13px; color: #2563eb; text-decoration: none; }
.ls-link:hover { text-decoration: underline; }
</style>
