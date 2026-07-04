<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const isLoggedIn = ref(!!sessionStorage.getItem('admin_token'))
const adminUser = ref(sessionStorage.getItem('admin_user') || '')

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/questions', label: '题库管理', icon: '❓' },
  { path: '/users', label: '用户管理', icon: '👥' },
  // HIDDEN: 论坛管理, will re-enable later
  // { path: '/forum', label: '论坛管理', icon: '💬' },
  { path: '/analytics', label: '运营分析', icon: '📈' },
]

onMounted(() => {
  // Verify token validity
  const token = sessionStorage.getItem('admin_token')
  if (token) {
    fetch('/api/verify', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => {
      if (!r.ok) {
        sessionStorage.removeItem('admin_token')
        sessionStorage.removeItem('admin_user')
        isLoggedIn.value = false
        router.push('/login')
      }
    }).catch(() => {})
  }
})

function doLogout() {
  sessionStorage.removeItem('admin_token')
  sessionStorage.removeItem('admin_user')
  isLoggedIn.value = false
  router.push('/login')
}
</script>

<template>
  <div class="admin-layout" v-if="route.path !== '/login'">
    <aside class="sidebar">
      <div class="sidebar-header">
        <router-link to="/" class="sidebar-logo">童慧行</router-link>
        <span class="sidebar-badge">管理</span>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path.startsWith(item.path) && (item.path !== '/' ? true : route.path === '/') }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="user-name">{{ adminUser }}</span>
          <a href="#" class="logout-link" @click.prevent="doLogout">退出</a>
        </div>
        <a href="https://grandand.com" target="_blank" class="footer-link">← 返回主站</a>
      </div>
    </aside>
    <main class="main-content">
      <header class="topbar">
        <h2 class="page-title">{{ route.meta.title || '童慧行管理' }}</h2>
        <div class="topbar-right">
          <a href="https://grandand.com" target="_blank" class="topbar-link">主站</a>
          <span class="topbar-sep">|</span>
          <a href="https://travel.grandand.com" target="_blank" class="topbar-link">走天下</a>
        </div>
      </header>
      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
  <router-view v-else />
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased;
}

.admin-layout { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: 220px; background: #fff; border-right: 1px solid #e2e8f0;
  display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 40;
}
.sidebar-header {
  padding: 20px 20px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e2e8f0;
}
.sidebar-logo { font-size: 22px; font-weight: 800; color: #2563eb; text-decoration: none; }
.sidebar-badge {
  font-size: 10px; background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 600;
}
.sidebar-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px;
  text-decoration: none; font-size: 14px; color: #64748b; transition: all 0.15s; font-weight: 500;
}
.nav-item:hover { background: #f1f5f9; color: #0f172a; }
.nav-item.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
.nav-icon { font-size: 16px; width: 22px; text-align: center; }
.sidebar-footer { padding: 12px 10px; border-top: 1px solid #e2e8f0; }
.sidebar-user {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 14px 10px; font-size: 13px;
}
.user-name { color: #0f172a; font-weight: 600; }
.logout-link { color: #dc2626; text-decoration: none; font-size: 12px; }
.logout-link:hover { text-decoration: underline; }
.footer-link {
  display: block; padding: 8px 14px; font-size: 13px; color: #94a3b8; text-decoration: none; border-radius: 8px;
}
.footer-link:hover { background: #f1f5f9; color: #64748b; }

/* Main Content */
.main-content { margin-left: 220px; flex: 1; min-height: 100vh; }
.topbar {
  background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0;
  padding: 16px 28px; display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 30;
}
.page-title { font-size: 18px; font-weight: 700; color: #0f172a; }
.topbar-right { display: flex; align-items: center; gap: 10px; }
.topbar-link { font-size: 13px; color: #64748b; text-decoration: none; }
.topbar-link:hover { color: #2563eb; }
.topbar-sep { color: #e2e8f0; font-size: 12px; }

.content-area { padding: 24px 28px; }

/* ----- Shared Component Styles ----- */

/* Cards */
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 500; border: none; cursor: pointer; text-decoration: none;
  transition: all 0.15s;
}
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-outline { background: transparent; border: 1px solid #e2e8f0; color: #64748b; }
.btn-outline:hover { border-color: #bfdbfe; color: #2563eb; background: #f8fafc; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
.btn-sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
.btn-warning { background: #f59e0b; color: #fff; }
.btn-warning:hover { background: #d97706; }

/* Inputs */
.input {
  padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px;
  outline: none; transition: all 0.15s; color: #334155; background: #fff;
}
.input:focus { border-color: #bfdbfe; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.input::placeholder { color: #94a3b8; }
select.input { cursor: pointer; }

/* Tables */
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th {
  text-align: left; padding: 10px 14px; color: #64748b; font-weight: 600;
  border-bottom: 2px solid #e2e8f0; white-space: nowrap;
}
.data-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.data-table tr:hover td { background: #f8fafc; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; }
.page-btn {
  padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;
  cursor: pointer; background: #fff; color: #64748b; transition: all 0.15s;
}
.page-btn:hover { border-color: #bfdbfe; color: #2563eb; }
.page-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-info { font-size: 13px; color: #94a3b8; margin: 0 8px; }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }

/* Filters */
.filter-group { display: flex; align-items: center; gap: 6px; }
.filter-label { font-size: 12px; color: #94a3b8; white-space: nowrap; }

/* Search box */
.search-box {
  display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 0 12px; background: #fff; transition: all 0.15s; flex: 1; max-width: 320px;
}
.search-box:focus-within { border-color: #bfdbfe; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.search-box input { border: none; background: transparent; padding: 8px 6px; font-size: 13px; outline: none; flex: 1; color: #334155; }
.search-box input::placeholder { color: #94a3b8; }
.search-box .search-icon { color: #94a3b8; width: 16px; height: 16px; cursor: pointer; }

/* Stat Cards */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;
}
.stat-card .stat-label { font-size: 12px; color: #94a3b8; font-weight: 500; }
.stat-card .stat-value {
  font-size: 28px; font-weight: 800; margin-top: 4px; line-height: 1.2;
}
.stat-card .stat-sub { font-size: 12px; color: #cbd5e1; margin-top: 2px; }

/* Loading & empty states */
.loading-state { text-align: center; padding: 48px 20px; color: #94a3b8; font-size: 14px; }
.empty-state { text-align: center; padding: 48px 20px; color: #94a3b8; }
.empty-state .empty-icon { font-size: 36px; margin-bottom: 8px; }
.empty-state .empty-text { font-size: 14px; }

/* Badge tags */
.tag {
  display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 500;
}
.tag-blue { background: #eff6ff; color: #2563eb; }
.tag-green { background: #f0fdf4; color: #16a34a; }
.tag-yellow { background: #fefce8; color: #ca8a04; }
.tag-red { background: #fef2f2; color: #dc2626; }
.tag-purple { background: #faf5ff; color: #9333ea; }
.tag-gray { background: #f1f5f9; color: #64748b; }
.tag-orange { background: #fff7ed; color: #ea580c; }

/* Section */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 15px; font-weight: 700; color: #0f172a; }

/* Tab bar */
.tab-bar { display: flex; gap: 4px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 4px; }
.tab-item {
  flex: 1; text-align: center; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 500;
  color: #64748b; text-decoration: none; transition: all 0.15s;
}
.tab-item:hover { background: #f1f5f9; color: #0f172a; }
.tab-item.active { background: #2563eb; color: #fff; }
</style>
