<script setup lang="ts">
import { computed } from 'vue'

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
}

const props = defineProps<{
  myUserId: string
  myTeam: 'team1' | 'team2'
  /** 当前正在答题（可能是单人题或对战题）；null = 等待下一题 */
  question: QuestionView | null
  /** 单人模式下显示 */
  soloIndex?: number
  soloTotal?: number
  /** 玩家已选答案索引，null = 还没选 */
  selected: number | null
  /** 玩家是否已答过（不可再选） */
  answered: boolean
  /** 正确答案（用于显示） */
  correctAnswer: number | null
  /** 当前题剩余秒数 */
  timeLeft: number
  /** 单人模式连对数 */
  soloStreak?: number
  /** 在线模式：双方总分 */
  team1Total: number
  team2Total: number
  /** 对战结束结果（null = 还在进行） */
  result: MatchResult | null
  /** 单人模式结束（不依赖 result） */
  soloDone?: boolean
  soloCorrect?: number
}>()

const emit = defineEmits<{
  (e: 'answer', idx: number): void
  (e: 'surrender'): void
  (e: 'next-question'): void
  (e: 'play-again'): void
  (e: 'back'): void
  (e: 're-pick-session'): void
}>()

const SUBJECT_LABELS: Record<string, string> = {
  shici: '诗词', guoxue: '国学', english: '英语', science: '科学', general: '通识',
  chinese: '诗词', mixed: '综合',
}

const difficultyLabel = computed(() => {
  if (!props.question) return ''
  return props.question.difficulty >= 2 ? ` · ⭐难度${props.question.difficulty}` : ''
})

const subjectLabel = computed(() => {
  if (props.question) return SUBJECT_LABELS[props.question.category] || props.question.category
  return ''
})

const isUrgent = computed(() => props.timeLeft <= 3)

const optionClass = (idx: number): string => {
  if (!props.question) return ''
  const isSelected = props.selected === idx
  if (isSelected) {
    if (props.answered) {
      return idx === props.correctAnswer ? 'opt-correct' : 'opt-wrong'
    }
    return 'opt-selected'
  }
  // 未选：但已答过则高亮正确选项
  if (props.answered && idx === props.correctAnswer) {
    return 'opt-correct-reveal'
  }
  return ''
}

function handleAnswer(idx: number) {
  if (props.answered) return
  emit('answer', idx)
}
function handleSurrender() {
  uni.showModal({
    title: '投降',
    content: '确定要投降吗？',
    success: (res) => {
      if (res.confirm) emit('surrender')
    },
  })
}
</script>

<template>
  <view class="play-panel">
    <!-- 顶部信息条 -->
    <view class="play-header">
      <text v-if="question" class="timer-badge" :class="{ 'timer-urgent': isUrgent }">
        ⏱ {{ timeLeft }}s
      </text>
      <text v-else-if="soloTotal && soloIndex !== undefined" class="header-info">
        🔥 第 {{ soloIndex + 1 }}/{{ soloTotal }} 题
      </text>
    </view>

    <!-- 答题中（在线） -->
    <view v-if="question && result === null" class="quiz-card animate-fadeInUp" :key="question.questionNumber">
      <view class="question-progress">
        <view class="progress-bar">
          <view
            class="progress-fill"
            :style="{ width: ((question.questionNumber / question.totalQuestions) * 100) + '%' }"
          />
        </view>
        <text class="progress-text">{{ question.questionNumber }}/{{ question.totalQuestions }}</text>
      </view>
      <text class="question-number">
        第 {{ question.questionNumber }}/{{ question.totalQuestions }} 题 · {{ subjectLabel }}{{ difficultyLabel }}
      </text>
      <text class="question-text">{{ question.question }}</text>
      <view class="options">
        <view
          v-for="(opt, i) in question.options"
          :key="i"
          :class="['option-btn', optionClass(i)]"
          @tap="handleAnswer(i)"
        >
          <text>{{ opt }}</text>
        </view>
      </view>
      <view class="score-bar">
        <text class="score-red">🔴 红队：{{ team1Total }} 分</text>
        <text class="score-blue">🔵 蓝队：{{ team2Total }} 分</text>
      </view>
      <view class="surrender-row">
        <view class="btn-surrender" @tap="handleSurrender">
          <text>🏳️ 投降</text>
        </view>
      </view>
    </view>

    <!-- 答题中（单人） -->
    <view
      v-else-if="question && soloTotal && soloIndex !== undefined"
      class="quiz-card animate-fadeInUp"
      :key="`solo-${soloIndex}`"
    >
      <view class="question-progress">
        <view class="progress-bar">
          <view
            class="progress-fill"
            :style="{ width: (((soloIndex + 1) / soloTotal) * 100) + '%' }"
          />
        </view>
        <text class="progress-text">{{ soloIndex + 1 }}/{{ soloTotal }}</text>
      </view>
      <text class="question-number">
        第 {{ soloIndex + 1 }}/{{ soloTotal }} 题 · {{ subjectLabel }}
      </text>
      <text class="question-text">{{ question.question }}</text>
      <view class="options">
        <view
          v-for="(opt, i) in question.options"
          :key="i"
          :class="['option-btn', optionClass(i)]"
          @tap="handleAnswer(i)"
        >
          <text>{{ opt }}</text>
        </view>
      </view>
      <view class="solo-streak">
        <text>🔥 已连胜 {{ soloStreak }} 题</text>
      </view>
    </view>

    <!-- 单人结算 -->
    <view v-else-if="soloDone" class="solo-result quiz-card animate-scaleIn">
      <text class="result-icon">🏆</text>
      <text class="result-title">
        {{ soloCorrect === soloTotal ? '🎉 全部答对！' : '挑战结束！' }}
      </text>
      <text class="score-detail">
        你连续答对了 <text class="highlight">{{ soloCorrect }}</text> 道题
      </text>
      <view class="stats">
        <view class="stat-item">
          <text class="stat-num">{{ soloCorrect }}</text>
          <text class="stat-lbl">连胜</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ Math.min((soloCorrect ?? 0) + 1, soloTotal ?? 0) }}</text>
          <text class="stat-lbl">总答题</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">
            {{ soloTotal && soloTotal > 0
              ? Math.round(((soloCorrect ?? 0) / Math.min(((soloIndex ?? 0) + 1), soloTotal)) * 100) + '%'
              : '0%' }}
          </text>
          <text class="stat-lbl">正确率</text>
        </view>
      </view>
      <view class="action-row">
        <view class="btn-primary" @tap="emit('back')">
          <text>返回首页</text>
        </view>
        <view class="btn-secondary" @tap="emit('re-pick-session')">
          <text>重新选择</text>
        </view>
      </view>
    </view>

    <!-- 对战结算 -->
    <view v-else-if="result" class="quiz-result quiz-card animate-scaleIn">
      <text class="result-icon">
        {{ result.isWinner ? '🎉' : result.isDraw ? '🤝' : '💪' }}
      </text>
      <text class="result-title">{{ result.message }}</text>
      <view class="result-teams">
        <view class="result-team result-team-red">
          <text class="rt-label">🔴 红队</text>
          <text class="rt-score">{{ result.team1.reduce((s, p) => s + (p.score || 0), 0) }}</text>
          <view class="rt-members">
            <view v-for="p in result.team1" :key="p.userId" class="rt-member">
              <text>{{ p.userId === myUserId ? '⭐ ' : '' }}{{ p.username }}</text>
              <text class="rt-member-score">+{{ p.score || 0 }}</text>
            </view>
          </view>
        </view>
        <view class="result-vs"><text>VS</text></view>
        <view class="result-team result-team-blue">
          <text class="rt-label">🔵 蓝队</text>
          <text class="rt-score">{{ result.team2.reduce((s, p) => s + (p.score || 0), 0) }}</text>
          <view class="rt-members">
            <view v-for="p in result.team2" :key="p.userId" class="rt-member">
              <text>{{ p.userId === myUserId ? '⭐ ' : '' }}{{ p.username }}</text>
              <text class="rt-member-score">+{{ p.score || 0 }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="action-row">
        <view class="btn-primary" @tap="emit('play-again')">
          <text>再来一局</text>
        </view>
        <view class="btn-secondary" @tap="emit('back')">
          <text>返回首页</text>
        </view>
      </view>
    </view>

    <!-- 等待下一题 -->
    <view v-else class="quiz-card waiting">
      <view class="spinner" />
      <text>等待题目...</text>
    </view>
  </view>
</template>

<style scoped>
.play-panel {
  padding: 16rpx 32rpx;
}
.play-header {
  text-align: center;
  margin-bottom: 16rpx;
}
.header-info {
  font-size: 26rpx;
  color: #64748b;
}
.timer-badge {
  display: inline-block;
  padding: 8rpx 24rpx;
  background: #f1f5f9;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}
.timer-urgent {
  background: #fef2f2;
  color: #dc2626;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.quiz-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 2rpx solid #e2e8f0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx;
  gap: 16rpx;
}

/* 进度条 */
.question-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.progress-bar {
  flex: 1;
  height: 8rpx;
  background: #e2e8f0;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s;
}
.progress-text {
  font-size: 22rpx;
  color: #64748b;
  font-weight: 500;
}

.question-number {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 12rpx;
}
.question-text {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.5;
  margin-bottom: 32rpx;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.option-btn {
  padding: 24rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  background: #ffffff;
  font-size: 30rpx;
  color: #0f172a;
  transition: all 0.2s;
}
.opt-selected {
  border-color: #2563eb;
  background: #eff6ff;
}
.opt-correct {
  border-color: #10b981;
  background: #d1fae5;
  color: #065f46;
  font-weight: 600;
}
.opt-wrong {
  border-color: #ef4444;
  background: #fee2e2;
  color: #991b1b;
}
.opt-correct-reveal {
  border-color: #10b981;
  background: #f0fdf4;
}

.score-bar {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 16rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 500;
}
.score-red { color: #dc2626; }
.score-blue { color: #2563eb; }

.solo-streak {
  text-align: center;
  margin-top: 24rpx;
  padding: 12rpx;
  background: #fef3c7;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #92400e;
}

.surrender-row {
  text-align: center;
  margin-top: 24rpx;
}
.btn-surrender {
  display: inline-block;
  padding: 12rpx 32rpx;
  border: 2rpx solid #ef4444;
  color: #ef4444;
  border-radius: 12rpx;
  font-size: 24rpx;
  background: #ffffff;
}

/* 结算 */
.result-icon {
  display: block;
  font-size: 96rpx;
  text-align: center;
  margin-bottom: 16rpx;
}
.result-title {
  display: block;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16rpx;
}
.score-detail {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: #64748b;
  margin-bottom: 32rpx;
}
.highlight {
  color: #2563eb;
  font-weight: 700;
  font-size: 36rpx;
}
.stats {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.stat-item {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  background: #f8fafc;
  border-radius: 16rpx;
}
.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 4rpx;
}
.stat-lbl {
  display: block;
  font-size: 22rpx;
  color: #64748b;
}

.result-teams {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.result-team {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
}
.result-team-red {
  background: #fef2f2;
}
.result-team-blue {
  background: #eff6ff;
}
.rt-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.rt-score {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12rpx;
}
.result-team-red .rt-score { color: #dc2626; }
.result-team-blue .rt-score { color: #2563eb; }
.rt-members {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.rt-member {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  color: #475569;
}
.rt-member-score {
  font-weight: 600;
  color: #0f172a;
}
.result-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #94a3b8;
}

.action-row {
  display: flex;
  gap: 16rpx;
}
.btn-primary {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  background: #2563eb;
  color: #ffffff;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.btn-secondary {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  background: #f1f5f9;
  color: #0f172a;
  border-radius: 16rpx;
  font-size: 30rpx;
}
</style>