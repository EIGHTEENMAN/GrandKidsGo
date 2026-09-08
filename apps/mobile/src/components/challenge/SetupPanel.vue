<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  loggedIn: boolean
}>()

const emit = defineEmits<{
  (e: 'start-solo', payload: { subjects: string[]; difficulty: number; section_ref?: string }): void
  (e: 'create-room', payload: { subjects: string[]; difficulty: number; teamSize: number }): void
  (e: 'join-room', code: string): void
  (e: 'quick-match', payload: { subjects: string[]; difficulty: number }): void
  (e: 'show-login'): void
}>()

// 科目（与 xiaodada QuizBattle.tsx 保持一致）
const SUBJECTS = [
  { id: 'shici', name: '诗词', icon: '📜' },
  { id: 'guoxue', name: '国学', icon: '📖' },
  { id: 'english', name: '英语', icon: '🔤' },
  { id: 'science', name: '科学', icon: '🔬' },
  { id: 'general', name: '通识', icon: '🌍' },
]

const DIFFICULTIES = [
  { label: '全部', value: 0 },
  { label: '简单', value: 1 },
  { label: '普通', value: 2 },
  { label: '困难', value: 3 },
]

const TEAM_SIZES = [1, 2, 3, 4, 5]

const selectedSubjects = ref<string[]>([])
const difficulty = ref(0)
const teamSize = ref(1)
const roomCodeInput = ref('')
const mode = ref<'solo' | 'online'>('solo')

function toggleSubject(id: string) {
  if (selectedSubjects.value.includes(id)) {
    selectedSubjects.value = selectedSubjects.value.filter(s => s !== id)
  } else {
    selectedSubjects.value = [...selectedSubjects.value, id]
  }
}

function selectAll() {
  selectedSubjects.value = selectedSubjects.value.length === SUBJECTS.length
    ? []
    : SUBJECTS.map(s => s.id)
}

const canStart = computed(() => selectedSubjects.value.length > 0)

function handleStart() {
  if (!props.loggedIn) {
    emit('show-login')
    return
  }
  if (mode.value === 'solo') {
    emit('start-solo', {
      subjects: selectedSubjects.value,
      difficulty: difficulty.value,
    })
  } else {
    emit('create-room', {
      subjects: selectedSubjects.value,
      difficulty: difficulty.value,
      teamSize: teamSize.value,
    })
  }
}

function handleQuickMatch() {
  if (!props.loggedIn) {
    emit('show-login')
    return
  }
  emit('quick-match', {
    subjects: selectedSubjects.value,
    difficulty: difficulty.value,
  })
}

function handleJoin() {
  const code = roomCodeInput.value.trim().toUpperCase()
  if (!code) return
  if (!props.loggedIn) {
    emit('show-login')
    return
  }
  emit('join-room', code)
}
</script>

<template>
  <view class="setup-panel">
    <!-- 模式切换 -->
    <view class="mode-tabs">
      <view
        :class="['mode-tab', mode === 'solo' ? 'mode-tab-active' : '']"
        @tap="mode = 'solo'"
      >
        <text>📚 单人练习</text>
      </view>
      <view
        :class="['mode-tab', mode === 'online' ? 'mode-tab-active' : '']"
        @tap="mode = 'online'"
      >
        <text>⚡ 在线对战</text>
      </view>
    </view>

    <!-- 科目选择 -->
    <view class="section">
      <text class="section-label">📚 科目（可多选）</text>
      <view class="subject-grid">
        <view
          v-for="s in SUBJECTS"
          :key="s.id"
          :class="['subject-card', selectedSubjects.includes(s.id) ? 'subject-selected' : '']"
          @tap="toggleSubject(s.id)"
        >
          <text class="subject-icon">{{ s.icon }}</text>
          <text class="subject-name">{{ s.name }}</text>
        </view>
      </view>
      <view class="select-all-row">
        <text class="select-all-btn" @tap="selectAll">
          {{ selectedSubjects.length === SUBJECTS.length ? '取消全选' : '全选' }}
        </text>
      </view>
    </view>

    <!-- 难度选择 -->
    <view class="section">
      <text class="section-label">🎯 难度</text>
      <view class="difficulty-row">
        <view
          v-for="d in DIFFICULTIES"
          :key="d.value"
          :class="['diff-btn', difficulty === d.value ? 'diff-selected' : '']"
          @tap="difficulty = d.value"
        >
          <text>{{ d.label }}</text>
        </view>
      </view>
    </view>

    <!-- 房间设置（仅在线模式） -->
    <template v-if="mode === 'online'">
      <view class="section">
        <text class="section-label">👥 队伍人数</text>
        <view class="team-size-row">
          <view
            v-for="n in TEAM_SIZES"
            :key="n"
            :class="['team-size-btn', teamSize === n ? 'team-size-selected' : '']"
            @tap="teamSize = n"
          >
            <text class="team-size-num">{{ n }}v{{ n }}</text>
            <text class="team-size-label">每队{{ n }}人</text>
          </view>
        </view>
      </view>

      <view class="action-row">
        <view class="btn-primary" @tap="handleStart">
          <text>🏠 创建房间</text>
        </view>
        <view class="btn-secondary" @tap="handleQuickMatch">
          <text>⚡ 快速匹配</text>
        </view>
      </view>

      <view class="join-section">
        <text class="join-label">已有房间码？</text>
        <view class="join-row">
          <input
            v-model="roomCodeInput"
            class="join-input"
            placeholder="输入房间码"
            maxlength="7"
            placeholder-style="color:#94a3b8"
            @confirm="handleJoin"
          />
          <view class="btn-primary join-btn" @tap="handleJoin">
            <text>加入</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 开始按钮（单人模式） -->
    <template v-else>
      <view class="action-row">
        <view
          :class="['btn-primary', canStart ? '' : 'btn-disabled']"
          @tap="handleStart"
        >
          <text>🚀 {{ canStart ? '开始练习' : '请先选科目' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.setup-panel {
  padding: 24rpx 32rpx;
}

/* 模式切换 */
.mode-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 32rpx;
  background: #f1f5f9;
  padding: 6rpx;
  border-radius: 16rpx;
}
.mode-tab {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #64748b;
}
.mode-tab-active {
  background: #ffffff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

/* 通用 section */
.section {
  margin-bottom: 32rpx;
}
.section-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
}

/* 科目网格 */
.subject-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
}
.subject-card {
  padding: 24rpx 8rpx;
  text-align: center;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  background: #ffffff;
  transition: all 0.2s;
}
.subject-selected {
  border-color: #2563eb;
  background: #eff6ff;
}
.subject-icon {
  display: block;
  font-size: 40rpx;
  margin-bottom: 8rpx;
}
.subject-name {
  display: block;
  font-size: 22rpx;
  color: #0f172a;
}
.select-all-row {
  text-align: center;
  margin-top: 12rpx;
}
.select-all-btn {
  display: inline-block;
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 12rpx;
}

/* 难度 */
.difficulty-row {
  display: flex;
  gap: 12rpx;
}
.diff-btn {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  border: 2rpx solid #e2e8f0;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #64748b;
  background: #ffffff;
}
.diff-selected {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

/* 队伍人数 */
.team-size-row {
  display: flex;
  gap: 12rpx;
}
.team-size-btn {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  border: 2rpx solid #e2e8f0;
  border-radius: 12rpx;
  background: #ffffff;
}
.team-size-selected {
  border-color: #2563eb;
  background: #eff6ff;
}
.team-size-num {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}
.team-size-label {
  display: block;
  font-size: 20rpx;
  color: #64748b;
  margin-top: 4rpx;
}

/* 按钮 */
.action-row {
  display: flex;
  gap: 16rpx;
  margin: 32rpx 0;
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
.btn-disabled {
  background: #cbd5e1 !important;
  color: #ffffff;
}

/* 加入房间 */
.join-section {
  margin-top: 32rpx;
  padding: 24rpx;
  background: #f8fafc;
  border-radius: 16rpx;
}
.join-label {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 12rpx;
}
.join-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.join-input {
  flex: 1;
  padding: 20rpx 24rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 12rpx;
  font-size: 30rpx;
  letter-spacing: 4rpx;
  text-align: center;
  background: #ffffff;
}
.join-btn {
  flex: 0 0 auto;
  padding: 20rpx 32rpx !important;
}
</style>