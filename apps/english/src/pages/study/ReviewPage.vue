<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { words } from '../../data/words'
import { wordStore, getAccuracy } from '../../stores/wordStore'
import { playWordAudio } from '../../utils/audio'
import { router } from '../../router'

const filterDifficulty = ref(0)
const filterMastery = ref<'all' | 'mastered' | 'learning' | 'new'>('all')
const searchQuery = ref('')
const detailWord = ref<any>(null)

const STAGES = 6
const WORDS_PER_STAGE = 8

// 给定单词 id，返回它在所属 theme 内的关卡号
function getStageForWord(wordId: number): { themeId: string, stage: number } | null {
  const w = words.find(x => x.id === wordId)
  if (!w) return null
  const themeWords = words.filter(x => x.theme === w.theme)
  const idx = themeWords.findIndex(x => x.id === wordId)
  const stage = Math.floor(idx / WORDS_PER_STAGE) + 1
  return { themeId: w.theme, stage }
}

function openStudy(rec: any) {
  // 点击单词卡片：跳到它所在的 theme + stage，进入 FlashCard 学习
  // 带 ?wordId= 参数，FlashCard 用它直接定位到该单词（不是 stage 第一个）
  const loc = getStageForWord(rec.id)
  if (!loc) return
  const wordPart = `${encodeURIComponent(loc.themeId)}/${loc.stage}?wordId=${rec.id}`
  window.location.hash = `#/study/${wordPart}`
}

onMounted(() => {
  // 从 URL 自动填入（TopHeader 搜索跳转）
  // 注意：hash 路由的 ?q=xxx 在 # 后面，window.location.search 为空
  // 要从 hash 里解析 search 部分
  let search = window.location.search
  if (!search && window.location.hash.includes('?')) {
    search = '?' + window.location.hash.split('?').slice(1).join('?')
  }
  const params = new URLSearchParams(search)
  const q = params.get('q')
  if (q) searchQuery.value = q
})

const records = computed(() => {
  const arr = []
  for (const w of words) {
    const rec = wordStore.records.get(w.id)
    arr.push({
      ...w,
      correct: rec?.correct || 0,
      total: rec?.total || 0,
      mastered: rec?.mastered || false
    })
  }
  return arr
})

const stats = computed(() => ({
  total: records.value.filter(r => r.total > 0).length,
  mastered: records.value.filter(r => r.mastered).length,
  accuracy: getAccuracy()
}))

const filteredWords = computed(() => {
  let list = records.value
  if (filterMastery.value === 'mastered') list = list.filter(r => r.mastered)
  else if (filterMastery.value === 'learning') list = list.filter(r => r.total > 0 && !r.mastered)
  else if (filterMastery.value === 'new') list = list.filter(r => r.total === 0)

  if (filterDifficulty.value > 0) {
    list = list.filter(r => r.difficulty === filterDifficulty.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(r =>
      r.word.toLowerCase().includes(q) || r.meaning.includes(q)
    )
  }

  return list.slice(0, 100)
})

function playAudio(word: string) {
  playWordAudio(word.toLowerCase())
}

function showDetail(rec: any) {
  detailWord.value = rec
}

function close() {
  // 返回到 StudyHub（不是学英语首页 3 大卡）
  window.location.hash = '#/study/__hub__'
}
</script>

<template>
  <div class="review-page">
    <div class="review-header">
      <button class="back-btn" @click="close">← 返回</button>
      <h2 class="title">单词复习</h2>
    </div>

    <div class="review-stats">
      <div class="stat"><strong>{{ stats.total }}</strong> 已学</div>
      <div class="stat"><strong>{{ stats.mastered }}</strong> 掌握</div>
      <div class="stat"><strong>{{ stats.accuracy }}%</strong> 正确率</div>
    </div>

    <div class="review-filters">
      <select v-model="filterDifficulty" class="filter-select">
        <option :value="0">全部难度</option>
        <option v-for="d in [1,2,3,4,5,6,7,8]" :key="d" :value="d">难度 {{ d }}</option>
      </select>
      <select v-model="filterMastery" class="filter-select">
        <option value="all">全部状态</option>
        <option value="mastered">已掌握</option>
        <option value="learning">学习中</option>
        <option value="new">未学过</option>
      </select>
      <input v-model="searchQuery" placeholder="搜索单词" class="search-input" />
    </div>

    <div class="word-grid">
      <button
        v-for="rec in filteredWords"
        :key="rec.id"
        class="word-card"
        :class="{ mastered: rec.mastered }"
        @click="openStudy(rec)"
      >
        <div class="word-text">{{ rec.word }}</div>
        <div class="word-meaning">{{ rec.meaning }}</div>
        <div class="word-progress">
          <div class="progress-bar-mini">
            <div class="progress-bar-mini-fill" :style="{ width: (rec.total > 0 ? rec.correct / rec.total * 100 : 0) + '%' }"></div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="filteredWords.length === 0" class="empty">
      <p>没有匹配的单词</p>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailWord" class="detail-modal" @click.self="detailWord = null">
      <div class="detail-card">
        <button class="detail-close" @click="detailWord = null">✕</button>
        <h2 class="detail-word">{{ detailWord.word }}</h2>
        <p class="detail-phonetic">{{ detailWord.phonetic }}</p>
        <button class="detail-audio" @click="playAudio(detailWord.word)">听发音</button>
        <p class="detail-meaning">{{ detailWord.meaning }}</p>
        <p class="detail-sentence">{{ detailWord.sentence }}</p>
        <p class="detail-sentence-cn">{{ detailWord.sentenceCn }}</p>
        <div class="detail-stats">
          答对 <strong>{{ detailWord.correct }}</strong> / {{ detailWord.total }}
          <span v-if="detailWord.mastered" class="mastered-badge">已掌握</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-page {
  padding: var(--gap-lg) 0;
}

.review-header {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
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
}

.title {
  font-size: var(--text-h2);
  color: var(--color-text);
}

.review-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap-sm);
  margin-bottom: var(--gap-lg);
}

.stat {
  padding: var(--gap-sm);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: center;
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

.stat strong {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-h3);
  color: var(--color-text);
  margin-bottom: 2px;
}

.review-filters {
  display: flex;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-md);
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  padding: 10px 14px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  font-size: var(--text-body);
  font-family: inherit;
  flex: 1;
  min-width: 100px;
}

.search-input { flex: 2; }

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--gap-sm);
}

.word-card {
  padding: var(--gap-md);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  border: 2px solid transparent;
}

.word-card.mastered {
  border-color: var(--color-tertiary);
}

.word-text {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
  text-transform: lowercase;
}

.word-meaning {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-xs);
}

.progress-bar-mini {
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-bar-mini-fill {
  height: 100%;
  background: var(--color-tertiary);
}

.empty {
  text-align: center;
  padding: var(--gap-xl);
  color: var(--color-text-sub);
}

/* 详情弹窗 */
.detail-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 27, 61, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: var(--gap-md);
}

.detail-card {
  position: relative;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--gap-xl) var(--gap-lg);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.detail-close {
  position: absolute;
  top: var(--gap-sm);
  right: var(--gap-sm);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-text);
  font-size: var(--text-body);
}

.detail-word {
  font-family: var(--font-display);
  font-size: var(--text-word-l);
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
  text-transform: lowercase;
}

.detail-phonetic {
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
}

.detail-audio {
  padding: 12px 24px;
  border-radius: var(--radius-pill);
  background: var(--color-secondary);
  color: white;
  font-weight: 600;
  margin-bottom: var(--gap-md);
  box-shadow: var(--shadow-card);
}

.detail-meaning {
  font-size: var(--text-h2);
  color: var(--color-primary);
  font-weight: 700;
  margin-bottom: var(--gap-md);
}

.detail-sentence {
  font-style: italic;
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
}

.detail-sentence-cn {
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
}

.detail-stats {
  color: var(--color-text-sub);
  font-size: var(--text-small);
}

.mastered-badge {
  display: inline-block;
  margin-left: var(--gap-sm);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-tertiary-light);
  color: var(--color-tertiary);
  font-weight: 600;
}
</style>