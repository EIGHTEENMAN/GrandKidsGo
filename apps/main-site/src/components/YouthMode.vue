<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getToken } from '@/api/auth'

// ─── State ───────────────────────────────────────
const enabled = ref(false)
const dailyLimitMinutes = ref(40)
const nightModeEnabled = ref(true)
const totalUsedMinutes = ref(0)
const remainingMinutes = ref(0)
const allowed = ref(true)
const lastError = ref('')
const nightModeActive = ref(false)

let checkTimer: ReturnType<typeof setInterval> | null = null
let trackTimer: ReturnType<typeof setInterval> | null = null
let warnTimer: ReturnType<typeof setInterval> | null = null

// ─── Computed ────────────────────────────────────
const limitReached = computed(() => !allowed.value)
const showWarning = computed(() => {
  if (!enabled.value) return false
  if (limitReached.value) return false // blocking overlay handles this
  return remainingMinutes.value <= 5 && remainingMinutes.value > 0
})
const remainingDisplay = computed(() => {
  const m = remainingMinutes.value
  if (m <= 0) return '0'
  if (m < 60) return m + '分钟'
  return Math.floor(m / 60) + '小时' + (m % 60 || '')
})
const usagePercent = computed(() => {
  if (dailyLimitMinutes.value <= 0) return 0
  return Math.min(100, Math.round((totalUsedMinutes.value / dailyLimitMinutes.value) * 100))
})

// ─── API Calls ────────────────────────────────────
const AUTH_BASE = '/api/user'

async function fetchYouthMode() {
  try {
    const res = await fetch(AUTH_BASE + '/youth-mode', {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
    const d = await res.json()
    if (d.code === 'OK') {
      enabled.value = d.data.enabled
      dailyLimitMinutes.value = d.data.daily_time_limit_minutes || 40
      nightModeEnabled.value = d.data.night_mode_enabled !== 0
      totalUsedMinutes.value = d.data.todayUsage || 0
    }
  } catch (e) {
    // silent
  }
}

async function checkYouthMode() {
  try {
    const res = await fetch(AUTH_BASE + '/youth-mode/check', {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
    const d = await res.json()
    if (d.code === 'OK') {
      enabled.value = d.data.enabled
      nightModeActive.value = d.data.nightModeActive || false
      if (d.data.minutesUsed !== undefined) {
        totalUsedMinutes.value = d.data.minutesUsed
      }
      if (d.data.remainingMinutes !== undefined) {
        remainingMinutes.value = d.data.remainingMinutes
      }
      allowed.value = d.data.allowed !== false
    }
  } catch (e) {
    // silent
  }
}

async function trackUsage() {
  if (!enabled.value || limitReached.value || nightModeActive.value) return
  try {
    const res = await fetch(AUTH_BASE + '/youth-mode/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({ minutes: 1 }),
    })
    const d = await res.json()
    if (d.code === 'OK') {
      totalUsedMinutes.value = d.data.totalUsed || totalUsedMinutes.value + 1
      remainingMinutes.value = d.data.remaining || 0
      allowed.value = d.data.allowed !== false
    }
  } catch (e) {
    // silent
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    clearTimers()
  } else {
    startTimers()
    checkYouthMode()
  }
}

function clearTimers() {
  if (checkTimer) { clearInterval(checkTimer); checkTimer = null }
  if (trackTimer) { clearInterval(trackTimer); trackTimer = null }
  if (warnTimer) { clearInterval(warnTimer); warnTimer = null }
}

function startTimers() {
  if (!enabled.value) return
  // Check every 30s
  checkTimer = setInterval(checkYouthMode, 30000)
  // Track every 60s (1 minute of usage)
  trackTimer = setInterval(trackUsage, 60000)
  // Clear warning after 10s
  warnTimer = setInterval(() => {
    lastError.value = ''
  }, 10000)
}

// ─── Lifecycle ──────────────────────────────────
onMounted(async () => {
  await fetchYouthMode()
  if (enabled.value) {
    await checkYouthMode()
    startTimers()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onUnmounted(() => {
  clearTimers()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <!-- Night mode blocking overlay -->
  <div v-if="enabled && nightModeActive" class="ym-night-overlay">
    <div class="ym-night-card">
      <div class="ym-night-icon">🌙</div>
      <h2 class="ym-night-title">夜间模式已开启</h2>
      <p class="ym-night-desc">为了保护孩子的视力，童慧行在夜间（22:00-06:00）暂停服务</p>
      <p class="ym-night-time">请明天早上6点后再来哦</p>
    </div>
  </div>

  <!-- Daily limit reached blocking overlay -->
  <div v-if="enabled && !nightModeActive && limitReached" class="ym-night-overlay">
    <div class="ym-night-card">
      <div class="ym-night-icon">⏰</div>
      <h2 class="ym-night-title">今日学习时间已用完</h2>
      <p class="ym-night-desc">今日已使用 <strong>{{ totalUsedMinutes }}</strong> 分钟</p>
      <p v-if="dailyLimitMinutes" class="ym-night-desc">每日限制 {{ dailyLimitMinutes }} 分钟</p>
      <p class="ym-night-time">明天再来继续学习吧！</p>
    </div>
  </div>

  <!-- Floating indicator (when youth mode is active and allowed) -->
  <div
    v-if="enabled && !nightModeActive && !limitReached"
    class="ym-indicator"
    :class="{ 'ym-warning': showWarning }"
    :title="'今日已使用 ' + totalUsedMinutes + ' 分钟 / 限制 ' + dailyLimitMinutes + ' 分钟'"
  >
    <div class="ym-indicator-bar">
      <div class="ym-indicator-fill" :style="{ width: usagePercent + '%' }"></div>
    </div>
    <span class="ym-indicator-text">{{ remainingDisplay }}</span>
  </div>

  <!-- Warning toast -->
  <div v-if="showWarning && !nightModeActive" class="ym-warning-toast">
    ⚠️ 今日剩余 {{ remainingDisplay }}，请注意使用时间
  </div>
</template>

<style scoped>
/* ── Overlay (night mode + limit reached) ────── */
.ym-night-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  animation: ymFadeIn 0.3s ease;
}

.ym-night-card {
  text-align: center;
  max-width: 380px;
  padding: 48px 32px;
}

.ym-night-icon {
  font-size: 72px;
  margin-bottom: 20px;
}

.ym-night-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
}

.ym-night-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 8px;
}

.ym-night-time {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 20px;
}

/* ── Floating indicator ──────────────────────── */
.ym-indicator {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 998;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  cursor: default;
  animation: ymFadeInUp 0.3s ease;
  backdrop-filter: blur(8px);
  transition: border-color 0.3s, box-shadow 0.3s;
}

.ym-indicator.ym-warning {
  border-color: #f59e0b;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
}

.ym-indicator-bar {
  width: 48px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.ym-indicator-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.ym-warning .ym-indicator-fill {
  background: #f59e0b;
}

.ym-indicator-text {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.ym-warning .ym-indicator-text {
  color: #92400e;
}

/* ── Warning toast ───────────────────────────── */
.ym-warning-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  color: #92400e;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  animation: ymFadeInUp 0.3s ease;
  white-space: nowrap;
  text-align: center;
}

@keyframes ymFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ymFadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
