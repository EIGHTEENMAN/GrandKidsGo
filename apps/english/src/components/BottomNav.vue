<script setup lang="ts">
import { router } from '../router'

function goTab(tab: 'study' | 'chat' | 'profile') {
  if (router.current === tab) return
  // 直接写顶级 hash（清掉子路由）
  window.location.hash = '#/' + tab
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      :class="['tab', { active: router.current === 'study' }]"
      @click="goTab('study')"
    >
      学习
    </button>
    <button
      :class="['tab', { active: router.current === 'chat' }]"
      @click="goTab('chat')"
    >
      AI 对话
    </button>
    <button
      :class="['tab', { active: router.current === 'profile' }]"
      @click="goTab('profile')"
    >
      我的
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: var(--gap-sm);
  padding: var(--gap-sm);
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  z-index: 100;
  /* 移动端安全区 */
  padding-bottom: max(var(--gap-sm), env(safe-area-inset-bottom));
}

.tab {
  flex: 1;
  padding: 14px 8px;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text-sub);
  background: transparent;
  transition: all 0.15s ease;
  text-align: center;
}

.tab:hover {
  background: var(--color-primary-light);
}

.tab.active {
  background: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-card);
}

.tab:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}
</style>