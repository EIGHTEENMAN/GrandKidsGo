<script setup lang="ts">
import { ref, onMounted } from 'vue'

const blocked = ref(false)
const reason = ref('')
const loading = ref(true)

function getToken(): string | null {
  return sessionStorage.getItem('grandkidsgo_token')
}

onMounted(async () => {
  const token = getToken()
  if (!token) {
    loading.value = false
    return
  }

  try {
    const res = await fetch('/api/user/youth-mode/check', {
      headers: { Authorization: 'Bearer ' + token },
    })
    const d = await res.json()
    if (d.code === 'OK' && d.data.enabled && !d.data.allowed) {
      blocked.value = true
      reason.value = d.data.reason || '当前时段无法使用'
    }
  } catch {
    // silently fail — don't block on network error
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="ymg-loading">
    <div class="ymg-spinner"></div>
  </div>

  <div v-if="blocked" class="ymg-overlay">
    <div class="ymg-card">
      <div class="ymg-icon">⏰</div>
      <h2 class="ymg-title">青少年模式</h2>
      <p class="ymg-reason">{{ reason }}</p>
      <p class="ymg-hint">请家长登录个人中心调整设置，或明天再来</p>
      <a href="https://grandand.com" class="ymg-back">← 返回首页</a>
    </div>
  </div>

  <slot v-if="!blocked && !loading" />
</template>

<style scoped>
.ymg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.ymg-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: ymgSpin 0.6s linear infinite;
}
@keyframes ymgSpin {
  to { transform: rotate(360deg); }
}
.ymg-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.ymg-card {
  text-align: center;
  max-width: 360px;
  padding: 40px 24px;
}
.ymg-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
.ymg-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
}
.ymg-reason {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 8px;
}
.ymg-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 24px;
}
.ymg-back {
  display: inline-block;
  padding: 10px 24px;
  background: #2563eb;
  color: #fff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s;
}
.ymg-back:hover {
  background: #1d4ed8;
}
</style>
