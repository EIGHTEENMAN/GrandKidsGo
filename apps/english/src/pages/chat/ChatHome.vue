<script setup lang="ts">
import { computed } from 'vue'
import { characters, getCharacter } from '../../config/characters'
import { characterStore } from '../../stores/characterStore'
import { studyStore } from '../../stores/studyStore'
import { router } from '../../router'

const lastSession = computed(() => studyStore.lastSession)
const lastWords = computed(() => lastSession.value?.words.slice(0, 5) || [])
const lastCharacter = computed(() => characterStore.lastCharacterId ? getCharacter(characterStore.lastCharacterId) : null)

function openCharacter(id: string) {
  window.location.hash = `#/chat/${id}`
}
</script>

<template>
  <div class="chat-home">
    <header class="header">
      <h1 class="title">AI 对话</h1>
      <p class="subtitle">和 AI 朋友自由聊天，边玩边学</p>
    </header>

    <!-- 续聊大卡片 -->
    <div v-if="lastWords.length > 0 && lastCharacter" class="continue-card" @click="openCharacter(lastCharacter.id)">
      <div class="continue-badge">继续上次</div>
      <div class="continue-content">
        <div class="continue-row">
          <span class="continue-name">{{ characterStore.getDisplayName(lastCharacter.id, lastCharacter.defaultName) }}</span>
          <span class="continue-wants">想和你聊聊</span>
        </div>
        <div class="continue-words">
          <span v-for="w in lastWords" :key="w" class="word-chip">{{ w }}</span>
        </div>
        <p class="continue-hint">点击进入对话</p>
      </div>
    </div>

    <!-- 选角色提示 -->
    <div v-if="lastWords.length === 0" class="hint-card">
      <p class="hint-title">先学几个单词</p>
      <p class="hint-desc">学完后 AI 朋友能跟你聊得更深入</p>
      <button class="hint-btn" @click="router.navigate('study')">去学习</button>
    </div>

    <!-- 6 角色宫格 -->
    <section class="characters-section">
      <h2 class="section-title">选一个 AI 朋友</h2>
      <div class="character-grid">
        <button
          v-for="c in characters"
          :key="c.id"
          class="character-card"
          :style="{ '--char-color': c.color }"
          @click="openCharacter(c.id)"
        >
          <div class="char-avatar">{{ c.emojiLabel }}</div>
          <div class="char-name">{{ characterStore.getDisplayName(c.id, c.defaultName) }}</div>
          <div class="char-default" v-if="characterStore.hasCustomName(c.id)">默认：{{ c.defaultName }}</div>
          <div class="char-desc">{{ c.description }}</div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chat-home {
  padding: var(--gap-lg) 0;
}

.header {
  margin-bottom: var(--gap-lg);
}

.title {
  font-size: var(--text-title);
  color: var(--color-primary);
  margin-bottom: var(--gap-xs);
}

.subtitle {
  color: var(--color-text-sub);
}

/* 续聊大卡片 */
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

.continue-card:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
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

.continue-content {
  flex: 1;
}

.continue-row {
  display: flex;
  align-items: baseline;
  gap: var(--gap-xs);
  margin-bottom: var(--gap-xs);
}

.continue-name {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
}

.continue-wants {
  color: var(--color-text-sub);
  font-size: var(--text-body);
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
  font-size: var(--text-tiny);
  color: var(--color-text-sub);
  font-style: italic;
}

/* 提示卡 */
.hint-card {
  text-align: center;
  padding: var(--gap-lg);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-lg);
}

.hint-title {
  font-size: var(--text-h3);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
}

.hint-desc {
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
}

.hint-btn {
  padding: 12px 24px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: white;
  font-weight: 700;
  box-shadow: var(--shadow-card);
}

.hint-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

/* 角色网格 */
.section-title {
  font-size: var(--text-h3);
  color: var(--color-text);
  margin-bottom: var(--gap-md);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--gap-md);
}

.character-card {
  padding: var(--gap-md);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  border: 2px solid transparent;
  border-bottom: 4px solid var(--char-color, var(--color-primary));
  transition: all 0.15s;
}

.character-card:hover {
  transform: translateY(-2px);
  border-color: var(--char-color);
  box-shadow: var(--shadow-card-hover);
}

.character-card:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.char-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--char-color, var(--color-primary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 700;
  margin-bottom: var(--gap-sm);
}

.char-name {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
}

.char-default {
  font-size: var(--text-tiny);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-xs);
}

.char-desc {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}
</style>