<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../../data/words'
import { wordStore, getMasteredCount, getAccuracy } from '../../stores/wordStore'
import { studyStore } from '../../stores/studyStore'
import { router } from '../../router'

interface Theme {
  id: string
  name: string
  iconWord: string
  count: number
  mastered: number
}

const themes = computed<Theme[]>(() => {
  const map = new Map<string, { name: string, count: number, mastered: number }>()
  for (const w of words) {
    if (!map.has(w.theme)) {
      map.set(w.theme, { name: w.theme, count: 0, mastered: 0 })
    }
    const t = map.get(w.theme)!
    t.count++
    if (wordStore.records.get(w.id)?.mastered) t.mastered++
  }
  const iconWords = new Map<string, string>()
  for (const w of words) {
    if (!iconWords.has(w.theme)) iconWords.set(w.theme, w.word)
  }
  return [...map.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    iconWord: iconWords.get(id) || 'word',
    count: v.count,
    mastered: v.mastered
  }))
})

const totalWords = computed(() => words.length)
const totalMastered = computed(() => getMasteredCount())
const accuracy = computed(() => getAccuracy())

function openTheme(id: string) {
  window.location.hash = '#/study/' + id
}

function startReview() {
  window.location.hash = '#/study/__review__'
}

function goHome() {
  window.location.hash = '#/study'
}

const lastWords = computed(() => studyStore.lastSession?.words || [])
</script>

<template>
  <div class="study-hub">
    <!-- 返回 + 标题 -->
    <header class="hub-bar">
      <button class="back-btn" @click="goHome">← 返回</button>
      <h1 class="hub-title">单词学习</h1>
      <div class="hub-bar-spacer"></div>
    </header>

    <!-- 3 张统计卡 -->
    <section class="stats">
      <div class="stat-card stat-card--blue">
        <div class="stat-num">{{ totalMastered }}</div>
        <div class="stat-label">已掌握</div>
      </div>
      <div class="stat-card stat-card--orange">
        <div class="stat-num">{{ totalWords }}</div>
        <div class="stat-label">总词数</div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-num">{{ accuracy }}%</div>
        <div class="stat-label">正确率</div>
      </div>
    </section>

    <!-- AI 对话功能暂未上线,等后续开放
    <section v-if="lastWords.length" class="continue-card" @click="router.navigate('chat')">
      <div class="continue-badge">刚刚学过</div>
      <div class="continue-content">
        <h2 class="continue-title">继续和 AI 朋友聊</h2>
        <div class="continue-words">
          <span v-for="w in lastWords.slice(0, 5)" :key="w" class="word-chip">{{ w }}</span>
        </div>
        <p class="continue-hint">点击进入 AI 对话</p>
      </div>
    </section>
    -->

    <!-- 复习入口 -->
    <section class="actions">
      <button class="action-btn action-btn--review" @click="startReview">
        <div class="action-title">复习本课</div>
        <div class="action-desc">已学 {{ totalMastered }} 词</div>
      </button>
    </section>

    <!-- 主题宫格 -->
    <section class="themes">
      <h2 class="section-title">选一个主题</h2>
      <div class="theme-grid">
        <button
          v-for="t in themes"
          :key="t.id"
          class="theme-card"
          @click="openTheme(t.id)"
        >
          <div class="theme-icon">{{ t.iconWord }}</div>
          <div class="theme-name">{{ t.name }}</div>
          <div class="theme-count">{{ t.mastered }} / {{ t.count }}</div>
          <div class="theme-bar">
            <div
              class="theme-bar-fill"
              :style="{ width: (t.count > 0 ? t.mastered / t.count * 100 : 0) + '%' }"
            ></div>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.study-hub {
  padding: var(--gap-md) 0 var(--gap-xl);
}

.hub-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--gap-md);
}

.back-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  font-size: var(--text-small);
  color: var(--color-text-sub);
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.hub-title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  color: var(--color-text);
  margin: 0;
}

.hub-bar-spacer {
  width: 60px;
}

/* 3 张统计卡 */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap-sm);
  margin-bottom: var(--gap-lg);
}

.stat-card {
  padding: var(--gap-md);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.stat-card--blue { border-bottom: 4px solid var(--color-primary); }
.stat-card--orange { border-bottom: 4px solid var(--color-secondary); }
.stat-card--green { border-bottom: 4px solid var(--color-tertiary); }

.stat-num {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.stat-label {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-top: var(--gap-xs);
}

/* 续聊大卡 */
.continue-card {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 2px solid var(--color-primary);
  margin-bottom: var(--gap-lg);
  cursor: pointer;
  transition: all 0.15s;
}

.continue-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.continue-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--text-tiny);
  font-weight: 600;
  flex-shrink: 0;
}

.continue-content { flex: 1; }

.continue-title {
  font-size: var(--text-h3);
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
}

.continue-words {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-xs);
  margin-bottom: var(--gap-xs);
}

.word-chip {
  background: var(--color-secondary-light);
  color: var(--color-secondary);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  font-weight: 600;
}

.continue-hint {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

/* 复习入口 */
.actions { margin-bottom: var(--gap-lg); }

.action-btn {
  width: 100%;
  padding: var(--gap-md) var(--gap-lg);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  border: 2px solid var(--color-border);
}

.action-btn--review { border-color: var(--color-tertiary); }

.action-title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 700;
  color: var(--color-text);
}

.action-desc {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-top: 2px;
}

.section-title {
  font-size: var(--text-h3);
  color: var(--color-text);
  margin-bottom: var(--gap-md);
}

/* 主题宫格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--gap-md);
}

.theme-card {
  padding: var(--gap-md);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.theme-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.theme-card:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.theme-icon {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-primary);
  text-transform: lowercase;
  margin-bottom: var(--gap-xs);
}

.theme-name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.theme-count {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-xs);
}

.theme-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.theme-bar-fill {
  height: 100%;
  background: var(--color-tertiary);
  transition: width 0.3s ease;
}
</style>
