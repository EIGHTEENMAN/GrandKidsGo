<script setup lang="ts">
// KOL 复评护城河字段（v1.5 第十五节 B 第四节）
// DEPLOY.md 第七节 P1 — 运营后台分发 KOL 复评 UI

import { ref, onMounted } from 'vue'

interface SpotItem {
  id: string
  name: string
  kidHook: string
  momHook: string
  tips: string[]
  pitfalls: string[]
  cityName: string
}

const items = ref<SpotItem[]>([])
const loading = ref(true)
const errMsg = ref('')
const editorOpen = ref(false)
const edited = ref<SpotItem | null>(null)
const saving = ref(false)
const statusMsg = ref('')

function authHeaders(): Record<string, string> {
  return { 'x-admin-token': 'dev-admin-token' }
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await fetch('/api/travel/spots/needs-review', {
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

function openEditor(it: SpotItem) {
  edited.value = JSON.parse(JSON.stringify(it))
  editorOpen.value = true
}

async function save() {
  if (!edited.value || !edited.value.kidHook.trim()) {
    alert('kidHook 必填')
    return
  }
  saving.value = true
  statusMsg.value = ''
  try {
    const res = await fetch(`/api/travel/spots/${edited.value.id}/review`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidHook: edited.value.kidHook,
        momHook: edited.value.momHook,
        dadHook: edited.value.momHook,
        tips: edited.value.tips,
        pitfalls: edited.value.pitfalls,
        reviewer: 'kol-' + (sessionStorage.getItem('admin_user') || 'admin'),
      }),
    })
    const d = await res.json()
    if (d.error) throw new Error(d.error.message)
    items.value = items.value.filter((x) => x.id !== edited.value!.id)
    editorOpen.value = false
    statusMsg.value = `✓ "${edited.value.name}" 复评已保存，dataSource → kol_reviewed`
    setTimeout(() => { statusMsg.value = '' }, 4000)
  } catch (e) {
    alert(`保存失败：${(e as Error).message}`)
  } finally {
    saving.value = false
  }
}

function addArr(field: 'tips' | 'pitfalls') {
  if (!edited.value) return
  edited.value[field].push('')
}

function removeArr(field: 'tips' | 'pitfalls', i: number) {
  if (!edited.value) return
  edited.value[field].splice(i, 1)
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <h3 class="section-title">护城河字段复评（KOL）</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="sub-text">v1.5 第十五节 B · kidHook 是孩子视角描述，非 LLM 能写</span>
          <button class="btn btn-outline btn-sm" @click="load">↻ 刷新</button>
        </div>
      </div>
      <div class="stat-grid" style="margin-bottom:0">
        <div class="stat-card">
          <div class="stat-label">待复评地点</div>
          <div class="stat-value" style="color:#9333ea">{{ items.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">当前数据来源</div>
          <div class="stat-value" style="font-size:16px">ai_draft_v1</div>
          <div class="stat-sub">复评后 → kol_reviewed</div>
        </div>
      </div>
    </div>

    <!-- Status toast -->
    <div v-if="statusMsg" class="card" style="margin-bottom:12px;border-color:#bbf7d0;background:#f0fdf4;color:#16a34a;font-size:13px">
      {{ statusMsg }}
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
        <div class="empty-text">所有护城河字段均已复评，无待办项</div>
      </div>
    </div>

    <!-- Spot list -->
    <div v-else style="display:flex;flex-direction:column;gap:12px">
      <div v-for="it in items" :key="it.id" class="card spot-card">
        <div class="card-head">
          <div style="flex:1;min-width:0">
            <div class="spot-name">{{ it.name }}</div>
            <span class="tag tag-blue">{{ it.cityName }}</span>
          </div>
        </div>

        <div class="hook-section">
          <span class="hook-label">当前 kidHook（孩子亮点）</span>
          <div class="hook-content">{{ it.kidHook }}</div>
        </div>

        <div v-if="it.tips.length" class="hook-section">
          <span class="hook-label">tips（去之前要知道的事）</span>
          <ul class="hook-list">
            <li v-for="(t, i) in it.tips" :key="i">{{ t }}</li>
          </ul>
        </div>

        <div v-if="it.pitfalls.length" class="hook-section">
          <span class="hook-label">pitfalls（容易踩的坑）</span>
          <ul class="hook-list hook-list-pitfall">
            <li v-for="(p, i) in it.pitfalls" :key="i">{{ p }}</li>
          </ul>
        </div>

        <div class="card-actions">
          <button class="btn btn-primary btn-sm" @click="openEditor(it)">✍ 复评这条</button>
        </div>
      </div>
    </div>

    <!-- Editor modal -->
    <div v-if="editorOpen && edited" class="modal-mask" @click="editorOpen = false">
      <div class="modal modal-wide" @click.stop>
        <h3 class="modal-title">复评：{{ edited.name }}</h3>
        <p class="modal-tip">LLM 无法写出真正的"孩子感受"。请从 5-10 岁孩子的真实视角改写，10-30 字为宜。</p>

        <div class="field">
          <label class="field-label">kidHook <span class="tag tag-red" style="margin-left:4px">必填</span></label>
          <textarea v-model="edited.kidHook" class="input field-input" placeholder="孩子会觉得这里好玩在哪？用孩子的语言说"></textarea>
          <div class="field-hint">{{ edited.kidHook.length }} / 500 字</div>
        </div>

        <div class="field">
          <label class="field-label">momHook（妈妈视角）</label>
          <textarea v-model="edited.momHook" class="input field-input" placeholder="妈妈最关心什么？安全、出片、性价比…"></textarea>
        </div>

        <div class="field">
          <label class="field-label">tips（去之前要知道的事）</label>
          <div v-for="(t, i) in edited.tips" :key="'tip-' + i" class="arr-row">
            <input v-model="edited.tips[i]" class="input arr-input" placeholder="例：建议上午去，人少" />
            <button class="btn btn-sm btn-danger" @click="removeArr('tips', i)">×</button>
          </div>
          <button class="btn btn-outline btn-sm arr-add" @click="addArr('tips')">+ 添加一条</button>
        </div>

        <div class="field">
          <label class="field-label">pitfalls（容易踩的坑）</label>
          <div v-for="(p, i) in edited.pitfalls" :key="'pit-' + i" class="arr-row">
            <input v-model="edited.pitfalls[i]" class="input arr-input" placeholder="例：周末下午排队很长" />
            <button class="btn btn-sm btn-danger" @click="removeArr('pitfalls', i)">×</button>
          </div>
          <button class="btn btn-outline btn-sm arr-add" @click="addArr('pitfalls')">+ 添加一条</button>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="editorOpen = false">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '提交复评' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spot-card { padding: 20px 24px; }
.card-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.spot-name { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.sub-text { font-size: 12px; color: #94a3b8; }

.hook-section { background: #f8fafc; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px; }
.hook-label { font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 6px; display: block; }
.hook-content { font-size: 13px; color: #1e293b; line-height: 1.5; }
.hook-list { padding-left: 18px; margin: 4px 0 0; font-size: 13px; color: #475569; line-height: 1.6; }
.hook-list-pitfall { color: #b91c1c; }

.card-actions { display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 14px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; border-radius: 16px; padding: 28px 32px; width: 480px; max-width: 90vw; }
.modal-wide { width: 720px; max-height: 90vh; overflow-y: auto; }
.modal-title { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #0f172a; }
.modal-tip { color: #64748b; font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
.modal-actions { display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end; }

/* Form fields */
.field { margin-bottom: 18px; }
.field-label { font-size: 13px; color: #475569; font-weight: 500; margin-bottom: 6px; display: block; }
.field-input { width: 100%; min-height: 60px; resize: vertical; font-size: 13px; }
.field-hint { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 4px; }
.arr-row { display: flex; gap: 6px; margin-bottom: 6px; }
.arr-input { flex: 1; }
.arr-add { margin-top: 4px; }
</style>
