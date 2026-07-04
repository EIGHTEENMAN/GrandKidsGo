<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isLoggedIn, getUser, getIsNewUser, fetchUser, setUser, setToken, getActiveProfile, setActiveProfile, getToken } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import AuthModal from '@/components/AuthModal.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import ProfileSetupPage from '@/components/ProfileSetupPage.vue'
import PersonalCenter from '@/components/PersonalCenter.vue'
import YouthMode from '@/components/YouthMode.vue'
import CookieConsent from '@/components/CookieConsent.vue'
import LearningStatus from '@shared/components/LearningStatus.vue'
import LearningDashboard from '@/components/LearningDashboard.vue'
import SearchPage from '@/components/SearchPage.vue'
import DocPage from '@/components/DocPage.vue'
import LegalPage from '@/components/LegalPage.vue'
import FAQPage from '@/components/FAQPage.vue'
import { navLinks } from '@shared/config/navLinks'

const auth = useAuthStore()
const localUser = ref<any>(getUser())
const showAuth = ref(false)
const showSetup = ref(false)
// 强制家长同意:登录后如后端判定需要,必须先完成 parent-consent 才能正常使用
const showParentConsent = ref(false)
const pendingConsentUserId = ref('')
const showLearning = ref(false)
const searchQuery = ref('')
const isSearchPage = ref(false)
const isDocPage = ref(false)
const isProfileSetupPage = ref(false)
const isPersonalCenterPage = ref(false)
const isLegalPage = ref(false)
const isFaqPage = ref(false)
const showChildSwitcher = ref(false)

// Active profile display name
const activeProfile = ref<any>(getActiveProfile())
const displayName = computed(() => {
  return activeProfile.value?.nickname || localUser.value?.nickname || localUser.value?.username || ''
})
const displayAvatar = computed(() => {
  return activeProfile.value?.avatar || localUser.value?.avatar || ''
})

// Children list for switcher
const children = ref<any[]>([])
async function loadChildren() {
  if (!isLoggedIn()) return
  try {
    const res = await fetch('/api/user/children', {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
    const d = await res.json()
    if (d.code === 'OK') children.value = d.data
  } catch {}
}
function switchProfile(p: any) {
  setActiveProfile(p)
  showChildSwitcher.value = false
  window.location.reload()
}
function getProfileName(p: any): string {
  if (p.type === 'parent') return p.nickname || '家长'
  return p.nickname || '孩子'
}

function doSearch() {
  if (searchQuery.value.trim()) {
    window.location.href = '/search?q=' + encodeURIComponent(searchQuery.value.trim())
  }
}

async function refreshUser() {
  if (!isLoggedIn()) {
    localUser.value = null
    return
  }
  const u = getUser()
  if (u) {
    localUser.value = u
    checkParentConsent(u)
    return
  }
  // Token present but no user data — fetch from server
  try {
    const d = await fetchUser()
    if (d) {
      localUser.value = d
      checkParentConsent(d)
    }
  } catch {}
}

// 全局门卫:登录后如需家长同意,强制弹窗
function checkParentConsent(user: any) {
  if (user && user.requiresParentConsent) {
    pendingConsentUserId.value = user.id
    showParentConsent.value = true
  }
}

async function onParentConsentComplete() {
  showParentConsent.value = false
  // 重新拉取用户,requiresParentConsent 应已变 false
  await auth.refreshUser()
  if (auth.user) {
    localUser.value = auth.user
  }
}

onMounted(() => {
  isSearchPage.value = window.location.pathname.startsWith('/search')
  isDocPage.value = window.location.pathname.startsWith('/doc')
  isProfileSetupPage.value = window.location.pathname.startsWith('/profile-setup')
  isPersonalCenterPage.value = window.location.pathname === '/personal-center'
  isLegalPage.value = window.location.pathname === '/legal'
  isFaqPage.value = window.location.pathname === '/faq'
  if (!isSearchPage.value && !isDocPage.value && !isProfileSetupPage.value && !isPersonalCenterPage.value && !isLegalPage.value && !isFaqPage.value) {
    refreshUser()
    loadChildren()
    window.addEventListener('storage', () => {
      refreshUser()
      activeProfile.value = getActiveProfile()
    })
    document.addEventListener('click', () => { showChildSwitcher.value = false })
  } else if (isSearchPage.value) {
    const params = new URLSearchParams(window.location.search)
    const sq = params.get('q')
    if (sq) searchQuery.value = sq
  }
  // Check for login query param
  const params = new URLSearchParams(window.location.search)
  if (params.get('login') === '1') {
    showAuth.value = true
    // Clean URL
    history.replaceState(null, '', window.location.pathname)
  }
  // Soft prompt: show auth modal once on first visit if not logged in
  if (!isLoggedIn() && !localStorage.getItem('grandkidsgo_auth_prompted')) {
    setTimeout(() => {
      showAuth.value = true
    }, 500)
  }
  // Check for new user setup — redirect to full page
  if (isLoggedIn() && getIsNewUser() && !window.location.pathname.startsWith('/profile-setup')) {
    const u = getUser()
    if (!u?.nickname || u.nickname.startsWith('user_')) {
      window.location.href = '/profile-setup'
    }
  }
})

function handleLogin(user: any) {
  showAuth.value = false
  refreshUser()
  const isNew = getIsNewUser()
  if (isNew && (!user.nickname || user.nickname.startsWith('user_'))) {
    window.location.href = '/profile-setup'
  }
}

function handleLogout() {
  auth.logout()
  localUser.value = null
}

function handleCloseAuth() {
  showAuth.value = false
  localStorage.setItem('grandkidsgo_auth_prompted', '1')
}

async function handleSetupComplete() {
  showSetup.value = false
  const u = await fetchUser()
  if (u) {
    setUser(u)
    localUser.value = u
  }
}

// Track sub-app usage
function trackApp(name: string) {
  // Auto-build tracking map: navLinks entries handle 论坛/商城, core apps hardcoded
  const navMap: Record<string, string> = {}
  for (const link of navLinks) {
    if (!link.hidden && link.trackKey) navMap[link.label] = link.trackKey
  }
  const appKey = { '学国学': 'xueguoxue', '学诗词': 'xueshici', '学通识': 'xuetongshi', '学英语': 'english', '来挑战': 'tiaozhan', '走天下': 'travel', ...navMap }[name] || name
  try {
    navigator.sendBeacon(
      'https://admin.grandand.com/api/analytics/track',
      JSON.stringify({ appName: appKey, event: 'pageview' })
    )
  } catch {}
}

const apps = [
  { name: '学国学', desc: '经典启蒙，明智修身', icon: '📚', href: 'https://xueguoxue.grandand.com', color: '#8b5cf6' },
  { name: '学诗词', desc: '唐诗宋词，古韵童声', icon: '📜', href: 'https://xueshici.grandand.com', color: '#f59e0b' },
  { name: '学通识', desc: '天文地理，万物百科', icon: '🔭', href: 'https://xuetongshi.grandand.com', color: '#06b6d4' },
  { name: '学英语', desc: '趣味单词，自然拼读', icon: '🔤', href: 'https://english.grandand.com', color: '#ec4899' },
  { name: '来挑战', desc: '答题对战，益智闯关', icon: '⚡', href: 'https://tiaozhan.grandand.com', color: '#ef4444' },
  { name: '走天下', desc: '亲子旅行攻略分享', icon: '✈️', href: 'https://travel.grandand.com', color: '#22c55e' },
]

const stats = [
  { label: '国学经典', count: '100+', unit: '部', icon: '📚', color: '#8b5cf6' },
  { label: '唐诗宋词', count: '1000', unit: '首', icon: '📜', color: '#f59e0b' },
  { label: '通识百科', count: '2000', unit: '篇', icon: '🔭', color: '#06b6d4' },
  { label: '英语单词', count: '3000', unit: '词', icon: '🔤', color: '#ec4899' },
  { label: '益智题目', count: '5000', unit: '道', icon: '⚡', color: '#ef4444' },
  { label: '亲子攻略', count: '1000+', unit: '篇', icon: '✈️', color: '#22c55e' },
]
</script>

<template>
  <div class="page" v-if="!isSearchPage && !isDocPage && !isPersonalCenterPage && !isLegalPage && !isFaqPage">
    <!-- Header Nav -->
    <header class="header">
      <div class="header-inner">
        <div class="header-left">
          <a href="https://grandand.com" class="logo">童慧行</a>
          <form class="header-search" @submit.prevent="doSearch">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" @click="doSearch">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              placeholder="搜索"
              class="search-input"
            />
          </form>
        </div>
        <div class="header-right">
          <div class="header-links">
            <a v-for="link in navLinks.filter(l => !l.hidden)" :key="link.label" :href="link.href" class="header-link">{{ link.icon }} {{ link.label }}</a>
          </div>
          <div class="header-auth">
            <template v-if="localUser">
              <div class="header-switcher" @click.stop="showChildSwitcher = !showChildSwitcher">
                <span class="header-switcher-trigger">
                  <span v-if="displayAvatar" class="header-avatar">{{ displayAvatar }}</span>
                  <span>{{ displayName }}</span>
                  <span class="header-switcher-arrow">{{ showChildSwitcher ? '▲' : '▼' }}</span>
                </span>
                <div class="header-switcher-dropdown" v-if="showChildSwitcher" @click.stop>
                  <div
                    class="header-switcher-item"
                    :class="{ active: !activeProfile?.type || activeProfile.type === 'parent' }"
                    @click="switchProfile({ type: 'parent', id: localUser?.id, nickname: localUser?.nickname || localUser?.username })"
                  >
                    <span class="hs-item-avatar">👤</span>
                    <span class="hs-item-name">{{ localUser?.nickname || localUser?.username || '家长' }}</span>
                    <span class="hs-item-label">全部</span>
                  </div>
                  <div
                    v-for="c in children"
                    :key="c.id"
                    class="header-switcher-item"
                    :class="{ active: activeProfile?.id === c.id }"
                    @click="switchProfile({ type: 'child', id: c.id, nickname: c.nickname, avatar: c.avatar })"
                  >
                    <span class="hs-item-avatar">{{ c.avatar || '👶' }}</span>
                    <span class="hs-item-name">{{ c.nickname }}</span>
                  </div>
                </div>
              </div>
              <button class="header-learning-btn" @click="showLearning = !showLearning">📊</button>
              <a href="/personal-center" class="header-profile-btn">个人中心</a>
              <button class="header-logout" @click="handleLogout">退出</button>
            </template>
            <button v-else class="header-login" @click="showAuth = true">登录 / 注册</button>
          </div>
        </div>
      </div>
      <!-- Learning Status Popup -->
      <Teleport to="body">
        <div v-if="showLearning" class="ls-overlay" @click.self="showLearning = false">
          <LearningStatus @close="showLearning = false" />
        </div>
      </Teleport>
    </header>

    <!-- Hero Banner + Welcome Area -->
    <section class="hero">
      <div class="hero-inner">
        <div :class="['hero-content', { 'hero-split': localUser }]">
          <div class="hero-text animate-fadeInUp">
            <p class="hero-subtitle">读万卷书 行万里路</p>
            <p class="hero-desc">童慧行是一个专为儿童和父母打造的成长陪伴平台，为孩子们提供丰富的人文启蒙和学习资源，为年轻父母提供真实可靠的亲子旅行指南。</p>
            <p class="hero-desc-sub">从国学经典学立身，到通识百科长见识，再到走向广阔天地——陪伴孩子们读万卷书，行万里路。</p>
            <div class="hero-cta">
              <a href="#apps" class="cta-btn cta-primary">开始学习</a>
              <a href="https://travel.grandand.com" target="_self" class="cta-btn cta-secondary">看看世界 →</a>
            </div>
          </div>
          <!-- Welcome card when logged in -->
          <div v-if="localUser" class="hero-welcome animate-fadeInUp">
            <div class="welcome-card">
              <div class="welcome-header">
                <span class="welcome-avatar">{{ displayAvatar || '👤' }}</span>
                <div>
                  <p class="welcome-greeting">欢迎回来</p>
                  <p class="welcome-name">{{ displayName }}</p>
                </div>
              </div>
              <div class="welcome-stats">
                <div class="welcome-stat">
                  <span class="ws-val">{{ children.length }}</span>
                  <span class="ws-lbl">个孩子</span>
                </div>
                <div class="welcome-stat">
                  <span class="ws-val">⭐</span>
                  <span class="ws-lbl">学习</span>
                </div>
              </div>
              <a href="/personal-center" class="welcome-cta">进入个人中心 →</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats / Data Board -->
    <section class="stats">
      <div class="stats-inner">
        <div v-for="(s, i) in stats" :key="s.label" class="stat-item animate-fadeInUp" :style="{ animationDelay: (i * 100) + 'ms' }">
          <div class="stat-icon" :style="{ backgroundColor: s.color + '12' }">{{ s.icon }}</div>
          <span class="stat-count" :style="{ color: s.color }">{{ s.count }}<span class="stat-unit">{{ s.unit }}</span></span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- App Grid -->
    <main id="apps" class="main-section">
      <h2 class="section-title">全部应用</h2>
      <div class="app-grid">
        <a
          v-for="app in apps"
          :key="app.name"
          :href="app.href"
          target="_self"
          rel="noopener noreferrer"
          class="app-card"
          @click="trackApp(app.name)">
          <div class="app-icon" :style="{ backgroundColor: app.color + '18' }">
            <span class="app-emoji">{{ app.icon }}</span>
          </div>
          <h3 class="app-name">{{ app.name }}</h3>
          <p class="app-desc">{{ app.desc }}</p>
        </a>
      </div>

    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-links">
        <a href="/faq">常见问题</a>
        <a href="/legal">服务条款</a>
        <a href="/legal">隐私政策</a>
      </div>
      <p class="footer-icp"><a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">京ICP备XXXXXXXX号-X</a> <span class="footer-sep">|</span> 京公网安备 XXXXXXXXXX号</p>
      <p class="footer-copy">&copy; 2026 童慧行 &mdash; 儿童免费学习乐园 <span class="footer-ai">· AI辅助</span></p>
    </footer>

    <!-- Auth Modal -->
    <AuthModal
      :open="showAuth || showParentConsent"
      :force="showParentConsent"
      :force-consent="showParentConsent"
      :force-consent-user-id="pendingConsentUserId"
      @close="showParentConsent ? null : handleCloseAuth()"
      @login="handleLogin"
      @consent-complete="onParentConsentComplete"
    />

    <!-- Profile Setup -->
    <ProfileSetup
      :open="showSetup"
      @complete="handleSetupComplete"
    />

  </div>

  <!-- Youth Mode Monitor (site-wide, auto-tracks usage, shows warnings, night mode block) -->
  <YouthMode />

  <!-- Cookie Consent Banner -->
  <CookieConsent />

  <!-- Personal Center (page) -->
  <PersonalCenter
    v-if="isPersonalCenterPage"
    :open="true"
    @close="() => window.location.href = 'https://grandand.com'"
    @logout="() => window.location.href = 'https://grandand.com'"
  />

  <!-- Profile Setup Page (full page, not modal) -->
  <ProfileSetupPage v-if="isProfileSetupPage" />

  <!-- Search Page (shown when path is /search) -->
  <SearchPage v-if="isSearchPage" />

  <!-- Doc Page (shown when path is /doc) -->
  <DocPage v-if="isDocPage" />

  <!-- Legal Page (shown when path is /legal) -->
  <LegalPage v-if="isLegalPage" />
  <FAQPage v-if="isFaqPage" />
</template>

<style>
/* Animations */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out both; }

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased;
}

/* Header */
.header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}
.header-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.header-right {
  display: flex; align-items: center; gap: 16px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 32px; font-weight: 800; color: #2563eb; text-decoration: none; line-height: 1; }
.header-links { display: flex; gap: 8px; }
.header-link {
  padding: 8px 18px; border-radius: 10px; font-size: 14px; font-weight: 500;
  text-decoration: none; color: #64748b; transition: all 0.2s;
}
.header-link:hover { background: #f1f5f9; color: #0f172a; }
.header-search {
  display: flex; align-items: center; gap: 6px;
  background: #f1f5f9; border-radius: 10px;
  padding: 6px 12px; transition: all 0.2s;
  border: 1px solid transparent;
}
.header-search:focus-within {
  background: #fff;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.search-icon {
  width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0;
}
.search-input {
  border: none; background: transparent; outline: none;
  font-size: 13px; width: 160px; color: #334155;
}
.search-input::placeholder { color: #94a3b8; }

.header-auth { display: flex; align-items: center; gap: 12px; }
.header-user {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: #374151; font-weight: 500;
}
.header-avatar { font-size: 18px; }
.header-login {
  padding: 8px 20px; background: #2563eb; color: white; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
  transition: background 0.2s;
}
.header-login:hover { background: #1d4ed8; }
.header-logout {
  padding: 6px 12px; background: transparent; color: #9ca3af; border: none;
  border-radius: 8px; font-size: 13px; cursor: pointer; transition: color 0.2s;
}
.header-profile-btn {
  padding: 6px 14px; background: #f0f9ff; color: #2563eb; border: 1px solid #bfdbfe;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;
}
.header-profile-btn:hover { background: #2563eb; color: #fff; }
.header-logout:hover { color: #ef4444; }

/* Child Switcher */
.header-switcher {
  position: relative;
  cursor: pointer;
}
.header-switcher-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  transition: background 0.2s;
}
.header-switcher-trigger:hover { background: #f1f5f9; }
.header-switcher-arrow {
  font-size: 8px;
  color: #94a3b8;
  margin-left: 2px;
}
.header-switcher-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.1);
  min-width: 200px;
  z-index: 60;
  overflow: hidden;
  animation: fadeIn 0.15s ease-out;
}
.header-switcher-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;
}
.header-switcher-item:hover { background: #f8fafc; }
.header-switcher-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}
.hs-item-avatar { font-size: 18px; }
.hs-item-name { flex: 1; }
.hs-item-label {
  font-size: 11px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
}

.header-learning-btn {
  padding: 6px 10px; border-radius: 8px; font-size: 16px;
  background: transparent; border: none; cursor: pointer;
  transition: background 0.2s;
}
.header-learning-btn:hover { background: #f1f5f9; }

/* Hero */
.hero {
  background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
  padding: 48px 0 40px;
  border-bottom: 1px solid #e0f2fe;
}
.hero-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
}
.hero-text { text-align: left; }
.hero-title { font-size: 48px; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: 1px; line-height: 1.2; }
.hero-subtitle { font-size: 72px; font-weight: 800; color: #0f172a; margin-bottom: 16px; letter-spacing: 2px; }
.hero-desc { font-size: 15px; color: #64748b; line-height: 1.8; margin-bottom: 10px; }
.hero-desc-sub { font-size: 14px; color: #94a3b8; line-height: 1.7; margin-bottom: 16px; }
.hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
.cta-btn {
  padding: 14px 32px; border-radius: 14px; font-size: 16px; font-weight: 600;
  text-decoration: none; transition: all 0.25s; display: inline-block;
}
.cta-primary { background: #2563eb; color: white; }
.cta-primary:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,99,235,0.3); }
.cta-secondary { background: white; color: #2563eb; border: 2px solid #e2e8f0; }
.cta-secondary:hover { border-color: #2563eb; transform: translateY(-2px); }

/* Hero Split Layout */
.hero-content {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}
.hero-split .hero-text {
  flex: 1;
  min-width: 0;
}
.hero-split .hero-text .hero-subtitle {
  font-size: 56px;
}
.hero-welcome {
  flex-shrink: 0;
  width: 340px;
}
.welcome-card {
  background: white;
  border-radius: 20px;
  padding: 28px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
.welcome-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.welcome-avatar {
  font-size: 40px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f9ff;
  border-radius: 16px;
}
.welcome-greeting {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}
.welcome-name {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 2px 0 0;
}
.welcome-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.welcome-stat {
  flex: 1;
  background: #f8fafc;
  border-radius: 14px;
  padding: 14px;
  text-align: center;
}
.ws-val {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #2563eb;
}
.ws-lbl {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}
.welcome-cta {
  display: block;
  text-align: center;
  padding: 12px;
  background: #2563eb;
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
}
.welcome-cta:hover { background: #1d4ed8; }

@media (max-width: 860px) {
  .hero-split { flex-direction: column; }
  .hero-welcome { width: 100%; }
  .hero-split .hero-text .hero-subtitle { font-size: 48px; }
}

/* Stats */
.stats {
  background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
  padding: 56px 0;
}
.stats-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
  display: flex; justify-content: space-between; gap: 16px;
}
.stat-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  flex: 1; max-width: 160px;
}
.stat-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; margin-bottom: 2px;
}
.stat-count { font-size: 26px; font-weight: 800; }
.stat-unit { font-size: 14px; color: #94a3b8; margin-left: 2px; font-weight: 400; }
.stat-label { font-size: 13px; color: #64748b; }

/* App Grid */
.main-section { max-width: 1200px; margin: 0 auto; scroll-margin-top: 70px; padding: 48px 24px 48px; }
.section-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #0f172a; }
.app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.app-card {
  background: white; border-radius: 18px; padding: 32px 28px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  text-decoration: none; color: inherit; border: 1px solid #e2e8f0;
  transition: all 0.3s;
}
.app-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-3px); }
.app-icon {
  width: 80px; height: 80px; border-radius: 22px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.app-emoji { font-size: 40px; }
.app-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.app-desc { font-size: 14px; color: #94a3b8; line-height: 1.5; }

.empty-search {
  grid-column: 1 / -1;
  text-align: center; padding: 60px 20px;
  color: #94a3b8; font-size: 14px;
}

/* Footer */
.footer { text-align: center; padding: 32px 24px 24px; border-top: 1px solid #e2e8f0; }
.footer-links { display: flex; gap: 20px; justify-content: center; margin-bottom: 8px; }
.footer-links a { font-size: 13px; color: #94a3b8; text-decoration: none; }
.footer-links a:hover { color: #64748b; }
.footer-icp { font-size: 11px; color: #cbd5e1; margin-bottom: 6px; }
.footer-icp a { color: #cbd5e1; text-decoration: none; }
.footer-icp a:hover { color: #94a3b8; }
.footer-sep { color: #e2e8f0; margin: 0 6px; }
.footer-copy { font-size: 12px; color: #cbd5e1; }
.footer-ai { font-size: 10px; color: #d5dbe3; }

@media (max-width: 768px) {
  .hero { padding: 28px 0; }
  .hero-title { font-size: 28px; }
  .logo { font-size: 24px; }
  .hero-subtitle { font-size: 28px; white-space: normal; }
  .hero-desc { font-size: 14px; }
  .hero-desc-sub { font-size: 13px; }
  .hero-cta { flex-direction: column; }
  .cta-btn { text-align: center; padding: 12px 24px; font-size: 14px; }
  .stats-inner { display: grid; grid-template-columns: repeat(2, 1fr); justify-items: center; gap: 12px; }
  .stat-item { max-width: none; }
  .stat-count { font-size: 22px; }
  .stat-icon { width: 40px; height: 40px; font-size: 18px; }
  .app-grid { grid-template-columns: 1fr; }
  .header-inner { padding: 10px 16px; }
  .header-links { display: none; }
  .header-search { display: none; }
  .header-auth { margin-left: auto; gap: 6px; }
  .header-login { padding: 6px 14px; font-size: 13px; }
  .header-logout { display: none; }
  .header-profile-btn { display: none; }
  .header-learning-btn { padding: 4px 6px; font-size: 14px; }
  .header-switcher-trigger { padding: 4px 6px; font-size: 13px; }
  .section-title { font-size: 20px; }
  .app-card { padding: 24px 20px; }
  .app-icon { width: 64px; height: 64px; font-size: 32px; }
  .app-name { font-size: 17px; }
  .hero-split .hero-text .hero-subtitle { font-size: 24px; }
}

@media (max-width: 420px) {
  .hero-subtitle { font-size: 22px; }
  .stats-inner { grid-template-columns: repeat(2, 1fr); }
  .stat-count { font-size: 18px; }
}
</style>
