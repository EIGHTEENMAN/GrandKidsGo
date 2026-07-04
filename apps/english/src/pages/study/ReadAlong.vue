<script setup lang="ts">
import { ref, computed } from 'vue'
import { words } from '../../data/words'
import { studyStore } from '../../stores/studyStore'
import { playWordAudio } from '../../utils/audio'
import { startListening, stopListening, isSpeechSupported } from '../../utils/speech'
import { router } from '../../router'

const recording = ref(false)
const currentIndex = ref(0)
const feedback = ref<'good' | 'try-again' | null>(null)

// 取最近学习的单词作为跟读素材
const reviewWords = computed(() => {
  const last = studyStore.lastSession
  if (!last) {
    // 没最近学习 → 用第 1 关第 1 个主题的前 6 词
    return words.slice(0, 6)
  }
  return last.words.map((w, i) => {
    const entry = words.find(x => x.word.toLowerCase() === w)
    return entry || { word: w, meaning: last.wordMeanings[i] || '', phonetic: '', sentence: '', sentenceCn: '' }
  })
})

const currentWord = computed(() => reviewWords.value[currentIndex.value])
const isComplete = computed(() => currentIndex.value >= reviewWords.value.length)
const progress = computed(() => {
  if (reviewWords.value.length === 0) return 0
  return (currentIndex.value / reviewWords.value.length) * 100
})

function playWord() {
  if (currentWord.value) playWordAudio(currentWord.value.word.toLowerCase())
}

async function record() {
  if (!isSpeechSupported()) {
    feedback.value = 'try-again'
    return
  }
  recording.value = true
  try {
    const target = currentWord.value.word.toLowerCase()
    const ok = await startListening(target)
    feedback.value = ok ? 'good' : 'try-again'
    if (ok) {
      setTimeout(() => {
        feedback.value = null
        currentIndex.value++
      }, 1200)
    } else {
      setTimeout(() => { feedback.value = null }, 1500)
    }
  } finally {
    recording.value = false
    stopListening()
  }
}

function next() {
  feedback.value = null
  currentIndex.value++
}

function back() {
  // 返回到 StudyHub（不是学英语首页 3 大卡）
  window.location.hash = '#/study/__hub__'
}

function restart() {
  currentIndex.value = 0
  feedback.value = null
}
</script>

<template>
  <div class="readalong-page">
    <header class="header">
      <button class="back-btn" @click="back">← 返回</button>
      <h1 class="title">跟读复习</h1>
      <p class="subtitle">跟读最近学过的 {{ reviewWords.length }} 个单词</p>
    </header>

    <!-- 进度条 -->
    <div class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-text">{{ currentIndex + 1 }} / {{ reviewWords.length }}</div>
    </div>

    <!-- 主卡片 -->
    <div v-if="!isComplete && currentWord" class="word-card">
      <div class="word-big">{{ currentWord.word }}</div>
      <div class="word-phonetic">{{ currentWord.phonetic }}</div>
      <div class="word-meaning">{{ currentWord.meaning }}</div>
    </div>

    <!-- 完成态 -->
    <div v-if="isComplete" class="complete-card">
      <h2 class="complete-title">本课完成！</h2>
      <p class="complete-desc">你复习了 {{ reviewWords.length }} 个单词</p>
      <div class="complete-actions">
        <button class="action-btn action-btn--primary" @click="restart">再复习一次</button>
        <button class="action-btn" @click="back">回到首页</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!isComplete" class="actions">
      <button class="action-btn action-btn--orange" @click="playWord">听原声</button>
      <button
        class="record-btn"
        :class="{ 'record-btn--recording': recording, 'record-btn--good': feedback === 'good' }"
        @click="record"
        :disabled="recording"
      >
        {{ recording ? '正在录音...' : (feedback === 'good' ? '太棒了！' : '开始跟读') }}
      </button>
      <button class="action-btn" @click="next">跳过</button>
    </div>

    <p v-if="feedback === 'try-again'" class="feedback feedback--wrong">
      没听清，再试一次
    </p>
  </div>
</template>

<style scoped>
.readalong-page {
  padding: var(--gap-md) 0 var(--gap-xl);
}

.header {
  margin-bottom: var(--gap-lg);
}

.back-btn {
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-primary);
  font-size: var(--text-body);
  font-weight: 600;
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-md);
}

.title {
  font-size: var(--text-title);
  color: var(--color-text);
}

.subtitle {
  color: var(--color-text-sub);
}

/* 进度 */
.progress-wrap {
  margin-bottom: var(--gap-lg);
}

.progress-bar {
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-bottom: var(--gap-xs);
}

.progress-fill {
  height: 100%;
  background: var(--color-secondary);
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--color-text-sub);
}

/* 单词卡 */
.word-card {
  text-align: center;
  padding: var(--gap-xl) var(--gap-lg);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--color-primary);
  margin-bottom: var(--gap-lg);
}

.word-big {
  font-family: var(--font-display);
  font-size: var(--text-word-xl);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--gap-sm);
  text-transform: lowercase;
  line-height: 1;
}

.word-phonetic {
  font-size: var(--text-h3);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
}

.word-meaning {
  font-size: var(--text-h2);
  color: var(--color-primary);
  font-weight: 700;
}

/* 操作 */
.actions {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--gap-sm);
  align-items: center;
}

.action-btn {
  padding: 14px 20px;
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
  font-size: var(--text-body);
  font-weight: 600;
  box-shadow: var(--shadow-card);
}

.action-btn--primary {
  background: var(--color-primary);
  color: white;
}

.action-btn--orange {
  background: var(--color-secondary);
  color: white;
}

.action-btn:active,
.record-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.record-btn {
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-tertiary);
  color: white;
  font-size: var(--text-h3);
  font-weight: 700;
  box-shadow: var(--shadow-card);
  transition: all 0.15s;
}

.record-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.record-btn--recording {
  background: var(--color-secondary);
  animation: pulse 1.2s infinite;
}

.record-btn--good {
  background: var(--color-tertiary);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.feedback {
  text-align: center;
  margin-top: var(--gap-md);
  font-size: var(--text-body);
  font-weight: 600;
}

.feedback--wrong {
  color: var(--color-secondary);
}

/* 完成 */
.complete-card {
  text-align: center;
  padding: var(--gap-xl) var(--gap-lg);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--color-tertiary);
}

.complete-title {
  font-size: var(--text-title);
  color: var(--color-tertiary);
  margin-bottom: var(--gap-sm);
}

.complete-desc {
  color: var(--color-text-sub);
  margin-bottom: var(--gap-lg);
}

.complete-actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>