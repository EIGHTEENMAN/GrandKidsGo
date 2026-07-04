<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../../data/words'
import { wordStore } from '../../stores/wordStore'
import { router } from '../../router'

const props = defineProps<{
  themeId: string
}>()

const themeWords = computed(() => words.filter(w => w.theme === props.themeId))
const themeName = computed(() => themeWords.value[0]?.theme || props.themeId)

// 6 关卡，每关 6-8 词
const STAGES = 6
const stageList = computed(() => {
  const stageWords = Math.ceil(themeWords.value.length / STAGES)
  const result = []
  for (let i = 0; i < STAGES; i++) {
    const start = i * stageWords
    const end = Math.min(start + stageWords, themeWords.value.length)
    if (start >= themeWords.value.length) break
    const list = themeWords.value.slice(start, end)
    const mastered = list.filter(w => wordStore.records.get(w.id)?.mastered).length
    result.push({
      index: i + 1,
      wordCount: list.length,
      mastered,
      allDone: mastered === list.length
    })
  }
  return result
})

function openStage(stage: number) {
  window.location.hash = `#/study/${props.themeId}/${stage}`
}

function back() {
  // 返回到 StudyHub（不是学英语首页 3 大卡）
  window.location.hash = '#/study/__hub__'
}
</script>

<template>
  <div class="stage-list">
    <button class="back-btn" @click="back">← 返回</button>

    <header class="header">
      <h1 class="title">{{ themeName }}</h1>
      <p class="subtitle">共 {{ themeWords.length }} 词 · {{ stageList.length }} 关</p>
    </header>

    <div class="stages">
      <button
        v-for="s in stageList"
        :key="s.index"
        class="stage-card"
        :class="{ 'stage-card--done': s.allDone }"
        @click="openStage(s.index)"
      >
        <div class="stage-num">第 {{ s.index }} 关</div>
        <div class="stage-info">{{ s.mastered }} / {{ s.wordCount }}</div>
        <div class="stage-bar">
          <div
            class="stage-bar-fill"
            :style="{ width: (s.wordCount > 0 ? s.mastered / s.wordCount * 100 : 0) + '%' }"
          ></div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.stage-list {
  padding: var(--gap-lg) 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: var(--gap-md);
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-primary);
  font-weight: 600;
  font-size: var(--text-body);
  box-shadow: var(--shadow-card);
}

.back-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.header {
  margin-bottom: var(--gap-lg);
}

.title {
  font-size: var(--text-title);
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
}

.subtitle {
  color: var(--color-text-sub);
}

.stages {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.stage-card {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  padding: var(--gap-md) var(--gap-lg);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.stage-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.stage-card:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.stage-card--done {
  border-color: var(--color-tertiary);
}

.stage-num {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-primary);
}

.stage-card--done .stage-num {
  color: var(--color-tertiary);
}

.stage-info {
  font-size: var(--text-body);
  color: var(--color-text-sub);
  font-weight: 600;
  grid-column: 2;
  grid-row: 1;
}

.stage-bar {
  grid-column: 1 / -1;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-top: var(--gap-xs);
}

.stage-bar-fill {
  height: 100%;
  background: var(--color-tertiary);
  transition: width 0.3s ease;
}
</style>