<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { words } from '../../data/words'
import { wordStore } from '../../stores/wordStore'
import { studyStore } from '../../stores/studyStore'
import { playWordAudio, speakSentence, playSentenceAudio, stopAllAudio } from '../../utils/audio'
import { earnPoints } from '@shared/utils/points'

const showPointToast = ref(false)
const pointToastData = ref({ earned: 0, balance: 0 })

async function onSessionComplete() {
  const result = await earnPoints('study_checkin')
  if (result && result.earned > 0) {
    pointToastData.value = result
    showPointToast.value = true
    setTimeout(() => {
      showPointToast.value = false
      window.location.hash = '#/study/__read__'
    }, 2500)
  } else {
    window.location.hash = '#/study/__read__'
  }
}

const props = defineProps<{
  themeId: string
  stage: number
  wordId?: number | null  // 2026-07-01：搜索跳转直接定位到该单词
}>()

const STAGES = 6
const WORDS_PER_STAGE = 8

const themeWords = computed(() => words.filter(w => w.theme === props.themeId))

const sessionWords = computed(() => {
  const start = (props.stage - 1) * WORDS_PER_STAGE
  return themeWords.value.slice(start, start + WORDS_PER_STAGE)
})

const currentIndex = ref(0)
const spellInput = ref('')
const correctCount = ref(0)
const showResult = ref<'correct' | 'wrong' | null>(null)
const hideWord = ref(false)  // 拼写框 focus 时隐藏单词主词+音标，防照抄

const currentWord = computed(() => sessionWords.value[currentIndex.value])

const progress = computed(() => {
  if (sessionWords.value.length === 0) return 0
  return (currentIndex.value / sessionWords.value.length) * 100
})

const isComplete = computed(() => currentIndex.value >= sessionWords.value.length)

// 2026-07-01：如果 URL 带了 wordId，定位到该单词在 sessionWords 里的 index
function locateWordById() {
  if (!props.wordId) return
  const idx = sessionWords.value.findIndex(w => w.id === props.wordId)
  if (idx >= 0) currentIndex.value = idx
}

onMounted(() => {
  // 先定位再开 session，确保 startSession 用的是定位后的当前单词
  locateWordById()
  studyStore.startSession(
    props.themeId,
    themeWords.value[0]?.theme || props.themeId,
    props.stage,
    sessionWords.value.map(w => w.id)
  )
})

onUnmounted(() => {
  if (!isComplete.value) studyStore.cancelSession()
  stopAllAudio()
})

function playAudio() {
  if (currentWord.value) {
    playWordAudio(currentWord.value.word.toLowerCase())
  }
}

function playSentence() {
  if (!currentWord.value) return
  // 优先播预生成的 Edge TTS mp3（en-US-JennyNeural + friendly style）
  // 走 audio.ts 的 playSentenceAudio，自动管理 Audio 池避免 WebMediaPlayer 过多
  // 失败时降级到浏览器 speechSynthesis（由 audio.ts 内部处理）
  const id = currentWord.value.id
  const sentence = currentWord.value.sentence
  playSentenceAudio(id, sentence)
}

function checkSpell() {
  const input = spellInput.value.trim().toLowerCase()
  const target = currentWord.value.word.toLowerCase()
  if (input === target) {
    showResult.value = 'correct'
    wordStore.recordAnswer(currentWord.value.id, currentWord.value.word, currentWord.value.meaning, true)
    studyStore.recordAnswer(true)
    correctCount.value++
    setTimeout(() => next(), 700)
  } else {
    showResult.value = 'wrong'
    wordStore.recordAnswer(currentWord.value.id, currentWord.value.word, currentWord.value.meaning, false)
    studyStore.recordAnswer(false)
    setTimeout(() => {
      showResult.value = null
      spellInput.value = ''
    }, 1100)
  }
}

function next() {
  showResult.value = null
  spellInput.value = ''
  currentIndex.value++
  if (currentIndex.value >= sessionWords.value.length) {
    studyStore.completeSession(
      sessionWords.value.map(w => ({ word: w.word, meaning: w.meaning })),
      correctCount.value
    )
    onSessionComplete()
  }
}

function back() {
  stopAllAudio()
  window.location.hash = `#/study/${props.themeId}`
}

function prev() {
  if (currentIndex.value <= 0) return
  // 上一张不计入成绩（浏览模式）
  showResult.value = null
  spellInput.value = ''
  hideWord.value = false
  currentIndex.value--
}

function nextManual() {
  // 手动下一张：不检查拼写，直接跳过（不算成绩）
  showResult.value = null
  spellInput.value = ''
  currentIndex.value++
  if (currentIndex.value >= sessionWords.value.length) {
    studyStore.completeSession(
      sessionWords.value.map(w => ({ word: w.word, meaning: w.meaning })),
      correctCount.value
    )
    onSessionComplete()
  }
}
</script>

<template>
  <div class="flash-page">
    <!-- 顶栏：返回 + 进度 -->
    <header class="top-bar">
      <button class="back-btn" @click="back">← 退出</button>
      <div class="progress-text">{{ currentIndex + 1 }} / {{ sessionWords.length }}</div>
      <div class="top-spacer"></div>
    </header>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 主区：单词卡（单屏内含例句） -->
    <main class="content" v-if="currentWord">
      <div class="word-card">
        <div class="word-emoji">{{ currentWord.emoji || '📘' }}</div>
        <div class="word-row" :class="{ blurred: hideWord }">
          <h1 class="word-main">{{ hideWord ? '?' : currentWord.word }}</h1>
          <button class="audio-btn" @click="playAudio" title="听发音">🔊</button>
        </div>
        <div class="word-phonetic" v-if="!hideWord">{{ currentWord.phonetic }}</div>
        <div class="word-meaning">{{ currentWord.meaning }}</div>

        <div class="divider"></div>

        <div class="example">
          <div class="example-head">
            <span class="example-label">例句</span>
            <button
              class="example-audio-btn"
              @click="playSentence"
              title="听例句"
            >🔊 听</button>
          </div>
          <div class="example-en">{{ currentWord.sentence }}</div>
          <div class="example-cn">{{ currentWord.sentenceCn }}</div>
        </div>
      </div>
    </main>

    <!-- 底部：拼写输入 -->
    <footer class="bottom-bar">
      <div class="nav-row">
        <button
          class="nav-btn nav-btn--prev"
          :disabled="currentIndex === 0"
          @click="prev"
        >
          ← 上一张
        </button>
        <button
          class="nav-btn nav-btn--next"
          :disabled="currentIndex >= sessionWords.length - 1"
          @click="nextManual"
        >
          下一张 →
        </button>
      </div>
      <div class="spell-wrap">
        <p class="spell-hint">拼写单词</p>
        <div class="spell-row">
          <input
            id="spell-input"
            name="spell"
            v-model="spellInput"
            @keyup.enter="checkSpell"
            @focus="hideWord = true"
            @blur="hideWord = false"
            type="text"
            class="spell-input"
            :class="{
              'spell-input--wrong': showResult === 'wrong',
              'spell-input--correct': showResult === 'correct'
            }"
            :placeholder="`首字母: ${currentWord?.word[0] || ''}`"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            aria-label="拼写输入框"
          />
          <button class="spell-btn" @click="checkSpell">检查</button>
        </div>
        <p v-if="showResult === 'correct'" class="result-text result-text--correct">太棒了！</p>
        <p v-else-if="showResult === 'wrong'" class="result-text result-text--wrong">
          正确: <strong>{{ currentWord?.word }}</strong>
        </p>
      </div>
    </footer>

    <!-- 积分奖励 Toast -->
    <Teleport to="body" v-if="showPointToast">
      <div class="point-toast-overlay">
        <div class="point-toast">
          <div class="point-toast-star">⭐</div>
          <div class="point-toast-text">
            <strong>+{{ pointToastData.earned }} 积分</strong>
            <span>当前 {{ pointToastData.balance }} 分</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 单屏布局：100vh 减去 header 61 + bottomnav 80，flex 三段
   ⚠️ 移动端修复：viewport 高度在小屏幕上不够 → 改用 min-height 让内容自然撑开，
   避免 word-card 被 .bottom-bar 遮挡覆盖 */
.flash-page {
  min-height: calc(100vh - 61px - 80px);
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 var(--gap-md) var(--gap-md);
}

/* 顶栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-sm) 0;
}

.back-btn {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-text-sub);
  font-size: var(--text-small);
  font-weight: 600;
  border: 1px solid var(--color-border);
}

.top-spacer { width: 64px; }

.progress-text {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-primary);
  font-size: var(--text-body);
}

.progress-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-bottom: var(--gap-md);
}

.progress-fill {
  height: 100%;
  background: var(--color-secondary);
  transition: width 0.3s ease;
}

/* 主区：单词卡
   ⚠️ 修复重叠：去掉 align-items: center 强制居中，改用 flex-start + overflow-y: auto，
   让长例句自然撑开页面并可滚动，不再覆盖底部 nav-row/spell-wrap */
.content {
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 0;
  overflow-y: auto;
  /* iOS 安全区 */
  padding-bottom: var(--gap-sm);
}

.word-card {
  width: 100%;
  background: var(--color-card);
  border-radius: var(--radius-md);
  /* 减色：去掉彩色边框和阴影，跟主背景融合更干净 */
  border: 1px solid var(--color-border);
  padding: var(--gap-md) var(--gap-lg);
  text-align: center;
  /* 保证卡片高度自适应内容，不被外部 flex 拉伸/压缩 */
  flex-shrink: 0;
}

.word-emoji {
  font-size: 36px;
  line-height: 1;
  margin-bottom: var(--gap-xs);
}

.word-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  margin-bottom: 2px;
  transition: filter 0.2s;
}

.word-row.blurred {
  filter: blur(12px);
  user-select: none;
  pointer-events: none;
}

.word-main {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  text-transform: lowercase;
  letter-spacing: 0.5px;
  word-break: break-word;
}

.audio-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  /* 减色：去掉橙色实心背景，改用浅灰描边 */
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
}

.audio-btn:active {
  transform: translateY(1px);
}

.word-phonetic {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-xs);
}

.word-meaning {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--color-text);
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--gap-sm) 0;
}

.example {
  text-align: left;
}

.example-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.example-label {
  font-size: var(--text-tiny);
  color: var(--color-text-sub);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
}

.example-audio-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  /* 减色：去掉绿色背景，改透明 + 灰描边 */
  background: transparent;
  color: var(--color-text-sub);
  border: 1px solid var(--color-border);
  font-size: var(--text-tiny);
  font-weight: 700;
  font-family: var(--font-display);
  transition: all 0.15s;
}

.example-audio-btn:active {
  transform: scale(0.95);
}

.example-en {
  font-size: var(--text-body);
  color: var(--color-text);
  font-style: italic;
  line-height: 1.4;
  margin-bottom: 2px;
}

.example-cn {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

/* 底部：拼写
   ⚠️ 修复重叠：用 flex-shrink: 0 + 半透明白底把底部栏从内容流中独立出来，
   确保 nav-row/spell-wrap 永远在卡片下方，不会被 example 长文本压上来 */
.bottom-bar {
  flex-shrink: 0;
  padding: var(--gap-sm) 0 var(--gap-md);
  background: var(--color-bg);
  position: relative;
  z-index: 2;
}

.nav-row {
  display: flex;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-sm);
}

.nav-btn {
  flex: 1;
  padding: 12px 10px;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 700;
  /* 减色：去掉 box-shadow */
  transition: all 0.15s;
  white-space: nowrap;
  min-width: 0;
}

.nav-btn--prev,
.nav-btn--next {
  /* 上下张按钮统一：透明背景 + 灰色描边 + 文字色 */
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-btn:not(:disabled):active {
  transform: translateY(1px);
  background: var(--color-card);
}

.spell-wrap {
  width: 100%;
}

.spell-hint {
  text-align: center;
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: 6px;
  font-weight: 600;
}

.spell-row {
  display: flex;
  gap: var(--gap-sm);
}

.spell-input {
  flex: 1;
  padding: 12px 14px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 600;
  text-align: center;
  background: var(--color-card);
  transition: all 0.15s;
}

.spell-input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.spell-input--wrong {
  border-color: var(--color-secondary);
  animation: shake 0.3s;
}

.spell-input--correct {
  border-color: var(--color-tertiary);
  background: var(--color-tertiary-light);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.spell-btn {
  padding: 0 18px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-h3);
  font-weight: 700;
  /* 减色：去掉阴影（主操作按钮保留蓝色实心） */
  font-family: var(--font-display);
  white-space: nowrap;
  flex-shrink: 0;
  /* iOS Safari 避免按钮默认样式 */
  appearance: none;
  -webkit-appearance: none;
}

.spell-btn:active {
  transform: translateY(1px);
}

.result-text {
  text-align: center;
  margin-top: 6px;
  font-size: var(--text-small);
  font-weight: 600;
}

.result-text--correct { color: var(--color-tertiary); }
.result-text--wrong { color: var(--color-secondary); }

/* ─── 移动端断点 (< 480px) ───
   iPhone SE/12mini 等小屏幕：压字号 + 减 padding，给 nav-row/spell-wrap 留空间 */
@media (max-width: 480px) {
  .flash-page {
    padding: 0 var(--gap-sm) var(--gap-sm);
  }

  .word-card {
    padding: var(--gap-sm) var(--gap-md);
  }

  .word-emoji {
    font-size: 32px;
    margin-bottom: 2px;
  }

  .word-main {
    font-size: 28px;
  }

  .audio-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .word-meaning {
    font-size: 18px;
  }

  /* 例句紧凑，但保持可读 */
  .example-en {
    font-size: 15px;
    line-height: 1.45;
  }

  .example-cn {
    font-size: 13px;
  }

  /* 移动端拼写输入更紧凑，避免撑出屏幕 */
  .spell-input {
    padding: 10px 12px;
    font-size: 18px;
  }

  .spell-btn {
    padding: 0 16px;
    font-size: 18px;
  }

  .nav-btn {
    padding: 10px 8px;
    font-size: 16px;
  }
}

/* 积分 Toast */
.point-toast-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.35);
  animation: pt-fadeIn 0.3s ease;
}

.point-toast {
  background: white;
  border-radius: 20px;
  padding: 28px 36px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: pt-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.point-toast-star {
  font-size: 42px;
  margin-bottom: 8px;
  animation: pt-bounce 0.8s ease infinite;
}

.point-toast-text strong {
  display: block;
  font-size: 26px;
  color: #f59e0b;
  margin-bottom: 4px;
}

.point-toast-text span {
  font-size: 14px;
  color: #6b7280;
}

@keyframes pt-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pt-pop {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes pt-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
