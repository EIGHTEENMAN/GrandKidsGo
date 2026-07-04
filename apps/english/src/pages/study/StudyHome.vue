<script setup lang="ts">
import { router } from '../../router'

interface EntryCard {
  id: 'study' | 'chat' | 'profile'
  title: string
  subtitle: string
  description: string
  icon: string
  accent: 'blue' | 'orange' | 'green'
  badge?: string
}

const entries: EntryCard[] = [
  {
    id: 'study',
    title: '单词学习',
    subtitle: 'Vocabulary',
    description: '5018 词精选主题宫格 · 看图拼写 · 跟读复习',
    icon: 'Aa',
    accent: 'blue',
    badge: '主功能'
  },
  // AI 对话功能暂未上线,等后续开放
  // {
  //   id: 'chat',
  //   title: 'AI 对话',
  //   subtitle: 'AI Chat',
  //   description: '6 位性格朋友陪你练口语 · 偷偷夹英语',
  //   icon: 'Hi',
  //   accent: 'orange',
  //   badge: '新功能'
  // },
  {
    id: 'profile',
    title: '我的',
    subtitle: 'Profile',
    description: '学习进度 · 连续打卡 · 声音设置',
    icon: 'Me',
    accent: 'green'
  }
]

function go(id: 'study' | 'chat' | 'profile') {
  // 学习入口：进二级枢纽页（统计/续聊/复习/主题）；其他 Tab 切底部导航
  if (id === 'study') {
    window.location.hash = '#/study/__hub__'
  } else {
    router.navigate(id)
  }
}
</script>

<template>
  <div class="hub">
    <!-- 欢迎头部 -->
    <header class="hub-header">
      <h1 class="hub-title">英语乐园</h1>
      <p class="hub-subtitle">选一个模块开始今天的英语冒险</p>
    </header>

    <!-- 3 大入口卡片 -->
    <section class="entries">
      <button
        v-for="(card, idx) in entries"
        :key="card.id"
        :class="['entry-card', `entry-card--${card.accent}`]"
        :style="{ animationDelay: idx * 80 + 'ms' }"
        @click="go(card.id)"
      >
        <div class="entry-card-top">
          <div class="entry-icon">{{ card.icon }}</div>
          <span v-if="card.badge" class="entry-badge">{{ card.badge }}</span>
        </div>
        <div class="entry-body">
          <h2 class="entry-title">{{ card.title }}</h2>
          <p class="entry-subtitle">{{ card.subtitle }}</p>
          <p class="entry-desc">{{ card.description }}</p>
        </div>
        <div class="entry-arrow">→</div>
      </button>
    </section>

    <footer class="hub-footer">
      <p>每日 5 分钟 · 越学越棒</p>
    </footer>
  </div>
</template>

<style scoped>
.hub {
  padding: var(--gap-lg) 0 var(--gap-xl);
}

/* 头部 */
.hub-header {
  text-align: center;
  margin-bottom: var(--gap-xl);
}

.hub-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--gap-xs);
  letter-spacing: 1px;
}

.hub-subtitle {
  color: var(--color-text-sub);
  font-size: var(--text-body);
}

/* 3 大卡片网格 */
.entries {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  margin-bottom: var(--gap-xl);
}

.entry-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  padding: var(--gap-lg);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  border: 2px solid transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  animation: slideUp 0.5s ease both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 主题色边线（左侧粗条） */
.entry-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.entry-card--blue::before   { background: var(--color-primary); }
.entry-card--orange::before { background: var(--color-secondary); }
.entry-card--green::before  { background: var(--color-tertiary); }

.entry-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}

.entry-card:active {
  transform: translateY(1px);
  box-shadow: var(--shadow-card-active);
}

.entry-card--blue:hover   { border-color: var(--color-primary); }
.entry-card--orange:hover { border-color: var(--color-secondary); }
.entry-card--green:hover  { border-color: var(--color-tertiary); }

/* 顶部：图标 + 角标 */
.entry-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entry-icon {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -1px;
}

.entry-card--blue   .entry-icon { color: var(--color-primary); }
.entry-card--orange .entry-icon { color: var(--color-secondary); }
.entry-card--green  .entry-icon { color: var(--color-tertiary); }

.entry-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--text-tiny);
  font-weight: 600;
}

.entry-card--orange .entry-badge { background: var(--color-secondary); }
.entry-card--green  .entry-badge { background: var(--color-tertiary); }

/* 文字区 */
.entry-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-title {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.entry-subtitle {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
}

.entry-desc {
  font-size: var(--text-body);
  color: var(--color-text);
  margin-top: var(--gap-xs);
  line-height: 1.5;
  opacity: 0.8;
}

/* 右下角箭头 */
.entry-arrow {
  position: absolute;
  right: var(--gap-md);
  bottom: var(--gap-md);
  font-size: 24px;
  color: var(--color-text-sub);
  font-weight: 300;
  transition: transform 0.2s;
}

.entry-card:hover .entry-arrow {
  transform: translateX(4px);
  color: var(--color-text);
}

/* 页脚 */
.hub-footer {
  text-align: center;
  color: var(--color-text-sub);
  font-size: var(--text-small);
  opacity: 0.7;
}

/* 桌面端横排 */
@media (min-width: 720px) {
  .entries {
    flex-direction: row;
  }
  .entry-card {
    flex: 1;
    min-height: 280px;
  }
  .entry-icon {
    font-size: 56px;
  }
}
</style>
