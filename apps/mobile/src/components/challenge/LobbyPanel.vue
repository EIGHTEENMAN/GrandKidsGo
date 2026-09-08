<script setup lang="ts">
import { computed } from 'vue'
import { copyToClipboard } from '@/utils/native'

interface Player {
  userId: string
  username: string
}

const props = defineProps<{
  /** 当前用户 id */
  myUserId: string
  roomCode: string
  team1: Player[]
  team2: Player[]
  teamSize: number
  /** 是否房主 */
  isHost: boolean
  /** 是否在快速匹配中（true 时显示 spinner 而不是房间信息） */
  isQueueing: boolean
  /** 比赛开始倒计时（null = 等待中） */
  countdown: number | null
}>()

const emit = defineEmits<{
  (e: 'start-match'): void
  (e: 'leave'): void
}>()

const team1Slots = computed(() => {
  const slots: (Player | null)[] = []
  for (let i = 0; i < props.teamSize; i++) {
    slots.push(props.team1[i] || null)
  }
  return slots
})

const team2Slots = computed(() => {
  const slots: (Player | null)[] = []
  for (let i = 0; i < props.teamSize; i++) {
    slots.push(props.team2[i] || null)
  }
  return slots
})

function isHostOfTeam(team: Player[]): (p: Player | null) => boolean {
  const host = team[0]
  return (p) => p !== null && host !== null && p.userId === host.userId
}

function copyCode() {
  if (props.roomCode) copyToClipboard(props.roomCode)
  uni.showToast({ title: '房间码已复制', icon: 'success' })
}

function copyInvite(team: 'team1' | 'team2') {
  if (!props.roomCode) return
  const suffix = team === 'team1' ? '-T1' : '-T2'
  // mobile 自渲染直接跳到挑战页 URL
  const link = `https://m.grandand.com/pages/challenge/index?room=${props.roomCode}${suffix}`
  copyToClipboard(link)
  uni.showToast({ title: `${team === 'team1' ? '红队' : '蓝队'}邀请链接已复制`, icon: 'success' })
}

function handleStart() {
  emit('start-match')
}
function handleLeave() {
  emit('leave')
}
</script>

<template>
  <!-- 快速匹配等待 -->
  <view v-if="isQueueing" class="queue-panel">
    <view class="spinner" />
    <text class="queue-title">正在为你寻找对手...</text>
    <text class="queue-subtitle">请稍候，正在匹配实力相近的对手</text>
    <view class="btn-secondary leave-btn" @tap="handleLeave">
      <text>取消匹配</text>
    </view>
  </view>

  <!-- 房间大厅 -->
  <view v-else class="lobby-panel">
    <view class="lobby-header">
      <text class="lobby-title">
        {{ countdown !== null ? `⏰ ${countdown}秒后开始...` : '等待队友加入' }}
      </text>
      <view class="room-code-row">
        <text class="room-code-label">房间码：</text>
        <text class="room-code" @tap="copyCode">{{ roomCode }}</text>
        <text class="copy-btn" @tap="copyCode">📋</text>
      </view>
    </view>

    <view class="team-lobby">
      <!-- 红队 -->
      <view class="team-column team-red">
        <view class="team-header">
          <text class="team-label">🔴 红队</text>
          <text class="team-count">{{ team1.length }}/{{ teamSize }}</text>
        </view>
        <view
          v-for="(p, i) in team1Slots"
          :key="`red-${i}`"
          :class="['team-slot', p ? 'slot-filled' : '']"
        >
          <text class="slot-avatar">{{ p ? '🦸' : '⬜' }}</text>
          <view class="slot-info">
            <text class="slot-name">{{ p ? p.username : '等待加入...' }}</text>
            <text class="slot-status">
              {{ p ? (isHostOfTeam(team1)(p) ? '👑 队长' : '✅ 已加入') : '⏳ 等待中' }}
            </text>
          </view>
        </view>
        <view v-if="isHost" class="invite-btn invite-red" @tap="copyInvite('team1')">
          <text>📕 邀请到红队</text>
        </view>
      </view>

      <!-- VS 分隔 -->
      <view class="vs-divider">
        <text>VS</text>
      </view>

      <!-- 蓝队 -->
      <view class="team-column team-blue">
        <view class="team-header">
          <text class="team-label">🔵 蓝队</text>
          <text class="team-count">{{ team2.length }}/{{ teamSize }}</text>
        </view>
        <view
          v-for="(p, i) in team2Slots"
          :key="`blue-${i}`"
          :class="['team-slot', p ? 'slot-filled' : '']"
        >
          <text class="slot-avatar">{{ p ? '🦸' : '⬜' }}</text>
          <view class="slot-info">
            <text class="slot-name">{{ p ? p.username : '等待加入...' }}</text>
            <text class="slot-status">
              {{ p ? (isHostOfTeam(team2)(p) ? '👑 队长' : '✅ 已加入') : '⏳ 等待中' }}
            </text>
          </view>
        </view>
        <view v-if="isHost" class="invite-btn invite-blue" @tap="copyInvite('team2')">
          <text>📘 邀请到蓝队</text>
        </view>
      </view>
    </view>

    <view class="action-row">
      <view
        v-if="isHost && countdown === null"
        class="btn-primary"
        @tap="handleStart"
      >
        <text>🚀 开始对战</text>
      </view>
      <view class="btn-secondary" @tap="handleLeave">
        <text>离开房间</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 快速匹配 */
.queue-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx;
  text-align: center;
}
.spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 32rpx;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.queue-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12rpx;
}
.queue-subtitle {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  margin-bottom: 48rpx;
}
.leave-btn {
  width: 280rpx;
}

/* 房间大厅 */
.lobby-panel {
  padding: 24rpx 32rpx;
}
.lobby-header {
  text-align: center;
  margin-bottom: 24rpx;
}
.lobby-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}
.room-code-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.room-code-label {
  font-size: 26rpx;
  color: #64748b;
}
.room-code {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  color: #2563eb;
}
.copy-btn {
  font-size: 32rpx;
  padding: 4rpx 12rpx;
}

/* 队伍布局 */
.team-lobby {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.team-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.team-red {
  background: #fef2f2;
  padding: 16rpx;
  border-radius: 16rpx;
}
.team-blue {
  background: #eff6ff;
  padding: 16rpx;
  border-radius: 16rpx;
}
.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.team-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #0f172a;
}
.team-count {
  font-size: 24rpx;
  color: #64748b;
}
.team-slot {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx;
  background: #ffffff;
  border-radius: 12rpx;
  border: 2rpx dashed #cbd5e1;
}
.slot-filled {
  border-style: solid;
  border-color: #e2e8f0;
}
.slot-avatar {
  font-size: 32rpx;
}
.slot-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.slot-name {
  font-size: 24rpx;
  color: #0f172a;
  font-weight: 500;
}
.slot-status {
  font-size: 20rpx;
  color: #64748b;
  margin-top: 2rpx;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #94a3b8;
}

.invite-btn {
  padding: 16rpx 0;
  text-align: center;
  border-radius: 12rpx;
  font-size: 24rpx;
  margin-top: 8rpx;
}
.invite-red {
  background: #fecaca;
  color: #991b1b;
}
.invite-blue {
  background: #bfdbfe;
  color: #1e40af;
}

/* 按钮 */
.action-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
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