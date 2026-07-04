<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  open: boolean
  force?: boolean
  // 外部强制开启 parent-consent 流程(门卫场景):必须完成才能关闭
  forceConsent?: boolean
  forceConsentUserId?: string
}>()

const emit = defineEmits<{
  close: []
  login: [user: any]
  'consent-complete': []
}>()

const auth = useAuthStore()

// Phone login state
const phone = ref('')
const code = ref('')
const countdown = ref(0)
const loading = ref(false)
const error = ref('')
let timer: ReturnType<typeof setInterval> | null = null

// Password login/register state
const authTab = ref<'phone' | 'password'>('phone')
const passwordMode = ref<'login' | 'register'>('login')
const pwdUsername = ref('')
const pwdPassword = ref('')
const pwdConfirmPassword = ref('')
const pwdLoading = ref(false)

// Birth year for age check
const birthYear = ref('')
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years: number[] = []
  for (let y = currentYear - 4; y >= currentYear - 80; y--) years.push(y)
  return years
})

// Terms agreement
const agreedToTerms = ref(false)
const agreedError = ref('')

// Parent consent flow
const showParentConsent = ref(false)
const registeringUserId = ref('')
const parentName = ref('')
const parentPhone = ref('')
const parentCode = ref('')
const parentCountdown = ref(0)
const parentAgreed = ref(false)
let parentTimer: ReturnType<typeof setInterval> | null = null
const consentError = ref('')
const consentLoading = ref(false)

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (parentTimer) clearInterval(parentTimer)
})

// 监听外部强制开启 parent-consent (门卫场景)
watch(
  () => [props.forceConsent, props.forceConsentUserId] as const,
  ([enabled, userId]) => {
    if (enabled && userId) {
      registeringUserId.value = userId
      showParentConsent.value = true
    }
  },
  { immediate: true }
)

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
    }
  }, 1000)
}

async function sendCode() {
  if (!phone.value || phone.value.length < 11) {
    error.value = '请输入正确的手机号'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.value, purpose: 'login' }),
    })
    const d = await res.json()
    if (d.code === 'OK') {
      startCountdown()
    } else {
      error.value = d.message || '发送失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

async function doPhoneLogin() {
  if (!phone.value || !code.value) {
    error.value = '请填写手机号和验证码'
    return
  }
  if (!agreedToTerms.value) {
    error.value = '请阅读并同意服务条款'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const extra: any = {}
    if (birthYear.value) {
      extra.birthday = birthYear.value + '-01-01'
    }
    const d = await auth.phoneLogin(phone.value, code.value, extra)
    if (d.code === 'OK') {
      if (d.data.requiresParentConsent) {
        const user = await auth.refreshUser()
        if (user) {
          registeringUserId.value = user.id
          showParentConsent.value = true
          error.value = ''
        }
      } else {
        emit('login', d.data.user)
      }
    } else {
      error.value = d.message || '登录失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

async function doUsernameLogin() {
  if (!pwdUsername.value || !pwdPassword.value) {
    error.value = '请填写用户名和密码'
    return
  }
  error.value = ''
  pwdLoading.value = true
  try {
    const d = await auth.usernameLogin(pwdUsername.value, pwdPassword.value)
    if (d.code === 'OK') {
      if (d.data.requiresParentConsent) {
        const user = await auth.refreshUser()
        if (user) {
          registeringUserId.value = user.id
          showParentConsent.value = true
          error.value = ''
        }
      } else {
        emit('login', d.data.user)
      }
    } else {
      error.value = d.message || '登录失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    pwdLoading.value = false
  }
}

async function doUsernameRegister() {
  if (!pwdUsername.value || !pwdPassword.value) {
    error.value = '请填写用户名和密码'
    return
  }
  if (pwdUsername.value.length < 2) {
    error.value = '用户名至少2个字符'
    return
  }
  if (pwdPassword.value.length < 6) {
    error.value = '密码至少6位'
    return
  }
  if (pwdPassword.value !== pwdConfirmPassword.value) {
    error.value = '两次密码输入不一致'
    return
  }
  if (!agreedToTerms.value) {
    error.value = '请阅读并同意服务条款'
    return
  }
  error.value = ''
  pwdLoading.value = true
  try {
    const body: any = {
      username: pwdUsername.value,
      password: pwdPassword.value,
    }
    if (birthYear.value) {
      body.birthday = birthYear.value + '-01-01'
    }
    // Require birthday for under-14 users
    if (isUnder14(birthYear.value) && !body.birthday) {
      error.value = '未满14周岁用户请选择出生年份'
      pwdLoading.value = false
      return
    }
    const d = await auth.usernameRegister(body)
    if (d.code === 'OK') {
      if (d.data.requiresParentConsent) {
        registeringUserId.value = d.data.user.id
        showParentConsent.value = true
        error.value = ''
      } else {
        emit('login', d.data.user)
      }
    } else {
      error.value = d.message || '注册失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    pwdLoading.value = false
  }
}

function switchTab(tab: 'phone' | 'password') {
  authTab.value = tab
  error.value = ''
}

function onBackdropClick() {
  if (!props.force && !showParentConsent.value) emit('close')
}

// 门卫场景下,parent-consent 只能通过提交关闭,不允许外部关闭
function tryCloseConsent() {
  if (!props.forceConsent) {
    showParentConsent.value = false
  }
}

function onWechatLogin() {
  // 微信 H5 OAuth 暂未完成接入,提示用户使用其他方式
  // TODO: 等正式接入 snsapi_login 流程后,处理重定向回来的 code + 触发 parent-consent
  error.value = '微信登录暂未开放,请使用手机号或用户名注册'
}

// ─── Parent Consent ─────────────────────────────────────────

function isUnder14(birthYearVal: string): boolean {
  if (!birthYearVal) return false
  const age = currentYear - parseInt(birthYearVal)
  return age < 14
}

async function sendParentCode() {
  if (!parentPhone.value || parentPhone.value.length < 11) {
    consentError.value = '请输入正确的家长手机号'
    return
  }
  consentError.value = ''
  consentLoading.value = true
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: parentPhone.value, purpose: 'parent_consent' }),
    })
    const d = await res.json()
    if (d.code === 'OK') {
      parentCountdown.value = 60
      parentTimer = setInterval(() => {
        parentCountdown.value--
        if (parentCountdown.value <= 0 && parentTimer) clearInterval(parentTimer)
      }, 1000)
    } else {
      consentError.value = d.message || '发送失败'
    }
  } catch {
    consentError.value = '网络错误'
  } finally {
    consentLoading.value = false
  }
}

async function submitParentConsent() {
  if (!parentName.value || !parentPhone.value || !parentCode.value) {
    consentError.value = '请填写家长信息和验证码'
    return
  }
  if (!parentAgreed.value) {
    consentError.value = '请阅读并同意《儿童个人信息保护政策》'
    return
  }
  consentError.value = ''
  consentLoading.value = true
  try {
    const res = await fetch('/api/auth/parent-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: registeringUserId.value,
        parentName: parentName.value,
        parentPhone: parentPhone.value,
        verificationCode: parentCode.value,
      }),
    })
    const d = await res.json()
    if (d.code === 'OK') {
      showParentConsent.value = false
      // Refresh user to get youth mode settings
      await auth.refreshUser()
      // 门卫场景:通知父组件已完成
      if (props.forceConsent) {
        emit('consent-complete')
      }
    } else {
      consentError.value = d.message || '提交失败'
    }
  } catch {
    consentError.value = '网络错误'
  } finally {
    consentLoading.value = false
  }
}
</script>

<template>
  <div v-if="open" class="am-overlay" @click.self="onBackdropClick">
    <div class="am-modal">
      <!-- Close -->
      <button v-if="!force" class="am-close" @click="emit('close')">✕</button>

      <div class="am-body">
        <!-- Left: desktop only (QR) -->
        <div class="am-left">
          <div class="am-left-desktop">
            <h2 class="am-title">扫码登录</h2>
            <div class="am-qr">
              <div class="am-qr-inner">
                <div class="am-qr-icon">📷</div>
                <p class="am-qr-text">扫码登录</p>
              </div>
            </div>
            <p class="am-qr-hint">打开 App 或微信扫一扫</p>
            <div class="am-methods">
              <div class="am-method" v-for="m in [
                { name: '童慧行 App', icon: '📱', desc: '打开童慧行 App 扫一扫' },
                { name: '走天下 App', icon: '🧳', desc: '打开童慧行走天下 App 扫一扫' },
                { name: '微信', icon: '💬', desc: '使用微信扫一扫' },
              ]" :key="m.name">
                <span class="am-method-icon">{{ m.icon }}</span>
                <div>
                  <p class="am-method-name">{{ m.name }}</p>
                  <p class="am-method-desc">{{ m.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Tabs with forms -->
        <div class="am-right">
          <!-- Mobile: compact OAuth row -->
          <div class="am-mobile-oauth">
            <span class="amo-label">一键登录</span>
            <button class="amo-btn amo-btn-wechat" @click="onWechatLogin" title="微信登录暂未开放">💬 微信</button>
            <button class="amo-btn amo-btn-app">📱 童慧行 App</button>
            <button class="amo-btn amo-btn-travel">🧳 走天下</button>
          </div>
          <!-- Tab Bar -->
          <div class="am-tabs">
            <button
              class="am-tab"
              :class="{ 'am-tab-active': authTab === 'phone' }"
              @click="switchTab('phone')"
            >手机验证</button>
            <button
              class="am-tab"
              :class="{ 'am-tab-active': authTab === 'password' }"
              @click="switchTab('password')"
            >账号密码</button>
          </div>

          <!-- Phone Login Form -->
          <template v-if="authTab === 'phone'">
            <h2 class="am-title am-title-dark">手机号登录</h2>
            <p class="am-subtitle">输入手机号，验证后自动注册/登录</p>

            <div v-if="error" class="am-error">{{ error }}</div>

            <div class="am-field">
              <label class="am-label">手机号</label>
              <input
                v-model="phone"
                type="tel"
                maxlength="11"
                placeholder="请输入手机号"
                class="am-input"
                @input="phone = phone.replace(/\D/g, '').slice(0, 11)"
              />
            </div>

            <div class="am-field">
              <label class="am-label">验证码</label>
              <div class="am-code-row">
                <input
                  v-model="code"
                  type="text"
                  maxlength="6"
                  placeholder="请输入验证码"
                  class="am-input am-code-input"
                  @input="code = code.replace(/\D/g, '').slice(0, 6)"
                />
                <button
                  class="am-code-btn"
                  :disabled="loading || countdown > 0"
                  @click="sendCode"
                >
                  {{ countdown > 0 ? countdown + 's' : loading ? '发送中...' : '获取验证码' }}
                </button>
              </div>
            </div>

            <div class="am-field">
              <label class="am-label">出生年份 <span style="color:#94a3b8;font-weight:400;font-size:12px">（未满14周岁需家长同意）</span></label>
              <select v-model="birthYear" class="am-input" style="appearance:auto">
                <option value="">选择出生年份</option>
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
              </select>
            </div>

            <label class="am-terms-checkbox">
              <input v-model="agreedToTerms" type="checkbox" />
              我已阅读并同意 <a href="/legal" target="_blank" class="am-terms-link">《服务条款》</a>、<a href="/legal#privacy" target="_blank" class="am-terms-link">《隐私政策》</a>、<a href="/legal#children" target="_blank" class="am-terms-link">《监护人须知》</a>及<a href="/legal#complaint" target="_blank" class="am-terms-link">《侵权投诉规则》</a>
            </label>

            <button class="am-login-btn" :disabled="loading" @click="doPhoneLogin">
              {{ loading ? '处理中...' : '登录 / 注册' }}
            </button>
          </template>

          <!-- Username/Password Form -->
          <template v-else>
            <h2 class="am-title am-title-dark">账号密码登录</h2>
            <p class="am-subtitle">使用用户名和密码登录或注册新账号</p>

            <div v-if="error" class="am-error">{{ error }}</div>

            <!-- Login / Register sub-tab -->
            <div class="am-sub-tabs">
              <button
                class="am-sub-tab"
                :class="{ 'am-sub-tab-active': passwordMode === 'login' }"
                @click="passwordMode = 'login'; error = ''"
              >登录</button>
              <button
                class="am-sub-tab"
                :class="{ 'am-sub-tab-active': passwordMode === 'register' }"
                @click="passwordMode = 'register'; error = ''"
              >注册</button>
            </div>

            <!-- Login mode -->
            <template v-if="passwordMode === 'login'">
              <div class="am-field">
                <label class="am-label">用户名 / 手机号</label>
                <input
                  v-model="pwdUsername"
                  type="text"
                  placeholder="请输入用户名或手机号"
                  class="am-input"
                />
              </div>
              <div class="am-field">
                <label class="am-label">密码</label>
                <input
                  v-model="pwdPassword"
                  type="password"
                  placeholder="请输入密码"
                  class="am-input"
                />
              </div>
              <button class="am-login-btn" :disabled="pwdLoading" @click="doUsernameLogin">
                {{ pwdLoading ? '处理中...' : '登录' }}
              </button>
              <p class="am-toggle-mode" @click="passwordMode = 'register'; error = ''">
                没有账号？去注册
              </p>
            </template>

            <!-- Register mode -->
            <template v-if="passwordMode === 'register'">
              <div class="am-field">
                <label class="am-label">用户名</label>
                <input
                  v-model="pwdUsername"
                  type="text"
                  placeholder="2-20个字符"
                  class="am-input"
                />
              </div>
              <div class="am-field">
                <label class="am-label">密码</label>
                <input
                  v-model="pwdPassword"
                  type="password"
                  placeholder="至少6位密码"
                  class="am-input"
                />
              </div>
              <div class="am-field">
                <label class="am-label">确认密码</label>
                <input
                  v-model="pwdConfirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  class="am-input"
                />
              </div>
              <div class="am-field">
                <label class="am-label">出生年份 <span style="color:#94a3b8;font-weight:400;font-size:12px">（未满14周岁需家长同意）</span></label>
                <select v-model="birthYear" class="am-input" style="appearance:auto">
                  <option value="">选择出生年份</option>
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
                </select>
              </div>

              <label class="am-terms-checkbox">
                <input v-model="agreedToTerms" type="checkbox" />
                我已阅读并同意 <a href="/legal" target="_blank" class="am-terms-link">《服务条款》</a>、<a href="/legal#privacy" target="_blank" class="am-terms-link">《隐私政策》</a>、<a href="/legal#children" target="_blank" class="am-terms-link">《监护人须知》</a>及<a href="/legal#complaint" target="_blank" class="am-terms-link">《侵权投诉规则》</a>
              </label>

              <button class="am-login-btn" :disabled="pwdLoading" @click="doUsernameRegister">
                {{ pwdLoading ? '处理中...' : '注册' }}
              </button>
              <p class="am-toggle-mode" @click="passwordMode = 'login'; error = ''">
                已有账号？去登录
              </p>
            </template>
          </template>

          <p v-if="authTab === 'password' && passwordMode === 'login'" class="am-terms">
            登录即代表同意
            <a href="/legal" target="_blank" class="am-terms-link">《服务条款》</a>
            <span v-if="isUnder14(birthYear)">
              及 <a href="/legal#children" target="_blank" class="am-terms-link">《儿童个人信息保护政策》</a>
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Parent Consent Modal -->
  <div v-if="showParentConsent" class="am-overlay" style="z-index:1100" @click.self="forceConsent ? null : (showParentConsent = false)">
    <div class="am-modal" style="max-width:460px">
      <button v-if="!forceConsent" class="am-close" @click="showParentConsent = false">✕</button>
      <div class="am-right" style="width:100%;padding:32px">
        <h2 class="am-title am-title-dark">家长同意确认</h2>
        <p class="am-subtitle">您的孩子未满14周岁，根据相关法律法规，需要家长同意后才能使用童慧行</p>

        <div v-if="consentError" class="am-error">{{ consentError }}</div>

        <div class="am-field">
          <label class="am-label">家长姓名</label>
          <input v-model="parentName" type="text" placeholder="请输入家长姓名" class="am-input" />
        </div>

        <div class="am-field">
          <label class="am-label">家长手机号</label>
          <input v-model="parentPhone" type="tel" maxlength="11" placeholder="请输入家长手机号" class="am-input" @input="parentPhone = parentPhone.replace(/\D/g, '').slice(0, 11)" />
        </div>

        <div class="am-field">
          <label class="am-label">验证码</label>
          <div class="am-code-row">
            <input v-model="parentCode" type="text" maxlength="6" placeholder="请输入验证码" class="am-input am-code-input" @input="parentCode = parentCode.replace(/\D/g, '').slice(0, 6)" />
            <button class="am-code-btn" :disabled="consentLoading || parentCountdown > 0" @click="sendParentCode">
              {{ parentCountdown > 0 ? parentCountdown + 's' : consentLoading ? '发送中...' : '获取验证码' }}
            </button>
          </div>
        </div>

        <label class="am-terms" style="display:flex;align-items:center;gap:8px;cursor:pointer;justify-content:flex-start;font-size:13px;color:#374151">
          <input v-model="parentAgreed" type="checkbox" style="width:16px;height:16px" />
          我已阅读并同意 <a href="/legal/terms#children" target="_blank" class="am-terms-link">《儿童个人信息保护政策》</a>
        </label>

        <button class="am-login-btn" :disabled="consentLoading || !parentAgreed" @click="submitParentConsent">
          {{ consentLoading ? '提交中...' : '确认并启用青少年模式' }}
        </button>

        <p style="margin-top:12px;font-size:12px;color:#94a3b8;text-align:center">
          确认后将启用青少年模式：每日使用时长限制、夜间禁用（22:00-06:00）
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.am-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5);
}
.am-modal {
  background: white; border-radius: 16px;
  width: 100%; max-width: 672px; margin: 0 16px;
  overflow: hidden; position: relative;
  animation: fadeInUp 0.25s ease;
}
.am-close {
  position: absolute; top: 16px; right: 16px; z-index: 10;
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; border: none; cursor: pointer;
  color: #64748b; font-size: 14px; transition: background 0.2s;
}
.am-close:hover { background: #e2e8f0; }
.am-body { display: flex; flex-direction: column; }
@media (min-width: 768px) { .am-body { flex-direction: row; } }

/* Left */
.am-left {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  padding: 40px 32px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: white;
}
@media (max-width: 767px) { .am-left { display: none; } }

.am-title { font-size: 20px; font-weight: 700; margin-bottom: 24px; }

/* Desktop QR section */
.am-left-desktop { width: 100%; display: flex; flex-direction: column; align-items: center; }
@media (max-width: 767px) { .am-left-desktop { display: none; } }

.am-qr {
  width: 192px; height: 192px; background: white; border-radius: 12px;
  padding: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;
}
.am-qr-inner {
  width: 100%; height: 100%; border: 2px dashed #d1d5db; border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.am-qr-icon { font-size: 40px; margin-bottom: 4px; }
.am-qr-text { font-size: 12px; color: #9ca3af; }
.am-qr-hint { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 24px; }
.am-methods { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.am-method {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 16px;
}
.am-method-icon { font-size: 20px; }
.am-method-name { font-size: 14px; font-weight: 500; }
.am-method-desc { font-size: 12px; opacity: 0.6; }

/* Mobile: compact OAuth row (inside right panel) */
.am-mobile-oauth { display: none; }
@media (max-width: 767px) {
  .am-mobile-oauth { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
}
.amo-label { font-size: 12px; color: #94a3b8; margin-right: 4px; white-space: nowrap; }
.amo-btn {
  padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  background: #f8fafc; font-size: 12px; cursor: pointer; transition: all 0.15s;
  color: #475569; white-space: nowrap;
}
.amo-btn:active { background: #e2e8f0; }
.amo-btn-wechat:active { background: rgba(7,193,96,0.1); border-color: #07c160; color: #07c160; }
.amo-btn-app:active { border-color: #3b82f6; color: #3b82f6; }
.amo-btn-travel:active { border-color: #6366f1; color: #6366f1; }

/* Right */
.am-right {
  padding: 32px; display: flex; flex-direction: column; justify-content: center;
}
@media (min-width: 768px) { .am-right { width: 50%; } }
@media (max-width: 767px) { .am-right { padding: 20px 16px; } }
.am-title-dark { color: #0f172a; margin-bottom: 4px; }
.am-subtitle { font-size: 14px; color: #64748b; margin-bottom: 20px; }
.am-tabs {
  display: flex; gap: 0; margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}
.am-tab {
  flex: 1; padding: 10px 0; text-align: center;
  font-size: 14px; font-weight: 500; color: #64748b;
  background: none; border: none; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.am-tab:hover { color: #374151; }
.am-tab-active {
  color: #2563eb; border-bottom-color: #2563eb;
}
.am-sub-tabs {
  display: flex; gap: 0; margin-bottom: 16px;
  background: #f1f5f9; border-radius: 8px; padding: 3px;
}
.am-sub-tab {
  flex: 1; padding: 6px 0; text-align: center;
  font-size: 13px; font-weight: 500; color: #64748b;
  background: none; border: none; cursor: pointer;
  border-radius: 6px; transition: all 0.2s;
}
.am-sub-tab-active {
  background: white; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}
.am-toggle-mode {
  margin-top: 12px; text-align: center;
  font-size: 13px; color: #2563eb; cursor: pointer;
}
.am-toggle-mode:hover { text-decoration: underline; }
.am-error {
  margin-bottom: 16px; padding: 12px; background: #fef2f2;
  color: #dc2626; font-size: 14px; border-radius: 8px;
}
.am-field { margin-bottom: 16px; }
.am-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.am-input {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.am-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.am-code-row { display: flex; gap: 8px; }
.am-code-input { flex: 1; }
.am-code-btn {
  padding: 10px 16px; background: #f1f5f9; color: #374151;
  border: none; border-radius: 8px; font-size: 14px; cursor: pointer;
  white-space: nowrap; transition: background 0.2s;
}
.am-code-btn:hover:not(:disabled) { background: #e2e8f0; }
.am-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.am-login-btn {
  width: 100%; padding: 12px; background: #2563eb; color: white;
  border: none; border-radius: 12px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background 0.2s; margin-top: 8px;
}
.am-login-btn:hover:not(:disabled) { background: #1d4ed8; }
.am-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.am-terms { margin-top: 16px; font-size: 12px; color: #9ca3af; text-align: center; }
.am-terms-link { color: #2563eb; text-decoration: none; }
.am-terms-link:hover { text-decoration: underline; }
.am-terms-checkbox {
  display: flex; align-items: center; gap: 8px;
  margin-top: 14px; font-size: 12px; color: #64748b;
  cursor: pointer; justify-content: center; line-height: 1.5;
}
.am-terms-checkbox input[type="checkbox"] { width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile responsive: small screens (phones) */
@media (max-width: 480px) {
  .am-modal {
    max-width: 100% !important;
    margin: 0 8px;
    border-radius: 12px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .am-right {
    padding: 16px 14px !important;
  }
  .am-title {
    font-size: 17px;
    margin-bottom: 14px;
  }
  .am-subtitle {
    font-size: 13px;
    margin-bottom: 12px;
  }
  .am-field {
    margin-bottom: 10px;
  }
  .am-input {
    padding: 8px 10px;
    font-size: 13px;
  }
  .am-login-btn {
    padding: 10px;
    font-size: 13px;
    border-radius: 10px;
  }
  .am-code-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
  .am-error {
    padding: 8px 10px;
    font-size: 13px;
    margin-bottom: 10px;
  }
  .am-tabs {
    margin-bottom: 12px;
  }
  .am-tab {
    padding: 8px 0;
    font-size: 13px;
  }
  .am-sub-tabs {
    margin-bottom: 10px;
  }
  .am-label {
    font-size: 13px;
  }
  .am-terms {
    margin-top: 10px;
    font-size: 11px;
  }
  .am-close {
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  .am-mobile-oauth {
    gap: 4px;
    margin-bottom: 10px;
  }
  .amo-btn {
    padding: 5px 10px;
    font-size: 11px;
  }
  .am-toggle-mode {
    margin-top: 8px;
    font-size: 12px;
  }
}
</style>
