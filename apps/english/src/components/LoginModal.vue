<template>
  <div class="login-overlay" @click.self="dismiss">
    <div class="login-box">
      <button class="close-btn" @click="dismiss">✕</button>

      <!-- Mobile tab switch -->
      <div class="mobile-tabs">
        <button class="tab" :class="{ 'tab-active': mobileMode === 'phone' }" @click="mobileMode = 'phone'; authTab = 'phone'">手机号登录</button>
        <button class="tab" :class="{ 'tab-active': mobileMode === 'password' }" @click="mobileMode = 'password'; authTab = 'password'">账号密码</button>
        <button class="tab" :class="{ 'tab-active': mobileMode === 'qrcode' }" @click="mobileMode = 'qrcode'">扫码登录</button>
      </div>

      <div class="login-body">
        <!-- Left: QR Code (hidden on small mobile when phone tab active) -->
        <div class="login-left" v-show="!isSmall || mobileMode === 'qrcode'">
          <h2>扫码登录</h2>
          <div class="qr-area">
            <div class="qr-placeholder">
              <div class="qr-icon">📷</div>
              <p>扫码登录</p>
            </div>
          </div>
          <p class="qr-hint">打开 App 或微信扫一扫</p>
          <div class="qr-apps">
            <div class="qr-app-item">
              <span class="qr-app-icon">📱</span>
              <div>
                <div class="qr-app-name">童慧行 App</div>
                <div class="qr-app-desc">打开扫一扫</div>
              </div>
            </div>
            <div class="qr-app-item">
              <span class="qr-app-icon">🧳</span>
              <div>
                <div class="qr-app-name">走天下 App</div>
                <div class="qr-app-desc">打开扫一扫</div>
              </div>
            </div>
            <div class="qr-app-item">
              <span class="qr-app-icon">💬</span>
              <div>
                <div class="qr-app-name">微信</div>
                <div class="qr-app-desc">打开扫一扫</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Login Forms (hidden on small mobile when qrcode tab active) -->
        <div class="login-right" v-show="!isSmall || mobileMode === 'phone' || mobileMode === 'password'">
          <!-- Tab Bar -->
          <div class="login-tabs">
            <button class="login-tab" :class="{ 'login-tab-active': authTab === 'phone' }" @click="authTab = 'phone'; error = ''">手机验证</button>
            <button class="login-tab" :class="{ 'login-tab-active': authTab === 'password' }" @click="authTab = 'password'; error = ''">账号密码</button>
          </div>

          <!-- Phone Login -->
          <template v-if="authTab === 'phone'">
            <h2>手机号登录</h2>
            <p class="login-sub">输入手机号，验证后自动注册/登录</p>

            <div class="error-msg" v-if="error">{{ error }}</div>

            <div class="field">
              <label>手机号</label>
              <input type="tel" maxlength="11" placeholder="请输入手机号" v-model="phone" @input="onPhoneInput" />
            </div>

            <div class="field">
              <label>验证码</label>
              <div class="code-row">
                <input type="text" maxlength="6" placeholder="请输入验证码" v-model="code" @input="onCodeInput" />
                <button class="send-code-btn" :disabled="sending || countdown > 0" @click="sendCode">
                  {{ countdown > 0 ? countdown + 's' : sending ? '发送中...' : '获取验证码' }}
                </button>
              </div>
            </div>

            <button class="login-btn" :disabled="loading" @click="doLogin">
              {{ loading ? '处理中...' : '登录 / 注册' }}
            </button>
          </template>

          <!-- Password Login / Register -->
          <template v-else>
            <h2>账号密码登录</h2>
            <p class="login-sub">使用用户名和密码登录或注册新账号</p>

            <div class="error-msg" v-if="error">{{ error }}</div>

            <!-- Login / Register sub-tab -->
            <div class="pwd-sub-tabs">
              <button class="pwd-sub-tab" :class="{ 'pwd-sub-tab-active': passwordMode === 'login' }" @click="passwordMode = 'login'; error = ''">登录</button>
              <button class="pwd-sub-tab" :class="{ 'pwd-sub-tab-active': passwordMode === 'register' }" @click="passwordMode = 'register'; error = ''">注册</button>
            </div>

            <!-- Login mode -->
            <template v-if="passwordMode === 'login'">
              <div class="field">
                <label>用户名 / 手机号</label>
                <input type="text" placeholder="请输入用户名或手机号" v-model="pwdUsername" />
              </div>
              <div class="field">
                <label>密码</label>
                <input type="password" placeholder="请输入密码" v-model="pwdPassword" />
              </div>
              <button class="login-btn" :disabled="pwdLoading" @click="doUsernameLogin">
                {{ pwdLoading ? '处理中...' : '登录' }}
              </button>
              <p class="pwd-toggle" @click="passwordMode = 'register'; error = ''">没有账号？去注册</p>
            </template>

            <!-- Register mode -->
            <template v-if="passwordMode === 'register'">
              <div class="field">
                <label>用户名</label>
                <input type="text" placeholder="2-20个字符" v-model="pwdUsername" />
              </div>
              <div class="field">
                <label>密码</label>
                <input type="password" placeholder="至少6位密码" v-model="pwdPassword" />
              </div>
              <div class="field">
                <label>确认密码</label>
                <input type="password" placeholder="再次输入密码" v-model="pwdConfirmPassword" />
              </div>
              <button class="login-btn" :disabled="pwdLoading" @click="doUsernameRegister">
                {{ pwdLoading ? '处理中...' : '注册' }}
              </button>
              <p class="pwd-toggle" @click="passwordMode = 'login'; error = ''">已有账号？去登录</p>
            </template>
          </template>

          <button class="guest-btn" @click="dismiss">先逛逛</button>
          <p class="terms">登录即代表同意 <a href="https://grandand.com/legal/terms" target="_blank">《服务条款》</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"

const emit = defineEmits<{ loggedIn: [] }>()

const phone = ref("")
const code = ref("")
const error = ref("")
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
const mobileMode = ref<"phone" | "password" | "qrcode">("phone")
const isSmall = ref(window.innerWidth < 640)
let timer: ReturnType<typeof setInterval> | null = null

// Password login/register state
const authTab = ref<"phone" | "password">("phone")
const passwordMode = ref<"login" | "register">("login")
const pwdUsername = ref("")
const pwdPassword = ref("")
const pwdConfirmPassword = ref("")
const pwdLoading = ref(false)

function onResize() {
  isSmall.value = window.innerWidth < 640
}
onMounted(() => window.addEventListener("resize", onResize))
onUnmounted(() => window.removeEventListener("resize", onResize))

function onPhoneInput() {
  phone.value = phone.value.replace(/\D/g, "").slice(0, 11)
}

function onCodeInput() {
  code.value = code.value.replace(/\D/g, "").slice(0, 6)
}

function setCookie(name: string, value: string) {
  document.cookie = name + "=" + encodeURIComponent(value) + "; domain=.grandand.com; path=/; Secure; SameSite=Lax"
}

async function sendCode() {
  if (sending.value || countdown.value > 0) return
  if (!phone.value || phone.value.length < 11) {
    error.value = "请输入正确的手机号"
    return
  }
  error.value = ""
  sending.value = true
  try {
    const r = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value, purpose: "login" }),
    })
    const d = await r.json()
    if (d.code === "OK") {
      countdown.value = 60
      if (timer) clearInterval(timer)
      timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer!)
          timer = null
        }
      }, 1000)
    } else {
      error.value = d.message || "发送失败"
    }
  } catch {
    error.value = "网络错误"
  } finally {
    sending.value = false
  }
}

async function doLogin() {
  if (loading.value) return
  if (!phone.value || !code.value) {
    error.value = "请填写手机号和验证码"
    return
  }
  error.value = ""
  loading.value = true
  try {
    const r = await fetch("/api/auth/phone-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value, code: code.value }),
    })
    const d = await r.json()
    if (d.code === "OK") {
      const tok = d.data.accessToken
      sessionStorage.setItem("grandkidsgo_token", tok)
      setCookie("grandkidsgo_token", tok)
      if (d.data.user) {
        sessionStorage.setItem("grandkidsgo_user", JSON.stringify(d.data.user))
      }
      if (d.data.isNewUser) {
        localStorage.setItem("grandkidsgo_isNewUser", "true")
      }
      if (timer) clearInterval(timer)
      emit("loggedIn")
    } else {
      error.value = d.message || "登录失败"
    }
  } catch {
    error.value = "网络错误"
  } finally {
    loading.value = false
  }
}

async function doUsernameLogin() {
  if (pwdLoading.value) return
  if (!pwdUsername.value || !pwdPassword.value) {
    error.value = "请填写用户名和密码"
    return
  }
  error.value = ""
  pwdLoading.value = true
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: pwdUsername.value, password: pwdPassword.value }),
    })
    const d = await r.json()
    if (d.code === "OK") {
      const tok = d.data.accessToken
      sessionStorage.setItem("grandkidsgo_token", tok)
      setCookie("grandkidsgo_token", tok)
      if (d.data.user) {
        sessionStorage.setItem("grandkidsgo_user", JSON.stringify(d.data.user))
      }
      if (timer) clearInterval(timer)
      emit("loggedIn")
    } else {
      error.value = d.message || "登录失败"
    }
  } catch {
    error.value = "网络错误"
  } finally {
    pwdLoading.value = false
  }
}

async function doUsernameRegister() {
  if (pwdLoading.value) return
  if (!pwdUsername.value || !pwdPassword.value) {
    error.value = "请填写用户名和密码"
    return
  }
  if (pwdUsername.value.length < 2) {
    error.value = "用户名至少2个字符"
    return
  }
  if (pwdPassword.value.length < 6) {
    error.value = "密码至少6位"
    return
  }
  if (pwdPassword.value !== pwdConfirmPassword.value) {
    error.value = "两次密码输入不一致"
    return
  }
  error.value = ""
  pwdLoading.value = true
  try {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: pwdUsername.value, password: pwdPassword.value }),
    })
    const d = await r.json()
    if (d.code === "OK") {
      const tok = d.data.accessToken
      sessionStorage.setItem("grandkidsgo_token", tok)
      setCookie("grandkidsgo_token", tok)
      if (d.data.user) {
        sessionStorage.setItem("grandkidsgo_user", JSON.stringify(d.data.user))
      }
      if (d.data.isNewUser) {
        localStorage.setItem("grandkidsgo_isNewUser", "true")
      }
      if (timer) clearInterval(timer)
      emit("loggedIn")
    } else {
      error.value = d.message || "注册失败"
    }
  } catch {
    error.value = "网络错误"
  } finally {
    pwdLoading.value = false
  }
}

function dismiss() {
  if (timer) clearInterval(timer)
  emit("loggedIn")
}
</script>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-box {
  background: #1a1a2e;
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  margin: 0 16px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  animation: fadeInUp 0.25s ease;
}
@media (max-width: 639px) {
  .login-box {
    max-width: 100%;
    margin: 0 8px;
    border-radius: 12px;
    max-height: 85vh;
  }
}

/* Mobile tab switcher */
.mobile-tabs {
  display: none;
}
@media (max-width: 639px) {
  .mobile-tabs {
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .tab {
    flex: 1;
    padding: 12px 8px;
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tab-active {
    color: #ffd700;
    border-bottom: 2px solid #ffd700;
  }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.login-body {
  display: flex;
  flex-direction: column;
}
@media (min-width: 640px) {
  .login-body {
    flex-direction: row;
  }
}

/* Left side */
.login-left {
  background: linear-gradient(135deg, #2563eb, #6366f1);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
}
@media (min-width: 640px) {
  .login-left {
    width: 40%;
    padding: 36px 20px;
    border-radius: 14px 0 0 14px;
  }
}
.login-left h2 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
}
.qr-area {
  width: 160px;
  height: 160px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (max-width: 639px) {
  .qr-area {
    width: 130px;
    height: 130px;
    padding: 8px;
  }
}
.qr-placeholder {
  width: 100%;
  height: 100%;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.qr-icon {
  font-size: 36px;
  margin-bottom: 4px;
}
.qr-placeholder p {
  font-size: 12px;
  color: #9ca3af;
}
.qr-hint {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 20px;
}
.qr-apps {
  width: 100%;
}
.qr-app-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 14px;
  margin-bottom: 6px;
}
.qr-app-icon {
  font-size: 18px;
}
.qr-app-name {
  font-size: 13px;
  font-weight: 500;
}
.qr-app-desc {
  font-size: 11px;
  opacity: 0.6;
}

/* Right side */
.login-right {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
@media (min-width: 640px) {
  .login-right {
    width: 60%;
    padding: 32px 28px;
  }
}
.login-right h2 {
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 2px;
}
.login-sub {
  font-size: 13px;
  color: #88ccff;
  margin-bottom: 20px;
}
.error-msg {
  margin-bottom: 14px;
  padding: 10px;
  background: rgba(220, 38, 38, 0.15);
  color: #f87171;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid rgba(220, 38, 38, 0.3);
}
.field {
  margin-bottom: 14px;
}
.field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 4px;
}
.field input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.field input::placeholder {
  color: #64748b;
}
.field input:focus {
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
}
.code-row {
  display: flex;
  gap: 8px;
}
.code-row input {
  flex: 1;
}
.send-code-btn {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.1);
  color: #88ccff;
  border: 1px solid rgba(136, 204, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.send-code-btn:hover:not(:disabled) {
  background: rgba(136, 204, 255, 0.2);
}
.send-code-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.login-btn {
  width: 100%;
  padding: 12px;
  background: #d4a017;
  color: #1a1a2e;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 6px;
}
.login-btn:hover:not(:disabled) {
  background: #e2b32a;
}
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.guest-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background: transparent;
  color: #64748b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}
.guest-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}
.terms {
  margin-top: 14px;
  font-size: 11px;
  color: #64748b;
  text-align: center;
}
.terms a {
  color: #88ccff;
  text-decoration: none;
}

/* Tab bar */
.login-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.login-tab {
  flex: 1;
  padding: 8px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.login-tab:hover { color: #94a3b8; }
.login-tab-active {
  color: #ffd700;
  border-bottom-color: #ffd700;
}

/* Password sub-tabs */
.pwd-sub-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 3px;
}
.pwd-sub-tab {
  flex: 1;
  padding: 6px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}
.pwd-sub-tab-active {
  background: rgba(255,255,255,0.1);
  color: #ffd700;
}
.pwd-toggle {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #88ccff;
  cursor: pointer;
}
.pwd-toggle:hover { text-decoration: underline; }
</style>
