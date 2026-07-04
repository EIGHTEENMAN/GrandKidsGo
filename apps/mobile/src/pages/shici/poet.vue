<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { poemsIndex, categoryColors, poetBios } from './data'
import { shareContent } from '@/utils/native'

const poetName = ref('')
const activeDynasty = ref('')

onLoad((params) => {
  poetName.value = params?.name || ''
  activeDynasty.value = params?.dynasty || '全部'
})

const poetPoems = computed(() => {
  return poemsIndex.filter(p => p.author === poetName.value)
})

const poetInfo = computed(() => {
  const first = poetPoems.value[0]
  return {
    dynasty: first?.dynasty || '',
    category: first?.category || '',
    count: poetPoems.value.length,
    bio: poetBios[poetName.value] || '',
  }
})

const dynastyColor = computed(() => categoryColors[poetInfo.value.category] || '#f59e0b')

function openPoem(poem: typeof poemsIndex[0]) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(poem.title)}&url=${encodeURIComponent('https://xueshici.grandand.com/#' + poem.id)}`
  })
}

function sharePoet() {
  shareContent({
    title: poetName.value,
    text: `${poetInfo.value.dynasty}诗人 · ${poetInfo.value.count}首作品`,
  })
}

function sharePoem(poem: typeof poemsIndex[0]) {
  shareContent({
    title: poem.title,
    text: `${poem.author} · ${poem.dynasty}`,
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text>‹</text>
      </view>
      <text class="header-title">诗人详情</text>
      <text class="header-share" @click="sharePoet">分享</text>
    </view>

    <!-- Poet Info -->
    <view class="poet-header" :style="{ borderColor: dynastyColor + '30' }">
      <view class="poet-avatar" :style="{ background: dynastyColor + '18' }">
        <text class="poet-avatar-text">📜</text>
      </view>
      <view class="poet-info">
        <text class="poet-name">{{ poetName }}</text>
        <view class="poet-tags">
          <text class="poet-tag" :style="{ background: dynastyColor + '18', color: dynastyColor }">{{ poetInfo.dynasty }}</text>
          <text class="poet-tag poet-count-tag">{{ poetInfo.count }}首作品</text>
        </view>
        <text v-if="poetInfo.bio" class="poet-bio">{{ poetInfo.bio }}</text>
      </view>
    </view>

    <!-- Poem List -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">作品列表</text>
        <text class="section-count">{{ poetPoems.length }}首</text>
      </view>
      <view class="poem-list">
        <view
          v-for="p in poetPoems"
          :key="p.id"
          class="poem-item"
          hover-class="poem-hover"
        >
          <view class="poem-item-main" @click="openPoem(p)">
            <view class="poem-info">
              <text class="poem-title">{{ p.title }}</text>
              <text class="poem-preview">{{ p.summary.substring(0, 30) }}{{ p.summary.length > 30 ? '...' : '' }}</text>
            </view>
            <text class="poem-tag" :style="{ color: categoryColors[p.category], borderColor: categoryColors[p.category] }">{{ p.dynasty }}</text>
          </view>
          <text class="poem-share" @click.stop="sharePoem(p)">分享</text>
        </view>
      </view>
      <view v-if="poetPoems.length === 0" class="empty">
        <text class="empty-icon">📭</text>
        <text>暂无作品收录</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }
.header {
  display: flex; align-items: center; padding: 20rpx 24rpx;
  background: white; border-bottom: 1rpx solid #e2e8f0;
}
.back-btn { font-size: 40rpx; color: #64748b; padding: 8rpx 16rpx; margin-right: 16rpx; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #0f172a; }
.header-share { font-size: 24rpx; color: #2563eb; padding: 4rpx 14rpx; background: #eff6ff; border-radius: 8rpx; }

/* Poet Header */
.poet-header {
  display: flex; align-items: flex-start; gap: 20rpx;
  margin: 24rpx 24rpx 0; background: white; border-radius: 24rpx;
  padding: 28rpx 28rpx; border: 1rpx solid #e2e8f0;
}
.poet-avatar {
  width: 80rpx; height: 80rpx; border-radius: 20rpx;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.poet-avatar-text { font-size: 40rpx; }
.poet-info { flex: 1; }
.poet-name { font-size: 34rpx; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8rpx; }
.poet-tags { display: flex; gap: 8rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.poet-tag {
  font-size: 22rpx; font-weight: 500; padding: 4rpx 14rpx; border-radius: 8rpx;
}
.poet-count-tag { background: #f1f5f9; color: #64748b; }
.poet-bio { font-size: 24rpx; color: #64748b; line-height: 1.6; display: block; }

/* Section */
.section { margin: 24rpx 24rpx 40rpx; }
.section-header {
  display: flex; align-items: center; gap: 8rpx;
  margin-bottom: 16rpx; padding: 0 4rpx;
}
.section-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }
.section-count { font-size: 22rpx; color: #94a3b8; }

/* Poem List */
.poem-list { display: flex; flex-direction: column; gap: 10rpx; }
.poem-item {
  display: flex; align-items: center;
  background: white; border-radius: 18rpx; padding: 16rpx 20rpx;
  border: 1rpx solid #e2e8f0; transition: all 0.15s;
}
.poem-item-main { display: flex; align-items: center; flex: 1; min-width: 0; gap: 12rpx; }
.poem-share { font-size: 20rpx; color: #2563eb; padding: 4rpx 10rpx; background: #eff6ff; border-radius: 8rpx; flex-shrink: 0; }
.poem-hover {
  border-color: #fde68a; background: #fffbeb;
}
.poem-info { flex: 1; min-width: 0; }
.poem-title { font-size: 28rpx; font-weight: 600; color: #0f172a; display: block; margin-bottom: 6rpx; }
.poem-preview { font-size: 22rpx; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poem-tag {
  font-size: 20rpx; font-weight: 500; padding: 4rpx 14rpx; border-radius: 10rpx;
  border: 1rpx solid; flex-shrink: 0; margin-left: 16rpx;
}

/* Empty */
.empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 12rpx; padding: 60rpx 40rpx; color: #94a3b8; font-size: 24rpx;
}
.empty-icon { font-size: 48rpx; }
</style>
