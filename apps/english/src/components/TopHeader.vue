<script setup lang="ts">
/**
 * 学英语顶部 Header — 跟主站/学诗词/学国学/学通识 统一完整版
 *
 * 之前用 minimal（只 logo）导致用户视觉割裂；
 * 改回 full 后内容会留出 header 高度的顶部 padding。
 */
import { ref } from 'vue'
import HeaderBar from '@shared/components/HeaderBar.vue'

const searchQuery = ref('')
function handleSearch(q: string) {
  // 2026-07-01：之前跳主站 grandand.com/search 但主站没索引学英语 3340 单词
  // 改为站内搜索：跳到 ReviewPage（已有 searchQuery 输入框 + 单词过滤逻辑）
  // 2026-07-01：浏览器有时不刷新路由，加 reload() 强制重置
  const newHash = '#/study/__review__?q=' + encodeURIComponent(q)
  if (window.location.hash === newHash) {
    // 同样的 hash：触发 hashchange（强制重新加载组件）
    window.location.hash = ''
    setTimeout(() => { window.location.hash = newHash }, 0)
  } else {
    window.location.hash = newHash
  }
  // 强制滚动到顶部 + 触发视图更新
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}
</script>

<template>
  <HeaderBar v-model="searchQuery" :on-search="handleSearch" />
</template>