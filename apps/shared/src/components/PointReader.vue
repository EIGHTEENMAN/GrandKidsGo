<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { pinyin } from 'pinyin-pro'
import { charMeanings } from '../data/chardict'

const props = defineProps<{
  text: string
}>()

const popupVisible = ref(false)
const popupChar = ref('')
const popupPinyin = ref('')
const popupMeaning = ref('')
const popupStyle = ref({})
const popupRef = ref<HTMLElement | null>(null)

const segments = computed(() => {
  const segs = segmentGraphemes(props.text)
  return segs.map((c) => ({
    char: c,
    isChinese: /[一-鿿]/.test(c),
  }))
})

function segmentGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter !== 'undefined') {
    const seg = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
    return [...seg.segment(text)].map(s => s.segment)
  }
  return [...text]
}

function handleClick(event: MouseEvent, segIndex: number) {
  const seg = segments.value[segIndex]
  if (!seg.isChinese) return

  // Close existing popup first
  closePopup()

  const char = seg.char
  // Extract context window for polyphone detection
  const win = 6
  const start = Math.max(0, segIndex - win)
  const end = Math.min(props.text.length, segIndex + win + 1)
  const ctx = props.text.substring(start, end)
  const localIdx = segIndex - start

  let charPinyin = ''
  try {
    const arr = pinyin(ctx, { type: 'array' })
    charPinyin = arr[localIdx]
    if (!charPinyin || charPinyin === char) {
      // Fallback: pinyin without context
      const full = pinyin(ctx, { type: 'array' })
      charPinyin = full[localIdx] || char
    }
  } catch {
    charPinyin = char
  }

  const meaning = charMeanings[char] || ''

  // Position popup near click
  const x = event.clientX
  const y = event.clientY
  const pw = 180
  const ph = meaning ? 110 : 70
  let left = x - pw / 2
  let top = y + 14
  const pad = 8

  if (left < pad) left = pad
  if (left + pw > window.innerWidth - pad) left = window.innerWidth - pw - pad
  if (y + ph + 28 > window.innerHeight) top = y - ph - 8

  popupStyle.value = { left: `${left}px`, top: `${top}px` }
  popupChar.value = char
  popupPinyin.value = charPinyin
  popupMeaning.value = meaning
  popupVisible.value = true

  nextTick(() => {
    document.addEventListener('click', onDocumentClick)
  })
}

function closePopup() {
  popupVisible.value = false
  document.removeEventListener('click', onDocumentClick)
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (popupRef.value?.contains(target)) return
  if (popupVisible.value) closePopup()
}

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <span class="pr-text">
    <template v-for="(seg, i) in segments" :key="i">
      <span
        v-if="seg.isChinese"
        class="pr-char"
        @click.stop="handleClick($event, i)"
      >{{ seg.char }}</span>
      <template v-else>{{ seg.char }}</template>
    </template>

    <!-- popup -->
    <Teleport to="body">
      <div
        v-if="popupVisible"
        ref="popupRef"
        class="pr-popup"
        :style="popupStyle"
      >
        <div class="pr-popup-char">{{ popupChar }}</div>
        <div class="pr-popup-pinyin">{{ popupPinyin }}</div>
        <div v-if="popupMeaning" class="pr-popup-meaning">{{ popupMeaning }}</div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.pr-text {
  line-height: 2;
}

.pr-char {
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.1s;
  position: relative;
}
.pr-char:hover {
  background: rgba(37, 99, 235, 0.08);
}
.pr-char:active {
  background: rgba(37, 99, 235, 0.15);
}

/* Popup */
.pr-popup {
  position: fixed;
  z-index: 10000;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  min-width: 90px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  animation: prFadeIn 0.15s ease-out;
  pointer-events: auto;
}
@keyframes prFadeIn {
  from { opacity: 0; transform: translateY(4px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.pr-popup-char {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
.pr-popup-pinyin {
  font-size: 14px;
  color: #2563eb;
  font-weight: 500;
  margin-top: 2px;
}
.pr-popup-meaning {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
  line-height: 1.4;
  border-top: 1px solid #f1f5f9;
  padding-top: 6px;
}
</style>
