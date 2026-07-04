<script setup lang="ts">
import { ref, onMounted } from 'vue'

const questions = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const downloading = ref(false)

const keyword = ref('')
const category = ref('all')
const difficulty = ref('all')

const categories = [
  { value: 'all', label: '全部分类' },
  { value: 'shici', label: '诗词' },
  { value: 'guoxue', label: '国学' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
  { value: 'general', label: '通识' },
]

const difficulties = [
  { value: 'all', label: '全部难度' },
  { value: '1', label: '简单' },
  { value: '2', label: '中等' },
  { value: '3', label: '困难' },
]

const diffLabel = (d: number) => ['简单', '中等', '困难'][d - 1] || '简单'
const catLabel: Record<string, string> = { shici: '诗词', guoxue: '国学', science: '科学', english: '英语', general: '通识' }

function authHeaders() {
  return { Authorization: 'Bearer ' + sessionStorage.getItem('admin_token') }
}

async function search() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    if (category.value !== 'all') params.set('category', category.value)
    if (difficulty.value !== 'all') params.set('difficulty', difficulty.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))

    const r = await fetch('/api/admin/questions?' + params.toString(), { headers: authHeaders() })
    const d = await r.json()
    questions.value = d.list
    total.value = d.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function downloadWord() {
  downloading.value = true
  try {
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    if (category.value !== 'all') params.set('category', category.value)
    if (difficulty.value !== 'all') params.set('difficulty', difficulty.value)

    const r = await fetch('/api/admin/questions/download?' + params.toString(), { headers: authHeaders() })
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `童慧行题库-${Date.now()}.docx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
    alert('下载失败')
  } finally {
    downloading.value = false
  }
}

function onSearch() {
  page.value = 1
  search()
}

function goPage(p: number) {
  page.value = p
  search()
}

const totalPages = () => Math.ceil(total.value / pageSize.value)

function optLabel(q: any, idx: number) {
  return `${String.fromCharCode(65 + idx)}. ${q.options[idx]}`
}

function isCorrect(q: any, idx: number) {
  return idx === q.answer
}

onMounted(search)
</script>

<template>
  <!-- 页内标签页导航 -->
  <div class="tab-bar" style="margin-bottom:16px">
    <router-link to="/questions" class="tab-item" :class="{ active: $route.path === '/questions' }">📋 题库列表</router-link>
    <router-link to="/questions/rules" class="tab-item" :class="{ active: $route.path === '/questions/rules' }">📖 出题规则</router-link>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="toolbar">
      <div class="search-box" style="max-width:300px">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px" @click="onSearch">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="keyword" placeholder="搜索题目或选项" @keyup.enter="onSearch" />
      </div>
      <div class="filter-group">
        <span class="filter-label">分类</span>
        <select v-model="category" class="input" style="padding:7px 12px" @change="onSearch">
          <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-label">难度</span>
        <select v-model="difficulty" class="input" style="padding:7px 12px" @change="onSearch">
          <option v-for="d in difficulties" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
      <div style="flex:1"></div>
      <button class="btn btn-outline btn-sm" @click="$router.push('/questions/rules')">📋 出题规则</button>
      <button class="btn btn-primary" :disabled="downloading" @click="downloadWord">
        {{ downloading ? '生成中...' : '📥 下载 Word' }}
      </button>
    </div>
  </div>

  <div class="card">
    <div class="section-header">
      <h3 class="section-title">题库列表 <span style="font-weight:400;color:#94a3b8;font-size:13px">共 {{ total }} 题</span></h3>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="questions.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-text">暂无数据</div>
    </div>

    <template v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:50px">ID</th>
            <th style="width:70px">分类</th>
            <th>题目</th>
            <th>选项</th>
            <th style="width:60px">答案</th>
            <th style="width:60px">难度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in questions" :key="q.id">
            <td style="color:#94a3b8">{{ q.id }}</td>
            <td><span class="tag tag-blue">{{ catLabel[q.category] || q.category }}</span></td>
            <td style="max-width:300px">{{ q.question }}</td>
            <td style="max-width:360px">
              <div v-for="(o, i) in q.options" :key="i" style="display:flex;align-items:center;gap:4px;line-height:1.8">
                <span v-if="isCorrect(q, i)" style="color:#16a34a">✅</span>
                <span v-else style="color:#94a3b8;width:16px;display:inline-block"></span>
                <span :style="{ color: isCorrect(q, i) ? '#16a34a' : '#64748b' }">{{ optLabel(q, i) }}</span>
              </div>
            </td>
            <td><span class="tag tag-green">{{ String.fromCharCode(65 + q.answer) }}</span></td>
            <td>
              <span :class="['tag', q.difficulty === 3 ? 'tag-red' : q.difficulty === 2 ? 'tag-yellow' : 'tag-green']">
                {{ diffLabel(q.difficulty) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages() > 1">
        <button class="page-btn" :disabled="page <= 1" @click="goPage(page - 1)">‹</button>
        <template v-for="p in totalPages()" :key="p">
          <button v-if="Math.abs(p - page) <= 2 || p === 1 || p === totalPages()" :class="['page-btn', { active: p === page }]" @click="goPage(p)">{{ p }}</button>
          <span v-else-if="p === page - 3 || p === page + 3" class="page-info">...</span>
        </template>
        <button class="page-btn" :disabled="page >= totalPages()" @click="goPage(page + 1)">›</button>
      </div>
    </template>
  </div>
</template>
