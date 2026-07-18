<script setup lang="ts">
// 走天下攻略待审（v1.5 第十六节 admin 后台）
// DEPLOY.md 第七节 P1 — admin 审核 UI

import { ref, onMounted } from 'vue'

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
  likeCount: number
  saveCount: number
  author: { id: string; nickname: string; avatar: string | null }
}

const items = ref<PendingItem[]>([])
const loading = ref(true)
const errMsg = ref('')
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
    const res = await fetch('/api/travel/guides/pending', {
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

async function approve(id: string) {
  if (!confirm(`确定批准攻略？发布后将在走天下公开可见。`)) return
  try {
    const res = await fetch(`/api/travel/guides/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message)
    items.value = items.value.filter((x) => x.id !== id)
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
    alert('请输入拒绝理由')
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
    items.value = items.value.filter((x) => x.id !== rejectTargetId.value)
    rejectModalOpen.value = false
  } catch (e) {
    alert(`拒绝失败：${(e as Error).message}`)
  }
}

function openPreview(it: PendingItem) {
  previewItem.value = it
  previewModalOpen.value = true
}

function ago(dateStr: string): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

onMounted(loadPending)
</script>

<template>
  <div>
    <!-- Stats bar -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <h3 class="section-title">走天下攻略待审</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="sub-text">v1.5 · DFA 审核后人工通过</span>
          <button class="btn btn-outline btn-sm" @click="loadPending">↻ 刷新</button>
        </div>
      </div>
      <div class="stat-grid" style="margin-bottom:0">
        <div class="stat-card">
          <div class="stat-label">待审攻略</div>
          <div class="stat-value" style="color:#f59e0b">{{ items.length }}</div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">加载中…</div>

    <!-- Error -->
    <div v-else-if="errMsg" class="card" style="margin-bottom:16px;border-color:#fecaca;background:#fef2f2;color:#dc2626;font-size:13px">
      {{ errMsg }}
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">没有待审攻略，所有攻略均已审核完毕</div>
      </div>
    </div>

    <!-- Pending list -->
    <div v-else style="display:flex;flex-direction:column;gap:12px">
      <div v-for="it in items" :key="it.id" class="card guide-card">
        <div class="card-head">
          <div style="flex:1;min-width:0">
            <div class="card-title">{{ it.title }}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
              <span class="tag tag-blue">{{ it.cityName ?? '未选城市' }}</span>
              <span v-if="it.days" class="tag tag-green">{{ it.days }} 天</span>
              <span v-if="it.childAges.length > 0" class="tag tag-purple">
                {{ Math.floor(it.childAges[0]! / 12) }} 岁娃
              </span>
              <span class="meta-sub">{{ ago(it.createdAt) }}</span>
              <span class="meta-id">{{ it.id.slice(0, 8) }}…</span>
            </div>
            <!-- 作者行 -->
            <div class="author-row">
              <div class="author-avatar">
                {{ it.author.avatar ? '🖼' : it.author.nickname?.slice(0, 1) ?? '?' }}
              </div>
              <div class="author-meta">
                <span class="author-name">{{ it.author.nickname }}</span>
                <span class="author-id">ID: {{ it.author.id.slice(0, 8) }}…</span>
              </div>
            </div>
          </div>
          <div class="stats-mini">
            <span>♥ {{ it.likeCount }}</span>
            <span>★ {{ it.saveCount }}</span>
          </div>
        </div>

        <p v-if="it.preview" class="preview-text">{{ it.preview.replace(/<[^>]+>/g, '') }}</p>

        <div class="card-actions">
          <button class="btn btn-outline btn-sm" @click="openPreview(it)">预览</button>
          <button class="btn btn-danger btn-sm" @click="askReject(it.id)">拒绝</button>
          <button class="btn btn-primary btn-sm" @click="approve(it.id)">通过 → 发布</button>
        </div>
      </div>
    </div>

    <!-- Reject modal -->
    <div v-if="rejectModalOpen" class="modal-mask" @click="rejectModalOpen = false">
      <div class="modal" @click.stop>
        <h3 class="modal-title">拒绝攻略</h3>
        <p class="modal-tip">拒绝理由会写进 OperationLog，用于通知创作者修改后再提交。</p>
        <textarea v-model="rejectReason" placeholder="必填，例如：含孩子真实姓名 / 拼写错误太多 / 内容不够详细"
          class="input" style="width:100%;min-height:80px;resize:vertical;font-size:13px"></textarea>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="rejectModalOpen = false">取消</button>
          <button class="btn btn-danger" @click="confirmReject">确认拒绝</button>
        </div>
      </div>
    </div>

    <!-- Preview modal -->
    <div v-if="previewModalOpen && previewItem" class="modal-mask" @click="previewModalOpen = false">
      <div class="modal modal-wide" @click.stop>
        <h3 class="modal-title">{{ previewItem.title }}</h3>
        <div class="preview-meta">
          <span class="tag tag-blue">{{ previewItem.cityName ?? '未选城市' }}</span>
          <span v-if="previewItem.days" class="tag tag-green">{{ previewItem.days }} 天</span>
          <span v-if="previewItem.childAges.length" class="tag tag-purple">
            {{ Math.floor(previewItem.childAges[0]! / 12) }} 岁娃
          </span>
          <span class="meta-sub">{{ previewItem.createdAt.slice(0, 16).replace('T', ' ') }}</span>
          <span class="meta-sub">ID: {{ previewItem.id }}</span>
        </div>
        <div v-if="previewItem.cover" class="preview-cover">
          <img :src="previewItem.cover" alt="cover" />
        </div>
        <div class="preview-body">
          <div v-html="previewItem.preview"></div>
        </div>
        <div v-if="!previewItem.preview" class="empty-state" style="padding:24px">
          <div class="empty-text">攻略内容为空</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="previewModalOpen = false">关闭</button>
          <button class="btn btn-danger btn-sm" @click="previewModalOpen = false; askReject(previewItem!.id)">拒绝</button>
          <button class="btn btn-primary btn-sm" @click="previewModalOpen = false; approve(previewItem!.id)">通过 → 发布</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guide-card { padding: 20px 24px; }
.card-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.card-title { font-size: 16px; font-weight: 600; color: #0f172a; line-height: 1.4; }
.sub-text { font-size: 12px; color: #94a3b8; }
.meta-sub { font-size: 12px; color: #94a3b8; }
.meta-id { font-size: 11px; color: #cbd5e1; font-family: monospace; }
.stats-mini { display: flex; gap: 8px; font-size: 12px; color: #94a3b8; white-space: nowrap; }

.author-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f1f5f9; }
.author-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #fda4af 0%, #fb7185 100%);
  color: #fff; font-weight: 600; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.author-meta { display: flex; align-items: center; gap: 8px; }
.author-name { font-size: 13px; color: #334155; font-weight: 500; }
.author-id { font-size: 11px; color: #cbd5e1; font-family: monospace; }

.preview-text {
  font-size: 13px; color: #475569; line-height: 1.6;
  margin: 0 0 14px; max-height: 60px; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
}
.card-actions { display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 14px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; border-radius: 16px; padding: 28px 32px; width: 480px; max-width: 90vw; }
.modal-wide { width: 720px; max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #0f172a; }
.modal-tip { color: #64748b; font-size: 13px; margin-bottom: 16px; line-height: 1.5; }
.modal-actions { display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end; }

/* Preview */
.preview-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
.preview-cover { margin-bottom: 16px; }
.preview-cover img { max-width: 100%; max-height: 300px; border-radius: 10px; object-fit: cover; }
.preview-body { font-size: 14px; line-height: 1.7; color: #334155; }
.preview-body :deep(p) { margin-bottom: 10px; }
.preview-body :deep(img) { max-width: 100%; border-radius: 8px; margin: 8px 0; }
</style>
