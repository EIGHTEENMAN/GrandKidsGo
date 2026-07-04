<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { logout } from './auth'
import { getProgress, getAppRanking } from '@/stores/progress'

const isLoggedIn = ref(false)
const userInfo = ref<any>(null)

const progress = ref(getProgress())
const ranking = ref(getAppRanking())

// Learning report from server API
const learningReport = ref<any>(null)
const reportLoading = ref(false)

const subjectLabels: Record<string, string> = {
  poetry: '诗词', classics: '国学', general: '通识', english: '英语', challenge: '挑战',
}
const subjectColors: Record<string, string> = {
  poetry: '#2563eb', classics: '#7c3aed', general: '#059669', english: '#d97706', challenge: '#dc2626',
}

async function loadLearningReport() {
  const token = uni.getStorageSync('grandkidsgo_token')
  if (!token) return
  reportLoading.value = true
  try {
    // Get children first
    const cRes = await uni.request({
      url: 'https://grandand.com/api/user/children',
      header: { Authorization: 'Bearer ' + token },
    })
    const cData = cRes.data as any
    if (cData?.code === 'OK' && cData?.data?.length > 0) {
      const childId = cData.data[0].id
      const rRes = await uni.request({
        url: `https://grandand.com/api/user/learning-report?childId=${childId}`,
        header: { Authorization: 'Bearer ' + token },
      })
      const rData = rRes.data as any
      if (rData?.code === 'OK') learningReport.value = rData.data
    }
  } catch { /* ignore */ }
  finally { reportLoading.value = false }
}

// Achievements: same logic as web version
const achievements = computed(() => {
  const r = learningReport.value
  if (!r) return []
  const summary = r.subjectSummary || []
  const totals = r.totals || { items: 0, minutes: 0 }
  const streak = r.streak || { current: 0, longest: 0 }
  const hasSubject = (s: string) => (summary.find((x: any) => x.subject === s)?.items_learned || 0) > 0
  const subjectItems = (s: string) => summary.find((x: any) => x.subject === s)?.items_learned || 0

  return [
    { id: 'first_read', icon: '📖', name: '初次阅读', unlocked: totals.items >= 1 },
    { id: 'streak_3', icon: '🔥', name: '坚持三天', unlocked: streak.current >= 3 || streak.longest >= 3 },
    { id: 'streak_7', icon: '⭐', name: '一周好习惯', unlocked: streak.current >= 7 || streak.longest >= 7 },
    { id: 'streak_30', icon: '💪', name: '坚持不懈', unlocked: streak.longest >= 30 },
    { id: 'items_50', icon: '🎯', name: '小有成就', unlocked: totals.items >= 50 },
    { id: 'items_200', icon: '📚', name: '学富五车', unlocked: totals.items >= 200 },
    { id: 'items_500', icon: '🏆', name: '博学多才', unlocked: totals.items >= 500 },
    { id: 'items_1000', icon: '👑', name: '学习王者', unlocked: totals.items >= 1000 },
    { id: 'hour_1', icon: '⏰', name: '学习一小时', unlocked: totals.minutes >= 60 },
    { id: 'hour_5', icon: '🕐', name: '学习五小时', unlocked: totals.minutes >= 300 },
    { id: 'subject_poetry', icon: '📝', name: '诗词入门', unlocked: subjectItems('poetry') >= 10 },
    { id: 'subject_classics', icon: '🏛️', name: '国学入门', unlocked: subjectItems('classics') >= 10 },
    { id: 'subject_general', icon: '🌍', name: '通识入门', unlocked: subjectItems('general') >= 10 },
    { id: 'all_subjects', icon: '🦸', name: '全能学霸', unlocked: hasSubject('poetry') && hasSubject('classics') && hasSubject('general') },
  ]
})

// Generate calendar days (current month)
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth())

const calendarDays = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1

  const days: { day: number; activity: number; isCurrent: boolean }[] = []
  const prevLastDay = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) days.push({ day: prevLastDay - i, activity: 0, isCurrent: false })

  const logs = learningReport.value?.dailyLogs || []
  const activityMap: Record<string, number> = {}
  logs.forEach((d: any) => {
    const total = Object.values(d.subjects || {}).reduce((s: number, v: any) => s + (v.items || 0), 0)
    activityMap[d.date] = total
  })

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ day: d, activity: activityMap[dateStr] || 0, isCurrent: true })
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) days.push({ day: d, activity: 0, isCurrent: false })

  return days
})

function prevMonth() {
  if (calendarMonth.value === 0) { calendarMonth.value = 11; calendarYear.value-- }
  else calendarMonth.value--
}
function nextMonth() {
  if (calendarMonth.value === 11) { calendarMonth.value = 0; calendarYear.value++ }
  else calendarMonth.value++
}

function activityLevel(n: number): number {
  if (n === 0) return 0
  if (n <= 2) return 1
  if (n <= 5) return 2
  return 3
}

// Category chart
const totalItems = computed(() => {
  const s = learningReport.value?.subjectSummary || []
  return s.reduce((sum: number, p: any) => sum + (p.items_learned || 0), 0)
})

const conicGradient = computed(() => {
  const items = totalItems.value
  if (items === 0) return ''
  const s = learningReport.value?.subjectSummary || []
  let cumulative = 0
  const parts: string[] = []
  s.forEach((p: any) => {
    const pct = (p.items_learned || 0) / items
    if (pct === 0) return
    const startDeg = Math.round(cumulative * 360)
    const endDeg = Math.round((cumulative + pct) * 360)
    parts.push(`${subjectColors[p.subject] || '#94a3b8'} ${startDeg}deg ${endDeg}deg`)
    cumulative += pct
  })
  if (parts.length === 0) return ''
  return `conic-gradient(${parts.join(', ')})`
})

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

// Learning path levels
const PATH_LEVELS = [
  { id: 'enlightenment', icon: '👶', label: '启蒙', desc: '开始学习之旅', minItems: 0 },
  { id: 'beginner', icon: '📚', label: '入门', desc: '掌握基础知识', minItems: 30 },
  { id: 'intermediate', icon: '🎯', label: '进阶', desc: '深入探索领域', minItems: 100 },
  { id: 'advanced', icon: '🏆', label: '深造', desc: '成为小专家', minItems: 300 },
]
const pathLevels = computed(() => {
  const totals = learningReport.value?.totals?.items || 0
  let currentFound = false
  return PATH_LEVELS.map((level: any, i: number) => {
    const nextLevel = PATH_LEVELS[i + 1]
    const unlocked = totals >= level.minItems
    let isCurrent = false
    if (!currentFound) {
      if (unlocked && (!nextLevel || totals < nextLevel.minItems)) {
        isCurrent = true
        currentFound = true
      }
    }
    const nextMin = nextLevel ? nextLevel.minItems : level.minItems + 1
    const prevMin = level.minItems
    const range = nextMin - prevMin
    const current = Math.max(0, Math.min(range, totals - prevMin))
    const progress = range > 0 ? Math.round((current / range) * 100) : 100
    return { ...level, unlocked, isCurrent, progress, currentItems: current }
  })
})
const currentLevelLabel = computed(() => {
  const cur = pathLevels.value.find((l: any) => l.isCurrent)
  return cur ? cur.label : '启蒙'
})

//

const totalAppCount = computed(() => progress.value.totalVisits)
const totalContentView = computed(() => progress.value.totalContentViewed)
const streakDays = computed(() => progress.value.dailyStreak)

function openWebView(label: string, url: string) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(label)}&url=${encodeURIComponent(url)}`
  })
}

onShow(() => {
  checkAuth()
  progress.value = getProgress()
  ranking.value = getAppRanking()
  if (uni.getStorageSync('grandkidsgo_token')) loadLearningReport()
})

function checkAuth() {
  const token = uni.getStorageSync('grandkidsgo_token')
  if (token) {
    isLoggedIn.value = true
    const stored = uni.getStorageSync('grandkidsgo_user')
    if (stored) {
      try { userInfo.value = JSON.parse(stored) } catch {
        userInfo.value = { nickname: '用户' }
      }
    }
  } else {
    isLoggedIn.value = false
    userInfo.value = null
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/mine/login' })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        logout()
        isLoggedIn.value = false
        userInfo.value = null
      }
    }
  })
}
</script>

<template>
  <view class="page">
    <!-- Profile Card -->
    <view class="profile-card">
      <view v-if="isLoggedIn && userInfo" class="profile-info">
        <view class="profile-avatar">{{ userInfo.avatar || '👤' }}</view>
        <view class="profile-detail">
          <text class="profile-name">{{ userInfo.nickname || userInfo.username || '用户' }}</text>
          <view class="profile-meta">
            <text class="profile-badge">童慧行用户</text>
            <text v-if="streakDays > 0" class="profile-streak">🔥 {{ streakDays }}天连续</text>
          </view>
        </view>
      </view>
      <view v-else class="profile-login" @click="goLogin" hover-class="hover-opacity">
        <view class="profile-avatar">👤</view>
        <view class="profile-detail">
          <text class="profile-name">登录/注册</text>
          <text class="profile-badge">登录后享受完整功能</text>
        </view>
        <text class="profile-arrow">›</text>
      </view>
    </view>

    <!-- Learning Stats -->
    <view class="stats-card" v-if="isLoggedIn">
      <view class="stats-header">📊 学习统计</view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-num">{{ totalAppCount }}</text>
          <text class="stat-label">总访问</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ Object.keys(progress.appOpens).length }}</text>
          <text class="stat-label">学过的应用</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ totalContentView }}</text>
          <text class="stat-label">浏览内容</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ streakDays }}</text>
          <text class="stat-label">连续天数</text>
        </view>
      </view>
      <!-- App ranking bars -->
      <view v-if="ranking.length > 0" class="ranking-section">
        <text class="ranking-title">应用使用排行</text>
        <view v-for="(r, i) in ranking.slice(0, 4)" :key="r.name" class="ranking-row">
          <text class="ranking-idx">{{ i + 1 }}</text>
          <text class="ranking-name">{{ r.name }}</text>
          <view class="ranking-bar-bg">
            <view
              class="ranking-bar"
              :style="{ width: (r.count / Math.max(...ranking.map(x => x.count)) * 100) + '%' }"
            ></view>
          </view>
          <text class="ranking-count">{{ r.count }}次</text>
        </view>
      </view>
    </view>

    <!-- Learning Report -->
    <view v-if="isLoggedIn" class="report-section">
      <view class="report-header">📊 学习报告</view>

      <view v-if="reportLoading" class="report-loading">加载中...</view>
      <view v-else-if="!learningReport" class="report-loading">暂无数据，快去学习吧！</view>

      <!-- Calendar -->
      <view v-if="learningReport" class="report-calendar">
        <view class="cal-header">
          <text class="cal-nav" @click="prevMonth">‹</text>
          <text class="cal-title">{{ calendarYear }}年{{ monthNames[calendarMonth] }}</text>
          <text class="cal-nav" @click="nextMonth">›</text>
        </view>
        <view class="cal-grid">
          <view v-for="wd in ['一','二','三','四','五','六','日']" :key="wd" class="cal-weekday">{{ wd }}</view>
          <view
            v-for="(day, i) in calendarDays" :key="i"
            class="cal-day"
            :class="['cal-lv' + activityLevel(day.activity), day.isCurrent ? '' : 'cal-dim']"
          >{{ day.day }}</view>
        </view>
        <view class="cal-streak">
          <text class="cal-streak-item">🔥 当前 {{ learningReport.streak?.current || 0 }} 天</text>
          <text class="cal-streak-item">⭐ 最长 {{ learningReport.streak?.longest || 0 }} 天</text>
        </view>
      </view>

      <!-- Category Chart -->
      <view v-if="learningReport && totalItems > 0" class="report-chart">
        <view class="chart-title">学习分布</view>
        <view class="chart-body">
          <view class="chart-donut" :style="{ background: conicGradient }">
            <view class="chart-hole">
              <text class="chart-total">{{ totalItems }}</text>
              <text class="chart-label">项</text>
            </view>
          </view>
          <view class="chart-legend">
            <view v-for="item in (learningReport.subjectSummary || [])" :key="item.subject" class="chart-row">
              <view class="chart-dot" :style="{ background: subjectColors[item.subject] }"></view>
              <text class="chart-row-name">{{ subjectLabels[item.subject] || item.subject }}</text>
              <text class="chart-row-count">{{ item.items_learned }}</text>
              <text class="chart-row-pct">{{ totalItems > 0 ? Math.round(item.items_learned / totalItems * 100) : 0 }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Achievements -->
      <view v-if="learningReport" class="report-achievements">
        <view class="ach-header">
          <text>成就墙</text>
          <text class="ach-progress">{{ achievements.filter(a => a.unlocked).length }}/{{ achievements.length }}</text>
        </view>
        <view class="ach-grid">
          <view v-for="a in achievements" :key="a.id" class="ach-badge" :class="a.unlocked ? 'ach-unlocked' : 'ach-locked'">
            <text class="ach-icon">{{ a.unlocked ? a.icon : '🔒' }}</text>
            <text class="ach-name">{{ a.name }}</text>
          </view>
        </view>
      </view>

      <!-- Learning Path -->
      <view class="report-path">
        <view class="path-header">
          <text>🎯 学习路径</text>
          <text class="path-level-tag">{{ currentLevelLabel }}</text>
        </view>
        <view class="path-ladder">
          <view v-for="(item, i) in pathLevels" :key="item.id" class="path-step">
            <view v-if="i > 0" class="path-connector" :class="item.unlocked ? 'path-conn-done' : ''"></view>
            <view class="path-body" :class="item.isCurrent ? 'path-body-cur' : ''">
              <view class="path-icon">{{ item.icon }}</view>
              <view class="path-info">
                <view class="path-top">
                  <text class="path-name">{{ item.label }}</text>
                  <text v-if="item.isCurrent" class="path-badge">当前</text>
                  <text v-else-if="item.unlocked" class="path-badge path-badge-done">已解锁</text>
                  <text v-else class="path-badge path-badge-locked">🔒</text>
                </view>
                <text class="path-desc">{{ item.desc }}</text>
                <view v-if="item.isCurrent" class="path-bar-wrap">
                  <view class="path-bar" :style="{ width: item.progress + '%' }"></view>
                </view>
                <text v-if="item.isCurrent" class="path-bar-text">{{ item.currentItems }} / {{ i < PATH_LEVELS.length - 1 ? PATH_LEVELS[i + 1].minItems : '∞' }} 项</text>
                <text v-if="!item.unlocked && !item.isCurrent" class="path-lock-msg">学完 {{ item.minItems }} 项后解锁</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-section">
      <view class="menu-item" @click="openWebView('商城', 'https://store.grandand.com')">
        <text class="menu-icon">🎒</text>
        <view class="menu-content">
          <text class="menu-label">积分商城</text>
          <text class="menu-desc">兑换好礼</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="openWebView('论坛', 'https://forum.grandand.com')">
        <text class="menu-icon">💬</text>
        <view class="menu-content">
          <text class="menu-label">社区论坛</text>
          <text class="menu-desc">交流分享</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="openWebView('常见问题', 'https://grandand.com/faq')">
        <text class="menu-icon">📖</text>
        <view class="menu-content">
          <text class="menu-label">常见问题</text>
          <text class="menu-desc">使用帮助</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="openWebView('法律条款', 'https://grandand.com/legal')">
        <text class="menu-icon">⚖️</text>
        <view class="menu-content">
          <text class="menu-label">法律条款</text>
          <text class="menu-desc">隐私与协议</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- Logout -->
    <view v-if="isLoggedIn" class="logout-section">
      <button class="logout-btn" @click="handleLogout" hover-class="hover-logout">退出登录</button>
    </view>

    <!-- Version -->
    <view class="version">
      <text>童慧行 v1.0.0</text>
    </view>
  </view>
</template>

<style scoped>
.page { padding-bottom: 40rpx; }

/* Profile */
.profile-card {
  margin: 24rpx; background: white; border-radius: 24rpx;
  padding: 32rpx; border: 1rpx solid #e2e8f0;
}
.profile-info, .profile-login { display: flex; align-items: center; }
.profile-avatar {
  font-size: 56rpx; width: 88rpx; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 22rpx; margin-right: 24rpx;
}
.profile-detail { flex: 1; display: flex; flex-direction: column; }
.profile-name { font-size: 34rpx; font-weight: 700; color: #0f172a; }
.profile-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.profile-badge { font-size: 24rpx; color: #94a3b8; }
.profile-streak { font-size: 22rpx; color: #ea580c; font-weight: 500; }
.profile-arrow { font-size: 36rpx; color: #cbd5e1; font-weight: 300; }

/* Stats Card */
.stats-card {
  margin: 0 24rpx 24rpx; background: white; border-radius: 24rpx;
  padding: 28rpx; border: 1rpx solid #e2e8f0;
}
.stats-header { font-size: 28rpx; font-weight: 700; color: #0f172a; margin-bottom: 20rpx; }
.stats-grid { display: flex; gap: 8rpx; }
.stat-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 14rpx 4rpx; background: #f8fafc; border-radius: 16rpx;
}
.stat-num { font-size: 36rpx; font-weight: 800; color: #2563eb; }
.stat-label { font-size: 20rpx; color: #94a3b8; margin-top: 4rpx; }

/* Ranking */
.ranking-section { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #f1f5f9; }
.ranking-title { font-size: 24rpx; font-weight: 600; color: #64748b; display: block; margin-bottom: 12rpx; }
.ranking-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 10rpx; }
.ranking-idx { font-size: 22rpx; font-weight: 700; color: #94a3b8; width: 28rpx; text-align: center; }
.ranking-name { font-size: 24rpx; color: #334155; width: 80rpx; flex-shrink: 0; }
.ranking-bar-bg { flex: 1; height: 20rpx; background: #f1f5f9; border-radius: 10rpx; overflow: hidden; }
.ranking-bar { height: 100%; background: linear-gradient(90deg, #60a5fa, #3b82f6); border-radius: 10rpx; }
.ranking-count { font-size: 20rpx; color: #94a3b8; width: 56rpx; text-align: right; }

/* Menu */
.menu-section {
  margin: 0 24rpx; background: white; border-radius: 24rpx;
  border: 1rpx solid #e2e8f0; overflow: hidden;
}
.menu-item {
  display: flex; align-items: center; padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f1f5f9;
}
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 32rpx; margin-right: 20rpx; }
.menu-content { flex: 1; display: flex; flex-direction: column; }
.menu-label { font-size: 28rpx; color: #334155; }
.menu-desc { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }
.menu-arrow { font-size: 32rpx; color: #cbd5e1; }

/* Logout */
.logout-section { margin: 40rpx 24rpx; }
.logout-btn {
  width: 100%; padding: 28rpx; background: white; color: #ef4444;
  border-radius: 20rpx; font-size: 28rpx; font-weight: 500;
  border: 1rpx solid #fecaca;
}

/* Version */
.version { text-align: center; padding: 40rpx; font-size: 22rpx; color: #cbd5e1; }

/* Report Section */
.report-section {
  margin: 0 24rpx 24rpx; background: white; border-radius: 24rpx;
  padding: 28rpx; border: 1rpx solid #e2e8f0;
}
.report-header { font-size: 28rpx; font-weight: 700; color: #0f172a; margin-bottom: 16rpx; }
.report-loading { text-align: center; padding: 24rpx; color: #94a3b8; font-size: 24rpx; }

/* Calendar */
.report-calendar { margin-bottom: 20rpx; }
.cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.cal-nav { font-size: 32rpx; color: #64748b; padding: 4rpx 12rpx; }
.cal-title { font-size: 26rpx; font-weight: 600; color: #0f172a; }
.cal-grid { display: flex; flex-wrap: wrap; }
.cal-weekday, .cal-day {
  width: 14.28%; text-align: center; font-size: 22rpx;
  padding: 8rpx 0; box-sizing: border-box;
}
.cal-weekday { font-size: 20rpx; color: #94a3b8; font-weight: 500; }
.cal-day { border-radius: 8rpx; color: #334155; }
.cal-dim { color: #cbd5e1; }
.cal-lv0 { background: #f1f5f9; }
.cal-lv1 { background: #dbeafe; }
.cal-lv2 { background: #93c5fd; color: #fff; }
.cal-lv3 { background: #2563eb; color: #fff; }
.cal-streak { display: flex; gap: 20rpx; margin-top: 12rpx; padding-top: 12rpx; border-top: 1rpx solid #f1f5f9; }
.cal-streak-item { font-size: 22rpx; color: #475569; }

/* Category Chart */
.report-chart { margin-bottom: 20rpx; padding-top: 16rpx; border-top: 1rpx solid #f1f5f9; }
.chart-title { font-size: 24rpx; font-weight: 600; color: #0f172a; margin-bottom: 12rpx; }
.chart-body { display: flex; align-items: center; gap: 20rpx; }
.chart-donut {
  width: 140rpx; height: 140rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.chart-hole {
  width: 84rpx; height: 84rpx; border-radius: 50%; background: white;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.chart-total { font-size: 30rpx; font-weight: 700; color: #0f172a; line-height: 1.1; }
.chart-label { font-size: 18rpx; color: #94a3b8; }
.chart-legend { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.chart-row { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; }
.chart-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.chart-row-name { color: #334155; min-width: 3em; }
.chart-row-count { margin-left: auto; color: #0f172a; font-weight: 600; }
.chart-row-pct { color: #94a3b8; width: 4em; text-align: right; }

/* Achievements */
.report-achievements { padding-top: 16rpx; border-top: 1rpx solid #f1f5f9; }
.ach-header { display: flex; justify-content: space-between; align-items: center; font-size: 24rpx; font-weight: 600; color: #0f172a; margin-bottom: 12rpx; }
.ach-progress { font-size: 22rpx; font-weight: 500; color: #94a3b8; }
.ach-grid { display: flex; flex-wrap: wrap; gap: 8rpx; }
.ach-badge {
  width: calc(20% - 8rpx); text-align: center; padding: 12rpx 4rpx;
  border-radius: 12rpx;
}
.ach-badge.ach-unlocked { background: #f0f9ff; }
.ach-badge.ach-locked { opacity: 0.4; }
.ach-icon { font-size: 40rpx; display: block; line-height: 1.2; margin-bottom: 4rpx; }
.ach-name { font-size: 18rpx; color: #475569; display: block; }
.ach-locked .ach-name { color: #94a3b8; }

/* Hover */
/* Learning Path */
.report-path {
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f1f5f9;
}
.path-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
}
.path-level-tag {
  font-size: 24rpx;
  color: #2563eb;
  background: #eff6ff;
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
}
.path-ladder { position: relative; }
.path-step { position: relative; }
.path-connector {
  width: 4rpx;
  height: 40rpx;
  background: #e2e8f0;
  margin-left: 36rpx;
}
.path-conn-done { background: #2563eb; }
.path-body {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
  padding: 16rpx;
  border-radius: 16rpx;
  transition: all 0.2s;
}
.path-body-cur {
  background: #f0f9ff;
  border: 1rpx solid #bfdbfe;
}
.path-icon {
  font-size: 36rpx;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #f8fafc;
  flex-shrink: 0;
}
.path-body-cur .path-icon { background: #eff6ff; }
.path-info { flex: 1; min-width: 0; }
.path-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 4rpx;
}
.path-name { font-size: 28rpx; font-weight: 600; color: #0f172a; }
.path-desc { font-size: 22rpx; color: #94a3b8; margin-bottom: 8rpx; }
.path-badge {
  font-size: 20rpx;
  padding: 2rpx 16rpx;
  border-radius: 20rpx;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 500;
}
.path-badge-done { background: #dcfce7; color: #16a34a; }
.path-badge-locked { background: #f1f5f9; color: #94a3b8; }
.path-bar-wrap {
  height: 10rpx;
  background: #e2e8f0;
  border-radius: 5rpx;
  overflow: hidden;
  margin-top: 8rpx;
}
.path-bar {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 5rpx;
}
.path-bar-text { font-size: 20rpx; color: #64748b; margin-top: 6rpx; }
.path-lock-msg { font-size: 22rpx; color: #94a3b8; margin-top: 6rpx; }
.path-step:not(.path-unlocked) .path-name { color: #94a3b8; }
.path-step:not(.path-unlocked) .path-icon { opacity: 0.5; }
.hover-opacity { opacity: 0.7; }
.hover-logout { background: #fef2f2; }
</style>
