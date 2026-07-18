<script setup lang="ts">
// admin 排行榜审核（v2.0）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第十三节 B 第三节

import { ref, onMounted, computed } from 'vue'

interface LeaderboardItem {
  rank: number
  userId?: string
  nickname?: string
  avatar?: string | null
  cityName?: string | null
  feelingScoreAvg?: number
  badgeCount?: number
  guideCount?: number
  cityCount?: number
  score: number
  badgeBreakdown?: { bronze: number; silver: number; gold: number; diamond: number }
  title?: string
  childLabel?: string
  feelingContribution?: number
  saveCount?: number
  likeCount?: number
  viewCount?: number
  tripCount?: number
}

interface Snapshot {
  id: string
  scope: string
  period: string
  capturedAt: string
  weekKey: string
}

const SCOPES = [
  { key: 'mom',   label: '妈妈榜' },
  { key: 'child', label: '孩子榜' },
  { key: 'city',  label: '城市榜' },
  { key: 'guide', label: '攻略榜' },
]
const PERIODS = [
  { key: 'week',  label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all',   label: '总榜' },
]

const activeScope = ref('mom')
const activePeriod = ref('week')
const items = ref<LeaderboardItem[]>([])
const snapshot = ref<Snapshot | null>(null)
const loading = ref(false)
const errMsg = ref('')
const actionMsg = ref('')

function authHeaders(): Record<string, string> {
  return { 'x-admin-token': 'dev-admin-token' }
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await fetch(`/api/travel/admin/leaderboard/${activeScope.value}/${activePeriod.value}`, {
      headers: authHeaders(),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message ?? '加载失败')
    items.value = d.items ?? []
    snapshot.value = d.snapshot
  } catch (e) {
    errMsg.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function pinUser(userId: string) {
  const reason = prompt('置顶原因（必填）：')
  if (!reason?.trim()) return
  const res = await fetch('/api/travel/admin/leaderboard/pin', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, scope: activeScope.value, period: activePeriod.value, reason }),
  })
  const d = await res.json()
  if (d.error) { alert(`失败：${d.error.message}`); return }
  actionMsg.value = `✓ 已记录置顶意图（${userId.slice(0, 8)}…）：${reason}`
  setTimeout(() => { actionMsg.value = '' }, 4000)
}

async function hideUser(userId: string) {
  if (!confirm(`确认下线该用户？将从下周开始不参与公开榜。`)) return
  const reason = prompt('下线原因（必填）：') ?? ''
  if (!reason.trim()) return
  const res = await fetch('/api/travel/admin/leaderboard/hide', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, reason }),
  })
  const d = await res.json()
  if (d.error) { alert(`失败：${d.error.message}`); return }
  actionMsg.value = `✓ 已下线 ${userId.slice(0, 8)}…：${reason}`
  setTimeout(() => { actionMsg.value = '' }, 4000)
}

function switchScope(s: string) { activeScope.value = s; load() }
function switchPeriod(p: string) { activePeriod.value = p; load() }

function descForScope(it: LeaderboardItem): string {
  if (activeScope.value === 'mom') {
    return `${it.badgeCount ?? 0} 勋章 · ${it.guideCount ?? 0} 攻略 · ${it.cityCount ?? 0} 城市`
  }
  if (activeScope.value === 'child') {
    return `真实感受分 ${it.feelingScoreAvg ?? 0} · ${it.cityCount ?? 0} 城市`
  }
  if (activeScope.value === 'city') {
    return `${it.tripCount ?? 0} 次出行 · 平均 ${it.feelingScoreAvg ?? 0} 分`
  }
  return `真实感受 ${it.feelingContribution ?? 0} · 收藏 ${it.saveCount ?? 0} · 点赞 ${it.likeCount ?? 0}`
}

function titleForScope(it: LeaderboardItem): string {
  if (activeScope.value === 'child') return it.childLabel ?? '宝宝'
  if (activeScope.value === 'city') return it.cityName ?? '?'
  if (activeScope.value === 'guide') return it.title ?? '?'
  return it.nickname ?? '童慧行用户'
}

onMounted(load)
</script>

<template>
  <div>
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <h3 class="section-title">走天下排行榜审核</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="sub-text">v2.0 · 强制置顶 / 下线</span>
          <button class="btn btn-outline btn-sm" @click="load">↻ 刷新</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <div style="display:flex;gap:4rpx;background:#f1f5f9;border-radius:10rpx;padding:3rpx">
          <button
            v-for="s in SCOPES"
            :key="s.key"
            class="seg-btn"
            :class="{ active: activeScope === s.key }"
            @click="switchScope(s.key)">{{ s.label }}</button>
        </div>
        <div style="display:flex;gap:4rpx;background:#f1f5f9;border-radius:10rpx;padding:3rpx">
          <button
            v-for="p in PERIODS"
            :key="p.key"
            class="seg-btn"
            :class="{ active: activePeriod === p.key }"
            @click="switchPeriod(p.key)">{{ p.label }}</button>
        </div>
      </div>

      <div v-if="snapshot" class="meta-row">
        <span class="tag tag-blue">快照：{{ snapshot.id.slice(0, 8) }}…</span>
        <span class="tag tag-purple">{{ snapshot.weekKey }}</span>
        <span class="sub-text">{{ snapshot.capturedAt }}</span>
      </div>
    </div>

    <div v-if="actionMsg" class="card" style="margin-bottom:12px;border-color:#bbf7d0;background:#f0fdf4;color:#16a34a;font-size:13px">
      {{ actionMsg }}
    </div>

    <div v-if="loading" class="loading-state">加载中…</div>
    <div v-else-if="errMsg" class="card" style="border-color:#fecaca;background:#fef2f2;color:#dc2626;font-size:13px">{{ errMsg }}</div>
    <div v-else-if="items.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">该榜单暂无数据</div>
      </div>
    </div>

    <div v-else class="card" style="padding:0;overflow:hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:60px">#</th>
            <th>用户/项</th>
            <th>详情</th>
            <th style="width:100px;text-align:right">分数</th>
            <th style="width:200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.rank">
            <td>
              <span :class="['rank-cell', `rank-${it.rank}`]">{{ it.rank }}</span>
            </td>
            <td>
              <div class="cell-name">{{ titleForScope(it) }}</div>
              <div v-if="it.userId" class="cell-id">{{ it.userId.slice(0, 8) }}…</div>
            </td>
            <td>
              <span class="meta-text">{{ descForScope(it) }}</span>
            </td>
            <td style="text-align:right">
              <span class="score-num">{{ it.score }}</span>
            </td>
            <td>
              <button v-if="it.userId" class="btn btn-sm btn-outline" @click="pinUser(it.userId)">置顶</button>
              <button v-if="it.userId" class="btn btn-sm btn-danger" @click="hideUser(it.userId)">下线</button>
              <span v-else class="sub-text" style="margin-left:8px">（无需操作）</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sub-text { font-size: 12px; color: #94a3b8; }
.meta-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.seg-btn { padding: 6rpx 14rpx; border-radius: 8rpx; background: transparent; border: 0; font-size: 13px; color: #64748b; cursor: pointer; }
.seg-btn.active { background: #fff; color: #2563eb; font-weight: 600; box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.08); }
.rank-cell { display:inline-flex; align-items:center; justify-content:center; min-width:32rpx; height:32rpx; padding:0 8rpx; border-radius:8rpx; font-weight: 700; font-size: 13px; background: #f1f5f9; color: #475569; }
.rank-1 { background: #fef3c7; color: #ca8a04; }
.rank-2 { background: #f1f5f9; color: #475569; }
.rank-3 { background: #fde68a; color: #a16207; }
.cell-name { font-size: 13px; color: #0f172a; font-weight: 500; }
.cell-id { font-size: 11px; color: #cbd5e1; font-family: monospace; }
.meta-text { font-size: 12px; color: #64748b; }
.score-num { font-size: 18px; font-weight: 800; color: #f59e0b; }
</style>
