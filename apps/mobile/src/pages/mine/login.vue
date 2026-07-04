<script setup lang="ts">
import { ref, computed } from 'vue'
import { setToken, setUser } from './auth'

const phone = ref('')
const code = ref('')
const codeSent = ref(false)
const codeSending = ref(false)
const countdown = ref(60)
const loading = ref(false)
const error = ref('')
const agreed = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value))

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
      codeSent.value = false
    }
  }, 1000)
}

async function sendCode() {
  if (!phoneValid.value) {
    error.value = '请输入正确的11位手机号'
    return
  }
  error.value = ''
  codeSending.value = true
  try {
    const res = await uni.request({
      url: 'https://grandand.com/api/auth/send-code',
      method: 'POST',
      data: { phone: phone.value },
    })
    const d = res.data as any
    if (d.code === 'OK') {
      codeSent.value = true
      startCountdown()
      uni.showToast({ title: '验证码已发送', icon: 'success' })
    } else {
      error.value = d.message || '发送失败，请稍后重试'
    }
  } catch {
    error.value = '网络异常，请检查网络连接'
  } finally {
    codeSending.value = false
  }
}

async function doLogin() {
  if (!code.value) {
    error.value = '请输入验证码'
    return
  }
  if (!agreed.value) {
    error.value = '请阅读并同意服务条款'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await uni.request({
      url: 'https://grandand.com/api/auth/phone-login',
      method: 'POST',
      data: { phone: phone.value, code: code.value },
    })
    const d = res.data as any
    if (d.code === 'OK') {
      setToken(d.data.token)
      setUser(d.data.user)
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1000)
    } else {
      error.value = d.message || '验证码错误，请重试'
    }
  } catch {
    error.value = '网络异常，请检查网络连接'
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (timer) clearInterval(timer)
  uni.navigateBack()
}
</script>

<template>
  <view class="page">
    <!-- Back -->
    <view class="back-bar">
      <view class="back-btn" @click="goBack">
        <text>‹</text>
      </view>
    </view>

    <!-- Hero -->
    <view class="hero">
      <view class="hero-icon">👤</view>
      <text class="hero-title">欢迎来到童慧行</text>
      <text class="hero-desc">登录后同步学习进度，记录成长</text>
    </view>

    <!-- Form -->
    <view class="form">
      <!-- Phone -->
      <view class="input-group">
        <text class="input-label">手机号</text>
        <view class="input-wrap" :class="{ 'input-active': phone.length > 0 }">
          <text class="input-prefix">+86</text>
          <input
            v-model="phone"
            class="input"
            type="text"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-style="color: #cbd5e1"
          />
        </view>
      </view>

      <!-- Code -->
      <view class="input-group">
        <text class="input-label">验证码</text>
        <view class="code-row">
          <view class="input-wrap code-input-wrap" :class="{ 'input-active': code.length > 0 }">
            <input
              v-model="code"
              class="input"
              type="text"
              maxlength="6"
              placeholder="输入6位验证码"
              placeholder-style="color: #cbd5e1"
            />
          </view>
          <button
            class="code-btn"
            :class="{ 'code-btn-disabled': codeSent || codeSending }"
            :disabled="codeSending || codeSent || !phoneValid"
            @click="sendCode"
          >
            <text v-if="codeSending">发送中...</text>
            <text v-else-if="codeSent">{{ countdown }}s</text>
            <text v-else>获取验证码</text>
          </button>
        </view>
      </view>

      <!-- Error -->
      <view v-if="error" class="error-text">
        <text>{{ error }}</text>
      </view>

      <!-- Agreement -->
      <view class="agreement">
        <view class="checkbox" :class="{ 'checkbox-checked': agreed }" @click="agreed = !agreed">
          <text v-if="agreed">✓</text>
        </view>
        <text class="agreement-text">
          已阅读并同意
          <text class="agreement-link" @click.stop="uni.navigateTo({ url: '/pages/learning/webview?title=服务条款&url=' + encodeURIComponent('https://grandand.com/legal') })">服务条款</text>
          和
          <text class="agreement-link" @click.stop="uni.navigateTo({ url: '/pages/learning/webview?title=隐私政策&url=' + encodeURIComponent('https://grandand.com/legal') })">隐私政策</text>
        </text>
      </view>

      <!-- Login Button -->
      <button class="login-btn" :loading="loading" :disabled="loading || !phoneValid || !code" @click="doLogin">
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <!-- Hint -->
      <view class="hint">
        <text class="hint-text">未注册的手机号验证后将自动创建账号</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

/* Back */
.back-bar { padding: 20rpx 24rpx 0; }
.back-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: white; font-size: 40rpx; color: #64748b;
  border: 1rpx solid #e2e8f0;
}

/* Hero */
.hero {
  display: flex; flex-direction: column; align-items: center;
  padding: 40rpx 32rpx 48rpx;
}
.hero-icon {
  width: 120rpx; height: 120rpx; border-radius: 32rpx;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 64rpx; margin-bottom: 24rpx;
}
.hero-title { font-size: 36rpx; font-weight: 800; color: #0f172a; }
.hero-desc { font-size: 26rpx; color: #94a3b8; margin-top: 8rpx; }

/* Form */
.form { padding: 0 32rpx; }
.input-group { margin-bottom: 28rpx; }
.input-label {
  display: block; font-size: 26rpx; font-weight: 600; color: #475569;
  margin-bottom: 12rpx;
}
.input-wrap {
  display: flex; align-items: center; gap: 12rpx;
  padding: 24rpx 24rpx; background: white;
  border-radius: 16rpx; font-size: 28rpx; color: #0f172a;
  border: 2rpx solid #e2e8f0; box-sizing: border-box;
  transition: border-color 0.2s;
}
.input-active { border-color: #2563eb; }
.input-prefix { font-size: 26rpx; color: #94a3b8; font-weight: 500; padding-right: 12rpx; border-right: 1rpx solid #e2e8f0; }
.input { flex: 1; border: none; outline: none; font-size: 28rpx; color: #0f172a; background: transparent; }
.code-row { display: flex; gap: 16rpx; }
.code-input-wrap { flex: 1; }
.code-btn {
  padding: 24rpx 28rpx; background: #f0f9ff; color: #2563eb;
  border-radius: 16rpx; font-size: 24rpx; font-weight: 500; white-space: nowrap;
  border: 2rpx solid #bfdbfe; flex-shrink: 0;
}
.code-btn-disabled { opacity: 0.5; }
.code-btn[disabled] { opacity: 0.5; }

/* Error */
.error-text {
  background: #fef2f2; padding: 20rpx 24rpx; border-radius: 12rpx;
  margin-bottom: 24rpx; font-size: 24rpx; color: #ef4444;
  border: 1rpx solid #fecaca;
}

/* Agreement */
.agreement {
  display: flex; align-items: flex-start; gap: 12rpx;
  margin-bottom: 32rpx;
}
.checkbox {
  width: 36rpx; height: 36rpx; border-radius: 8rpx;
  border: 2rpx solid #cbd5e1; flex-shrink: 0; margin-top: 2rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; color: white;
}
.checkbox-checked { background: #2563eb; border-color: #2563eb; }
.agreement-text { font-size: 24rpx; color: #94a3b8; line-height: 1.5; }
.agreement-link { color: #2563eb; text-decoration: underline; }

/* Login */
.login-btn {
  width: 100%; padding: 28rpx; background: #2563eb; color: white;
  border-radius: 16rpx; font-size: 30rpx; font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.3);
}
.login-btn[disabled] { opacity: 0.5; box-shadow: none; }

/* Hint */
.hint { text-align: center; padding: 28rpx; }
.hint-text { font-size: 22rpx; color: #cbd5e1; }
</style>
