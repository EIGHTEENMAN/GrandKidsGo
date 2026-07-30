<script setup lang="ts">
// 走天下攻略审核（用户答复 2026-07-29：admin 后台拆「自动审核队列」+「人工审核管理」）
// - 「自动审核队列」：DFA soft 命中 → 机器标疑 → 待人工二次确认（type=auto）
// - 「人工审核管理」：所有 pending_review 攻略（含 clean、soft）（type=manual）
// 状态机：
//   pending_review + sensitivity=soft → 自动审核队列
//   pending_review + sensitivity=clean → 人工审核管理
//   pending_review + sensitivity=hard → 不可能（hard 直接 rejected）
//   rejected / published → 不在这两个队列

import { ref, onMounted, computed } from 'vue'

interface PendingItem {
  id: string
  title: string
  preview: string
  cover: string | null
  cityId: string | null
  cityName: string | null
  childAges: number[]
  days: number | null
  userId: string
  createdAt: string
  submittedAt: string
  likeCount: number
  saveCount: number
  author: { id: string; nickname: string; avatar: string | null }
  sensitivity: 'hard' | 'soft' | 'clean' | null
  reason: string | null
}

const items = ref<PendingItem[]>([])
const loading = ref(true)
const errMsg = ref('')
const activeTab = ref<'auto' | 'manual'>('auto') // 默认显示自动审核队列

const counts = ref({ auto: 0, manual: 0 })

const rejectModalOpen = ref(false)
const rejectTargetId = ref('')
const rejectReason = ref('')
const previewModalOpen = ref(false)
const previewItem = ref<PendingItem | null>(null)

function authHeaders(): Record<string, string> {
  return { 'x-admin-token': 'dev-admin-token' }
}

async function loadPending() {
  loading.value = true
  errMsg.value = ''
  try {
    // 同时拉两个队列的总数（不并行，分别串行以保证 UI 一致）
    const [autoRes, manualRes] = await Promise.all([
      fetch('/api/travel/guides/pending?type=auto', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/travel/guides/pending?type=manual', { headers: authHeaders() }).then(r => r.json()),
    ])
    counts.value = {
      auto: autoRes.items?.length ?? 0,
      manual: manualRes.items?.length ?? 0,
    }
    items.value = activeTab.value === 'auto' ? (autoRes.items ?? []) : (manualRes.items ?? [])
  } catch (e) {
    errMsg.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function switchTab(tab: 'auto' | 'manual') {
  activeTab.value = tab
  loading.value = true
  try {
    const res = await fetch(`/api/travel/guides/pending?type=${tab}`, { headers: authHeaders() }).then(r => r.json())
    items.value = res.items ?? []
  } catch (e) {
    errMsg.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function approve(id: string) {
  if (!confirm(`确定批准这篇攻略？发布后将在走天下公开可见。`)) return
  try {
    const res = await fetch(`/api/travel/guides/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message)
    await loadPending() // 刷新两个 tab 的 count
  } catch (e) {
    alert(`批准失败：${(e as Error).message}`)
  }
}

function askReject(id: string) {
  rejectTargetId.value = id
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    alert('请输入拒绝理由（会展示给作者）')
    return
  }
  try {
    const res = await fetch(`/api/travel/guides/${rejectTargetId.value}/reject`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason.value }),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message)
    rejectModalOpen.value = false
    await loadPending()
  } catch (e) {
    alert(`拒绝失败：${(e as Error).message}`)
  }
}

function openPreview(it: PendingItem) {
  previewItem.value = it
  previewModalOpen.value = true
}

function ago(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr).getTime()
  if (Number.isNaN(d)) return dateStr
  const mins = Math.floor((Date.now() - d) / 60000)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

const SENSITIVITY_LABEL: Record<string, { tone: string; text: string }> = {
  hard: { tone: 'bg-red-100 text-red-700', text: '🚨 硬命中（已自动拒，本队列不会出现）' },
  soft: { tone: 'bg-amber-100 text-amber-700', text: '⚠️ 软命中（DFA 标疑，需人工确认）' },
  clean: { tone: 'bg-blue-100 text-blue-700', text: '✅ DFA 通过（合规但需要人工审核质量）' },
  none: { tone: 'bg-gray-100 text-gray-600', text: '无 DFA 记录' },
}

function getSensiLabel(s: string | null) {
  return SENSITIVITY_LABEL[s ?? 'none'] ?? SENSITIVITY_LABEL.none
}

onMounted(loadPending)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h2 class="section-title">攻略审核管理</h2>
      <span class="sub-text">DFA 自动审核 + 人工审核 · 状态机详见攻略体系 v1.0</span>
    </header>

    <!-- 两个 tab 切换 -->
    <div class="tab-bar">
      <button
        :class="['tab-btn', activeTab === 'auto' && 'active']"
        @click="switchTab('auto')"
      >
        ⚙️ 自动审核队列
        <span class="count-badge">{{ counts.auto }}</span>
        <span class="tab-hint">DFA 软命中</span>
      </button>
      <button
        :class="['tab-btn', activeTab === 'manual' && 'active']"
        @click="switchTab('manual')"
      >
        👤 人工审核管理
        <span class="count-badge">{{ counts.manual }}</span>
        <span class="tab-hint">全部待审</span>
      </button>
    </div>

    <div v-if="loading" class="loading-text">加载中…</div>
    <div v-else-if="errMsg" class="error-text">{{ errMsg }}</div>
    <div v-else-if="items.length === 0" class="empty-text">
      <p>没有待审攻略</p>
      <p class="empty-hint">
        <template v-if="activeTab === 'auto'">
          当用户发布的攻略触发 DFA 软命中（色情/赌博/歧视等疑似敏感词）时，会自动进入此队列
        </template>
        <template v-else>
          所有待人工审核的攻略都汇总在这里
        </template>
      </p>
    </div>
    <ul v-else class="report-list">
      <li v-for="it in items" :key="it.id" class="report-item">
        <div class="meta-row">
          <span class="target-id">攻略 ID: {{ it.id.slice(0, 8) }}…</span>
          <span class="ago">提交 {{ ago(it.submittedAt || it.createdAt) }}</span>
        </div>
        <div class="title-row">
          <h3 class="title-text">{{ it.title }}</h3>
          <span :class="['sensi-badge', getSensiLabel(it.sensitivity).tone]">
            {{ getSensiLabel(it.sensitivity).text }}
          </span>
        </div>
        <div class="meta-row sub">
          <span>作者：{{ it.author?.nickname || '匿名' }}</span>
          <span v-if="it.cityName">📍 {{ it.cityName }}</span>
          <span v-if="it.days">📅 {{ it.days }} 天</span>
        </div>
        <p v-if="it.reason" class="reason-text">
          <strong>DFA 命中：</strong>{{ it.reason }}
        </p>
        <p v-if="it.preview" class="preview-text">{{ it.preview.replace(/<[^>]+>/g, '') }}</p>
        <div class="actions">
          <button class="btn btn-outline btn-sm" @click="openPreview(it)">预览</button>
          <button class="btn btn-danger btn-sm" @click="askReject(it.id)">拒绝</button>
          <button class="btn btn-success btn-sm" @click="approve(it.id)">放行</button>
        </div>
      </li>
    </ul>

    <!-- 拒绝原因 modal -->
    <div v-if="rejectModalOpen" class="modal-mask" @click="rejectModalOpen = false">
      <div class="modal" @click.stop>
        <h3 class="modal-title">拒绝攻略</h3>
        <p class="modal-hint">请填写拒绝理由（用户会看到这条理由，便于修改重提）</p>
        <textarea
          v-model="rejectReason"
          rows="3"
          placeholder="例：内容含歧视儿童用词，请删除后重提"
          class="modal-textarea"
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="rejectModalOpen = false">取消</button>
          <button class="btn btn-danger" @click="confirmReject">确认拒绝</button>
        </div>
      </div>
    </div>

    <!-- 预览 modal -->
    <div v-if="previewModalOpen && previewItem" class="modal-mask" @click="previewModalOpen = false">
      <div class="modal modal-large" @click.stop>
        <h3 class="modal-title">{{ previewItem.title }}</h3>
        <div class="preview-meta">
          <span>{{ previewItem.author?.nickname }}</span>
          <span v-if="previewItem.cityName">📍 {{ previewItem.cityName }}</span>
          <span v-if="previewItem.days">📅 {{ previewItem.days }} 天</span>
          <span v-if="previewItem.childAges?.length">👶 {{ previewItem.childAges.join(' / ') }} 月</span>
        </div>
        <div v-if="previewItem.reason" class="reason-block">
          <strong>DFA 命中：</strong>{{ previewItem.reason }}
        </div>
        <div class="preview-content" v-html="previewItem.preview"></div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="previewModalOpen = false">关闭</button>
          <button class="btn btn-danger" @click="askReject(previewItem.id); previewModalOpen = false">拒绝</button>
          <button class="btn btn-success" @click="approve(previewItem.id); previewModalOpen = false">放行</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px; max-width: 1024px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.section-title { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0; }
.sub-text { font-size: 12px; color: #9ca3af; }

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 12px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { color: #1f2937; }
.tab-btn.active {
  background: white;
  color: #1f2937;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 700;
  border-radius: 10px;
}
.tab-btn:not(.active) .count-badge { background: #d1d5db; color: #6b7280; }
.tab-hint { font-size: 11px; color: #9ca3af; margin-left: 4px; }

.loading-text, .empty-text, .error-text { padding: 40px 20px; text-align: center; color: #9ca3af; }
.empty-hint { font-size: 12px; margin-top: 8px; color: #d1d5db; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.6; }
.error-text { color: #ef4444; }

.report-list { display: flex; flex-direction: column; gap: 12px; }
.report-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
.meta-row.sub { font-size: 12px; color: #9ca3af; }
.target-id { font-family: monospace; }

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.title-text {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  flex: 1;
}
.sensi-badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-weight: 600;
}

.reason-text {
  margin: 8px 0;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  font-size: 13px;
  color: #92400e;
}
.preview-text {
  font-size: 13px;
  color: #4b5563;
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 6px 0;
  max-height: 60px;
  overflow: hidden;
  line-height: 1.6;
}

.actions { display: flex; gap: 8px; margin-top: 12px; }
.btn {
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.btn-sm { padding: 4px 12px; }
.btn-outline { background: white; color: #374151; border-color: #d1d5db; }
.btn-outline:hover { background: #f3f4f6; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }

.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
}
.modal-large { max-width: 720px; max-height: 80vh; overflow-y: auto; }
.modal-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 8px; }
.modal-hint { font-size: 12px; color: #9ca3af; margin: 0 0 12px; }
.modal-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.preview-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
}
.reason-block {
  background: #fef3c7;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #92400e;
  margin-bottom: 12px;
}
.preview-content {
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
</style>