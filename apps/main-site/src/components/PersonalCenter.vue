<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { getToken, fetchUser, saveProfile, getChildren, addChild, updateChild, deleteChild, logout, getUser, getActiveProfile, setActiveProfile, getLearningSummary, setUser, setChildPassword, deleteAccount } from '@/api/auth'
import StudyCalendar from '@shared/components/StudyCalendar.vue'
import CategoryChart from '@shared/components/CategoryChart.vue'
import AchievementWall from '@shared/components/AchievementWall.vue'
import LearningPath from '@shared/components/LearningPath.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; logout: [] }>()

// ─── State ──────────────────────────────────────────────────
const user = ref<any>(getUser())
const children = ref<any[]>([])
const points = ref(0)
const learningSummary = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const viewMode = ref<'parent' | 'child'>('parent')
const activeChild = ref<any>(null)
const searchQuery = ref('')

// Profile editing
const editing = ref(false)
const editNickname = ref('')
const editAvatar = ref('')
const editGender = ref('')
const editBirthday = ref('')
const saving = ref(false)

// Children management
const addingChild = ref(false)
const childForm = ref({ nickname: '', gender: '', birthday: '', avatar: '' })
const editingChild = ref<string | null>(null)
const editChildForm = ref({ nickname: '', gender: '', birthday: '', avatar: '' })
const passwordChildId = ref<string | null>(null)
const passwordInput = ref('')
const savingPassword = ref(false)
const showDeleteConfirm = ref(false)
const deletingAccount = ref(false)

// ─── Youth Mode ───────────────────────────────────────────────
const youthMode = ref<any>(null)
const youthModeLoading = ref(false)
const editingYouthLimit = ref(false)
const youthLimitInput = ref(40)

const avatars = ['🦁', '🐯', '🐼', '🐨', '🐸', '🦊', '🐰', '🐙', '🦄', '🐲']

// ─── Learning Report ──────────────────────────────────────────
const learningReport = ref<any>(null)
const reportLoading = ref(false)

async function loadLearningReport(childId: string) {
  reportLoading.value = true
  try {
    const res = await fetch(`/api/user/learning-report?childId=${childId}`, {
      headers: { Authorization: 'Bearer ' + getToken() }
    })
    const data = await res.json()
    if (data.code === 'OK') learningReport.value = data.data
  } catch { /* ignore */ }
  finally { reportLoading.value = false }
}

watch(activeChild, (child) => {
  if (child?.id) loadLearningReport(child.id)
})

// ─── Computed ───────────────────────────────────────────────
const displayName = computed(() => {
  if (viewMode.value === 'child' && activeChild.value) return activeChild.value.nickname
  return user.value?.nickname || user.value?.username || '用户'
})

const displayAvatar = computed(() => {
  if (viewMode.value === 'child' && activeChild.value) return activeChild.value.avatar || '👤'
  return user.value?.avatar || '👤'
})

// ─── Data Loading ───────────────────────────────────────────
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const u = await fetchUser()
    if (u) user.value = u
    const c = await getChildren()
    if (c.code === 'OK') children.value = c.data || []

    const ls = await getLearningSummary()
    if (ls.code === 'OK') learningSummary.value = ls.data || []

    const pRes = await fetch('/api/user/points', { headers: { Authorization: 'Bearer ' + getToken() } })
    const pData = await pRes.json()
    if (pData.code === 'OK') points.value = pData.data?.balance || 0

    // Youth mode
    const ymRes = await fetch('/api/user/youth-mode', { headers: { Authorization: 'Bearer ' + getToken() } })
    const ymData = await ymRes.json()
    if (ymData.code === 'OK') youthMode.value = ymData.data

    const saved = getActiveProfile()
    if (saved && saved.type === 'child') {
      const match = children.value.find((c: any) => c.id === saved.id)
      if (match) {
        viewMode.value = 'child'
        activeChild.value = match
      }
    }
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (props.open) loadData() })

// ─── Header Search ──────────────────────────────────────────
function doSearch() {
  if (searchQuery.value.trim()) {
    window.location.href = '/search?q=' + encodeURIComponent(searchQuery.value.trim())
  }
}

// ─── View Switching ─────────────────────────────────────────
function switchToParent() {
  viewMode.value = 'parent'
  activeChild.value = null
  setActiveProfile({ type: 'parent', id: user.value?.id, nickname: user.value?.nickname || user.value?.username })
}

function switchToChild(child: any) {
  viewMode.value = 'child'
  activeChild.value = child
  setActiveProfile({ type: 'child', id: child.id, nickname: child.nickname })
}

// ─── Profile Edit ───────────────────────────────────────────
function startEdit() {
  editNickname.value = user.value?.nickname || ''
  editAvatar.value = user.value?.avatar || ''
  editGender.value = user.value?.gender || ''
  editBirthday.value = user.value?.birthday || ''
  editing.value = true
}

async function saveEdit() {
  if (!editNickname.value.trim()) return
  saving.value = true
  try {
    await saveProfile({
      nickname: editNickname.value.trim(),
      avatar: editAvatar.value || undefined,
      gender: editGender.value || undefined,
      birthday: editBirthday.value || undefined,
    })
    await fetchUser()
    user.value = getUser()
    editing.value = false
  } catch {
    error.value = '保存失败'
  } finally {
    saving.value = false
  }
}

// ─── Children CRUD ──────────────────────────────────────────
function hasPassword(c: any): boolean {
  return !!(c.phone && c.password_hash)
}

function startSetPassword(childId: string) {
  passwordChildId.value = childId
  passwordInput.value = ''
}

async function savePassword() {
  if (!passwordChildId.value || passwordInput.value.length < 6) return
  savingPassword.value = true
  try {
    const res = await setChildPassword(passwordChildId.value, passwordInput.value)
    if (res.code === 'OK') {
      passwordChildId.value = null
      passwordInput.value = ''
      await loadData()
    } else {
      error.value = res.message || '设置失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    savingPassword.value = false
  }
}

async function saveChild() {
  if (!childForm.value.nickname.trim()) return
  saving.value = true
  try {
    const res = await addChild({
      nickname: childForm.value.nickname.trim(),
      gender: childForm.value.gender || undefined,
      birthday: childForm.value.birthday || undefined,
      avatar: childForm.value.avatar || undefined,
    })
    if (res.code === 'OK') {
      const childId = res.data.id
      for (const subject of ['poetry', 'classics', 'general']) {
        await fetch('/api/user/learning-progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify({ childId, subject, itemsLearned: 0, timeSpentMinutes: 0 }),
        })
      }
    }
    addingChild.value = false
    childForm.value = { nickname: '', gender: '', birthday: '', avatar: '' }
    await loadData()
  } catch {
    error.value = '添加失败'
  } finally {
    saving.value = false
  }
}

function startEditChild(c: any) {
  editingChild.value = c.id
  editChildForm.value = {
    nickname: c.nickname,
    gender: c.gender || '',
    birthday: c.birthday || '',
    avatar: c.avatar || '',
  }
}

async function saveEditChild() {
  if (!editingChild.value || !editChildForm.value.nickname.trim()) return
  saving.value = true
  try {
    await updateChild(editingChild.value, {
      nickname: editChildForm.value.nickname.trim(),
      gender: editChildForm.value.gender || undefined,
      birthday: editChildForm.value.birthday || undefined,
      avatar: editChildForm.value.avatar || undefined,
    })
    editingChild.value = null
    await loadData()
  } catch {
    error.value = '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeChild(id: string) {
  if (!confirm('确定删除这个孩子？')) return
  try {
    await deleteChild(id)
    if (activeChild.value?.id === id) switchToParent()
    await loadData()
  } catch {
    error.value = '删除失败'
  }
}

// ─── Logout ─────────────────────────────────────────────────
function handleLogout() {
  logout()
  emit('logout')
}

async function handleLogin(user: any) {
  // not used
  return
}

async function handleDeleteAccount() {
  deletingAccount.value = true
  try {
    const res = await deleteAccount()
    if (res.code === 'OK') {
      showDeleteConfirm.value = false
      logout()
      emit('logout')
    } else {
      error.value = res.message || '注销失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    deletingAccount.value = false
  }
}

async function saveYouthLimit() {
  if (youthLimitInput.value < 15 || youthLimitInput.value > 120) return
  youthModeLoading.value = true
  try {
    await fetch('/api/user/youth-mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ dailyTimeLimit: youthLimitInput.value }),
    })
    editingYouthLimit.value = false
    youthMode.value.daily_time_limit_minutes = youthLimitInput.value
  } catch {} finally {
    youthModeLoading.value = false
  }
}

// ─── Helpers ────────────────────────────────────────────────
const genderLabel = (g: string) => g === 'male' || g === '男' ? '👦 男孩' : g === 'female' || g === '女' ? '👧 女孩' : '🤫 保密'

function calcAge(birthday: string): string {
  if (!birthday) return ''
  const b = new Date(birthday)
  const age = Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000))
  return age > 0 ? age + '岁' : ''
}

function getChildProgress(childId: string): any[] {
  const entry = learningSummary.value.find((s: any) => s.id === childId)
  return entry?.progress || []
}

function getTotalTime(progress: any[]): number {
  return Math.floor((progress || []).reduce((s: number, p: any) => s + (p.time_spent_minutes || 0), 0) / 60)
}

function subjectIcon(subject: string): string {
  const icons: Record<string, string> = { poetry: '📜', classics: '📚', general: '🔬', english: '⭐', challenge: '🏆' }
  return icons[subject] || '📖'
}

function subjectName(subject: string): string {
  const names: Record<string, string> = { poetry: '诗词', classics: '国学', general: '通识', english: '英语', challenge: '挑战' }
  return names[subject] || subject
}

function subjectDetail(p: any): string {
  const parts: string[] = []
  if (p.items_learned) parts.push(p.items_learned + (p.subject === 'poetry' ? '首' : p.subject === 'general' ? '题' : '篇'))
  if (p.time_spent_minutes) parts.push(Math.floor(p.time_spent_minutes / 60) + 'h')
  if (p.accuracy) parts.push(p.accuracy + '%')
  return parts.join(' · ') || '学习中'
}

function subjectColor(subject: string): string {
  const colors: Record<string, string> = { poetry: '#f59e0b', classics: '#8b5cf6', general: '#06b6d4', english: '#ec4899', challenge: '#ef4444' }
  return colors[subject] || '#64748b'
}

const allSubjects = [
  { key: 'poetry', name: '诗词', icon: '📜', color: '#f59e0b' },
  { key: 'classics', name: '国学', icon: '📚', color: '#8b5cf6' },
  { key: 'general', name: '通识', icon: '🔬', color: '#06b6d4' },
  { key: 'english', name: '英语', icon: '⭐', color: '#ec4899' },
  { key: 'challenge', name: '挑战', icon: '🏆', color: '#ef4444' },
]

function hasChildSubjectProgress(childId: string, subjectKey: string): boolean {
  const progress = getChildProgress(childId)
  return !!progress.find((p: any) => p.subject === subjectKey)
}

function getSubjectData(childId: string, subjectKey: string): any {
  return getChildProgress(childId).find((p: any) => p.subject === subjectKey)
}

function subjectProgressPercent(items: number | undefined): number {
  if (!items) return 0
  const max = 100
  return Math.min(100, Math.round((items / max) * 100))
}

const ageOptions = Array.from({ length: 18 }, (_, i) => i + 1)
</script>

<template>
  <div class="pc-page">
    <!-- Header Nav (matches main site) -->
    <header class="pc-header">
      <div class="pc-header-inner">
        <div class="pc-header-left">
          <a href="https://grandand.com" class="pc-logo">童慧行</a>
          <form class="pc-search-form" @submit.prevent="doSearch">
            <svg class="pc-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" @click="doSearch">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              placeholder="搜索"
              class="pc-search-input"
            />
          </form>
        </div>
        <div class="pc-header-right">
          <div class="pc-header-links">
          <a v-for="link in navLinks.filter(l => !l.hidden)" :key="link.label" :href="link.href" class="pc-header-link">{{ link.icon }} {{ link.label }}</a>
        </div>
          <div class="pc-header-auth">
            <template v-if="user">
              <a href="/personal-center" class="pc-header-profile-btn active">个人中心</a>
              <button class="pc-header-logout" @click="handleLogout">退出</button>
            </template>
            <a v-else href="https://grandand.com" class="pc-header-login">返回首页</a>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Hero -->
    <div class="pc-hero">
      <div class="pc-hero-inner">
        <div class="pc-hero-content">
          <h1 class="pc-hero-title">个人中心</h1>
          <p class="pc-hero-desc">管理个人信息，查看学习情况</p>
        </div>
        <div class="pc-hero-info">
          <span class="pc-hero-points" v-if="points > 0">🪙 {{ points }} 积分</span>
        </div>
      </div>
    </div>

    <div v-if="loading && !user" class="pc-loading">加载中...</div>

    <div v-else class="pc-body">
      <!-- ── Profile Switcher ─────────────────────────────── -->
      <div class="pc-switcher">
        <div
          :class="['pc-switch-item', { active: viewMode === 'parent' }]"
          @click="switchToParent()"
        >
          <span class="pc-switch-avatar">{{ user?.avatar || '👤' }}</span>
          <div class="pc-switch-info">
            <span class="pc-switch-name">{{ user?.nickname || user?.username || '家长' }}</span>
            <span class="pc-switch-label">全部概览</span>
          </div>
        </div>
        <div
          v-for="c in children"
          :key="c.id"
          :class="['pc-switch-item', { active: viewMode === 'child' && activeChild?.id === c.id }]"
          @click="switchToChild(c)"
        >
          <span class="pc-switch-avatar">{{ c.avatar || '👶' }}</span>
          <div class="pc-switch-info">
            <span class="pc-switch-name">{{ c.nickname }}</span>
            <span class="pc-switch-label">{{ c.gender ? genderLabel(c.gender) : '' }}{{ calcAge(c.birthday) ? ' · ' + calcAge(c.birthday) : '' }}</span>
          </div>
        </div>
      </div>

      <!-- ── PARENT VIEW ──────────────────────────────────── -->
      <template v-if="viewMode === 'parent'">
        <!-- Summary Stats -->
        <div class="pc-summary" v-if="!loading">
          <div class="pc-summary-card">
            <span class="pc-summary-icon">👶</span>
            <span class="pc-summary-val">{{ children.length }}</span>
            <span class="pc-summary-lbl">孩子</span>
          </div>
          <div class="pc-summary-card">
            <span class="pc-summary-icon">⏱</span>
            <span class="pc-summary-val">{{ Math.floor(learningSummary.reduce((s: number, c: any) => s + getTotalTime(c.progress || []), 0)) }}h</span>
            <span class="pc-summary-lbl">总学习</span>
          </div>
          <div class="pc-summary-card">
            <span class="pc-summary-icon">📖</span>
            <span class="pc-summary-val">{{ learningSummary.reduce((s: number, c: any) => s + (c.progress || []).reduce((s2: number, p: any) => s2 + (p.items_learned || 0), 0), 0) }}</span>
            <span class="pc-summary-lbl">学习量</span>
          </div>
          <div class="pc-summary-card">
            <span class="pc-summary-icon">🏆</span>
            <span class="pc-summary-val">{{ children.filter(c => c.challenge_points > 0).length > 0 ? '活跃' : '-' }}</span>
            <span class="pc-summary-lbl">挑战</span>
          </div>
        </div>

        <!-- Learning Overview -->
        <section class="pc-card">
          <h2 class="pc-section-title">📊 学习概览</h2>
          <div v-if="children.length === 0" class="pc-empty">
            <p>还没有添加孩子</p>
            <button class="pc-btn-primary" @click="addingChild = true">+ 添加孩子</button>
          </div>
          <div v-else class="pc-child-grid">
            <div
              v-for="child in children"
              :key="child.id"
              class="pc-child-card"
              @click="switchToChild(child)"
            >
              <div class="pc-child-header">
                <span class="pc-child-avatar">{{ child.avatar || (child.gender === '男' || child.gender === 'male' ? '👦' : '👧') }}</span>
                <div class="pc-child-header-info">
                  <span class="pc-child-name">{{ child.nickname }}</span>
                  <span class="pc-child-meta">{{ calcAge(child.birthday) || '' }} · ⏱ {{ getTotalTime(getChildProgress(child.id)) }}h</span>
                </div>
                <span class="pc-child-arrow">→</span>
              </div>
              <div class="pc-child-subjects">
                <div
                  v-for="s in allSubjects"
                  :key="s.key"
                  class="pc-child-subject"
                >
                  <div class="pc-cs-header">
                    <span>{{ s.icon }} {{ s.name }}</span>
                    <span class="pc-cs-stat" v-if="hasChildSubjectProgress(child.id, s.key)">{{ subjectDetail(getSubjectData(child.id, s.key)) }}</span>
                    <span class="pc-cs-stat pc-cs-empty" v-else>未开始</span>
                  </div>
                  <div class="pc-cs-bar-track">
                    <div
                      class="pc-cs-bar-fill"
                      :style="{ width: subjectProgressPercent(getSubjectData(child.id, s.key)?.items_learned) + '%', backgroundColor: s.color }"
                    ></div>
                  </div>
                </div>
                <!-- Game stats -->
                <div class="pc-child-subject" v-if="child.game_level || child.challenge_points">
                  <div class="pc-cs-header">
                    <span>{{ child.game_level ? '⭐ 英语 LV' + child.game_level : '' }}{{ child.game_level && child.challenge_points ? ' · ' : '' }}{{ child.challenge_points ? '🏆 挑战 #' + (child.challenge_rank || '?') + ' · ' + child.challenge_points + '分' : '' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- My Profile -->
        <section class="pc-card">
          <div class="pc-card-header">
            <h2 class="pc-section-title">📋 我的资料</h2>
            <button class="pc-btn-text" @click="startEdit">编辑</button>
          </div>
          <div class="pc-info-grid">
            <div class="pc-info-item">
              <span class="pc-info-label">昵称</span>
              <span class="pc-info-value">{{ user?.nickname || user?.username || '-' }}</span>
            </div>
            <div class="pc-info-item">
              <span class="pc-info-label">性别</span>
              <span class="pc-info-value">{{ user?.gender ? (user.gender === '男' || user.gender === 'male' ? '男' : user.gender === '女' || user.gender === 'female' ? '女' : user.gender) : '-' }}</span>
            </div>
            <div class="pc-info-item">
              <span class="pc-info-label">生日</span>
              <span class="pc-info-value">{{ user?.birthday || '-' }}</span>
            </div>
            <div class="pc-info-item">
              <span class="pc-info-label">手机</span>
              <span class="pc-info-value">{{ user?.phone || '未绑定' }}</span>
            </div>
            <div class="pc-info-item">
              <span class="pc-info-label">积分</span>
              <span class="pc-info-value pc-points">🪙 {{ points }}</span>
            </div>
          </div>
        </section>

        <!-- Youth Mode Settings -->
        <section class="pc-card" v-if="youthMode?.enabled">
          <div class="pc-card-header">
            <h2 class="pc-section-title">🛡️ 青少年模式</h2>
            <button class="pc-btn-text" @click="editingYouthLimit = !editingYouthLimit; if (!editingYouthLimit) { youthLimitInput = youthMode?.daily_time_limit_minutes || 40 }">
              {{ editingYouthLimit ? '取消' : '调整限制' }}
            </button>
          </div>
          <div class="pc-info-grid" style="grid-template-columns:repeat(4,1fr)">
            <div class="pc-info-item">
              <span class="pc-info-label">状态</span>
              <span class="pc-info-value" style="color:#059669">✅ 已启用</span>
            </div>
            <div class="pc-info-item">
              <span class="pc-info-label">每日限制</span>
              <span class="pc-info-value">{{ youthMode?.daily_time_limit_minutes || 40 }} 分钟</span>
            </div>
            <div class="pc-info-item">
              <span class="pc-info-label">今日使用</span>
              <span class="pc-info-value">{{ youthMode?.todayUsage || 0 }} 分钟</span>
            </div>
            <div class="pc-info-item" v-if="youthMode?.night_mode_enabled">
              <span class="pc-info-label">夜间模式</span>
              <span class="pc-info-value">🌙 22:00-06:00 禁用</span>
            </div>
          </div>
          <div v-if="editingYouthLimit" style="margin-top:12px">
            <label class="pc-info-label" style="margin-bottom:4px;display:block">每日使用限制（分钟，15-120）</label>
            <div style="display:flex;gap:8px">
              <input v-model.number="youthLimitInput" type="number" min="15" max="120" class="pc-input" style="width:120px" />
              <button class="pc-btn-primary" @click="saveYouthLimit" :disabled="youthModeLoading || youthLimitInput < 15 || youthLimitInput > 120">
                {{ youthModeLoading ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Children Management -->
        <section class="pc-card">
          <div class="pc-card-header">
            <h2 class="pc-section-title">👶 孩子管理</h2>
            <button class="pc-btn-primary" @click="addingChild = true">+ 添加孩子</button>
          </div>
          <div v-if="children.length === 0" class="pc-empty">还没有添加孩子信息</div>
          <div v-for="c in children" :key="c.id" class="pc-child-row">
            <template v-if="editingChild === c.id">
              <div class="pc-inline-form">
                <input v-model="editChildForm.nickname" placeholder="昵称" class="pc-input" />
                <div class="pc-avatar-select-mini">
                  <span v-for="a in avatars" :key="a" :class="['pc-avatar-opt', { active: editChildForm.avatar === a }]" @click="editChildForm.avatar = a">{{ a }}</span>
                </div>
                <select v-model="editChildForm.gender" class="pc-input">
                  <option value="">性别</option>
                  <option value="男">👦 男孩</option>
                  <option value="女">👧 女孩</option>
                </select>
                <input v-model="editChildForm.birthday" type="date" class="pc-input" placeholder="生日" />
                <div class="pc-inline-actions">
                  <button class="pc-btn-sm pc-btn-primary" @click="saveEditChild" :disabled="saving">保存</button>
                  <button class="pc-btn-sm pc-btn-ghost" @click="editingChild = null">取消</button>
                </div>
              </div>
            </template>
            <template v-else>
              <span class="pc-row-avatar">{{ c.avatar || (c.gender === '男' || c.gender === 'male' ? '👦' : '👧') }}</span>
              <div class="pc-row-info">
                <span class="pc-row-name">{{ c.nickname }}</span>
                <span class="pc-row-detail">{{ c.gender ? genderLabel(c.gender) + ' · ' : '' }}{{ calcAge(c.birthday) || (c.birthday || '') }}</span>
              </div>
              <div class="pc-row-actions">
                <button class="pc-btn-sm pc-btn-outline" @click="startEditChild(c)">编辑</button>
                <button class="pc-btn-sm pc-btn-outline" @click="startSetPassword(c.id)" v-if="c.phone">{{ hasPassword(c) ? '改密码' : '设密码' }}</button>
                <button class="pc-btn-sm pc-btn-danger" @click="removeChild(c.id)">删除</button>
              </div>
            </template>
          </div>

          <!-- Add Child Form -->
          <div v-if="addingChild" class="pc-add-form">
            <input v-model="childForm.nickname" placeholder="孩子昵称" class="pc-input" />
            <div class="pc-avatar-select-mini">
              <span v-for="a in avatars" :key="a" :class="['pc-avatar-opt', { active: childForm.avatar === a }]" @click="childForm.avatar = a">{{ a }}</span>
            </div>
            <select v-model="childForm.gender" class="pc-input">
              <option value="">选择性别</option>
              <option value="男">👦 男孩</option>
              <option value="女">👧 女孩</option>
            </select>
            <input v-model="childForm.birthday" type="date" class="pc-input" placeholder="生日" />
            <div class="pc-add-actions">
              <button class="pc-btn-primary" @click="saveChild" :disabled="saving">添加</button>
              <button class="pc-btn-ghost" @click="addingChild = false">取消</button>
            </div>
          </div>
        </section>
      </template>

      <!-- ── CHILD VIEW ───────────────────────────────────── -->
      <template v-if="viewMode === 'child' && activeChild">
        <!-- Summary Stats -->
        <div class="pc-summary">
          <div class="pc-summary-card pc-summary-main">
            <span class="pc-summary-avatar">{{ activeChild.avatar || '👤' }}</span>
            <div class="pc-summary-main-info">
              <span class="pc-summary-main-name">{{ activeChild.nickname }}</span>
              <span class="pc-summary-main-meta">{{ activeChild.gender ? genderLabel(activeChild.gender) : '' }}{{ calcAge(activeChild.birthday) ? ' · ' + calcAge(activeChild.birthday) : '' }}</span>
            </div>
          </div>
          <div class="pc-summary-card">
            <span class="pc-summary-icon">⏱</span>
            <span class="pc-summary-val">{{ getTotalTime(getChildProgress(activeChild.id)) }}h</span>
            <span class="pc-summary-lbl">学习时长</span>
          </div>
          <div class="pc-summary-card">
            <span class="pc-summary-icon">📖</span>
            <span class="pc-summary-val">{{ getChildProgress(activeChild.id).reduce((s: number, p: any) => s + (p.items_learned || 0), 0) }}</span>
            <span class="pc-summary-lbl">学习量</span>
          </div>
          <div class="pc-summary-card" v-if="activeChild.game_level || activeChild.challenge_points">
            <span class="pc-summary-icon">🏆</span>
            <span class="pc-summary-val">{{ activeChild.game_level ? 'LV' + activeChild.game_level : '#' + (activeChild.challenge_rank || '?') }}</span>
            <span class="pc-summary-lbl">{{ activeChild.game_level ? '英语' : '挑战' }}</span>
          </div>
        </div>

        <!-- Subject Cards Grid -->
        <section class="pc-card">
          <h2 class="pc-section-title">📖 学习详情</h2>
          <div class="pc-subject-grid">
            <div
              v-for="s in allSubjects"
              :key="s.key"
              :class="['pc-subject-card', { 'pc-subject-empty': !hasChildSubjectProgress(activeChild.id, s.key) }]"
            >
              <div class="pc-subject-top">
                <div class="pc-subject-icon" :style="{ backgroundColor: s.color + '18' }">{{ s.icon }}</div>
                <div class="pc-subject-info">
                  <span class="pc-subject-name">{{ s.name }}</span>
                  <span class="pc-subject-stat" v-if="hasChildSubjectProgress(activeChild.id, s.key)">
                    {{ subjectDetail(getSubjectData(activeChild.id, s.key)) }}
                  </span>
                  <span class="pc-subject-stat pc-stat-empty" v-else>未开始</span>
                </div>
              </div>
              <div class="pc-subject-bar-track" v-if="hasChildSubjectProgress(activeChild.id, s.key)">
                <div
                  class="pc-subject-bar-fill"
                  :style="{ width: subjectProgressPercent(getSubjectData(activeChild.id, s.key)?.items_learned) + '%', backgroundColor: s.color }"
                ></div>
              </div>
              <div class="pc-subject-detail" v-if="hasChildSubjectProgress(activeChild.id, s.key)">
                <div class="pc-subject-detail-item" v-if="getSubjectData(activeChild.id, s.key)?.items_learned">
                  <span class="pc-sd-val">{{ getSubjectData(activeChild.id, s.key).items_learned }}</span>
                  <span class="pc-sd-lbl">{{ s.key === 'poetry' ? '首' : s.key === 'general' ? '题' : '篇' }}</span>
                </div>
                <div class="pc-subject-detail-item" v-if="getSubjectData(activeChild.id, s.key)?.time_spent_minutes">
                  <span class="pc-sd-val">{{ Math.floor(getSubjectData(activeChild.id, s.key).time_spent_minutes / 60) }}h</span>
                  <span class="pc-sd-lbl">时长</span>
                </div>
                <div class="pc-subject-detail-item" v-if="getSubjectData(activeChild.id, s.key)?.accuracy">
                  <span class="pc-sd-val">{{ getSubjectData(activeChild.id, s.key).accuracy }}%</span>
                  <span class="pc-sd-lbl">正确率</span>
                </div>
              </div>
              <!-- Game specific display -->
              <template v-if="s.key === 'english' && activeChild.game_level">
                <div class="pc-subject-detail">
                  <div class="pc-subject-detail-item">
                    <span class="pc-sd-val">LV {{ activeChild.game_level }}</span>
                    <span class="pc-sd-lbl">等级</span>
                  </div>
                  <div class="pc-subject-detail-item" v-if="activeChild.game_score">
                    <span class="pc-sd-val">{{ activeChild.game_score?.toLocaleString() }}</span>
                    <span class="pc-sd-lbl">最高分</span>
                  </div>
                </div>
              </template>
              <template v-if="s.key === 'challenge' && activeChild.challenge_points">
                <div class="pc-subject-detail">
                  <div class="pc-subject-detail-item">
                    <span class="pc-sd-val">#{{ activeChild.challenge_rank || '?' }}</span>
                    <span class="pc-sd-lbl">排名</span>
                  </div>
                  <div class="pc-subject-detail-item">
                    <span class="pc-sd-val">{{ activeChild.challenge_points }}</span>
                    <span class="pc-sd-lbl">积分</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </section>

        <!-- Learning Report -->
        <section class="pc-card">
          <h2 class="pc-section-title">📊 学习报告</h2>
          <div v-if="reportLoading" class="pc-report-loading">加载中...</div>
          <div v-else-if="!learningReport" class="pc-report-loading">暂无数据</div>
          <template v-else>
            <div class="pc-report-grid">
              <StudyCalendar
                :daily-logs="learningReport.dailyLogs || []"
                :streak="learningReport.streak || { current: 0, longest: 0 }"
              />
              <CategoryChart :subject-summary="learningReport.subjectSummary || []" />
            </div>
            <div class="pc-report-achievements">
              <AchievementWall
                :subject-summary="learningReport.subjectSummary || []"
                :streak="learningReport.streak || { current: 0, longest: 0 }"
                :totals="learningReport.totals || { items: 0, minutes: 0 }"
              />
            </div>
            <div class="pc-report-path">
              <LearningPath :totals="learningReport.totals || { items: 0 }" />
            </div>
          </template>
        </section>

        <!-- Children Management (same cards but editable) -->
        <section class="pc-card">
          <div class="pc-card-header">
            <h2 class="pc-section-title">👶 孩子管理</h2>
            <button class="pc-btn-primary" @click="addingChild = true">+ 添加孩子</button>
          </div>
          <div v-for="c in children" :key="c.id" class="pc-child-row">
            <span class="pc-row-avatar">{{ c.avatar || (c.gender === '男' || c.gender === 'male' ? '👦' : '👧') }}</span>
            <div class="pc-row-info">
              <span class="pc-row-name">{{ c.nickname }}</span>
              <span class="pc-row-detail">{{ c.gender ? genderLabel(c.gender) + ' · ' : '' }}{{ calcAge(c.birthday) || (c.birthday || '') }}{{ c.phone ? ' · 📱' + c.phone : '' }}{{ hasPassword(c) ? ' · 🔐已设密码' : '' }}</span>
            </div>
            <div class="pc-row-actions">
              <button class="pc-btn-sm pc-btn-outline" @click="switchToChild(c)" v-if="activeChild.id !== c.id">切换</button>
              <button class="pc-btn-sm pc-btn-outline" @click="startEditChild(c)">编辑</button>
              <button class="pc-btn-sm pc-btn-danger" @click="removeChild(c.id)">删除</button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- Logout & Delete Account -->
    <div class="pc-logout">
      <button class="pc-btn-logout" @click="handleLogout">退出登录</button>
      <button class="pc-btn-delete-account" @click="showDeleteConfirm = true">注销账号</button>
    </div>

    <!-- Error Toast -->
    <p v-if="error" class="pc-error">{{ error }}</p>

    <!-- Password Setup Modal -->
    <div v-if="passwordChildId" class="pc-overlay" @click.self="passwordChildId = null">
      <div class="pc-modal">
        <h3>设置孩子独立密码</h3>
        <p class="pc-modal-desc">设置后孩子可使用手机号+密码独立登录</p>
        <input
          v-model="passwordInput"
          type="password"
          placeholder="至少6位密码"
          class="pc-input pc-input-lg"
          minlength="6"
          @keydown.enter="savePassword"
        />
        <div class="pc-modal-actions">
          <button class="pc-btn-primary" @click="savePassword" :disabled="passwordInput.length < 6 || savingPassword">
            {{ savingPassword ? '设置中...' : '确认设置' }}
          </button>
          <button class="pc-btn-ghost" @click="passwordChildId = null">取消</button>
        </div>
      </div>
    </div>

    <!-- Profile Edit Modal -->
    <div v-if="editing" class="pc-overlay" @click.self="editing = false">
      <div class="pc-modal">
        <h3>编辑资料</h3>
        <div class="pc-avatar-select">
          <span v-for="a in avatars" :key="a" :class="['pc-avatar-opt', { active: editAvatar === a }]" @click="editAvatar = a">{{ a }}</span>
        </div>
        <input v-model="editNickname" placeholder="昵称" class="pc-input pc-input-lg" />
        <select v-model="editGender" class="pc-input pc-input-lg">
          <option value="">选择性别</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>
        <input v-model="editBirthday" type="date" class="pc-input pc-input-lg" placeholder="生日" />
        <div class="pc-modal-actions">
          <button class="pc-btn-primary" @click="saveEdit" :disabled="saving">保存</button>
          <button class="pc-btn-ghost" @click="editing = false">取消</button>
        </div>
      </div>
    </div>

    <!-- Delete Account Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="pc-overlay" @click.self="showDeleteConfirm = false">
      <div class="pc-modal">
        <h3>确认注销账号？</h3>
        <div class="pc-modal-desc" style="display:flex;flex-direction:column;gap:8px">
          <p>注销后，以下数据将被永久删除且无法恢复：</p>
          <ul style="margin:0 0 0 16px;padding:0;font-size:13px;color:#64748b">
            <li>个人资料（昵称、头像等）</li>
            <li>孩子信息及学习记录</li>
            <li>积分余额</li>
            <li>登录会话</li>
          </ul>
          <p style="margin-top:4px;color:#ef4444;font-weight:500">此操作不可撤销，请谨慎操作</p>
        </div>
        <div class="pc-modal-actions">
          <button class="pc-btn-danger" @click="handleDeleteAccount" :disabled="deletingAccount" style="flex:1;padding:10px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;border:none">
            {{ deletingAccount ? '注销中...' : '确认注销' }}
          </button>
          <button class="pc-btn-ghost" @click="showDeleteConfirm = false" style="flex:1">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pc-page { min-height: 100vh; background: #f8fafc; }

/* ── Header (matches main-site App.vue) ───────────────── */
.pc-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}
.pc-header-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.pc-header-left { display: flex; align-items: center; gap: 12px; }
.pc-logo { font-size: 32px; font-weight: 800; color: #2563eb; text-decoration: none; line-height: 1; }
.pc-search-form {
  display: flex; align-items: center; gap: 6px;
  background: #f1f5f9; border-radius: 10px;
  padding: 6px 12px; transition: all 0.2s;
  border: 1px solid transparent;
}
.pc-search-form:focus-within {
  background: #fff;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.pc-search-icon { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; cursor: pointer; }
.pc-search-input {
  border: none; background: transparent; outline: none;
  font-size: 13px; width: 160px; color: #334155;
}
.pc-search-input::placeholder { color: #94a3b8; }
.pc-header-right { display: flex; align-items: center; gap: 16px; }
.pc-header-links { display: flex; gap: 8px; }
.pc-header-link {
  padding: 8px 18px; border-radius: 10px; font-size: 14px; font-weight: 500;
  text-decoration: none; color: #64748b; transition: all 0.2s;
}
.pc-header-link:hover { background: #f1f5f9; color: #0f172a; }
.pc-header-auth { display: flex; align-items: center; gap: 12px; }
.pc-header-profile-btn {
  padding: 6px 14px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
  border-radius: 8px; font-size: 13px; font-weight: 500; text-decoration: none;
  transition: all 0.2s;
}
.pc-header-profile-btn:hover, .pc-header-profile-btn.active { background: #2563eb; color: #fff; }
.pc-header-logout {
  padding: 6px 12px; background: transparent; color: #9ca3af; border: none;
  border-radius: 8px; font-size: 13px; cursor: pointer; transition: color 0.2s;
  font-family: inherit;
}
.pc-header-logout:hover { color: #ef4444; }
.pc-header-login {
  padding: 8px 20px; background: #2563eb; color: white; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
  text-decoration: none; transition: background 0.2s;
}
.pc-header-login:hover { background: #1d4ed8; }

/* ── Hero ──────────────────────────────────────────────── */
.pc-hero {
  background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
  border-bottom: 1px solid #e0f2fe;
}
.pc-hero-inner {
  max-width: 1200px; margin: 0 auto; padding: 32px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.pc-hero-title {
  font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 6px;
}
.pc-hero-desc { font-size: 14px; color: #64748b; margin: 0; }
.pc-hero-points {
  font-size: 14px; font-weight: 600; color: #92400e;
  background: #fef3c7; padding: 8px 16px; border-radius: 10px;
  white-space: nowrap;
}

/* ── Body ──────────────────────────────────────────────── */
.pc-body { max-width: 1200px; margin: 0 auto; padding: 20px 24px 80px; }
.pc-loading { text-align: center; color: #94a3b8; font-size: 14px; padding: 60px; }

/* ── Switcher ──────────────────────────────────────────── */
.pc-switcher {
  display: flex; gap: 10px; overflow-x: auto; padding: 4px 0 20px;
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.pc-switcher::-webkit-scrollbar { display: none; }
.pc-switch-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px; border-radius: 14px; border: 2px solid #e2e8f0;
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
  background: #fff; flex-shrink: 0;
}
.pc-switch-item.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.pc-switch-item:hover { border-color: #93c5fd; }
.pc-switch-avatar { font-size: 24px; line-height: 1; }
.pc-switch-info { display: flex; flex-direction: column; }
.pc-switch-name { font-size: 14px; font-weight: 600; color: #0f172a; }
.pc-switch-label { font-size: 11px; color: #94a3b8; margin-top: 1px; }

/* ── Summary Stats ─────────────────────────────────────── */
.pc-summary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;
}
.pc-summary-card {
  background: #fff; border-radius: 14px; padding: 16px;
  border: 1px solid #e2e8f0; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.pc-summary-main {
  flex-direction: row; gap: 14px; text-align: left; grid-column: span 1;
}
.pc-summary-avatar { font-size: 36px; line-height: 1; }
.pc-summary-main-info { display: flex; flex-direction: column; }
.pc-summary-main-name { font-size: 18px; font-weight: 700; color: #0f172a; }
.pc-summary-main-meta { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.pc-summary-icon { font-size: 20px; }
.pc-summary-val { font-size: 22px; font-weight: 700; color: #2563eb; }
.pc-summary-lbl { font-size: 11px; color: #94a3b8; }

/* ── Cards ─────────────────────────────────────────────── */
.pc-card {
  background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}
.pc-card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.pc-card-header .pc-section-title { margin-bottom: 0; }
.pc-section-title {
  font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px;
}
.pc-empty {
  text-align: center; color: #94a3b8; font-size: 14px; padding: 32px 20px;
}
.pc-empty p { margin-bottom: 12px; }

/* ── Child Grid (Parent View) ─────────────────────────── */
.pc-child-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pc-child-card {
  padding: 18px; border: 1px solid #e2e8f0; border-radius: 14px;
  cursor: pointer; transition: all 0.2s;
}
.pc-child-card:hover { border-color: #bfdbfe; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
.pc-child-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.pc-child-avatar { font-size: 32px; line-height: 1; }
.pc-child-header-info { flex: 1; }
.pc-child-name { display: block; font-size: 16px; font-weight: 600; color: #0f172a; }
.pc-child-meta { display: block; font-size: 12px; color: #94a3b8; margin-top: 1px; }
.pc-child-arrow { font-size: 16px; color: #bfdbfe; }
.pc-child-subjects { display: flex; flex-direction: column; gap: 8px; }
.pc-child-subject { }
.pc-cs-header {
  display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 4px;
}
.pc-cs-stat { font-size: 12px; color: #64748b; font-weight: 500; }
.pc-cs-empty { color: #cbd5e1; }
.pc-cs-bar-track {
  height: 4px; background: #f1f5f9; border-radius: 4px; overflow: hidden;
}
.pc-cs-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease-out; }

/* ── Subject Grid (Child View) ─────────────────────────── */
.pc-subject-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.pc-subject-card {
  background: #f8fafc; border-radius: 14px; padding: 18px;
  border: 1px solid #f1f5f9; transition: all 0.2s;
}
.pc-subject-card:hover { border-color: #e2e8f0; }
.pc-subject-card.pc-subject-empty { opacity: 0.5; }
.pc-subject-top {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.pc-subject-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.pc-subject-info { display: flex; flex-direction: column; }
.pc-subject-name { font-size: 15px; font-weight: 600; color: #0f172a; }
.pc-subject-stat { font-size: 12px; color: #64748b; margin-top: 2px; }
.pc-stat-empty { color: #cbd5e1; }
.pc-subject-bar-track {
  height: 5px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 10px;
}
.pc-subject-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease-out; }
.pc-subject-detail {
  display: flex; gap: 12px;
}
.pc-subject-detail-item {
  display: flex; flex-direction: column; align-items: center;
  background: #fff; border-radius: 10px; padding: 8px 14px;
  border: 1px solid #f1f5f9; flex: 1;
}
.pc-sd-val { font-size: 18px; font-weight: 700; color: #2563eb; }
.pc-sd-lbl { font-size: 11px; color: #94a3b8; margin-top: 2px; }

/* ── Info Grid ─────────────────────────────────────────── */
.pc-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pc-info-item {
  padding: 12px; background: #f8fafc; border-radius: 10px;
}
.pc-info-label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
.pc-info-value { font-size: 14px; color: #0f172a; font-weight: 500; }
.pc-points { color: #92400e; }

/* ── Child Management Rows ─────────────────────────────── */
.pc-child-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
}
.pc-child-row:last-child { border-bottom: none; }
.pc-row-avatar { font-size: 24px; line-height: 1; }
.pc-row-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pc-row-name { font-size: 14px; font-weight: 600; color: #0f172a; }
.pc-row-detail { font-size: 12px; color: #94a3b8; }
.pc-row-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

/* ── Forms ─────────────────────────────────────────────── */
.pc-input {
  padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; width: 100%; box-sizing: border-box; font-family: inherit;
}
.pc-input-lg { padding: 10px 14px; font-size: 15px; margin: 6px 0; }
.pc-inline-form { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.pc-inline-actions { display: flex; gap: 8px; }
.pc-add-form { display: flex; flex-direction: column; gap: 10px; padding: 12px 0; }
.pc-add-actions { display: flex; gap: 10px; }

/* ── Buttons ───────────────────────────────────────────── */
.pc-btn-primary {
  background: #2563eb; color: #fff; border: none; padding: 8px 20px;
  border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer;
  font-family: inherit; transition: background 0.2s;
}
.pc-btn-primary:hover { background: #1d4ed8; }
.pc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-btn-ghost {
  background: #f1f5f9; color: #64748b; border: none; padding: 8px 20px;
  border-radius: 10px; font-size: 13px; cursor: pointer; font-family: inherit;
}
.pc-btn-text {
  background: none; border: none; color: #2563eb; font-size: 13px;
  cursor: pointer; font-family: inherit; transition: color 0.2s;
}
.pc-btn-text:hover { color: #1d4ed8; }
.pc-btn-sm { padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
.pc-btn-outline { background: #f0f9ff; color: #2563eb; border: none; transition: all 0.2s; }
.pc-btn-outline:hover { background: #2563eb; color: #fff; }
.pc-btn-danger { background: #fef2f2; color: #ef4444; border: none; transition: all 0.2s; }
.pc-btn-danger:hover { background: #fecaca; }
.pc-btn-logout {
  background: none; border: 1.5px solid #fecaca; color: #ef4444;
  padding: 10px 40px; border-radius: 10px; font-size: 14px; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
}
.pc-btn-logout:hover { background: #fef2f2; border-color: #ef4444; }

.pc-delete-group {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}
.pc-btn-delete-account {
  background: none; border: 1.5px solid #e2e8f0; color: #94a3b8;
  padding: 10px 40px; border-radius: 10px; font-size: 14px; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
}
.pc-btn-delete-account:hover { background: #fef2f2; border-color: #fecaca; color: #ef4444; }

/* ── Avatar Select ─────────────────────────────────────── */
.pc-avatar-select { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.pc-avatar-select-mini { display: flex; gap: 4px; flex-wrap: wrap; }
.pc-avatar-opt {
  font-size: 24px; width: 40px; height: 40px; display: flex;
  align-items: center; justify-content: center; border-radius: 10px;
  border: 2px solid transparent; cursor: pointer; transition: all 0.15s;
}
.pc-avatar-opt.active { border-color: #2563eb; background: #f0f9ff; }

/* ── Modal ─────────────────────────────────────────────── */
.pc-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.pc-modal {
  background: #fff; border-radius: 18px; padding: 28px; width: 100%; max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: pcFadeInUp 0.2s ease-out;
}
@keyframes pcFadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.pc-modal h3 { font-size: 17px; font-weight: 600; margin: 0 0 16px; }
.pc-modal-desc { font-size: 13px; color: #64748b; margin: -8px 0 12px; }
.pc-modal-actions { display: flex; gap: 10px; margin-top: 12px; }

/* ── Misc ──────────────────────────────────────────────── */
.pc-logout { text-align: center; padding: 12px 16px 60px; }
.pc-error {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #fef2f2; color: #ef4444; font-size: 13px;
  padding: 10px 24px; border-radius: 10px; z-index: 200;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
  .pc-header-links { display: none; }
  .pc-search-input { width: 100px; }
  .pc-hero-inner { flex-direction: column; align-items: flex-start; gap: 10px; }
  .pc-body { padding: 16px 16px 80px; }
  .pc-summary { grid-template-columns: repeat(2, 1fr); }
  .pc-child-grid { grid-template-columns: 1fr; }
  .pc-subject-grid { grid-template-columns: repeat(2, 1fr); }
  .pc-info-grid { grid-template-columns: 1fr 1fr; }
  .pc-report-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .pc-subject-grid { grid-template-columns: 1fr; }
  .pc-info-grid { grid-template-columns: 1fr; }
}

/* ── Learning Report ─────────────────────────────── */
.pc-report-loading {
  text-align: center; padding: 24px; color: #94a3b8; font-size: 14px;
}
.pc-report-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.pc-report-achievements {
  margin-top: 4px;
}
.pc-report-path {
  margin-top: 16px;
}
</style>
