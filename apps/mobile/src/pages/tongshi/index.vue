<script setup lang="ts">
import { ref, computed } from 'vue'
import { knowledgeIndex as topicIndex, categories, categoryColors, dailyQuotes, type TopicMeta } from './data'
import { shareContent } from '@/utils/native'
import ScrollToTop from '@/components/ScrollToTop.vue'

const activeCategory = ref('全部')
const searchQuery = ref('')
const daily = ref(dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)])

function shareDaily() {
  shareContent({
    title: '通识金句',
    text: `${daily.value.text}\n—— ${daily.value.source}`,
  })
}

const filteredTopics = computed(() => {
  let list = topicIndex
  if (activeCategory.value !== '全部') list = list.filter(t => t.category === activeCategory.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => t.title.includes(q) || t.tags.some(tag => tag.includes(q)))
  }
  return list
})

// Random recommendations
const randomTopics = computed(() => {
  const shuffled = [...topicIndex].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
})

const categoriesWithTopics = computed(() => {
  const cats = activeCategory.value === '全部' ? categories : [activeCategory.value]
  return cats.map(cat => ({
    category: cat,
    color: categoryColors[cat] || '#64748b',
    items: filteredTopics.value.filter(t => t.category === cat)
  })).filter(g => g.items.length > 0)
})

function shareTopic(t: TopicMeta) {
  shareContent({
    title: t.title,
    text: t.summary,
  })
}

function openTopic(t: TopicMeta) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(t.title)}&url=${encodeURIComponent('https://xuetongshi.grandand.com/#' + t.id)}`
  })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero-row">
        <view class="hero-left">
          <text class="hero-title">学通识</text>
          <text class="hero-desc">天文地理，万物百科</text>
        </view>
        <view class="hero-quote">
          <text class="quote-text">{{ daily.value.text }}</text>
          <text class="quote-source">—— {{ daily.value.source }}</text>
          <text class="quote-share" @click="shareDaily">分享</text>
        </view>
      </view>
      <view class="search-bar">
        <input v-model="searchQuery" class="search-input" placeholder="搜索主题或关键词" placeholder-style="color: #94a3b8" />
      </view>
      <scroll-view class="tags-scroll" scroll-x enable-flex>
        <view class="tags">
          <view v-for="cat in ['全部', ...categories]" :key="cat" class="tag" :class="activeCategory === cat ? 'tag-active' : ''" @click="activeCategory = cat">
            <text>{{ cat }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="content">
      <!-- Random Recommendations -->
      <view v-if="activeCategory === '全部' && !searchQuery" class="recommend-section">
        <view class="section-header">
          <text class="section-title">🔭 探索推荐</text>
        </view>
        <scroll-view class="recommend-scroll" scroll-x enable-flex>
          <view
            v-for="t in randomTopics"
            :key="t.id"
            class="recommend-card"
            @click="openTopic(t)"
            hover-class="recommend-hover"
          >
            <view class="recommend-top" style="background: #06b6d418;">🔭</view>
            <text class="recommend-title">{{ t.title }}</text>
            <text class="recommend-summary">{{ t.summary }}</text>
          </view>
        </scroll-view>
      </view>

      <view v-for="g in categoriesWithTopics" :key="g.category" class="section">
        <view class="section-header">
          <view class="section-dot" :style="{ backgroundColor: g.color }"></view>
          <text class="section-title">{{ g.category }}（{{ g.items.length }}）</text>
        </view>
        <view class="topic-grid">
          <view v-for="t in g.items" :key="t.id" class="topic-card" @click="openTopic(t)">
            <view class="card-top" :style="{ backgroundColor: g.color + '18' }">🔭</view>
            <text class="card-title">{{ t.title }}</text>
            <text class="card-summary">{{ t.summary }}</text>
          </view>
        </view>
        <view v-if="g.items.length === 0" class="empty">暂无内容</view>
      </view>

      <view v-if="categoriesWithTopics.length === 0" class="empty" style="padding: 80rpx">
        <text>没有找到匹配的内容</text>
      </view>
    </view>
    <ScrollToTop />
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.hero {
  background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
  padding: 24rpx 32rpx 20rpx; border-bottom: 1rpx solid #a5f3fc;
}
.hero-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.hero-left { display: flex; flex-direction: column; gap: 6rpx; }
.hero-title { font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-desc { font-size: 26rpx; color: #64748b; }
.hero-quote { text-align: right; max-width: 55%; }
.quote-text { font-size: 28rpx; font-weight: 700; color: #0891b2; display: block; }
.quote-source { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; display: block; }
.quote-share { font-size: 20rpx; color: #2563eb; padding: 4rpx 14rpx; background: #eff6ff; border-radius: 8rpx; display: inline-block; margin-top: 6rpx; }
.search-bar { margin-bottom: 16rpx; }
.search-input { width: 100%; padding: 20rpx 24rpx; background: white; border-radius: 16rpx; font-size: 26rpx; color: #0f172a; border: 1rpx solid #a5f3fc; box-sizing: border-box; }
.tags-scroll { white-space: nowrap; }
.tags { display: flex; gap: 12rpx; padding: 4rpx 0; }
.tag { padding: 10rpx 24rpx; border-radius: 12rpx; font-size: 24rpx; font-weight: 500; border: 2rpx solid #e2e8f0; background: white; color: #475569; flex-shrink: 0; }
.tag-active { background: #0891b2; color: white; border-color: #0891b2; }
.content { padding: 24rpx 32rpx 40rpx; }
.section { margin-bottom: 32rpx; }
.section-header { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.section-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.section-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }
.topic-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.topic-card { width: calc(50% - 8rpx); background: white; border-radius: 20rpx; padding: 24rpx; border: 1rpx solid #e2e8f0; }
.card-top { font-size: 36rpx; margin-bottom: 12rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8rpx; }
.card-summary { font-size: 22rpx; color: #94a3b8; line-height: 1.5; }
.empty { text-align: center; color: #94a3b8; font-size: 24rpx; }

/* Random Recommendations */
.recommend-section { margin-bottom: 24rpx; }
.recommend-scroll { white-space: nowrap; padding: 4rpx 0; }
.recommend-card {
  display: inline-flex; flex-direction: column; align-items: flex-start;
  background: white; border-radius: 20rpx; padding: 24rpx;
  border: 1rpx solid #e2e8f0; margin-right: 16rpx; width: 240rpx;
}
.recommend-hover { border-color: #a5f3fc; background: #ecfeff; }
.recommend-top {
  width: 56rpx; height: 56rpx; border-radius: 14rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; margin-bottom: 12rpx;
}
.recommend-title { font-size: 26rpx; font-weight: 700; color: #0f172a; display: block; margin-bottom: 6rpx; }
.recommend-summary { font-size: 22rpx; color: #94a3b8; line-height: 1.4; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
</style>
