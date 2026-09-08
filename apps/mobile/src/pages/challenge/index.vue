<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SetupPanel from '@/components/challenge/SetupPanel.vue'
import LobbyPanel from '@/components/challenge/LobbyPanel.vue'
import PlayPanel from '@/components/challenge/PlayPanel.vue'
import {
  checkAuth,
  getSoloQuestions,
  recordSolo,
  type QuizQuestion,
} from '@/utils/challenge-api'
import {
  getChallengeSocket,
  destroyChallengeSocket,
  type ClientMessage,
  type ServerMessage,
} from '@/utils/challenge-ws'

type Phase = 'setup' | 'lobby' | 'playing' | 'result'

interface Player {
  userId: string
  username: string
}
interface TeamPlayer extends Player {
  score?: number
}
interface MatchResult {
  isWinner: boolean
  isDraw: boolean
  message: string
  teamScore: number
  opponentScore: number
  teamMembers: string[]
  opponents: string[]
  team1: TeamPlayer[]
  team2: TeamPlayer[]
}
interface QuestionView {
  questionNumber: number
  totalQuestions: number
  question: string
  options: string[]
  category: string
  difficulty: number
  timeLimit: number
  correctAnswer?: number
}

const phase = ref<Phase>('setup')
const loggedIn = ref(false)
const myUserId = ref('')
const myTeam = ref<'team1' | 'team2'>('team1')

// 通用
const loading = ref(false)
const errorMsg = ref('')

// 房间/对战
const isQueueing = ref(false)
const roomCode = ref('')
const team1 = ref<Player[]>([])
const team2 = ref<Player[]>([])
const teamSize = ref(1)
const isHost = ref(false)
const countdown = ref<number | null>(null)
const currentQuestion = ref<QuestionView | null>(null)
const selected = ref<number | null>(null)
const answered = ref(false)
const timeLeft = ref(10)
const scores = ref<Record<string, number>>({})
const result = ref<MatchResult | null>(null)

// 单人
const soloQuestions = ref<QuizQuestion[]>([])
const soloIndex = ref(0)
const soloCorrect = ref(0)
const soloDone = ref(false)
const soloLoading = ref(false)

// WebSocket 监听器取消函数
let unsubscribeWs: (() => void) | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

const team1Total = computed(() => {
  if (result.value) return result.value.team1.reduce((s, p) => s + (p.score || 0), 0)
  return team1.value.reduce((s, p) => s + (scores.value[p.userId] || 0), 0)
})
const team2Total = computed(() => {
  if (result.value) return result.value.team2.reduce((s, p) => s + (p.score || 0), 0)
  return team2.value.reduce((s, p) => s + (scores.value[p.userId] || 0), 0)
})

onMounted(async () => {
  const token = uni.getStorageSync('grandkidsgo_token')
  if (!token) return
  try {
    const res = await checkAuth()
    if (res.code === 'OK' && res.data) {
      loggedIn.value = true
      myUserId.value = res.data.id
    }
  } catch (err) {
    console.warn('[challenge] checkAuth failed', err)
  }
  setupWs()
})

onUnmounted(() => {
  cleanup()
})

onLoad((options) => {
  // 处理房间邀请深链: ?room=ABCD-T1
  if (options?.room) {
    handleJoinRoom(String(options.room).toUpperCase())
  }
})

function setupWs() {
  const sock = getChallengeSocket()
  unsubscribeWs = sock.on(handleServerMessage)
}

function cleanup() {
  if (unsubscribeWs) {
    unsubscribeWs()
    unsubscribeWs = null
  }
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  destroyChallengeSocket()
}

function sendWs(msg: ClientMessage) {
  getChallengeSocket().send(msg)
}

function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case 'connected':
      break
    case 'error':
      uni.showToast({ title: msg.message, icon: 'none' })
      // token 无效时回到 setup
      if (msg.message.includes('登录')) {
        phase.value = 'setup'
        loggedIn.value = false
      }
      break
    case 'room_created':
      roomCode.value = msg.roomCode
      teamSize.value = msg.teamSize
      team1.value = msg.team1
      team2.value = msg.team2
      isHost.value = true
      myTeam.value = 'team1'
      phase.value = 'lobby'
      isQueueing.value = false
      break
    case 'room_update':
      team1.value = msg.team1
      team2.value = msg.team2
      teamSize.value = msg.teamSize
      break
    case 'match_starting':
      countdown.value = msg.countdown
      break
    case 'match_start_cancelled':
      countdown.value = null
      break
    case 'match_found':
    case 'match_start':
      isQueueing.value = false
      phase.value = 'playing'
      result.value = null
      scores.value = {}
      countdown.value = null
      team1.value = msg.team1 ?? team1.value
      team2.value = msg.team2 ?? team2.value
      myTeam.value = isMeInTeam(team1.value) ? 'team1' : 'team2'
      break
    case 'question':
      currentQuestion.value = {
        questionNumber: msg.questionNumber,
        totalQuestions: msg.totalQuestions,
        question: msg.question,
        options: msg.options,
        category: msg.category,
        difficulty: msg.difficulty,
        timeLimit: msg.timeLimit,
      }
      selected.value = null
      answered.value = false
      timeLeft.value = msg.timeLimit || 10
      startLocalTimer()
      break
    case 'answer_result':
      scores.value = msg.scores
      // 显示正确答案（reveal 模式）
      if (currentQuestion.value && currentQuestion.value.correctAnswer === undefined) {
        // 服务端 answer_result 不返回正确答案；reveal 由 question 重发或客户端保持
      }
      break
    case 'timeout':
      currentQuestion.value = null
      break
    case 'surrender_update':
      break
    case 'match_end':
      result.value = msg
      currentQuestion.value = null
      phase.value = 'result'
      stopLocalTimer()
      break
    case 'queue_status':
      // 1v1 自动匹配；不显示进度（直接跳到 match_found）
      break
  }
}

function startLocalTimer() {
  stopLocalTimer()
  timerInterval = setInterval(() => {
    timeLeft.value -= 1
    if (timeLeft.value <= 0) {
      stopLocalTimer()
    }
  }, 1000)
}

function stopLocalTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function isMeInTeam(team: Player[]): boolean {
  return team.some(p => p.userId === myUserId.value)
}

// ===== 用户事件 =====

function handleStartSolo(payload: { subjects: string[]; difficulty: number }) {
  phase.value = 'playing'
  soloLoading.value = true
  soloQuestions.value = []
  soloIndex.value = 0
  soloCorrect.value = 0
  soloDone.value = false
  loading.value = true
  errorMsg.value = ''
  getSoloQuestions({
    subjects: payload.subjects,
    difficulty: payload.difficulty,
    limit: 15,
  })
    .then((qs) => {
      if (qs.length === 0) {
        uni.showToast({ title: '没有符合条件的题目', icon: 'none' })
        phase.value = 'setup'
        return
      }
      soloQuestions.value = qs
      presentSoloQuestion()
    })
    .catch((err) => {
      errorMsg.value = err.message || '获取题目失败'
      uni.showToast({ title: errorMsg.value, icon: 'none' })
      phase.value = 'setup'
    })
    .finally(() => {
      loading.value = false
      soloLoading.value = false
    })
}

function presentSoloQuestion() {
  if (soloIndex.value >= soloQuestions.value.length) {
    finishSolo()
    return
  }
  const q = soloQuestions.value[soloIndex.value]
  currentQuestion.value = {
    questionNumber: soloIndex.value + 1,
    totalQuestions: soloQuestions.value.length,
    question: q.question,
    options: parseOpts(q.options),
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: 10,
    correctAnswer: q.answer,
  }
  selected.value = null
  answered.value = false
  timeLeft.value = 10
  startLocalTimer()
}

function parseOpts(opts: string): string[] {
  try {
    const arr = JSON.parse(opts)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function handleSoloAnswer(idx: number) {
  if (answered.value) return
  selected.value = idx
  answered.value = true
  stopLocalTimer()
  const q = soloQuestions.value[soloIndex.value]
  const isCorrect = idx === q.answer
  if (isCorrect) {
    soloCorrect.value += 1
    setTimeout(() => {
      soloIndex.value += 1
      presentSoloQuestion()
    }, 1500)
  } else {
    setTimeout(() => {
      finishSolo()
    }, 1500)
  }
}

function finishSolo() {
  soloDone.value = true
  currentQuestion.value = null
  // 落库
  if (loggedIn.value) {
    recordSolo({
      totalQuestions: soloIndex.value + 1,
      totalCorrect: soloCorrect.value,
      bestStreak: soloCorrect.value,
      category: soloQuestions.value[0]?.category || 'mixed',
    }).catch(() => { /* 静默失败 */ })
  }
}

function handleCreateRoom(payload: { subjects: string[]; difficulty: number; teamSize: number }) {
  teamSize.value = payload.teamSize
  sendWs({
    type: 'create_room',
    subjects: payload.subjects,
    difficulty: payload.difficulty,
    teamSize: payload.teamSize,
  })
}

function handleQuickMatch(_payload: { subjects: string[]; difficulty: number }) {
  isQueueing.value = true
  phase.value = 'lobby'
  sendWs({ type: 'join_queue' })
}

function handleJoinRoom(code: string) {
  roomCode.value = code
  isHost.value = false
  sendWs({ type: 'join_room', roomCode: code })
}

function handleStartMatch() {
  sendWs({ type: 'start_match' })
}

function handleAnswer(idx: number) {
  if (answered.value) return
  selected.value = idx
  answered.value = true
  sendWs({ type: 'submit_answer', answer: idx })
}

function handleSurrender() {
  sendWs({ type: 'surrender' })
}

function handleLeave() {
  sendWs({ type: 'leave_room' })
  sendWs({ type: 'leave_queue' })
  phase.value = 'setup'
  roomCode.value = ''
  team1.value = []
  team2.value = []
  countdown.value = null
  result.value = null
  currentQuestion.value = null
}

function handlePlayAgain() {
  handleLeave()
  phase.value = 'setup'
}

function handleBack() {
  handleLeave()
}

function handleRePickSession() {
  handleLeave()
}

function handleShowLogin() {
  uni.navigateTo({ url: '/pages/mine/login' })
}
</script>

<template>
  <view class="challenge-page">
    <!-- setup: 选择模式 + 科目 + 难度 -->
    <SetupPanel
      v-if="phase === 'setup'"
      :logged-in="loggedIn"
      @start-solo="handleStartSolo"
      @create-room="handleCreateRoom"
      @quick-match="handleQuickMatch"
      @join-room="handleJoinRoom"
      @show-login="handleShowLogin"
    />

    <!-- lobby / queue -->
    <LobbyPanel
      v-else-if="phase === 'lobby'"
      :my-user-id="myUserId"
      :room-code="roomCode"
      :team1="team1"
      :team2="team2"
      :team-size="teamSize"
      :is-host="isHost"
      :is-queueing="isQueueing"
      :countdown="countdown"
      @start-match="handleStartMatch"
      @leave="handleLeave"
    />

    <!-- playing / result -->
    <PlayPanel
      v-else
      :my-user-id="myUserId"
      :my-team="myTeam"
      :question="currentQuestion"
      :solo-index="soloIndex"
      :solo-total="soloQuestions.length"
      :selected="selected"
      :answered="answered"
      :correct-answer="currentQuestion?.correctAnswer ?? null"
      :time-left="timeLeft"
      :solo-streak="soloCorrect"
      :team1-total="team1Total"
      :team2-total="team2Total"
      :result="result"
      :solo-done="soloDone"
      :solo-correct="soloCorrect"
      @answer="(idx) => soloQuestions.length > 0 ? handleSoloAnswer(idx) : handleAnswer(idx)"
      @surrender="handleSurrender"
      @play-again="handlePlayAgain"
      @back="handleBack"
      @re-pick-session="handleRePickSession"
    />
  </view>
</template>

<style scoped>
.challenge-page {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 48rpx;
}
</style>