<script setup lang="ts">
import { ref, onMounted } from 'vue'

const posts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const keyword = ref('')
const actionMsg = ref('')

function authHeaders() {
  const token = sessionStorage.getItem('admin_token')
  return { Authorization: 'Bearer ' + token }
}

async function search() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))
    const r = await fetch('/api/admin/forum/posts?' + params.toString(), { headers: authHeaders() })
    const d = await r.json()
    posts.value = d.list
    total.value = d.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function toggleHide(post: any) {
  try {
    const hidden = post.status === 'hidden'
    const endpoint = hidden
      ? `/api/admin/forum/posts/${post.id}/unhide`
      : `/api/admin/forum/posts/${post.id}/hide`
    const r = await fetch(endpoint, { method: 'POST', headers: authHeaders() })
    const d = await r.json()
    if (d.success) {
      post.status = hidden ? 'normal' : 'hidden'
      actionMsg.value = hidden ? '帖子已恢复' : '帖子已隐藏'
      setTimeout(() => actionMsg.value = '', 2000)
    }
  } catch { alert('操作失败') }
}

async function deletePost(post: any) {
  if (!confirm(`确定删除帖子"${post.title}"？\n评论和点赞记录也将被删除，不可恢复！`)) return
  try {
    const r = await fetch(`/api/admin/forum/posts/${post.id}`, { method: 'DELETE', headers: authHeaders() })
    const d = await r.json()
    if (d.success) {
      posts.value = posts.value.filter(p => p.id !== post.id)
      total.value--
      actionMsg.value = '帖子已删除'
      setTimeout(() => actionMsg.value = '', 2000)
    }
  } catch { alert('删除失败') }
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

function statusLabel(status: string) {
  const map: Record<string, string> = { normal: '正常', hidden: '已隐藏' }
  return map[status] || status
}

function statusTag(status: string) {
  return status === 'hidden' ? 'tag-orange' : 'tag-green'
}

onMounted(search)
</script>

<template>
  <div class="card" style="margin-bottom:16px">
    <div class="toolbar">
      <div class="search-box" style="max-width:360px">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px" @click="onSearch">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="keyword" placeholder="搜索帖子标题/内容/作者" @keyup.enter="onSearch" />
      </div>
      <div style="flex:1"></div>
      <span v-if="actionMsg" style="font-size:12px;color:#16a34a">{{ actionMsg }}</span>
      <button class="btn btn-primary" @click="onSearch">搜索</button>
    </div>
  </div>

  <div class="card">
    <div class="section-header">
      <h3 class="section-title">帖子管理 <span style="font-weight:400;color:#94a3b8;font-size:13px">共 {{ total }} 帖</span></h3>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="posts.length === 0" class="empty-state">
      <div class="empty-icon">💬</div>
      <div class="empty-text">{{ keyword ? '未搜索到相关帖子' : '暂无帖子数据' }}</div>
    </div>

    <template v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th style="width:100px">作者</th>
            <th style="width:60px">状态</th>
            <th style="width:50px">浏览</th>
            <th style="width:50px">点赞</th>
            <th style="width:50px">评论</th>
            <th style="width:150px">发布时间</th>
            <th style="width:140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="post.title">
              {{ post.title }}
            </td>
            <td style="color:#64748b">{{ post.username }}</td>
            <td><span :class="['tag', statusTag(post.status)]">{{ statusLabel(post.status) }}</span></td>
            <td style="color:#94a3b8;font-size:12px">{{ post.view_count }}</td>
            <td style="color:#94a3b8;font-size:12px">{{ post.like_count }}</td>
            <td style="color:#94a3b8;font-size:12px">{{ post.comment_count }}</td>
            <td style="color:#94a3b8;font-size:12px">{{ post.created_at?.replace('T', ' ') }}</td>
            <td style="white-space:nowrap">
              <button
                class="btn btn-sm"
                :class="post.status === 'hidden' ? 'btn-primary' : 'btn-warning'"
                @click="toggleHide(post)"
              >
                {{ post.status === 'hidden' ? '恢复' : '隐藏' }}
              </button>
              <button class="btn btn-sm btn-danger" style="margin-left:4px" @click="deletePost(post)">
                删除
              </button>
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
