<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { router } from '../../router'
import { wordStore } from '../../stores/wordStore'
import { studyStore } from '../../stores/studyStore'
import { isLoggedIn, getUser } from '@shared/composables/useAuth'
import { useAuth } from '@shared/composables/useAuth'

// 声音开关（默认开）
const SOUND_KEY = 'english_setting_sound'
const FOLLOW_KEY = 'english_setting_follow_read'

const soundOn = ref(localStorage.getItem(SOUND_KEY) !== '0')
const followRead = ref(localStorage.getItem(FOLLOW_KEY) !== '0')

function toggleSound() {
  soundOn.value = !soundOn.value
  localStorage.setItem(SOUND_KEY, soundOn.value ? '1' : '0')
}

function toggleFollow() {
  followRead.value = !followRead.value
  localStorage.setItem(FOLLOW_KEY, followRead.value ? '1' : '0')
}

function clearProgress() {
  if (confirm('确定要清除所有学习记录吗？此操作不可撤销。')) {
    wordStore.clearAllProgress()
    studyStore.clearHistory()
    alert('学习记录已清除')
  }
}

const user = ref<any>(null)
const isLogin = ref(false)
onMounted(() => {
  isLogin.value = isLoggedIn()
  if (isLogin.value) user.value = getUser()
})

function logout() {
  if (!confirm('确定要退出登录吗？')) return
  const auth = useAuth()
  auth.logout()
  window.location.href = 'https://grandand.com'
}

function back() {
  router.navigate('profile')
}
</script>

<template>
  <div class="settings-panel">
    <header class="header">
      <button class="back-btn" @click="back">← 返回</button>
      <h1 class="title">设置</h1>
    </header>

    <section class="settings-group">
      <h2 class="group-title">学习偏好</h2>

      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">声音播放</div>
          <div class="setting-desc">单词和例句的音频自动播放</div>
        </div>
        <button class="toggle" :class="{ on: soundOn }" @click="toggleSound">
          <div class="toggle-knob"></div>
        </button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">跟读模式</div>
          <div class="setting-desc">复习时显示跟读按钮</div>
        </div>
        <button class="toggle" :class="{ on: followRead }" @click="toggleFollow">
          <div class="toggle-knob"></div>
        </button>
      </div>
    </section>

    <section class="settings-group">
      <h2 class="group-title">数据</h2>
      <button class="danger-btn" @click="clearProgress">清除所有学习记录</button>
    </section>

    <section class="settings-group" v-if="isLogin">
      <h2 class="group-title">账号</h2>
      <div class="user-row">
        <div class="user-avatar">{{ user?.nickname?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U' }}</div>
        <div class="user-info">
          <div class="user-name">{{ user?.nickname || user?.username }}</div>
          <div class="user-meta">{{ user?.email || user?.phone || '已登录' }}</div>
        </div>
      </div>
      <button class="logout-btn" @click="logout">退出登录</button>
    </section>

    <p class="version">v2.0.0 · 英语乐园</p>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: var(--gap-lg) 0;
}

.header {
  margin-bottom: var(--gap-lg);
}

.back-btn {
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-primary);
  font-size: var(--text-body);
  font-weight: 600;
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-md);
}

.title {
  font-size: var(--text-title);
  color: var(--color-text);
}

.settings-group {
  margin-bottom: var(--gap-lg);
}

.group-title {
  font-size: var(--text-h3);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
  font-weight: 600;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap-md) var(--gap-lg);
  background: var(--color-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-sm);
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}

.setting-desc {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

/* Toggle */
.toggle {
  position: relative;
  width: 56px;
  height: 32px;
  border-radius: var(--radius-pill);
  background: var(--color-border);
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle.on {
  background: var(--color-tertiary);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.toggle.on .toggle-knob {
  left: 27px;
}

.danger-btn,
.logout-btn {
  width: 100%;
  padding: var(--gap-md);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-secondary);
  font-size: var(--text-body);
  font-weight: 600;
  box-shadow: var(--shadow-card);
}

.danger-btn:active,
.logout-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.user-row {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  background: var(--color-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-sm);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
}

.user-meta {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

.version {
  text-align: center;
  color: var(--color-text-sub);
  font-size: var(--text-small);
  margin-top: var(--gap-xl);
}
</style>