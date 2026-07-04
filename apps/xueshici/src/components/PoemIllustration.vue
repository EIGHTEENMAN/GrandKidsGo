<script setup lang="ts">
/**
 * PoemIllustration — 诗配画展示组件（2026-07-01 简化版）
 *
 * 媒体回退链：.jpg → .svg → 文字占位（去掉 mp4 动画）
 * 只显示静态图片，点击可全屏查看大图。
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  poemId: number
  poemTitle: string
  poemAuthor: string
  poemDynasty: string
  color?: string
}>()

// ===== 状态 =====
type Stage = 'jpg' | 'svg'
const stage = ref<Stage>('jpg')
const imgStatus = ref<'loading' | 'loaded' | 'empty'>('loading')
const showFullscreen = ref(false)

// ===== 朝代颜色 =====
const dynastyColorMap: Record<string, string> = {
  '春秋战国': '#d97706',
  '汉': '#dc2626',
  '三国': '#f97316',
  '魏晋南北朝': '#8b5cf6',
  '唐': '#f59e0b',
  '宋': '#06b6d4',
  '元': '#ec4899',
  '明': '#ef4444',
  '清': '#1d4ed8',
  '近现代': '#64748b',
}
const accentColor = computed(() => props.color || dynastyColorMap[props.poemDynasty] || '#94a3b8')

const mediaUrl = computed(() => `/images/poems/${props.poemId}.${stage.value}`)

// ===== 加载处理 =====
function handleImgLoad() {
  imgStatus.value = 'loaded'
}

function handleImgError() {
  if (stage.value === 'jpg') {
    stage.value = 'svg'
  } else {
    imgStatus.value = 'empty'
  }
}

// ===== 全屏预览 =====
function toggleFullscreen() {
  if (imgStatus.value === 'loaded') showFullscreen.value = !showFullscreen.value
}

function closeFullscreen() {
  showFullscreen.value = false
}

// ESC 关闭全屏
import { onMounted, onUnmounted } from 'vue'
let onEsc: ((e: KeyboardEvent) => void) | null = null
onMounted(() => {
  onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') showFullscreen.value = false
  }
  document.addEventListener('keydown', onEsc)
})
onUnmounted(() => {
  if (onEsc) document.removeEventListener('keydown', onEsc)
})
</script>

<template>
  <div class="pi-wrapper" :style="{ '--pi-accent': accentColor }">
    <!-- 已加载 / 加载中（保持容器可见） -->
    <div
      v-if="imgStatus !== 'empty'"
      class="pi-image-wrap"
      @click="toggleFullscreen"
      role="button"
      :aria-label="`查看《${poemTitle}》配图大图`"
      tabindex="0"
      @keydown.enter="toggleFullscreen"
    >
      <img
        :src="mediaUrl"
        :alt="`《${poemTitle}》${poemAuthor} · ${poemDynasty} 配图`"
        class="pi-image"
        @load="handleImgLoad"
        @error="handleImgError"
        loading="lazy"
      />
      <!-- 朝代/作者角标（左下） -->
      <div class="pi-badge">
        <span class="pi-badge-dynasty">{{ poemDynasty }}</span>
        <span class="pi-badge-author">{{ poemAuthor }}</span>
      </div>
      <!-- AI 生成标识（右下） -->
      <div class="pi-ai-badge">⚡ AI 生成</div>
    </div>

    <!-- 空状态占位（无配图） -->
    <div v-if="imgStatus === 'empty'" class="pi-placeholder">
      <p class="pi-placeholder-text">配图生成中...</p>
    </div>

    <!-- 全屏预览遮罩 -->
    <Teleport to="body" v-if="showFullscreen">
      <div class="pi-fullscreen-overlay" @click.self="closeFullscreen">
        <button class="pi-fullscreen-close" @click="closeFullscreen" aria-label="关闭全屏">✕</button>
        <div class="pi-fullscreen-content">
          <img :src="`/images/poems/${poemId}.jpg`" :alt="`《${poemTitle}》配图`" class="pi-fullscreen-img"
            @error="(e) => ((e.target as HTMLImageElement).src = mediaUrl)" />
          <p class="pi-fullscreen-caption">
            《{{ poemTitle }}》 · {{ poemAuthor }}（{{ poemDynasty }}）
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.pi-wrapper {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #fafaf9;
  border: 1px solid #e7e5e4;
}

/* ===== 图片容器 ===== */
.pi-image-wrap {
  position: relative;
  width: 100%;
  max-height: 320px;
  overflow: hidden;
  cursor: pointer;
  background: #fafaf9;
}

.pi-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: cover;
}

/* ===== 角标 ===== */
.pi-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
}

.pi-ai-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  letter-spacing: 0.3px;
}

.pi-badge-dynasty,
.pi-badge-author {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  color: #44403c;
  backdrop-filter: blur(4px);
  letter-spacing: 0.5px;
}

.pi-badge-dynasty {
  background: var(--pi-accent, #94a3b8);
  color: white;
}

/* ===== 空状态占位 ===== */
.pi-placeholder {
  position: relative;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pi-placeholder-text {
  font-size: 12px;
  color: var(--pi-accent, #94a3b8);
  opacity: 0.4;
  letter-spacing: 2px;
}

/* ===== 全屏遮罩 ===== */
.pi-fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.pi-fullscreen-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.pi-fullscreen-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.pi-fullscreen-content {
  max-width: 90vw;
  max-height: 90vh;
  text-align: center;
}

.pi-fullscreen-img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.pi-fullscreen-caption {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 12px;
  letter-spacing: 1px;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .pi-image-wrap {
    max-height: 220px;
  }
  .pi-image {
    max-height: 220px;
  }
  .pi-placeholder {
    height: 150px;
  }
}
</style>