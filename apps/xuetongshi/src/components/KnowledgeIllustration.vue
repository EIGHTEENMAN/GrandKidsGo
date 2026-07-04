<script setup lang="ts">
/**
 * KnowledgeIllustration — 学通识知识详情页配图
 *
 * 媒体回退链（按优先级）：
 *   .jpg (AI 真实图) → .svg (占位水墨) → 文字占位
 *
 * 状态：loading / loaded / error
 * 设计：卡片顶部横向 banner 16:9 比例，淡彩渐变背景
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  topicId: string
  topicTitle: string
  category: string
  color?: string
  parentTopicId?: string  // 章节所属的 topic（用于 section 图片文件名）
}>()

type FallbackStage = 'jpg' | 'none'
const fallbackStage = ref<FallbackStage>('jpg')
const imgStatus = ref<'loading' | 'loaded' | 'error'>('loading')
const showFullscreen = ref(false)

const mediaUrl = computed(() => {
  // 如果有 parentTopicId → 这是节图片，路径 = sections/{parentTopicId}-{sectionId}
  if (props.parentTopicId) {
    return `/images/sections/${props.parentTopicId}-${props.topicId}.${fallbackStage.value}`
  }
  return `/images/knowledge/${props.topicId}.${fallbackStage.value}`
})

function handleLoad() {
  imgStatus.value = 'loaded'
}

function handleError() {
  // jpg 失败直接文字占位（SVG 是 v1 水墨风，已不符合调性）
  imgStatus.value = 'error'
}
</script>

<template>
  <div class="ki-banner" :style="{ backgroundColor: (color || '#94a3b8') + '15' }">
    <img
      v-if="imgStatus !== 'error'"
      :src="mediaUrl"
      :alt="topicTitle"
      class="ki-img"
      :class="{ 'ki-img-loaded': imgStatus === 'loaded' }"
      @load="handleLoad"
      @error="handleError"
      @click="imgStatus === 'loaded' && (showFullscreen = true)"
    />
    <div v-else class="ki-fallback">
      <div class="ki-fallback-char">{{ topicTitle.slice(0, 1) }}</div>
      <div class="ki-fallback-title">{{ topicTitle }}</div>
    </div>
    <div class="ki-badge" :style="{ backgroundColor: color || '#94a3b8' }">
      {{ category }}
    </div>
    <div v-if="imgStatus === 'loaded'" class="ki-ai-badge">⚡ AI 生成</div>

    <!-- 全屏查看 -->
    <Teleport to="body" v-if="showFullscreen">
      <div class="ki-fullscreen" @click="showFullscreen = false">
        <img :src="mediaUrl" :alt="topicTitle" class="ki-fullscreen-img" />
        <button class="ki-close" @click.stop="showFullscreen = false">×</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ki-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ki-img {
  width: 100%;
  height: 100%;
  object-fit: contain;  /* contain 而非 cover：保留完整图，不裁剪 */
  opacity: 0;
  transition: opacity 0.4s ease;
  cursor: zoom-in;
}
.ki-img-loaded { opacity: 1; }

.ki-badge {
  position: absolute;
  top: 12px; left: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
}

.ki-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #94a3b8;
}
.ki-fallback-char {
  font-size: 120px;
  font-weight: 900;
  font-family: serif;
  opacity: 0.4;
  line-height: 1;
}
.ki-fallback-title {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
}

/* 全屏 */
.ki-fullscreen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
  cursor: zoom-out;
}
.ki-fullscreen-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.ki-close {
  position: absolute;
  top: 20px; right: 20px;
  width: 44px; height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 28px;
  border-radius: 50%;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.ki-close:hover { background: rgba(255, 255, 255, 0.3); }

.ki-ai-badge {
  position: absolute;
  bottom: 10px; right: 10px;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  letter-spacing: 0.3px;
  pointer-events: none;
}
</style>
