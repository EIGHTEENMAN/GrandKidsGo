<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  subject: string
  sectionRef: string
  serverUrl?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const questions = ref<any[]>([])
const currentIndex = ref(0)
const selectedAnswer = ref<number | null>(null)
const showResult = ref(false)
const correctCount = ref(0)

watch(() => props.visible, async (v) => {
  if (v) await loadQuestions()
  else reset()
})

function reset() {
  loading.value = false
  questions.value = []
  currentIndex.value = 0
  selectedAnswer.value = null
  showResult.value = false
  correctCount.value = 0
}

async function loadQuestions() {
  loading.value = true
  try {
    const base = props.serverUrl || ''
    const url = `${base}/api/quiz/solo?subjects=${props.subject}&section_ref=${encodeURIComponent(props.sectionRef)}&limit=3`
    const res = await fetch(url)
    const d = await res.json()
    if (Array.isArray(d) && d.length > 0) {
      questions.value = d
    } else {
      emit('close')
    }
  } catch {
    emit('close')
  } finally {
    loading.value = false
  }
}

function selectAnswer(i: number) {
  if (selectedAnswer.value !== null) return
  selectedAnswer.value = i
  if (i === questions.value[currentIndex.value].answer) correctCount.value++

  setTimeout(() => {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
      selectedAnswer.value = null
    } else {
      showResult.value = true
    }
  }, 1500)
}

function retry() {
  reset()
  loadQuestions()
}
</script>

<template>
  <div v-if="visible" class="rc-overlay" @click.self="emit('close')">
    <div class="rc-card">
      <!-- Loading -->
      <div v-if="loading" class="rc-state">
        <div class="rc-spinner"></div>
        <p class="rc-state-text">出题中...</p>
      </div>

      <!-- Question -->
      <template v-if="!loading && !showResult && questions.length > 0">
        <div class="rc-header">
          <span class="rc-title">来挑战一下！</span>
          <span class="rc-progress">{{ currentIndex + 1 }}/{{ questions.length }}</span>
        </div>
        <p class="rc-question">{{ questions[currentIndex].question }}</p>
        <div class="rc-options">
          <button
            v-for="(opt, i) in JSON.parse(questions[currentIndex].options)"
            :key="i"
            class="rc-option"
            :class="{
              'rc-correct': selectedAnswer !== null && i === questions[currentIndex].answer,
              'rc-wrong': selectedAnswer !== null && i === selectedAnswer && i !== questions[currentIndex].answer,
              'rc-disabled': selectedAnswer !== null,
            }"
            :disabled="selectedAnswer !== null"
            @click="selectAnswer(i)"
          >
            <span class="rc-opt-label">{{ 'ABCD'[i] }}</span>
            <span class="rc-opt-text">{{ opt }}</span>
          </button>
        </div>
      </template>

      <!-- Result -->
      <div v-if="!loading && showResult" class="rc-state">
        <div class="rc-result-icon">{{ correctCount === questions.length ? '🎉' : correctCount >= questions.length / 2 ? '👍' : '💪' }}</div>
        <p class="rc-result-title">挑战完成！</p>
        <p class="rc-result-text">答对 {{ correctCount }}/{{ questions.length }} 题</p>
        <div class="rc-actions">
          <button class="rc-btn rc-btn-primary" @click="retry">再来一组</button>
          <button class="rc-btn rc-btn-secondary" @click="emit('close')">返回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rc-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: rcFadeIn 0.2s ease-out;
}
@keyframes rcFadeIn { from { opacity: 0; } to { opacity: 1; } }
.rc-card {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 480px;
  max-height: 80vh; overflow-y: auto;
  padding: 28px 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: rcSlideUp 0.25s ease-out;
}
@keyframes rcSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rc-state { text-align: center; padding: 40px 20px; }
.rc-spinner {
  width: 36px; height: 36px; border: 3px solid #e2e8f0;
  border-top-color: #2563eb; border-radius: 50%;
  animation: rcSpin 0.6s linear infinite; margin: 0 auto 16px;
}
@keyframes rcSpin { to { transform: rotate(360deg); } }
.rc-state-text { font-size: 14px; color: #94a3b8; }
.rc-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.rc-title { font-size: 18px; font-weight: 700; color: #0f172a; }
.rc-progress { font-size: 13px; color: #94a3b8; font-weight: 500; }
.rc-question {
  font-size: 16px; font-weight: 600; color: #0f172a;
  line-height: 1.6; margin-bottom: 20px;
}
.rc-options { display: flex; flex-direction: column; gap: 10px; }
.rc-option {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 12px;
  border: 2px solid #e2e8f0; background: #fff;
  cursor: pointer; transition: all 0.15s; text-align: left;
  font-size: 14px;
}
.rc-option:hover:not(.rc-disabled) { border-color: #93c5fd; background: #f0f9ff; }
.rc-correct { border-color: #22c55e !important; background: #f0fdf4 !important; }
.rc-wrong { border-color: #ef4444 !important; background: #fef2f2 !important; }
.rc-disabled { cursor: default; opacity: 0.85; }
.rc-opt-label {
  width: 26px; height: 26px; border-radius: 8px;
  background: #f1f5f9; display: flex; align-items: center;
  justify-content: center; font-size: 13px; font-weight: 700;
  color: #64748b; flex-shrink: 0;
}
.rc-option.rc-correct .rc-opt-label { background: #22c55e; color: #fff; }
.rc-option.rc-wrong .rc-opt-label { background: #ef4444; color: #fff; }
.rc-opt-text { flex: 1; color: #334155; line-height: 1.4; }
.rc-result-icon { font-size: 48px; margin-bottom: 12px; }
.rc-result-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
.rc-result-text { font-size: 15px; color: #64748b; margin-bottom: 24px; }
.rc-actions { display: flex; gap: 12px; justify-content: center; }
.rc-btn {
  padding: 10px 24px; border-radius: 10px; font-size: 14px;
  font-weight: 600; border: none; cursor: pointer; transition: all 0.2s;
}
.rc-btn-primary { background: #2563eb; color: #fff; }
.rc-btn-primary:hover { background: #1d4ed8; }
.rc-btn-secondary { background: #f1f5f9; color: #475569; }
.rc-btn-secondary:hover { background: #e2e8f0; }
</style>
