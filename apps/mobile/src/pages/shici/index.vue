<script setup lang="ts">
import { ref, computed } from 'vue'
import { poemsIndex, categories, categoryColors, poetBios } from './data'
import { shareContent, copyToClipboard } from '@/utils/native'
import ScrollToTop from '@/components/ScrollToTop.vue'

const activeDynasty = ref('全部')
const searchQuery = ref('')

const filteredPoems = computed(() => {
  let list = poemsIndex
  if (activeDynasty.value !== '全部') list = list.filter(p => p.dynasty === activeDynasty.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.title.includes(q) || p.author.includes(q))
  }
  return list
})

interface PoetGroup {
  name: string
  poems: typeof poemsIndex
  count: number
}
interface DynastyGroup {
  dynasty: string
  color: string
  poets: PoetGroup[]
}

const poetsByDynasty = computed<DynastyGroup[]>(() => {
  let base = filteredPoems.value
  const dynasties = activeDynasty.value === '全部' ? categories : [activeDynasty.value]
  return dynasties.map(dyn => {
    const dynPoems = base.filter(p => p.category === dyn)
    const poetMap = new Map<string, typeof poemsIndex>()
    dynPoems.forEach(p => {
      if (!poetMap.has(p.author)) poetMap.set(p.author, [])
      poetMap.get(p.author)!.push(p)
    })
    const poets = Array.from(poetMap.entries())
      .map(([name, poems]) => ({ name, poems, count: poems.length }))
      .sort((a, b) => b.count - a.count)
    return { dynasty: dyn, color: categoryColors[dyn] || '#64748b', poets }
  }).filter(g => g.poets.length > 0)
})

function openPoet(name: string) {
  uni.navigateTo({
    url: `/pages/shici/poet?name=${encodeURIComponent(name)}&dynasty=${encodeURIComponent(activeDynasty.value)}`
  })
}

function openSearchResult(poem: typeof poemsIndex[0]) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(poem.title)}&url=${encodeURIComponent('https://xueshici.grandand.com/#' + poem.id)}`
  })
}

function randomDailyPoem() {
  if (poemsIndex.length === 0) return
  const p = poemsIndex[Math.floor(Math.random() * poemsIndex.length)]
  const lines = p.summary.split('\n').filter(l => l.trim())
  const preview = lines.slice(0, Math.min(3, lines.length)).join('，') + '。'
  return { poem: p, preview }
}

const daily = ref(randomDailyPoem())

function shuffleDaily() {
  daily.value = randomDailyPoem()
}

function shareDaily() {
  if (!daily.value) return
  shareContent({
    title: daily.value.poem.title,
    text: `${daily.value.preview}\n—— ${daily.value.poem.author}`,
  })
}

function sharePoet(name: string) {
  shareContent({
    title: name,
    text: `和${name}学古诗`,
  })
}

// Random poet recommendations (shuffle and pick 4)
const randomPoets = computed(() => {
  const all = poetsByDynasty.value.flatMap(g => g.poets)
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
})
</script>

<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-row">
        <view class="hero-left">
          <text class="hero-title">学诗词</text>
          <text class="hero-desc">唐诗宋词，古韵童声</text>
        </view>
        <view v-if="daily" class="hero-quote">
          <view class="quote-main" @click="shuffleDaily">
            <text class="quote-text">{{ daily.value.preview }}</text>
            <text class="quote-source">{{ daily.value.poem.author }} · {{ daily.value.poem.title }}</text>
          </view>
          <view class="quote-actions">
            <text class="quote-shuffle" @click="shuffleDaily">换一首</text>
            <text class="quote-share" @click="shareDaily">分享</text>
          </view>
        </view>
      </view>
      <!-- Search -->
      <view class="search-bar">
        <input v-model="searchQuery" class="search-input" placeholder="搜索诗词名或作者" placeholder-style="color: #94a3b8" />
      </view>
      <!-- Dynasty Tags -->
      <scroll-view class="tags-scroll" scroll-x enable-flex>
        <view class="tags">
          <view
            v-for="dyn in ['全部', ...categories]"
            :key="dyn"
            class="tag"
            :class="activeDynasty === dyn ? 'tag-active' : ''"
            @click="activeDynasty = dyn"
          >
            <text>{{ dyn }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Random Poets (shown when no search/category filter) -->
    <view class="content">
      <view v-if="activeDynasty === '全部' && !searchQuery" class="random-section">
        <view class="section-header">
          <text class="section-title">🎲 随机推荐</text>
        </view>
        <view class="random-grid">
          <view
            v-for="poet in randomPoets"
            :key="poet.name"
            class="random-card"
            hover-class="random-hover"
          >
            <view class="random-card-main" @click="openPoet(poet.name)">
              <view class="random-avatar">📜</view>
              <view class="random-info">
                <text class="random-name">{{ poet.name }}</text>
                <text class="random-count">{{ poet.count }}首</text>
              </view>
            </view>
            <text class="random-share" @click="sharePoet(poet.name)">分享</text>
          </view>
        </view>
      </view>

      <!-- Poets by Dynasty -->
      <view v-for="g in poetsByDynasty" :key="g.dynasty" class="section">
        <view class="section-header">
          <view class="section-dot" :style="{ backgroundColor: g.color }"></view>
          <text class="section-title">{{ g.dynasty }}（{{ g.poets.length }}位诗人）</text>
        </view>
        <view class="poet-grid">
          <view
            v-for="poet in g.poets"
            :key="poet.name"
            class="poet-card"
            @click="openPoet(poet.name)"
          >
            <text class="poet-name">{{ poet.name }}</text>
            <text class="poet-count">{{ poet.count }}首</text>
            <text v-if="poetBios[poet.name]" class="poet-bio">{{ poetBios[poet.name] }}</text>
          </view>
        </view>
        <view v-if="g.poets.length === 0" class="empty">暂无诗人</view>
      </view>

      <!-- Search results inline -->
      <view v-if="searchQuery && filteredPoems.length > 0 && filteredPoems.length < poemsIndex.length" class="section">
        <view class="section-header">
          <text class="section-title">搜索结果（{{ filteredPoems.length }}首）</text>
        </view>
        <view class="search-list">
          <view
            v-for="p in filteredPoems"
            :key="p.id"
            class="search-item"
            @click="openSearchResult(p)"
          >
            <view class="search-item-info">
              <text class="search-item-title">{{ p.title }}</text>
              <text class="search-item-meta">{{ p.author }} · {{ p.dynasty }}</text>
            </view>
            <text class="search-item-tag" :style="{ color: categoryColors[p.category], borderColor: categoryColors[p.category] }">{{ p.dynasty }}</text>
          </view>
        </view>
      </view>

      <view v-if="poetsByDynasty.length === 0" class="empty" style="padding: 80rpx">
        <text>没有找到匹配的诗人</text>
      </view>
    </view>
    <ScrollToTop />
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.hero {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  padding: 24rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #fde68a;
}
.hero-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.hero-left { display: flex; flex-direction: column; gap: 6rpx; }
.hero-title { font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-desc { font-size: 26rpx; color: #64748b; }
.hero-quote { text-align: right; max-width: 50%; }
.quote-text { font-size: 30rpx; font-weight: 700; color: #d97706; display: block; }
.quote-source { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; display: block; }
.quote-main { flex: 1; }
.quote-actions { display: flex; gap: 12rpx; margin-top: 8rpx; justify-content: flex-end; }
.quote-shuffle, .quote-share {
  font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 8rpx;
  flex-shrink: 0;
}
.quote-shuffle { color: #d97706; background: #fef3c7; }
.quote-share { color: #2563eb; background: #eff6ff; }

.search-bar { margin-bottom: 16rpx; }
.search-input {
  width: 100%; padding: 20rpx 24rpx; background: white; border-radius: 16rpx;
  font-size: 26rpx; color: #0f172a; border: 1rpx solid #fde68a; box-sizing: border-box;
}

.tags-scroll { white-space: nowrap; }
.tags { display: flex; gap: 12rpx; padding: 4rpx 0; }
.tag {
  padding: 10rpx 24rpx; border-radius: 12rpx; font-size: 24rpx;
  font-weight: 500; border: 2rpx solid #e2e8f0; background: white; color: #475569;
  flex-shrink: 0;
}
.tag-active { background: #d97706; color: white; border-color: #d97706; }

.content { padding: 24rpx 32rpx 40rpx; }
.section { margin-bottom: 32rpx; }
.section-header { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.section-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.section-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }

.poet-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.poet-card {
  width: calc(50% - 6rpx); background: white; border-radius: 16rpx;
  padding: 20rpx; border: 1rpx solid #e2e8f0;
}
.poet-name { font-size: 26rpx; font-weight: 700; color: #0f172a; display: block; }
.poet-count { font-size: 22rpx; color: #64748b; margin-left: 6rpx; font-weight: 400; display: block; }
.poet-bio { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; display: block; }

.search-list { display: flex; flex-direction: column; gap: 8rpx; }
.search-item {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border-radius: 16rpx; padding: 20rpx 24rpx;
  border: 1rpx solid #e2e8f0;
}
.search-item-info { flex: 1; min-width: 0; }
.search-item-title { font-size: 26rpx; font-weight: 600; color: #0f172a; display: block; margin-bottom: 4rpx; }
.search-item-meta { font-size: 22rpx; color: #94a3b8; }
.search-item-tag {
  font-size: 20rpx; font-weight: 500; padding: 4rpx 14rpx; border-radius: 10rpx;
  border: 1rpx solid; flex-shrink: 0; margin-left: 16rpx;
}
.empty { text-align: center; color: #94a3b8; font-size: 24rpx; }

/* Random Recommendations */
.random-section { margin-bottom: 24rpx; }
.random-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.random-card {
  width: calc(50% - 6rpx); background: white; border-radius: 16rpx;
  padding: 16rpx 20rpx; border: 1rpx solid #e2e8f0;
  display: flex; align-items: center; justify-content: space-between;
}
.random-card-main { display: flex; align-items: center; gap: 16rpx; flex: 1; min-width: 0; }
.random-share {
  font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx;
  color: #2563eb; background: #eff6ff; flex-shrink: 0;
}
.random-hover { border-color: #fde68a; background: #fffbeb; }
.random-avatar {
  width: 56rpx; height: 56rpx; border-radius: 14rpx;
  background: #fef3c7; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; flex-shrink: 0;
}
.random-info { display: flex; flex-direction: column; gap: 4rpx; }
.random-name { font-size: 26rpx; font-weight: 700; color: #0f172a; }
.random-count { font-size: 22rpx; color: #94a3b8; }
</style>
