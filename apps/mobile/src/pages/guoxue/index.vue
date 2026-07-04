<script setup lang="ts">
import { ref, computed } from 'vue'
import { classicIndex, categories, categoryColors, type ClassicMeta } from './data'
import { shareContent } from '@/utils/native'
import ScrollToTop from '@/components/ScrollToTop.vue'

const activeCategory = ref('全部')
const searchQuery = ref('')
const dailyQuotes = [
  { text: '学而时习之，不亦说乎', source: '《论语》' },
  { text: '温故而知新，可以为师矣', source: '《论语》' },
  { text: '千里之行，始于足下', source: '《道德经》' },
  { text: '玉不琢，不成器；人不学，不知义', source: '《三字经》' },
  { text: '上善若水', source: '《道德经》' },
]
const daily = ref(dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)])

function shuffleDaily() {
  daily.value = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]
}

function shareDaily() {
  shareContent({
    title: '每日金句',
    text: `${daily.value.text}\n—— ${daily.value.source}`,
  })
}

const filteredClassics = computed(() => {
  let list = classicIndex
  if (activeCategory.value !== '全部') list = list.filter(c => c.category === activeCategory.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.title.includes(q) || c.author.includes(q) || c.tags.some(t => t.includes(q)))
  }
  return list
})

const categoriesWithClassics = computed(() => {
  const cats = activeCategory.value === '全部' ? categories : [activeCategory.value]
  return cats.map(cat => ({
    category: cat,
    color: categoryColors[cat] || '#64748b',
    items: filteredClassics.value.filter(c => c.category === cat)
  })).filter(g => g.items.length > 0)
})

// Random recommendations
const randomClassics = computed(() => {
  const shuffled = [...classicIndex].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
})

function openClassic(c: ClassicMeta) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(c.title)}&url=${encodeURIComponent('https://xueguoxue.grandand.com/#' + c.id)}`
  })
}
</script>

<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-row">
        <view class="hero-left">
          <text class="hero-title">学国学</text>
          <text class="hero-desc">经典启蒙，明智修身</text>
        </view>
        <view class="hero-quote">
          <view @click="shuffleDaily">
            <text class="quote-text">{{ daily.value.text }}</text>
            <text class="quote-source">—— {{ daily.value.source }}</text>
          </view>
          <view class="quote-actions">
            <text class="quote-shuffle" @click="shuffleDaily">换一句</text>
            <text class="quote-share" @click="shareDaily">分享</text>
          </view>
        </view>
      </view>
      <!-- Search -->
      <view class="search-bar">
        <input v-model="searchQuery" class="search-input" placeholder="搜索书名、作者或标签" placeholder-style="color: #94a3b8" />
      </view>
      <!-- Category Tags -->
      <scroll-view class="tags-scroll" scroll-x enable-flex>
        <view class="tags">
          <view
            v-for="cat in ['全部', ...categories]"
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

    <!-- Random Classics -->
    <view class="content">
      <view v-if="activeCategory === '全部' && !searchQuery" class="recommend-section">
        <view class="section-header">
          <text class="section-title">📖 随机推荐</text>
        </view>
        <scroll-view class="recommend-scroll" scroll-x enable-flex>
          <view
            v-for="c in randomClassics"
            :key="c.id"
            class="recommend-card"
            @click="openClassic(c)"
            hover-class="recommend-hover"
          >
            <view class="recommend-top" :style="{ backgroundColor: categoryColors[c.category] + '18' }">📖</view>
            <text class="recommend-title">{{ c.title }}</text>
            <text class="recommend-author">{{ c.author }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- Classics by Category -->
      <view v-for="g in categoriesWithClassics" :key="g.category" class="section">
        <view class="section-header">
          <view class="section-dot" :style="{ backgroundColor: g.color }"></view>
          <text class="section-title">{{ g.category }}（{{ g.items.length }}）</text>
        </view>
        <view class="classic-grid">
          <view
            v-for="c in g.items"
            :key="c.id"
            class="classic-card"
            @click="openClassic(c)"
          >
            <view class="card-top" :style="{ backgroundColor: g.color + '18' }">
              <text class="card-emoji">📖</text>
            </view>
            <text class="card-title">{{ c.title }}</text>
            <text class="card-author">{{ c.author }} · {{ c.dynasty }}</text>
            <text class="card-cat" :style="{ backgroundColor: g.color + '18', color: g.color }">{{ c.category }}</text>
            <text class="card-summary">{{ c.summary }}</text>
          </view>
        </view>
        <view v-if="g.items.length === 0" class="empty">暂无典籍</view>
      </view>

      <!-- Search results inline -->
      <view v-if="searchQuery && filteredClassics.length > 0 && filteredClassics.length < classicIndex.length" class="section">
        <view class="section-header">
          <text class="section-title">搜索结果（{{ filteredClassics.length }}部）</text>
        </view>
        <view class="search-list">
          <view
            v-for="c in filteredClassics"
            :key="c.id"
            class="search-item"
            @click="openClassic(c)"
          >
            <view class="search-item-info">
              <text class="search-item-title">{{ c.title }}</text>
              <text class="search-item-meta">{{ c.author }} · {{ c.dynasty }}</text>
            </view>
            <text class="search-item-tag" :style="{ color: categoryColors[c.category], borderColor: categoryColors[c.category] }">{{ c.category }}</text>
          </view>
        </view>
      </view>

      <view v-if="categoriesWithClassics.length === 0" class="empty" style="padding: 80rpx">
        <text>没有找到匹配的典籍</text>
      </view>
    </view>
    <ScrollToTop />
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.hero {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  padding: 24rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #bbf7d0;
}
.hero-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.hero-left { display: flex; flex-direction: column; gap: 6rpx; }
.hero-title { font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-desc { font-size: 26rpx; color: #64748b; }
.hero-quote { text-align: right; max-width: 55%; }
.quote-text { font-size: 28rpx; font-weight: 700; color: #16a34a; display: block; line-height: 1.4; }
.quote-source { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; display: block; }
.quote-actions { display: flex; gap: 12rpx; margin-top: 8rpx; justify-content: flex-end; }
.quote-shuffle, .quote-share { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 8rpx; flex-shrink: 0; }
.quote-shuffle { color: #16a34a; background: #f0fdf4; }
.quote-share { color: #2563eb; background: #eff6ff; }

.search-bar { margin-bottom: 16rpx; }
.search-input {
  width: 100%; padding: 20rpx 24rpx; background: white; border-radius: 16rpx;
  font-size: 26rpx; color: #0f172a; border: 1rpx solid #bbf7d0; box-sizing: border-box;
}

.tags-scroll { white-space: nowrap; }
.tags { display: flex; gap: 12rpx; padding: 4rpx 0; }
.tag {
  padding: 10rpx 24rpx; border-radius: 12rpx; font-size: 24rpx;
  font-weight: 500; border: 2rpx solid #e2e8f0; background: white; color: #475569;
  flex-shrink: 0;
}
.tag-active { background: #16a34a; color: white; border-color: #16a34a; }

.content { padding: 24rpx 32rpx 40rpx; }
.section { margin-bottom: 32rpx; }
.section-header { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.section-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.section-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }

.classic-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.classic-card {
  width: calc(50% - 8rpx); background: white; border-radius: 20rpx;
  padding: 24rpx; border: 1rpx solid #e2e8f0; display: flex; flex-direction: column;
}
.card-top {
  width: 64rpx; height: 64rpx; border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 12rpx;
}
.card-emoji { font-size: 32rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: #0f172a; margin-bottom: 4rpx; }
.card-author { font-size: 22rpx; color: #64748b; margin-bottom: 8rpx; }
.card-cat {
  font-size: 20rpx; font-weight: 500; padding: 4rpx 14rpx; border-radius: 8rpx;
  align-self: flex-start; margin-bottom: 8rpx;
}
.card-summary { font-size: 22rpx; color: #94a3b8; line-height: 1.5; }

.search-list { display: flex; flex-direction: column; gap: 8rpx; }
.search-item { display: flex; align-items: center; justify-content: space-between; background: white; border-radius: 16rpx; padding: 20rpx 24rpx; border: 1rpx solid #e2e8f0; }
.search-item-info { flex: 1; min-width: 0; }
.search-item-title { font-size: 26rpx; font-weight: 600; color: #0f172a; display: block; margin-bottom: 4rpx; }
.search-item-meta { font-size: 22rpx; color: #94a3b8; }
.search-item-tag { font-size: 20rpx; font-weight: 500; padding: 4rpx 14rpx; border-radius: 10rpx; border: 1rpx solid; flex-shrink: 0; margin-left: 16rpx; }
.empty { text-align: center; color: #94a3b8; font-size: 24rpx; }

/* Random Recommendations */
.recommend-section { margin-bottom: 24rpx; }
.recommend-scroll { white-space: nowrap; padding: 4rpx 0; }
.recommend-card {
  display: inline-flex; flex-direction: column; align-items: center;
  background: white; border-radius: 20rpx; padding: 24rpx;
  border: 1rpx solid #e2e8f0; margin-right: 16rpx; width: 200rpx;
}
.recommend-hover { border-color: #bbf7d0; background: #f0fdf4; }
.recommend-top {
  width: 56rpx; height: 56rpx; border-radius: 14rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; margin-bottom: 12rpx;
}
.recommend-title {
  font-size: 26rpx; font-weight: 700; color: #0f172a;
  display: block; margin-bottom: 4rpx; text-align: center;
  overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.recommend-author { font-size: 22rpx; color: #94a3b8; display: block; }
</style>
