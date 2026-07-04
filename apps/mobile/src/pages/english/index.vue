<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { WORLDS, GRADES } from './data'
import { shareContent } from '@/utils/native'

const totalWords = 3000
const currentGrade = ref(0)
const showHowToPlay = ref(true)

const gradeWorlds = [
  WORLDS.filter(w => w.grade === 1),
  WORLDS.filter(w => w.grade === 2),
  WORLDS.filter(w => w.grade === 3),
]

onMounted(() => {
  // Auto-hide how-to-play after 5 seconds on first visit
  const seen = uni.getStorageSync('grandkidsgo_english_hint')
  if (seen) showHowToPlay.value = false
})

function dismissHint() {
  showHowToPlay.value = false
  uni.setStorageSync('grandkidsgo_english_hint', '1')
}

function openWorld(w: typeof WORLDS[0]) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(w.nameCn)}&url=${encodeURIComponent('https://english.grandand.com/')}`
  })
}

function shareEnglish() {
  shareContent({
    title: '学英语 - 童慧行',
    text: `趣味单词，自然拼读 · ${totalWords}单词`,
  })
}

function startFirstWorld() {
  const firstWorld = WORLDS.find(w => w.grade === 1)
  if (firstWorld) openWorld(firstWorld)
}
</script>

<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-left">
        <text class="hero-title">学英语</text>
        <text class="hero-desc">趣味单词，自然拼读</text>
      </view>
      <view class="hero-stats" @click="shareEnglish">
        <text class="hero-stat-num">{{ totalWords }}</text>
        <text class="hero-stat-lbl">单词量</text>
        <text class="hero-share">分享</text>
      </view>
    </view>

    <!-- Start CTA -->
    <view class="cta-section" @click="startFirstWorld">
      <view class="cta-content">
        <text class="cta-icon">🚀</text>
        <view class="cta-texts">
          <text class="cta-title">开始闯关</text>
          <text class="cta-desc">从动物世界开始你的冒险</text>
        </view>
      </view>
      <text class="cta-arrow">›</text>
    </view>

    <!-- How to Play Hint -->
    <view class="hint-banner" v-if="showHowToPlay">
      <view class="hint-content">
        <text class="hint-title">🎯 如何学习</text>
        <view class="hint-steps">
          <text class="hint-step">1. 选择关卡主题</text>
          <text class="hint-step">2. 看图学单词</text>
          <text class="hint-step">3. 拼写挑战巩固</text>
          <text class="hint-step">4. 闯关解锁新内容</text>
        </view>
      </view>
      <text class="hint-close" @click="dismissHint">知道了 ✕</text>
    </view>

    <!-- Grade levels -->
    <view class="grades">
      <view v-for="(grade, gi) in GRADES" :key="grade" class="grade-section" :class="gi === currentGrade ? 'grade-expanded' : ''">
        <view class="grade-header" @click="currentGrade = gi === currentGrade ? -1 : gi">
          <text class="grade-title">⭐ {{ grade }}</text>
          <text class="grade-arrow" :class="gi === currentGrade ? 'grade-arrow-up' : ''">›</text>
        </view>
        <scroll-view
          v-if="gi === currentGrade"
          class="grade-worlds"
          scroll-x
          enable-flex
          :show-scrollbar="false"
        >
          <view
            v-for="w in gradeWorlds[gi]"
            :key="w.id"
            class="world-card"
            @click="openWorld(w)"
            hover-class="world-hover"
          >
            <view class="world-visual" :style="{ backgroundColor: w.color + '18' }">
              <text class="world-emoji">{{ w.visual }}</text>
            </view>
            <text class="world-name">{{ w.nameCn }}</text>
            <text class="world-theme">{{ w.theme }}</text>
            <view class="world-stages">
              <text v-for="s in w.stages" :key="s" class="stage-dot" :style="{ backgroundColor: w.color }"></text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="center-tip">
      <text class="tip-text">🎮 在游戏中学习，点击关卡开始冒险</text>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

/* Hero */
.hero {
  background: linear-gradient(135deg, #fdf2ff 0%, #fce7f3 100%);
  padding: 32rpx 32rpx; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1rpx solid #fbcfe8;
}
.hero-left { display: flex; flex-direction: column; gap: 6rpx; }
.hero-title { font-size: 40rpx; font-weight: 800; color: #0f172a; }
.hero-desc { font-size: 26rpx; color: #64748b; }
.hero-stats { text-align: center; }
.hero-stat-num { font-size: 44rpx; font-weight: 800; color: #ec4899; display: block; }
.hero-stat-lbl { font-size: 22rpx; color: #94a3b8; }
.hero-share { font-size: 20rpx; color: #ec4899; margin-top: 4rpx; display: block; }

/* CTA */
.cta-section {
  margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fdf2ff 0%, #fce7f3 100%);
  border-radius: 20rpx; padding: 28rpx 28rpx;
  display: flex; align-items: center; justify-content: space-between;
  border: 1rpx solid #fbcfe8;
}
.cta-content { display: flex; align-items: center; gap: 16rpx; }
.cta-icon { font-size: 40rpx; }
.cta-texts { display: flex; flex-direction: column; }
.cta-title { font-size: 28rpx; font-weight: 700; color: #9d174d; }
.cta-desc { font-size: 22rpx; color: #ec4899; margin-top: 2rpx; }
.cta-arrow { font-size: 36rpx; color: #f9a8d4; }

/* Hint Banner */
.hint-banner {
  margin: 16rpx 24rpx 0; background: white; border-radius: 18rpx;
  padding: 24rpx; border: 1rpx solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: flex-start;
}
.hint-content { flex: 1; }
.hint-title { font-size: 26rpx; font-weight: 700; color: #0f172a; display: block; margin-bottom: 12rpx; }
.hint-steps { display: flex; flex-direction: column; gap: 8rpx; }
.hint-step { font-size: 24rpx; color: #64748b; }
.hint-close { font-size: 22rpx; color: #94a3b8; flex-shrink: 0; padding: 4rpx 12rpx; }

/* Grades */
.grades { padding: 24rpx 0 0; }
.grade-section { margin-bottom: 8rpx; }
.grade-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 32rpx; cursor: pointer;
}
.grade-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }
.grade-arrow { font-size: 32rpx; color: #cbd5e1; transition: transform 0.2s; }
.grade-arrow-up { transform: rotate(90deg); }
.grade-worlds { white-space: nowrap; padding: 0 24rpx 16rpx; }
.world-card {
  display: inline-flex; flex-direction: column; align-items: center;
  background: white; border-radius: 24rpx; padding: 28rpx 24rpx;
  border: 1rpx solid #e2e8f0; margin-right: 20rpx; width: 240rpx;
}
.world-hover { opacity: 0.9; transform: scale(0.97); }
.world-visual {
  width: 80rpx; height: 80rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx;
}
.world-emoji { font-size: 40rpx; }
.world-name { font-size: 28rpx; font-weight: 700; color: #0f172a; margin-bottom: 4rpx; }
.world-theme { font-size: 22rpx; color: #94a3b8; margin-bottom: 12rpx; }
.world-stages { display: flex; gap: 6rpx; }
.stage-dot { width: 14rpx; height: 14rpx; border-radius: 50%; }

.center-tip { text-align: center; padding: 40rpx 32rpx 60rpx; }
.tip-text { font-size: 24rpx; color: #94a3b8; }
</style>
