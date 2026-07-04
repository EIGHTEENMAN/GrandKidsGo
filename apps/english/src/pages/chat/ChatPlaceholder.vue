<script setup lang="ts">
import { studyStore } from '../../stores/studyStore'
import { router } from '../../router'
</script>

<template>
  <div class="chat-placeholder">
    <div class="coming-soon-card">
      <h2 class="title">AI 对话</h2>
      <p class="desc">和 AI 朋友自由聊天，边玩边学英语</p>
      <div class="feature-list">
        <div class="feature">6 个 AI 角色可选（小狐、Miss Wang、团团...）</div>
        <div class="feature">自定义你的 AI 朋友名字</div>
        <div class="feature">聊最近学过的单词，AI 自然帮你复习</div>
      </div>
      <p class="hint">P1 阶段上线，敬请期待</p>
    </div>

    <div v-if="studyStore.lastSession" class="continue-card" @click="router.navigate('study')">
      <div class="continue-badge">刚刚学过</div>
      <div class="continue-content">
        <h3 class="continue-title">回到学习</h3>
        <div class="continue-words">
          <span v-for="w in studyStore.lastSession.words.slice(0, 5)" :key="w" class="word-chip">{{ w }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-placeholder {
  padding: var(--gap-xl) 0;
}

.coming-soon-card {
  padding: var(--gap-xl) var(--gap-lg);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: center;
  border: 3px dashed var(--color-primary);
  margin-bottom: var(--gap-lg);
}

.title {
  font-size: var(--text-title);
  color: var(--color-primary);
  margin-bottom: var(--gap-sm);
}

.desc {
  color: var(--color-text-sub);
  margin-bottom: var(--gap-lg);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-lg);
  text-align: left;
}

.feature {
  padding: var(--gap-sm) var(--gap-md);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--text-body);
}

.hint {
  color: var(--color-text-sub);
  font-size: var(--text-small);
  font-style: italic;
}

.continue-card {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--gap-md) var(--gap-lg);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  border: 2px solid var(--color-tertiary);
  cursor: pointer;
}

.continue-badge {
  background: var(--color-tertiary);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--text-tiny);
  font-weight: 600;
  flex-shrink: 0;
}

.continue-title {
  font-size: var(--text-h3);
  margin-bottom: var(--gap-xs);
}

.continue-words {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-xs);
}

.word-chip {
  background: var(--color-secondary-light);
  color: var(--color-secondary);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  font-weight: 600;
}
</style>