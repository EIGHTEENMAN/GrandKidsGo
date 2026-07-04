<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function doLogin() {
  if (!username.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    if (!r.ok) {
      const d = await r.json()
      error.value = d.error || '登录失败'
      return
    }
    const d = await r.json()
    sessionStorage.setItem('admin_token', d.token)
    sessionStorage.setItem('admin_user', d.username)
    router.push('/')
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">童慧行</div>
      <div class="login-title">管理后台</div>
      <div class="login-subtitle">请登录以继续</div>

      <form @submit.prevent="doLogin" class="login-form">
        <div v-if="error" class="login-error">{{ error }}</div>
        <input
          v-model="username"
          class="input"
          placeholder="用户名"
          autocomplete="username"
          autofocus
        />
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="密码"
          autocomplete="current-password"
        />
        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
}
.login-card {
  width: 380px;
  padding: 40px 36px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.login-logo {
  font-size: 36px;
  font-weight: 800;
  color: #2563eb;
  text-align: center;
}
.login-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-top: 8px;
}
.login-subtitle {
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  margin-top: 4px;
  margin-bottom: 28px;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.login-form .input {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
}
.login-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  text-align: center;
}
.login-btn {
  padding: 12px;
  font-size: 15px;
  justify-content: center;
  margin-top: 4px;
}
</style>
