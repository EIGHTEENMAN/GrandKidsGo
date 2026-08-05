<script setup lang="ts">
/**
 * PoemIllustration — 诗配画展示组件
 *
 * 2026-08-05 智能裁切优化：
 *   - 旧版用 object-fit: cover，1024×1024 方形图被压成长条 banner 时，
 *     人像的脸/山水的主峰经常被裁出画面外
 *   - 新版用 object-fit: cover + 智能 object-position：
 *     · 检测诗标题/作者/tags 含人像关键词 → 脸上移（center 30%）
 *     · 含山水/风景关键词 → 主景居中（center 45%）
 *     · 都无 → 居中（center center）
 *
 * 媒体回退链：.jpg → .svg → 文字占位
 * 只显示静态图片，点击可全屏查看大图。
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  poemId: number
  poemTitle: string
  poemAuthor: string
  poemDynasty: string
  poemTags?: string                  // 2026-08-05 新增：用于识别主体类型
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

// ===== 智能 object-position（2026-08-05）=====
// 优先级：山水 > 人像 > 通用
// 理由：山水词（山/水/月/江...）比人像词（送/忆/思...）更明确；surname 王/李/赵 也可能误触人像词
// 人像关键词：含"人/送/忆/别/思/乡/客/酒/宴/故人/翁/妇/将/军/臣"
//   （注意：去掉了"游/王/女"等高歧义单字；改用"送别/思乡/故乡"等组合词更稳）
const PORTRAIT_KEYWORDS = /[送忆别思乡酒宴故人翁妇将臣]|送别|思乡|友人|故人/u
// 山水关键词：含"山/水/江/河/湖/海/月/云/松/石/雪/风/花/鸟/寺/塔/楼/桥/春/晓/夜色"
const LANDSCAPE_KEYWORDS = /[山水江河湖海月云松石雪风花鸟寺塔楼桥春晓夜登]/u

const subjectKind = computed<'portrait' | 'landscape' | 'generic'>(() => {
  const text = `${props.poemTitle || ''} ${props.poemAuthor || ''} ${props.poemTags || ''}`
  // 山水优先（更明确的视觉信号）
  if (LANDSCAPE_KEYWORDS.test(text)) return 'landscape'
  if (PORTRAIT_KEYWORDS.test(text)) return 'portrait'
  return 'generic'
})

// object-position 含义：图框相对图片的位置
//   - `center top` (0%)：图框顶部对齐图片顶部 → 看到图片上方内容
//   - `center 50%`：图框中心对齐图片中心 → 看到图片正中
//   - `center 100%`：图框底部对齐图片底部 → 看到图片下方内容
//
// AI 配图人脸常位于图片**上方 1/4** → portrait 顶部对齐（甚至越过顶部，让下巴进入视图）
// AI 配图山水主峰常在图片**正中**或略高 → landscape 50%/40%（居于中部）
//
// 当前策略：
//   portrait:  'center 10%'    — 上移到 10%，人脸处于图框上半
//   landscape: 'center 40%'    — 稍偏上（避开顶部角标、保留底部空间）
//   generic:   'center center'
const objectPosition = computed(() => {
  switch (subjectKind.value) {
    case 'portrait': return 'center 10%'
    case 'landscape': return 'center 40%'
    default: return 'center center'
  }
})

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
        :class="`pi-image-${subjectKind}`"
        :style="{ objectPosition }"
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
            :style="{ objectPosition }"
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
  height: 320px;       /* 2026-08-05：固定高度，让 object-position 真正起作用 */
  max-height: 320px;
  object-fit: cover;
  /* object-position 由内联样式动态设置（人像/山水/通用） */
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
  object-fit: contain;
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
    height: 220px;
    max-height: 220px;
  }
  .pi-placeholder {
    height: 150px;
  }
}
</style>