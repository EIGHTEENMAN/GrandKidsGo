<script setup lang="ts">
// admin 动态审核（v2.0 第九节 C 第五节）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第十三节 B 第三节

import { ref, onMounted, computed } from 'vue'

interface Activity {
  id: string
  userId: string
  type: string
  targetId: string
  isPublic: string
  createdAt: string
  content: { text: string; meta?: any; template?: string }
  author?: { id: string; nickname: string; avatar: string | null }
}

const TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  badge_unlocked:   { label: '勋章', emoji: '🏅', color: '#f59e0b' },
  guide_published:  { label: '攻略', emoji: '📝', color: '#2563eb' },
  trip_completed:   { label: '出行', emoji: '✈️', color: '#16a34a' },
}

const items = ref<Activity[]>([])
const loading = ref(true)
const errMsg = ref('')
const statusMsg = ref('')
const typeFilter = ref<string>('all')

function authHeaders(): Record<string, string> {
  return { 'x-admin-token': 'dev-admin-token' }
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await fetch('/api/travel/admin/activities/pending', {
      headers: authHeaders(),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message ?? '加载失败')
    items.value = d.items ?? []
  } catch (e) {
    errMsg.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function hide(id: string) {
  const reason = prompt('隐藏原因（必填）：')
  if (!reason?.trim()) return
  const res = await fetch(`/api/travel/admin/activities/${id}/hide`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  const d = await res.json()
  if (d.error) { alert(`失败：${d.error.message}`); return }
  statusMsg.value = `✓ 已隐藏动态 ${id.slice(0, 8)}…：${reason}`
  setTimeout(() => { statusMsg.value = '' }, 4000)
  await load()
}

async function del(id: string) {
  if (!confirm('确认删除？删除后不可恢复。')) return
  const res = await fetch(`/api/travel/admin/activities/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const d = await res.json()
  if (d.error) { alert(`失败：${d.error.message}`); return }
  statusMsg.value = `✓ 已删除动态 ${id.slice(0, 8)}…`
  setTimeout(() => { statusMsg.value = '' }, 4000)
  await load()
}

const filtered = computed(() => {
  if (typeFilter.value === 'all') return items.value
  return items.value.filter((it) => it.type === typeFilter.value)
})

const stats = computed(() => {
  const byType: Record<string, number> = { all: items.value.length }
  for (const it of items.value) {
    byType[it.type] = (byType[it.type] ?? 0) + 1
  }
  return byType
})

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

onMounted(load)
</script>

<template>
  <div>
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <h3 class="section-title">社区动态审核</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="sub-text">v2.0 · 隐藏 / 删除</span>
          <button class="btn btn-outline btn-sm" @click="load">↻ 刷新</button>
        </div>
      </div>
      <div class="stat-grid" style="margin-bottom:12px">
        <div class="stat-card" v-for="(cnt, k) in stats" :key="k">
          <div class="stat-label">{{ k === 'all' ? '全部' : (TYPE_META[k]?.label ?? k) }}</div>
          <div class="stat-value" style="color:#475569;font-size:20px">{{ cnt }}</div>
        </div>
      </div>
      <div style="display:flex;gap:4rpx;background:#f1f5f9;border-radius:10rpx;padding:3rpx">
        <button
          v-for="(label, k) in { all: '全部', badge_unlocked: '🏅 勋章', guide_published: '📝 攻略', trip_completed: '✈️ 出行' }"
          :key="k"
          class="seg-btn"
          :class="{ active: typeFilter === k }"
          @click="typeFilter = String(k)">{{ label }}</button>
      </div>
    </div>

    <div v-if="statusMsg" class="card" style="margin-bottom:12px;border-color:#bbf7d0;background:#f0fdf4;color:#16a34a;font-size:13px">
      {{ statusMsg }}
    </div>

    <div v-if="loading" class="loading-state">加载中…</div>
    <div v-else-if="errMsg" class="card" style="border-color:#fecaca;background:#fef2f2;color:#dc2626;font-size:13px">{{ errMsg }}</div>
    <div v-else-if="filtered.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">无动态需审核</div>
      </div>
    </div>

    <div v-else class="card" style="padding:0;overflow:hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>作者</th>
            <th style="width:90px">类型</th>
            <th>动态内容</th>
            <th style="width:100px">时间</th>
            <th style="width:160px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in filtered" :key="it.id">
            <td>
              <div class="cell-name">{{ it.author?.nickname ?? '?' }}</div>
              <div class="cell-id">{{ it.userId.slice(0, 8) }}…</div>
            </td>
            <td>
              <span class="type-tag" :style="{ background: (TYPE_META[it.type]?.color ?? '#475569') + '20', color: TYPE_META[it.type]?.color }">
                {{ TYPE_META[it.type]?.emoji ?? '·' }} {{ TYPE_META[it.type]?.label ?? it.type }}
              </span>
            </td>
            <td>
              <div class="content-text">{{ it.content?.text ?? '（无内容）' }}</div>
              <div class="content-id">target: {{ it.targetId.slice(0, 12) }}…</div>
            </td>
            <td>
              <span class="time-text">{{ relativeTime(it.createdAt) }}</span>
            </td>
            <td>
              <button class="btn btn-sm btn-outline" @click="hide(it.id)">隐藏</button>
              <button class="btn btn-sm btn-danger" @click="del(it.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sub-text { font-size: 12px; color: #94a3b8; }
.seg-btn { padding: 6rpx 14rpx; border-radius: 8rpx; background: transparent; border: 0; font-size: 13px; color: #64748b; cursor: pointer; }
.seg-btn.active { background: #fff; color: #2563eb; font-weight: 600; box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.08); }
.cell-name { font-size: 13px; color: #0f172a; font-weight: 500; }
.cell-id { font-size: 11px; color: #cbd5e1; font-family: monospace; }
.type-tag { display:inline-block; padding: 2rpx 8rpx; border-radius: 8rpx; font-size: 12px; font-weight: 500; }
.content-text { font-size: 13px; color: #334155; line-height: 1.5; max-width: 400px; }
.content-id { font-size: 11px; color: #cbd5e1; font-family: monospace; margin-top: 2px; }
.time-text { font-size: 12px; color: #94a3b8; }
</style>
