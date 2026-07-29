<script setup lang="ts">
// 走天下攻略举报列表（攻略体系 v1.0 PR4）
// 数据源：apps/moderation 服务 /api/moderation/reports?status=pending&target_type=guide
//   （admin 端直接 fetch moderation 服务，转发走 nginx）
// 操作：resolve / dismiss（用 /api/moderation/review）

import { ref, onMounted } from 'vue'

interface ReportItem {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  content_snippet: string
  status: string
  created_at: string
}

const items = ref<ReportItem[]>([])
const loading = ref(true)
const errMsg = ref('')

async function loadReports() {
  loading.value = true
  errMsg.value = ''
  try {
    // admin 通过 nginx 转发到 moderation 服务 3020
    const res = await fetch('/api/moderation/reports?status=pending', {
      headers: { 'x-admin-token': 'dev-admin-token' },
    })
    if (!res.ok) throw new Error(`moderation ${res.status}`)
    items.value = await res.json()
  } catch (e) {
    errMsg.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function review(id: string, action: 'dismiss' | 'resolve') {
  if (!confirm(action === 'dismiss' ? '驳回这条举报？' : '采纳这条举报并下架攻略？')) return
  try {
    const res = await fetch('/api/moderation/review', {
      method: 'POST',
      headers: { 'x-admin-token': 'dev-admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: id, action }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    items.value = items.value.filter((r) => r.id !== id)
  } catch (e) {
    alert(`操作失败：${(e as Error).message}`)
  }
}

function ago(s: string): string {
  const d = new Date(s).getTime()
  if (Number.isNaN(d)) return s
  const mins = Math.floor((Date.now() - d) / 60000)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

onMounted(loadReports)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2 class="section-title">攻略举报</h2>
      <span class="sub-text">PR4：来自走天下 /api/guides/[id]/report</span>
    </header>

    <div v-if="loading" class="loading-text">加载中…</div>
    <div v-else-if="errMsg" class="error-text">{{ errMsg }}</div>
    <div v-else-if="items.length === 0" class="empty-text">暂无待处理举报</div>
    <ul v-else class="report-list">
      <li v-for="r in items" :key="r.id" class="report-item">
        <div class="meta-row">
          <span class="target-id">攻略 ID: {{ r.target_id.slice(0, 8) }}…</span>
          <span class="ago">{{ ago(r.created_at) }}</span>
        </div>
        <div class="reason">{{ r.reason }}</div>
        <div v-if="r.content_snippet" class="snippet">"{{ r.content_snippet }}"</div>
        <div class="actions">
          <a :href="`/api/moderation/target/guide/${r.target_id}`" target="_blank" class="btn btn-outline btn-sm">查看攻略</a>
          <button class="btn btn-outline btn-sm" @click="review(r.id, 'dismiss')">驳回</button>
          <button class="btn btn-danger btn-sm" @click="review(r.id, 'resolve')">下架</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page { padding: 24px; max-width: 960px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.section-title { font-size: 20px; font-weight: 700; color: #1f2937; }
.sub-text { font-size: 12px; color: #9ca3af; }
.loading-text, .empty-text, .error-text { padding: 60px 20px; text-align: center; color: #9ca3af; }
.error-text { color: #ef4444; }
.report-list { display: flex; flex-direction: column; gap: 12px; }
.report-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
.meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #6b7280; }
.target-id { font-family: monospace; }
.reason { font-size: 14px; color: #1f2937; font-weight: 500; margin-bottom: 4px; }
.snippet { font-size: 12px; color: #6b7280; background: #f9fafb; padding: 8px 12px; border-radius: 6px; margin: 8px 0; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.btn { padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; }
.btn-sm { padding: 4px 10px; }
.btn-outline { background: #fff; color: #374151; border-color: #d1d5db; }
.btn-outline:hover { background: #f3f4f6; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
</style>