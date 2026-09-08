<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProgress, getRecentApps, trackAppOpen } from '@/stores/progress'
import { getBrowseHistory, type BrowseRecord } from '@/stores/history'

// PWA install prompt
const pwaInstallEvent = ref<any>(null)
const showInstallPrompt = ref(false)
const showIosTutorial = ref(false)
const isIos = ref(false)
const isStandalone = ref(false)

function isStandaloneMode() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
  } catch { return false }
}

// 首启引导 banner
const SHOW_WELCOME_KEY = 'grandkidsgo_welcome_dismissed'
const showWelcome = ref(false)

onMounted(() => {
  isIos.value = /ipad|iphone|ipod/i.test(navigator.userAgent)
  isStandalone.value = isStandaloneMode()
  if (isStandalone.value) {
    showInstallPrompt.value = false
  } else if (isIos.value) {
    showInstallPrompt.value = true
    showIosTutorial.value = true
  }
  try {
    const dismissed = uni.getStorageSync(SHOW_WELCOME_KEY)
    if (!dismissed) showWelcome.value = true
  } catch {}
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pwaInstallEvent.value = e
    showInstallPrompt.value = true
    showIosTutorial.value = false
  })
  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false
    pwaInstallEvent.value = null
  })
})

function dismissWelcome() {
  showWelcome.value = false
  try { uni.setStorageSync(SHOW_WELCOME_KEY, '1') } catch {}
}

const token = ref('')
const userInfo = ref<any>(null)
const progress = ref(getProgress())
const recentApps = ref(getRecentApps())
const browseHistory = ref<BrowseRecord[]>([])

// Daily recommendation (rotate daily based on date) - 真实诗 ID，点卡片跳转到 shici 详情
// id 对齐 apps/mobile/src/pages/shici/data.ts 的 poemsIndex（数字字符串）
const dailyRecommendations = [
  { text: '床前明月光，疑是地上霜。', source: '静夜思 · 李白', icon: '🌙', poemId: '283' },
  { text: '春眠不觉晓，处处闻啼鸟。', source: '春晓 · 孟浩然', icon: '🌸', poemId: '277' },
  { text: '举头望明月，低头思故乡。', source: '静夜思 · 李白', icon: '🌕', poemId: '283' },
  { text: '欲穷千里目，更上一层楼。', source: '登鹳雀楼 · 王之涣', icon: '🏯', poemId: '275' },
  { text: '飞流直下三千尺，疑是银河落九天。', source: '望庐山瀑布 · 李白', icon: '🌊', poemId: '868' },
  { text: '少壮不努力，老大徒伤悲。', source: '长歌行 · 佚名', icon: '⏳', poemId: '37' },
  { text: '采菊东篱下，悠然见南山。', source: '饮酒 · 陶渊明', icon: '🌿', poemId: '57' },
  { text: '海上生明月，天涯共此时。', source: '望月怀远 · 张九龄', icon: '🌝', poemId: '830' },
  { text: '独在异乡为异客，每逢佳节倍思亲。', source: '九月九日忆山东兄弟 · 王维', icon: '🍂', poemId: '767' },
  { text: '但愿人长久，千里共婵娟。', source: '水调歌头 · 苏轼', icon: '🌗', poemId: '132' },
  { text: '大江东去，浪淘尽，千古风流人物。', source: '念奴娇 · 苏轼', icon: '🌊', poemId: '133' },
  { text: '不识庐山真面目，只缘身在此山中。', source: '题西林壁 · 苏轼', icon: '⛰️', poemId: '771' },
  { text: '长风破浪会有时，直挂云帆济沧海。', source: '行路难 · 李白', icon: '⛵', poemId: '69' },
  { text: '天生我材必有用，千金散尽还复来。', source: '将进酒 · 李白', icon: '🍶', poemId: '756' },
  { text: '随风潜入夜，润物细无声。', source: '春夜喜雨 · 杜甫', icon: '☔', poemId: '759' },
  { text: '海内存知己，天涯若比邻。', source: '送杜少府之任蜀州 · 王勃', icon: '🤝', poemId: '99' },
  { text: '野火烧不尽，春风吹又生。', source: '赋得古原草送别 · 白居易', icon: '🔥', poemId: '824' },
  { text: '夕阳无限好，只是近黄昏。', source: '登乐游原 · 李商隐', icon: '🌅', poemId: '90' },
  { text: '春蚕到死丝方尽，蜡炬成灰泪始干。', source: '无题 · 李商隐', icon: '🕯️', poemId: '92' },
  { text: '人生自古谁无死，留取丹心照汗青。', source: '过零丁洋 · 文天祥', icon: '❤️', poemId: '402' },
]
const dailyIdx = new Date().getDate() % dailyRecommendations.length
const daily = dailyRecommendations[dailyIdx]

const stats = [
  { label: '国学经典', count: 923, unit: '部', icon: '📚', color: '#8b5cf6' },
  { label: '唐诗宋词', count: 2026, unit: '首', icon: '📜', color: '#f59e0b' },
  { label: '通识百科', count: 2164, unit: '篇', icon: '🔭', color: '#06b6d4' },
  { label: '英语单词', count: 5018, unit: '词', icon: '🔤', color: '#ec4899' },
]

// Animated counters
const animatedStats = ref(stats.map(s => ({ ...s, displayCount: 0 })))
const statsVisible = ref(false)

onMounted(() => {
  token.value = uni.getStorageSync('grandkidsgo_token') || ''
  trackAppOpen('首页')
  // Trigger counter animation after mount
  setTimeout(() => {
    statsVisible.value = true
    animateCounters()
  }, 300)
})

function animateCounters() {
  stats.forEach((s, i) => {
    const target = s.count
    const duration = 1500
    const start = Date.now()
    function tick() {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      animatedStats.value[i].displayCount = Math.round(eased * target)
      if (progress < 1) requestAnimationFrame(tick)
    }
    // Stagger each counter
    setTimeout(tick, i * 200)
  })
}

onShow(() => {
  token.value = uni.getStorageSync('grandkidsgo_token') || ''
  const stored = uni.getStorageSync('grandkidsgo_user')
  if (stored) {
    try { userInfo.value = JSON.parse(stored) } catch {}
  }
  progress.value = getProgress()
  recentApps.value = getRecentApps()
  browseHistory.value = getBrowseHistory(8)
})

function goLearning() {
  uni.switchTab({ url: '/pages/learning/index' })
}

function goLogin() {
  uni.navigateTo({ url: '/pages/mine/index' })
}

const appRoutes: Record<string, string> = {
  '学诗词': '/pages/shici/index',
  '学国学': '/pages/guoxue/index',
  '学通识': '/pages/tongshi/index',
  '学英语': '/pages/english/index',
}

function openRecent(app: string) {
  const route = appRoutes[app]
  if (route) {
    uni.navigateTo({ url: route })
  } else {
    uni.switchTab({ url: '/pages/learning/index' })
  }
}

function openShici() {
  trackAppOpen('学诗词')
  uni.navigateTo({ url: '/pages/shici/index' })
}

// 点"每日诵读"卡片直接跳到该诗详情（用 webview 套主站锚点）
function openDailyPoem() {
  trackAppOpen('学诗词')
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(daily.source)}&url=${encodeURIComponent('https://xueshici.grandand.com/#' + daily.poemId)}`
  })
}
function openGuoxue() {
  trackAppOpen('学国学')
  uni.navigateTo({ url: '/pages/guoxue/index' })
}
function openTongshi() {
  trackAppOpen('学通识')
  uni.navigateTo({ url: '/pages/tongshi/index' })
}
function openEnglish() {
  trackAppOpen('学英语')
  uni.navigateTo({ url: '/pages/english/index' })
}

const days = ['日', '一', '二', '三', '四', '五', '六']
const today = new Date()
const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 星期${days[today.getDay()]}`

// 打卡里程碑
const streakMilestones = [
  { days: 3, label: '坚持三天', emoji: '🔥' },
  { days: 7, label: '一周好习惯', emoji: '⭐' },
  { days: 30, label: '坚持不懈', emoji: '💪' },
]

const streakInfo = computed(() => {
  const current = progress.value.dailyStreak || 0
  const next = streakMilestones.find(m => m.days > current) || streakMilestones[streakMilestones.length - 1]
  const prevDays = streakMilestones.filter(m => m.days <= current).pop()?.days || 0
  const target = next.days
  const progressPct = Math.min(100, Math.round(((current - prevDays) / (target - prevDays)) * 100))
  const achieved = streakMilestones.filter(m => m.days <= current).map(m => m.emoji).join('')
  return { current, next, target, progressPct, achieved }
})

// Continue learning - the most recently browsed specific content (not just the app)
const continueTarget = computed(() => {
  const records = browseHistory.value
  // 优先用有 url 的具体内容
  const withUrl = records.find(r => r.url)
  if (withUrl) {
    return { kind: 'content' as const, title: withUrl.title, subtitle: withUrl.subtitle, type: withUrl.type, url: withUrl.url, app: withUrl.title }
  }
  // fallback：最近一个 app
  const apps = recentApps.value
  if (apps.length > 0) {
    return { kind: 'app' as const, title: apps[0], subtitle: '点击继续学习', type: '' as any, url: '', app: apps[0] }
  }
  return null
})

const continueIcon = computed(() => {
  const t = continueTarget.value
  if (!t) return '▶'
  if (t.kind === 'app') return '▶'
  switch (t.type) {
    case 'poem': return '📜'
    case 'classic': return '📚'
    case 'topic': return '🔭'
    case 'english': return '🔤'
    default: return '📄'
  }
})

function openContinue() {
  const t = continueTarget.value
  if (!t) return
  if (t.kind === 'content' && t.url) {
    uni.navigateTo({
      url: `/pages/learning/webview?title=${encodeURIComponent(t.title)}&url=${encodeURIComponent(t.url)}`
    })
  } else {
    openRecent(t.app)
  }
}

function openHistory(item: BrowseRecord) {
  if (item.url) {
    const route = appRoutes[item.title]
    if (route) {
      uni.navigateTo({ url: route })
    } else {
      uni.navigateTo({
        url: `/pages/learning/webview?title=${encodeURIComponent(item.title)}&url=${encodeURIComponent(item.url)}`
      })
    }
  }
}

function historyIcon(type: string) {
  return type === 'poem' ? '📜' : type === 'classic' ? '📚' : type === 'topic' ? '🔭' : type === 'english' ? '🔤' : '📄'
}

function installPwa() {
  if (pwaInstallEvent.value) {
    pwaInstallEvent.value.prompt()
    pwaInstallEvent.value.userChoice.then(() => {
      pwaInstallEvent.value = null
      showInstallPrompt.value = false
    })
  }
}

function dismissInstall() {
  showInstallPrompt.value = false
}
</script>

<template>
  <view class="page">
    <!-- Welcome Banner (first visit) -->
    <view class="welcome-banner" v-if="showWelcome">
      <view class="welcome-banner-content">
        <text class="welcome-banner-icon">🌟</text>
        <view class="welcome-banner-texts">
          <text class="welcome-banner-title">欢迎来到童慧行</text>
          <text class="welcome-banner-desc">读万卷书，行万里路 — 国学/诗词/通识/英语/旅行 5 大乐园</text>
        </view>
      </view>
      <text class="welcome-banner-close" @click="dismissWelcome">✕</text>
    </view>

    <!-- PWA Install Prompt (Android) -->
    <view class="install-banner" v-if="showInstallPrompt && !showIosTutorial">
      <view class="install-content">
        <text class="install-icon">📲</text>
        <view class="install-texts">
          <text class="install-title">安装童慧行</text>
          <text class="install-desc">添加到主屏幕，离线也能学</text>
        </view>
      </view>
      <view class="install-actions">
        <text class="install-dismiss" @click="dismissInstall">稍后</text>
        <text class="install-btn" @click="installPwa">立即安装</text>
      </view>
    </view>

    <!-- PWA Install Tutorial (iOS Safari) -->
    <view class="install-banner ios-banner" v-if="showInstallPrompt && showIosTutorial">
      <view class="install-content">
        <text class="install-icon">📲</text>
        <view class="install-texts">
          <text class="install-title">添加到主屏幕</text>
          <text class="install-desc">点击底部的分享按钮 ⬆️，选「添加到主屏幕」</text>
        </view>
      </view>
      <text class="install-dismiss" @click="dismissInstall">知道了</text>
    </view>

    <!-- Welcome Header -->
    <view class="welcome-bar">
      <view class="welcome-left">
        <text class="welcome-greeting">{{ token && userInfo ? 'Hi，' + (userInfo.nickname || userInfo.username || '朋友') : '你好' }}</text>
        <text class="welcome-date">{{ dateStr }}</text>
      </view>
      <view v-if="token && userInfo" class="welcome-avatar">{{ userInfo.avatar || '👤' }}</view>
    </view>

    <!-- Daily Recommendation -->
    <view class="daily-card" @click="openDailyPoem">
      <view class="daily-icon">{{ daily.icon }}</view>
      <view class="daily-content">
        <text class="daily-label">每日诵读</text>
        <text class="daily-text">{{ daily.text }}</text>
        <text class="daily-source">—— {{ daily.source }}</text>
      </view>
      <view class="daily-arrow">›</view>
    </view>

    <!-- Continue Learning / Empty State -->
    <view v-if="continueTarget" class="continue-section" @click="openContinue" hover-class="continue-hover">
      <view class="continue-left">
        <text class="continue-icon">{{ continueIcon }}</text>
      </view>
      <view class="continue-content">
        <text class="continue-label">{{ continueTarget.kind === 'content' ? '继续浏览' : '继续学习' }}</text>
        <text class="continue-name">{{ continueTarget.title }}</text>
      </view>
      <text class="continue-arrow">›</text>
    </view>
    <view v-else class="continue-section continue-empty" @click="goLearning" hover-class="continue-hover">
      <view class="continue-left">
        <text class="continue-icon">▶</text>
      </view>
      <view class="continue-content">
        <text class="continue-label">开始你的学习之旅</text>
        <text class="continue-name">选一个应用开始吧</text>
      </view>
      <text class="continue-arrow">›</text>
    </view>

    <!-- Streak Card (每日打卡) -->
    <view class="streak-card" v-if="token">
      <view class="streak-left">
        <text class="streak-fire">🔥</text>
      </view>
      <view class="streak-content">
        <view class="streak-row">
          <text class="streak-num">{{ streakInfo.current }}</text>
          <text class="streak-unit">天连续打卡</text>
          <text class="streak-achieved" v-if="streakInfo.achieved">{{ streakInfo.achieved }}</text>
        </view>
        <view class="streak-bar">
          <view class="streak-bar-fill" :style="{ width: streakInfo.progressPct + '%' }"></view>
        </view>
        <text class="streak-hint">距{{ streakInfo.next.emoji }}{{ streakInfo.next.label }}还差 {{ streakInfo.target - streakInfo.current }} 天</text>
      </view>
    </view>

    <!-- Recent Apps -->
    <view class="recent-section" v-if="recentApps.length > 0">
      <view class="section-header">
        <text class="section-title">🕐 最近学习</text>
      </view>
      <scroll-view class="recent-scroll" scroll-x enable-flex>
        <view
          v-for="app in recentApps"
          :key="app"
          class="recent-chip"
          @click="openRecent(app)"
        >
          <text>{{ app }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- Browse History -->
    <view class="history-section" v-if="browseHistory.length > 0">
      <view class="section-header">
        <text class="section-title">📖 最近浏览</text>
      </view>
      <view class="history-list">
        <view
          v-for="item in browseHistory"
          :key="item.id"
          class="history-item"
          @click="openHistory(item)"
          hover-class="history-hover"
        >
          <text class="history-icon">{{ historyIcon(item.type) }}</text>
          <view class="history-info">
            <text class="history-title">{{ item.title }}</text>
            <text class="history-meta" v-if="item.subtitle">{{ item.subtitle }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Quick Apps -->
    <view class="quick-section">
      <view class="section-header">
        <text class="section-title">🚀 快速开始</text>
      </view>
      <view class="quick-grid">
        <view class="quick-card" @click="openGuoxue">
          <view class="quick-icon" style="background: #8b5cf618;">📚</view>
          <text class="quick-name">学国学</text>
          <text class="quick-desc">经典启蒙</text>
        </view>
        <view class="quick-card" @click="openShici">
          <view class="quick-icon" style="background: #f59e0b18;">📜</view>
          <text class="quick-name">学诗词</text>
          <text class="quick-desc">唐诗宋词</text>
        </view>
        <view class="quick-card" @click="openTongshi">
          <view class="quick-icon" style="background: #06b6d418;">🔭</view>
          <text class="quick-name">学通识</text>
          <text class="quick-desc">万物百科</text>
        </view>
        <view class="quick-card" @click="openEnglish">
          <view class="quick-icon" style="background: #ec489918;">🔤</view>
          <text class="quick-name">学英语</text>
          <text class="quick-desc">趣味单词</text>
        </view>
      </view>
    </view>

    <!-- Platform Stats -->
    <view class="stats-section">
      <view class="section-header">
        <text class="section-title">📈 童慧行内容</text>
      </view>
      <view class="stats-grid">
        <view v-for="s in animatedStats" :key="s.label" class="stat-card" :style="{ borderColor: s.color + '30' }">
          <view class="stat-icon" :style="{ backgroundColor: s.color + '15' }">
            <text>{{ s.icon }}</text>
          </view>
          <text class="stat-count" :style="{ color: s.color }">{{ s.displayCount }}<text class="stat-unit">{{ s.unit }}+</text></text>
          <text class="stat-label">{{ s.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding-bottom: 30rpx; }

/* Welcome Banner (first visit) */
.welcome-banner {
  margin: 16rpx 32rpx 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 20rpx; padding: 20rpx 24rpx;
  display: flex; align-items: center; justify-content: space-between;
  border: 1rpx solid #fcd34d;
}
.welcome-banner-content { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.welcome-banner-icon { font-size: 36rpx; }
.welcome-banner-texts { display: flex; flex-direction: column; }
.welcome-banner-title { font-size: 28rpx; font-weight: 700; color: #92400e; }
.welcome-banner-desc { font-size: 22rpx; color: #b45309; margin-top: 4rpx; line-height: 1.4; }
.welcome-banner-close {
  font-size: 28rpx; color: #d97706; padding: 8rpx 12rpx;
  flex-shrink: 0;
}

/* PWA Install */
.install-banner {
  margin: 16rpx 32rpx 0; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 20rpx; padding: 20rpx 24rpx;
  display: flex; align-items: center; justify-content: space-between;
  border: 1rpx solid #bfdbfe;
}
.install-content { display: flex; align-items: center; gap: 12rpx; }
.install-icon { font-size: 36rpx; }
.install-texts { display: flex; flex-direction: column; }
.install-title { font-size: 26rpx; font-weight: 700; color: #1e40af; }
.install-desc { font-size: 22rpx; color: #3b82f6; margin-top: 2rpx; }
.install-actions { display: flex; align-items: center; gap: 12rpx; }
.install-dismiss { font-size: 24rpx; color: #93c5fd; padding: 6rpx 12rpx; }
.install-btn {
  font-size: 24rpx; font-weight: 600; color: white;
  background: #2563eb; padding: 10rpx 24rpx; border-radius: 12rpx;
}

/* iOS 教程 banner */
.ios-banner {
  background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
  border-color: #fde047;
}
.ios-banner .install-title { color: #854d0e; }
.ios-banner .install-desc { color: #a16207; }
.ios-banner .install-dismiss { color: #ca8a04; }

/* Welcome */
.welcome-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx 32rpx 16rpx;
}
.welcome-left { display: flex; flex-direction: column; gap: 4rpx; }
.welcome-greeting { font-size: 36rpx; font-weight: 800; color: #0f172a; }
.welcome-date { font-size: 24rpx; color: #94a3b8; }
.welcome-avatar { font-size: 44rpx; }

/* Daily Card */
.daily-card {
  margin: 0 32rpx 24rpx;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-radius: 24rpx; padding: 28rpx 28rpx;
  display: flex; align-items: center; gap: 20rpx;
  border: 1rpx solid #fde68a;
}
.daily-icon { font-size: 48rpx; }
.daily-content { flex: 1; min-width: 0; }
.daily-label { font-size: 20rpx; font-weight: 600; color: #d97706; display: block; margin-bottom: 6rpx; }
.daily-text { font-size: 28rpx; font-weight: 700; color: #92400e; line-height: 1.5; display: block; }
.daily-source { font-size: 22rpx; color: #a16207; margin-top: 6rpx; display: block; }
.daily-arrow { font-size: 36rpx; color: #d97706; }

/* Section */
.section-header { padding: 8rpx 32rpx 16rpx; display: flex; align-items: center; gap: 8rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #0f172a; }

/* Streak Card */
.streak-card {
  margin: 0 32rpx 24rpx; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border-radius: 24rpx; padding: 24rpx 28rpx;
  display: flex; align-items: center; gap: 20rpx;
  border: 1rpx solid #fed7aa;
}
.streak-left {
  width: 80rpx; height: 80rpx; border-radius: 24rpx;
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.streak-fire { font-size: 40rpx; }
.streak-content { flex: 1; min-width: 0; }
.streak-row { display: flex; align-items: baseline; gap: 8rpx; }
.streak-num { font-size: 44rpx; font-weight: 800; color: #c2410c; }
.streak-unit { font-size: 22rpx; color: #9a3412; }
.streak-achieved { font-size: 24rpx; margin-left: 8rpx; }
.streak-bar {
  margin-top: 10rpx; height: 12rpx; background: #fed7aa;
  border-radius: 6rpx; overflow: hidden;
}
.streak-bar-fill {
  height: 100%; background: linear-gradient(90deg, #fb923c 0%, #f97316 100%);
  border-radius: 6rpx; transition: width 0.4s ease;
}
.streak-hint { font-size: 20rpx; color: #c2410c; margin-top: 8rpx; display: block; }

/* Recent */
.recent-section { margin-bottom: 8rpx; }
.recent-scroll { padding: 0 24rpx; white-space: nowrap; }
.recent-chip {
  display: inline-flex; padding: 14rpx 28rpx; background: #eff6ff;
  border-radius: 28rpx; margin-right: 16rpx; font-size: 24rpx;
  font-weight: 500; color: #2563eb; border: 1rpx solid #bfdbfe;
}

/* Browse History */
.history-section { margin-bottom: 8rpx; }
.history-list { display: flex; flex-wrap: wrap; gap: 10rpx; padding: 0 32rpx; }
.history-item {
  display: flex; align-items: center; gap: 12rpx;
  background: white; border-radius: 16rpx; padding: 16rpx 20rpx;
  border: 1rpx solid #e2e8f0; width: calc(50% - 5rpx);
  box-sizing: border-box; transition: border-color 0.15s;
}
.history-hover { border-color: #bfdbfe; background: #f8faff; }
.history-icon { font-size: 28rpx; flex-shrink: 0; }
.history-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.history-title {
  font-size: 24rpx; font-weight: 600; color: #0f172a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-meta { font-size: 20rpx; color: #94a3b8; margin-top: 2rpx; }

/* Quick */
.quick-section { margin-bottom: 8rpx; }
.quick-grid { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 32rpx; }
.quick-card {
  width: calc(50% - 8rpx); background: white; border-radius: 24rpx;
  padding: 28rpx 24rpx; display: flex; flex-direction: column;
  align-items: center; border: 1rpx solid #e2e8f0;
}
.quick-icon {
  width: 80rpx; height: 80rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; margin-bottom: 14rpx;
}
.quick-name { font-size: 28rpx; font-weight: 700; color: #0f172a; }
.quick-desc { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }

/* Stats */
.stats-section { margin-top: 8rpx; }
.stats-grid { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 32rpx; }
.stat-card {
  flex: 1; min-width: 40%; background: white; border-radius: 20rpx;
  padding: 28rpx; display: flex; flex-direction: column; align-items: center;
  border: 1rpx solid #e2e8f0;
  animation: statFadeIn 0.5s ease both;
}
@keyframes statFadeIn {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.stat-card:nth-child(1) { animation-delay: 0s; }
.stat-card:nth-child(2) { animation-delay: 0.1s; }
.stat-card:nth-child(3) { animation-delay: 0.2s; }
.stat-card:nth-child(4) { animation-delay: 0.3s; }
.stat-icon {
  width: 64rpx; height: 64rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; margin-bottom: 12rpx;
}
.stat-count { font-size: 36rpx; font-weight: 800; }
.stat-unit { font-size: 22rpx; color: #94a3b8; margin-left: 4rpx; font-weight: 400; }
.stat-label { font-size: 24rpx; color: #64748b; margin-top: 6rpx; }

/* Continue Learning */
.continue-section {
  margin: 0 32rpx 24rpx; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 24rpx; padding: 24rpx 28rpx;
  display: flex; align-items: center; gap: 20rpx;
  border: 1rpx solid #bae6fd;
}
.continue-empty {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
}
.continue-empty .continue-left { background: #94a3b8; }
.continue-empty .continue-label { color: #475569; }
.continue-empty .continue-name { color: #334155; }
.continue-hover { opacity: 0.85; }
.continue-left {
  width: 72rpx; height: 72rpx; border-radius: 20rpx;
  background: #38bdf8; display: flex; align-items: center; justify-content: center;
}
.continue-icon { font-size: 32rpx; color: white; }
.continue-content { flex: 1; }
.continue-label { font-size: 20rpx; font-weight: 600; color: #0284c7; display: block; margin-bottom: 4rpx; }
.continue-name { font-size: 30rpx; font-weight: 700; color: #0c4a6e; }
.continue-arrow { font-size: 36rpx; color: #7dd3fc; }
</style>
