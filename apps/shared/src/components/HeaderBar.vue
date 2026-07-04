<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { isLoggedIn, getUser, useAuth } from '../composables/useAuth'
import { navLinks } from '../config/navLinks'

const props = withDefaults(defineProps<{
  placeholder?: string
  onSearch?: (query: string) => void
  /** UI 变体：'default' = 完整（搜索+链接+登录），'minimal' = 仅 logo（儿童学习站避免抢视野） */
  variant?: 'default' | 'minimal'
}>(), {
  variant: 'default'
})

const isMinimal = computed(() => props.variant === 'minimal')

const searchQuery = defineModel<string>('modelValue', { required: true })
const localUser = ref<any>(null)
const showProfile = ref(false)
const showLearning = ref(false)
const learningData = ref<any[]>([])
const loadingLearning = ref(false)

const displayName = computed(() => {
  if (!localUser.value) return ''
  const profile = getActiveProfile()
  return profile?.nickname || localUser.value.nickname || localUser.value.username || '用户'
})

// localStorage helpers — keep in sync with main-site auth.ts
function getActiveProfile(): any | null {
  try {
    const raw = localStorage.getItem('grandkidsgo_active_profile')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getToken() { return sessionStorage.getItem('grandkidsgo_token') }

function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  // 优先用自定义搜索处理器（子 app 传入），否则 redirect 到主站全局搜索
  if (props.onSearch) {
    props.onSearch(q)
  } else {
    window.location.href = 'https://grandand.com/search?q=' + encodeURIComponent(q)
  }
}

function refreshUser() {
  localUser.value = isLoggedIn() ? getUser() : null
}

async function loadLearningData() {
  if (!localUser.value) return
  loadingLearning.value = true
  try {
    const res = await fetch('/api/user/learning-progress/summary', {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
    const d = await res.json()
    if (d.code === 'OK') learningData.value = d.data
  } catch { /* ignore */ }
  finally { loadingLearning.value = false }
}

function toggleLearning() {
  showLearning.value = !showLearning.value
  if (showLearning.value) loadLearningData()
}

function goToProfile() {
  window.location.href = 'https://grandand.com/personal-center'
}

function handleLogout() {
  const auth = useAuth()
  auth.logout()
  window.location.href = 'https://grandand.com'
}

onMounted(() => {
  refreshUser()

  // Cross-domain auth sync: check cookie if no localStorage user
  if (!isLoggedIn()) {
    const m = document.cookie.match(new RegExp('(^| )grandkidsgo_token=([^;]+)'))
    if (m) {
      const cookieToken = decodeURIComponent(m[2])
      sessionStorage.setItem('grandkidsgo_token', cookieToken)
      fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + cookieToken }
      })
      .then(r => r.json())
      .then(d => {
        if (d.code === 'OK') {
          sessionStorage.setItem('grandkidsgo_user', JSON.stringify(d.data))
          localUser.value = d.data
        }
      })
      .catch(() => {})
    }
  }

  window.addEventListener('storage', refreshUser)
})
</script>

<template>
  <header class="hd-header">
    <div class="hd-header-inner">
      <div class="hd-header-left">
        <a href="https://grandand.com" class="hd-logo">童慧行</a>
        <form v-if="!isMinimal" class="hd-search-form" @submit.prevent="doSearch">
          <svg class="hd-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" @click="doSearch">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            :placeholder="placeholder || '搜索'"
            class="hd-search-input"
          />
        </form>
      </div>
      <div v-if="!isMinimal" class="hd-header-right">
        <div class="hd-header-links">
          <a v-for="link in navLinks.filter(l => !l.hidden)" :key="link.label" :href="link.href" class="hd-header-link">{{ link.icon }} {{ link.label }}</a>
        </div>
        <div class="hd-header-auth">
          <template v-if="localUser">
            <button class="hd-learning-btn" @click="toggleLearning" title="学习情况">
              📊<span class="hd-learning-label">学习</span>
            </button>
            <span class="hd-user" @click="goToProfile">
              <span v-if="localUser.avatar" class="hd-avatar">{{ localUser.avatar }}</span>
              <span>{{ displayName }}</span>
              <span class="hd-user-arrow">▾</span>
            </span>
            <button class="hd-logout-btn" @click="handleLogout">退出</button>
          </template>
          <a v-else href="https://grandand.com/?login=1" class="hd-login-btn">登录 / 注册</a>
        </div>
      </div>
    </div>

    <!-- Learning Status Popup -->
    <Teleport to="body">
      <div v-if="showLearning" class="hd-overlay" @click.self="showLearning = false">
        <div class="hd-learning-panel">
          <div class="hd-learning-header">
            <span>📊 学习情况</span>
            <button class="hd-close-btn" @click="showLearning = false">✕</button>
          </div>
          <div class="hd-learning-body">
            <div v-if="loadingLearning" class="hd-learning-loading">加载中...</div>
            <div v-else-if="learningData.length === 0" class="hd-learning-empty">还没有学习记录</div>
            <template v-else>
              <div v-for="child in learningData" :key="child.id" class="hd-learning-child">
                <div class="hd-learning-child-name">
                  {{ child.avatar || '👤' }} {{ child.nickname }}
                  <span class="hd-learning-total">⏱ {{ Math.floor((child.progress || []).reduce((s: number, p: any) => s + (p.time_spent_minutes || 0), 0) / 60) }}h</span>
                </div>
                <div class="hd-learning-subjects">
                  <div v-for="p in child.progress" :key="p.subject" class="hd-learning-subject">
                    <span class="hd-subj-icon">{{ subjectIcon(p.subject) }}</span>
                    <span class="hd-subj-name">{{ subjectName(p.subject) }}</span>
                    <span class="hd-subj-stat">{{ subjectStat(p) }}</span>
                  </div>
                  <!-- Show subjects with no data yet as zero state -->
                  <div v-for="s in missingSubjects(child.progress)" :key="s" class="hd-learning-subject hd-subj-empty">
                    <span class="hd-subj-icon">{{ subjectIcon(s) }}</span>
                    <span class="hd-subj-name">{{ subjectName(s) }}</span>
                    <span class="hd-subj-stat">未开始</span>
                  </div>
                </div>
                <!-- Show game data inline -->
                <div class="hd-learning-game" v-if="child.game_level || child.challenge_points">
                  <span v-if="child.game_level">⭐ 英语 LV {{ child.game_level }}</span>
                  <span v-if="child.challenge_points">🏆 挑战 #{{ child.challenge_rank || '?' }} · {{ child.challenge_points }}分</span>
                </div>
              </div>
            </template>
          </div>
          <div class="hd-learning-footer">
            <a href="https://grandand.com/profile" class="hd-learning-link">查看完整个人中心 →</a>
          </div>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script lang="ts">
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
</script>

<style scoped>
.hd-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}
.hd-header-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.hd-header-left { display: flex; align-items: center; gap: 12px; }
.hd-logo { font-size: 32px; font-weight: 800; color: var(--hd-accent, #2563eb); text-decoration: none; line-height: 1; white-space: nowrap; }
.hd-search-form {
  display: flex; align-items: center; gap: 6px;
  background: #f1f5f9; border-radius: 10px;
  padding: 6px 12px; transition: all 0.2s;
  border: 1px solid transparent;
}
.hd-search-form:focus-within {
  background: #fff;
  border-color: var(--hd-accent-light, #bfdbfe);
  box-shadow: 0 0 0 3px var(--hd-accent-shadow, rgba(59,130,246,0.1));
}
.hd-search-icon {
  width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; cursor: pointer;
}
.hd-search-input {
  border: none; background: transparent; outline: none;
  font-size: 13px; width: 160px; color: #334155;
}
.hd-search-input::placeholder { color: #94a3b8; }

.hd-header-right { display: flex; align-items: center; gap: 16px; }
.hd-header-links { display: flex; gap: 8px; }
.hd-header-link {
  padding: 8px 18px; border-radius: 10px; font-size: 14px; font-weight: 500;
  text-decoration: none; color: #64748b; transition: all 0.2s;
}
.hd-header-link:hover { background: #f1f5f9; color: #0f172a; }

.hd-header-auth { display: flex; align-items: center; gap: 12px; }
.hd-learning-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 14px; border-radius: 10px;
  background: #f0f7ff; border: 1px solid #bfdbfe;
  font-size: 13px; color: #1d4ed8; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
}
.hd-learning-btn:hover { background: #dbeafe; }
.hd-learning-label { font-weight: 500; }
.hd-user {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: #374151; font-weight: 500;
  cursor: pointer; padding: 4px 8px; border-radius: 8px;
  transition: background 0.2s;
}
.hd-user:hover { background: #f1f5f9; }
.hd-avatar { font-size: 18px; }
.hd-user-arrow { font-size: 10px; color: #94a3b8; margin-left: 2px; }
.hd-login-btn {
  padding: 8px 20px; background: var(--hd-accent, #2563eb); color: white; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
  text-decoration: none; transition: background 0.2s;
  white-space: nowrap;
}
.hd-login-btn:hover { background: var(--hd-accent-hover, #1d4ed8); }
.hd-logout-btn {
  padding: 6px 12px; background: transparent; color: #9ca3af; border: none;
  border-radius: 8px; font-size: 13px; cursor: pointer; transition: color 0.2s;
}
.hd-logout-btn:hover { color: #ef4444; }

/* Learning Status Popup */
.hd-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.3);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 80px;
}
.hd-learning-panel {
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
.hd-learning-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
  font-size: 16px; font-weight: 600; color: #0f172a;
}
.hd-close-btn {
  background: none; border: none; font-size: 16px;
  cursor: pointer; color: #94a3b8; padding: 4px;
}
.hd-close-btn:hover { color: #475569; }
.hd-learning-body {
  overflow-y: auto; flex: 1; padding: 12px 20px;
}
.hd-learning-loading, .hd-learning-empty {
  text-align: center; padding: 24px; color: #94a3b8; font-size: 14px;
}
.hd-learning-child {
  padding: 12px 0; border-bottom: 1px solid #f1f5f9;
}
.hd-learning-child:last-child { border-bottom: none; }
.hd-learning-child-name {
  font-size: 14px; font-weight: 600; color: #0f172a;
  display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
}
.hd-learning-total { font-size: 12px; font-weight: 400; color: #94a3b8; margin-left: auto; }
.hd-learning-subjects { display: flex; flex-direction: column; gap: 4px; }
.hd-learning-subject {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #475569; padding: 2px 0;
}
.hd-learning-subject.hd-subj-empty { opacity: 0.5; }
.hd-subj-icon { font-size: 14px; }
.hd-subj-name { flex: 1; }
.hd-subj-stat { font-size: 12px; color: #64748b; }
.hd-learning-game {
  display: flex; gap: 12px; margin-top: 6px;
  font-size: 12px; color: #64748b; background: #f8fafc;
  padding: 6px 10px; border-radius: 8px;
}
.hd-learning-footer {
  padding: 12px 20px; border-top: 1px solid #f1f5f9;
  text-align: center;
}
.hd-learning-link {
  font-size: 13px; color: #2563eb; text-decoration: none;
}
.hd-learning-link:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .hd-header-links { display: none; }
  .hd-search-input { width: 100px; }
  .hd-learning-label { display: none; }
  /* 移动端：登录按钮降饱和为细线描边，避免在阅读场景中过于抢眼 */
  .hd-login-btn {
    padding: 5px 14px;
    background: transparent;
    color: var(--hd-accent, #2563eb);
    border: 1px solid var(--hd-accent, #2563eb);
    border-radius: 999px;
    font-size: 13px;
  }
  .hd-login-btn:hover {
    background: var(--hd-accent, #2563eb);
    color: white;
  }
}
</style>
