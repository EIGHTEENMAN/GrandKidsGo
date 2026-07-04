<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getRecentApps } from '@/stores/progress'

const recentApps = ref<string[]>([])

onMounted(() => {
  recentApps.value = getRecentApps()
})

const apps = [
  { name: '学国学', desc: '经典启蒙，明智修身', icon: '📚', url: 'https://xueguoxue.grandand.com', color: '#8b5cf6', category: '国学' },
  { name: '学诗词', desc: '唐诗宋词，古韵童声', icon: '📜', url: 'https://xueshici.grandand.com', color: '#f59e0b', category: '诗词' },
  { name: '学通识', desc: '天文地理，万物百科', icon: '🔭', url: 'https://xuetongshi.grandand.com', color: '#06b6d4', category: '通识' },
  { name: '学英语', desc: '趣味单词，自然拼读', icon: '🔤', url: 'https://english.grandand.com', color: '#ec4899', category: '英语' },
  { name: '来挑战', desc: '答题对战，益智闯关', icon: '⚡', url: 'https://tiaozhan.grandand.com', color: '#ef4444', category: '挑战' },
  { name: '走天下', desc: '亲子旅行攻略分享', icon: '✈️', url: 'https://travel.grandand.com', color: '#22c55e', category: '旅行' },
  { name: '社区论坛', desc: '交流分享，共同成长', icon: '💬', url: 'https://forum.grandand.com', color: '#f97316', category: '社区' },
  { name: '积分商城', desc: '努力学习，兑换好礼', icon: '🎒', url: 'https://store.grandand.com', color: '#14b8a6', category: '商城' },
]

const categories = ['全部', '学习', '挑战', '社区']
const activeCategory = ref('全部')

const filteredApps = computed(() => {
  if (activeCategory.value === '全部') return apps
  if (activeCategory.value === '学习') return apps.filter(a => ['国学', '诗词', '通识', '英语'].includes(a.category))
  if (activeCategory.value === '挑战') return apps.filter(a => a.category === '挑战')
  if (activeCategory.value === '社区') return apps.filter(a => ['社区', '商城', '旅行'].includes(a.category))
  return apps
})

// Native apps (migrated to UniApp pages) vs WebView
const nativeApps = new Set(['学诗词', '学国学', '学通识', '学英语'])

function openApp(name: string, url: string) {
  if (nativeApps.has(name)) {
    const routes: Record<string, string> = {
      '学诗词': '/pages/shici/index',
      '学国学': '/pages/guoxue/index',
      '学通识': '/pages/tongshi/index',
      '学英语': '/pages/english/index',
    }
    uni.navigateTo({ url: routes[name] })
    return
  }
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`
  })
}
</script>

<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-row">
        <view class="hero-left">
          <text class="hero-title">童慧行乐园</text>
          <text class="hero-desc">读万卷书，行万里路</text>
        </view>
        <view class="hero-badge">8个应用</view>
      </view>
      <scroll-view class="tags-scroll" scroll-x enable-flex>
        <view class="tags">
          <view
            v-for="cat in categories"
            :key="cat"
            class="tag"
            :class="activeCategory === cat ? 'tag-active' : ''"
            @click="activeCategory = cat"
          >
            <text>{{ cat }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Recent Apps -->
    <view class="recent-section" v-if="recentApps.length > 0">
      <view class="section-header">
        <text class="section-title">🕐 最近使用</text>
      </view>
      <scroll-view class="recent-scroll" scroll-x enable-flex>
        <view
          v-for="app in recentApps"
          :key="app"
          class="recent-chip"
          @click="openApp(app, apps.find(a => a.name === app)?.url || '')"
        >
          <text>{{ app }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- App Grid -->
    <view class="grid-section">
      <view class="section-header">
        <text class="section-title">{{ activeCategory === '全部' ? '所有应用' : activeCategory }}</text>
        <text class="section-count">{{ filteredApps.length }}个</text>
      </view>
      <view class="grid">
        <view
          v-for="app in filteredApps"
          :key="app.name"
          class="card"
          @click="openApp(app.name, app.url)"
          hover-class="card-hover"
        >
          <view class="card-icon" :style="{ backgroundColor: app.color + '18' }">
            <text class="card-emoji">{{ app.icon }}</text>
          </view>
          <text class="card-name">{{ app.name }}</text>
          <text class="card-desc">{{ app.desc }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

/* Hero */
.hero {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #dbeafe 100%);
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #c7d2fe;
}
.hero-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.hero-left { display: flex; flex-direction: column; gap: 6rpx; }
.hero-title { font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-desc { font-size: 26rpx; color: #64748b; }
.hero-badge {
  padding: 8rpx 20rpx; background: #6366f118; border-radius: 20rpx;
  font-size: 22rpx; font-weight: 500; color: #6366f1;
}

/* Tags */
.tags-scroll { white-space: nowrap; margin-bottom: 4rpx; }
.tags { display: flex; gap: 12rpx; padding: 4rpx 0; }
.tag {
  padding: 10rpx 28rpx; border-radius: 12rpx; font-size: 24rpx;
  font-weight: 500; border: 2rpx solid #e2e8f0; background: white; color: #475569;
  flex-shrink: 0;
}
.tag-active { background: #6366f1; color: white; border-color: #6366f1; }

/* Recent */
.recent-section { margin-top: 24rpx; margin-bottom: 8rpx; }
.section-header { padding: 0 32rpx 16rpx; display: flex; align-items: center; gap: 8rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }
.section-count { font-size: 22rpx; color: #94a3b8; }
.recent-scroll { padding: 0 24rpx; white-space: nowrap; }
.recent-chip {
  display: inline-flex; padding: 14rpx 28rpx; background: #eef2ff;
  border-radius: 28rpx; margin-right: 16rpx; font-size: 24rpx;
  font-weight: 500; color: #6366f1; border: 1rpx solid #c7d2fe;
}

/* Grid */
.grid-section { margin-top: 16rpx; }
.grid { display: flex; flex-wrap: wrap; gap: 20rpx; padding: 0 24rpx; }
.card {
  width: calc(50% - 10rpx); background: white; border-radius: 24rpx;
  padding: 36rpx 24rpx; display: flex; flex-direction: column;
  align-items: center; text-align: center;
  border: 1rpx solid #e2e8f0; box-sizing: border-box;
}
.card-hover { opacity: 0.85; transform: scale(0.98); }
.card-icon {
  width: 96rpx; height: 96rpx; border-radius: 28rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20rpx;
}
.card-emoji { font-size: 48rpx; }
.card-name { font-size: 30rpx; font-weight: 700; margin-bottom: 10rpx; color: #0f172a; }
.card-desc { font-size: 24rpx; color: #94a3b8; line-height: 1.4; }
</style>
