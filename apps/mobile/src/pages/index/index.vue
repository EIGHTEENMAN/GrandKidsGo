<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProgress, getRecentApps, trackAppOpen } from '@/stores/progress'
import { getBrowseHistory, type BrowseRecord } from '@/stores/history'

// PWA install prompt
const pwaInstallEvent = ref<any>(null)
const showInstallPrompt = ref(false)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pwaInstallEvent.value = e
    showInstallPrompt.value = true
  })
  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false
    pwaInstallEvent.value = null
  })
})

const token = ref('')
const userInfo = ref<any>(null)
const progress = ref(getProgress())
const recentApps = ref(getRecentApps())
const browseHistory = ref<BrowseRecord[]>([])

// Daily recommendation (rotate daily based on date)
const dailyRecommendations = [
  { text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', source: '静夜思 · 李白', icon: '🌙' },
  { text: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', source: '春晓 · 孟浩然', icon: '🌸' },
  { text: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。', source: '悯农 · 李绅', icon: '🌾' },
  { text: '离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。', source: '赋得古原草送别 · 白居易', icon: '🌿' },
  { text: '好雨知时节，当春乃发生。随风潜入夜，润物细无声。', source: '春夜喜雨 · 杜甫', icon: '☔' },
  { text: '欲穷千里目，更上一层楼。', source: '登鹳雀楼 · 王之涣', icon: '🏯' },
  { text: '小时不识月，呼作白玉盘。', source: '古朗月行 · 李白', icon: '🌕' },
  { text: '鹅鹅鹅，曲项向天歌。白毛浮绿水，红掌拨清波。', source: '咏鹅 · 骆宾王', icon: '🦢' },
  { text: '学而时习之，不亦说乎？', source: '论语', icon: '📖' },
  { text: '千里之行，始于足下。', source: '道德经', icon: '👣' },
]
const dailyIdx = new Date().getDate() % dailyRecommendations.length
const daily = dailyRecommendations[dailyIdx]

const stats = [
  { label: '国学经典', count: 168, unit: '部', icon: '📚', color: '#8b5cf6' },
  { label: '唐诗宋词', count: 934, unit: '首', icon: '📜', color: '#f59e0b' },
  { label: '通识百科', count: 2149, unit: '篇', icon: '🔭', color: '#06b6d4' },
  { label: '英语单词', count: 3000, unit: '词', icon: '🔤', color: '#ec4899' },
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

// Continue learning - the most recently opened app
const continueApp = computed(() => {
  const apps = recentApps.value
  if (apps.length > 0) return apps[0]
  return null
})

function openContinueApp() {
  if (continueApp.value) {
    openRecent(continueApp.value)
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
    <!-- PWA Install Prompt -->
    <view class="install-banner" v-if="showInstallPrompt">
      <view class="install-content">
        <text class="install-icon">📲</text>
        <view class="install-texts">
          <text class="install-title">安装童慧行</text>
          <text class="install-desc">添加到主屏幕，随时学习</text>
        </view>
      </view>
      <view class="install-actions">
        <text class="install-dismiss" @click="dismissInstall">稍后</text>
        <text class="install-btn" @click="installPwa">安装</text>
      </view>
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
    <view class="daily-card" @click="openShici">
      <view class="daily-icon">{{ daily.icon }}</view>
      <view class="daily-content">
        <text class="daily-label">每日诵读</text>
        <text class="daily-text">{{ daily.text }}</text>
        <text class="daily-source">—— {{ daily.source }}</text>
      </view>
      <view class="daily-arrow">›</view>
    </view>

    <!-- Continue Learning -->
    <view class="continue-section" v-if="continueApp" @click="openContinueApp" hover-class="continue-hover">
      <view class="continue-left">
        <text class="continue-icon">▶</text>
      </view>
      <view class="continue-content">
        <text class="continue-label">继续学习</text>
        <text class="continue-name">{{ continueApp }}</text>
      </view>
      <text class="continue-arrow">›</text>
    </view>

    <!-- Learning Progress (personalized) -->
    <view class="progress-section" v-if="token">
      <view class="section-header">
        <text class="section-title">📊 我的学习</text>
      </view>
      <view class="progress-cards">
        <view class="progress-card">
          <text class="progress-num">{{ progress.totalVisits }}</text>
          <text class="progress-label">访问次数</text>
        </view>
        <view class="progress-card">
          <text class="progress-num">{{ Object.keys(progress.appOpens).length }}</text>
          <text class="progress-label">学过的应用</text>
        </view>
        <view class="progress-card">
          <text class="progress-num">{{ progress.totalContentViewed }}</text>
          <text class="progress-label">浏览内容</text>
        </view>
        <view class="progress-card">
          <text class="progress-num">{{ progress.dailyStreak }}</text>
          <text class="progress-label">连续天数</text>
        </view>
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

/* Progress */
.progress-cards { display: flex; gap: 12rpx; padding: 0 32rpx; }
.progress-card {
  flex: 1; background: white; border-radius: 18rpx; padding: 20rpx 12rpx;
  display: flex; flex-direction: column; align-items: center;
  border: 1rpx solid #e2e8f0;
}
.progress-num { font-size: 36rpx; font-weight: 800; color: #2563eb; }
.progress-label { font-size: 20rpx; color: #94a3b8; margin-top: 4rpx; }

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
