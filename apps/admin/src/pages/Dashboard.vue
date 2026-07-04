<script setup lang="ts">
import { ref, onMounted } from 'vue'

const services = ref<any[]>([])
const system = ref<any>({})
const stats = ref<any>({})
const health = ref<any>({})
const moderation = ref<any>({ pendingCount: 0, pendingList: [] })
const analytics = ref<any>({ totalViews: 0, todayViews: 0, uniquePages: 0, eventCount: 0 })
const adminStats = ref<any>({})
const loading = ref(true)
const error = ref('')
let timer: any = null

function authHeaders() {
  const token = sessionStorage.getItem('admin_token')
  return { Authorization: 'Bearer ' + token }
}

async function fetchData() {
  try {
    const [s, sy, st, h, m, a, admin] = await Promise.all([
      fetch('/api/services', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/system', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/stats', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/health', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/moderation', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/analytics', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/admin/analytics/overview', { headers: authHeaders() }).then(r => r.json()).catch(() => ({})),
    ])
    services.value = s
    system.value = sy
    stats.value = st
    health.value = h
    moderation.value = m
    analytics.value = a
    adminStats.value = admin
    error.value = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  timer = setInterval(fetchData, 30000)
})

function formatTime(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  return `${h}小时${m % 60}分钟前`
}

function memoryFormat(bytes: number) {
  if (!bytes) return 'N/A'
  const mb = bytes / 1024 / 1024
  return mb > 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`
}

function contentTypeLabel(ct: string) {
  const map: Record<string, string> = {
    comment: '评论', kid_say: '童言', checkin_note: '签到', gallery_caption: '画廊',
  }
  return map[ct] || ct
}
</script>

<template>
  <!-- Error -->
  <div v-if="error" class="card" style="margin-bottom:16px;border-color:#fecaca;background:#fef2f2;color:#dc2626;font-size:13px">
    {{ error }}
  </div>

  <div v-if="loading" class="loading-state">加载中...</div>

  <template v-if="!loading">
    <!-- Admin Stats -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header"><h3 class="section-title">平台概况</h3></div>
      <div class="stat-grid" style="margin-bottom:0">
        <div class="stat-card">
          <div class="stat-label">注册用户</div>
          <div class="stat-value" style="color:#2563eb">{{ adminStats?.users?.total ?? '-' }}</div>
          <div v-if="adminStats?.users?.suspendedCount > 0" class="stat-sub">已暂停 {{ adminStats.users.suspendedCount }} 人</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总题目数</div>
          <div class="stat-value" style="color:#16a34a">{{ adminStats?.quiz?.totalQuestions ?? '-' }}</div>
        </div>
        <!-- HIDDEN: forum stats, will re-enable later
        <div class="stat-card">
          <div class="stat-label">论坛帖子</div>
          <div class="stat-value" style="color:#9333ea">{{ adminStats?.forum?.totalPosts ?? '-' }}</div>
          <div v-if="adminStats?.forum?.hiddenPosts > 0" class="stat-sub">已隐藏 {{ adminStats.forum.hiddenPosts }} 帖</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">论坛评论</div>
          <div class="stat-value" style="color:#f97316">{{ adminStats?.forum?.totalComments ?? '-' }}</div>
        </div>
        -->
        <div class="stat-card">
          <div class="stat-label">挑战玩家</div>
          <div class="stat-value" style="color:#ec4899">{{ adminStats?.quiz?.totalPlayers ?? '-' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总对局数</div>
          <div class="stat-value" style="color:#ca8a04">{{ adminStats?.quiz?.totalGames ?? '-' }}</div>
        </div>
      </div>
    </div>

    <!-- Travel-Guide Stats -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header"><h3 class="section-title">走天下运营</h3></div>
      <div class="stat-grid" style="margin-bottom:0">
        <div class="stat-card"><div class="stat-label">用户</div><div class="stat-value" style="color:#2563eb">{{ stats.users ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">攻略</div><div class="stat-value" style="color:#16a34a">{{ stats.guides ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">段落</div><div class="stat-value" style="color:#9333ea">{{ stats.sections ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">评分</div><div class="stat-value" style="color:#ca8a04">{{ stats.ratings ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">评论</div><div class="stat-value" style="color:#ec4899">{{ stats.comments ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">点赞</div><div class="stat-value" style="color:#f97316">{{ stats.likes ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">收藏</div><div class="stat-value" style="color:#dc2626">{{ stats.favorites ?? '-' }}</div></div>
      </div>
    </div>

    <!-- Analytics -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header"><h3 class="section-title">流量分析</h3></div>
      <div class="stat-grid" style="margin-bottom:0">
        <div class="stat-card"><div class="stat-label">总浏览量</div><div class="stat-value" style="color:#2563eb">{{ analytics.totalViews ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">今日访问</div><div class="stat-value" style="color:#16a34a">{{ analytics.todayViews ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">独立页面</div><div class="stat-value" style="color:#9333ea">{{ analytics.uniquePages ?? '-' }}</div></div>
        <div class="stat-card"><div class="stat-label">总事件数</div><div class="stat-value" style="color:#ca8a04">{{ analytics.eventCount ?? '-' }}</div></div>
      </div>
    </div>

    <!-- Moderation -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <h3 class="section-title">
          内容审核
          <span v-if="moderation.pendingCount > 0" class="tag tag-red" style="margin-left:8px">{{ moderation.pendingCount }} 待审</span>
        </h3>
        <span class="topbar-link" style="font-size:12px">自上次构建后</span>
      </div>
      <div v-if="moderation.pendingList?.length > 0" style="display:flex;flex-direction:column;gap:8px">
        <div v-for="item in moderation.pendingList" :key="item.id" class="card" style="padding:12px 16px;margin:0">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span class="tag tag-yellow">{{ contentTypeLabel(item.contentType) }}</span>
            <span style="font-size:12px;color:#94a3b8">{{ item.createdAt?.slice(11, 19) || '' }}</span>
          </div>
          <p style="font-size:13px;color:#64748b;line-height:1.5">{{ item.content }}</p>
          <p v-if="item.reason" style="color:#dc2626;font-size:12px;margin-top:4px">⚠ {{ item.reason }}</p>
        </div>
      </div>
      <div v-else class="empty-state" style="padding:24px"><div class="empty-text">暂无待审核内容</div></div>
    </div>

    <!-- System Info & Services -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:0">
      <div class="card">
        <div class="section-header"><h3 class="section-title">系统状态</h3></div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">主机</span><span>{{ system.hostname }}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Node.js</span><span>{{ system.node }}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">磁盘</span><span>{{ system.disk }}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">内存</span><span>{{ system.memory }}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">负载</span><span>{{ system.load }}</span></div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#94a3b8">API 状态</span>
            <span :style="{ color: health.status === 'ok' ? '#16a34a' : '#dc2626' }">{{ health.status ?? '-' }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-header"><h3 class="section-title">服务状态</h3></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div v-for="s in services" :key="s.id" class="card" style="padding:10px 14px;margin:0;display:flex;align-items:center;justify-content:space-between;font-size:13px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:8px;height:8px;border-radius:50%;display:inline-block" :style="{ background: s.status === 'online' ? '#16a34a' : '#dc2626' }"></span>
              <span style="font-weight:500">{{ s.name }}</span>
              <span style="color:#94a3b8;font-size:12px">:{{ s.port }}</span>
            </div>
            <div style="display:flex;gap:12px;font-size:12px;color:#94a3b8">
              <span>{{ memoryFormat(s.memory) }}</span>
              <span>{{ s.cpu }}%</span>
            </div>
          </div>
          <p v-if="services.length === 0" class="empty-state" style="padding:24px">无运行中服务</p>
        </div>
      </div>
    </div>
  </template>
</template>
