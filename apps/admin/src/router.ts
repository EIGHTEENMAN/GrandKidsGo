import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import Login from './pages/Login.vue'
import QuizBank from './pages/QuizBank.vue'
import QuizRules from './pages/QuizRules.vue'
import Users from './pages/Users.vue'
// HIDDEN: forum management, will re-enable later
// import Forum from './pages/Forum.vue'
import Analytics from './pages/Analytics.vue'

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { title: '登录', guest: true } },
  { path: '/', name: 'dashboard', component: Dashboard, meta: { title: '仪表盘', requiresAuth: true } },
  { path: '/questions', name: 'questions', component: QuizBank, meta: { title: '题库管理', requiresAuth: true } },
  { path: '/questions/rules', name: 'rules', component: QuizRules, meta: { title: '题库管理 — 出题规则', requiresAuth: true } },
  { path: '/users', name: 'users', component: Users, meta: { title: '用户管理', requiresAuth: true } },
  // HIDDEN: 论坛管理, will re-enable later
  // { path: '/forum', name: 'forum', component: Forum, meta: { title: '论坛管理', requiresAuth: true } },
  { path: '/analytics', name: 'analytics', component: Analytics, meta: { title: '运营分析', requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = sessionStorage.getItem('admin_token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.guest && token) {
    next('/')
  } else {
    next()
  }
})

export default router
