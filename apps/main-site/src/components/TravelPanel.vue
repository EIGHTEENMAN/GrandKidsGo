<!--
  走天下记录面板（main-site 个人中心联动）
  详见 项目建设方案/走天下实施方案-v2.0.md 第十三节 B
  - v1.5: summary + 旅行明细 + 勋章墙（脱敏）
  - v2.0: + 勋章稀有度分布 + 本周榜单 + 勋章等级分 + 勋章动态 3 条

  隐私硬约束（v1.4 第十五节 B + v2.0 加强）：
  - 不显示孩子年龄（只显示"幼儿/学龄前/学龄"）
  - 不显示孩子的真实姓名
  - 勋章文案去隐私化（"亲子勋章" 而非 "3岁娃勋章"）
  - 不显示孩子的照片
  - 排行榜 Top 3 展示用"某位妈妈/宝宝 N 月"脱敏
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const TRAVEL_API = (import.meta.env.VITE_TRAVEL_API as string) || 'https://travel.grandand.com'

interface Summary {
  cities: number
  plans: number
  publishedGuides: number
  badges: number
  byRarity: { bronze: number; silver: number; gold: number; diamond: number }
  totalScore: number
  myRank: number | null
}

interface TravelPlanRow {
  id: string
  title: string
  status: string
  childAges: number[]
}

interface RecentBadge {
  name: string
  icon: string
  rarity: string
  obtainedAt: string
}

interface RecentActivity {
  id: string
  type: string
  text: string
  createdAt: string
}

const summary = ref<Summary | null>(null)
const plans = ref<TravelPlanRow[]>([])
const recentBadges = ref<RecentBadge[]>([])
const recentActivities = ref<RecentActivity[]>([])
const loading = ref(true)
const errMsg = ref('')

function authHeaders(): Record<string, string> {
  const t = sessionStorage.getItem('grandkidsgo_token') || ''
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function ageBucket(ages: number[]): string {
  if (!ages.length) return '未填写'
  const months = ages[0] ?? 0
  if (months < 36) return '幼儿'
  if (months < 72) return '学龄前'
  return '学龄'
}

const RARITY_META: Record<string, { label: string; emoji: string; color: string }> = {
  bronze:  { label: '铜', emoji: '🥉', color: '#a16207' },
  silver:  { label: '银', emoji: '🥈', color: '#475569' },
  gold:    { label: '金', emoji: '🥇', color: '#ca8a04' },
  diamond: { label: '钻', emoji: '💎', color: '#1e40af' },
}

const ACTIVITY_META: Record<string, { emoji: string; label: string; color: string }> = {
  badge_unlocked:  { emoji: '🏅', label: '勋章', color: '#f59e0b' },
  guide_published: { emoji: '📝', label: '攻略', color: '#2563eb' },
  trip_completed:  { emoji: '✈️', label: '出行', color: '#16a34a' },
}

// v2.0: 5 块卡（v1.5 4 块 + 等级分）
const summaryCards = computed(() => {
  if (!summary.value) return []
  const s = summary.value
  return [
    { num: s.cities, label: '去过城市', color: '#2563eb' },
    { num: s.plans, label: '计划总数', color: '#9333ea' },
    { num: s.publishedGuides, label: '发布攻略', color: '#ec4899' },
    { num: s.badges, label: '亲子勋章', color: '#16a34a' },
    { num: s.totalScore, label: '等级分', color: '#ea580c' },
  ]
})

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const res = await fetch(`${TRAVEL_API}/api/user/travel-stats`, { headers: authHeaders() })
    if (res.ok) {
      const d = await res.json()
      summary.value = d.summary
      plans.value = d.plans ?? []
      recentBadges.value = d.recentBadges ?? []
      recentActivities.value = d.recentActivities ?? []
    } else {
      errMsg.value = '走天下记录加载失败'
    }
  } catch {
    errMsg.value = '网络错误，请稍后再试'
  } finally {
    loading.value = false
  }
}

defineExpose({ reload: load })
onMounted(load)
</script>

<template>
  <section class="travel-panel">
    <header class="tp-head">
      <h2 class="tp-title">走天下记录</h2>
      <span class="tp-sub">v2.0 · 孩子真实感受数据，跨产品脱敏</span>
    </header>

    <div v-if="loading" class="tp-loading">加载走天下记录…</div>
    <div v-else-if="errMsg" class="tp-error">{{ errMsg }}</div>

    <template v-else>
      <!-- 5 块统计 -->
      <div class="tp-summary">
        <div v-for="(c, i) in summaryCards" :key="i" class="tp-stat">
          <span class="tp-stat-num" :style="{ color: c.color }">{{ c.num }}</span>
          <span class="tp-stat-label">{{ c.label }}</span>
        </div>
      </div>

      <!-- 本周榜单（脱敏 Top 3） -->
      <div v-if="summary && summary.myRank !== null" class="tp-section tp-rank-section">
        <h3 class="tp-section-title">
          <span>🏆 本周妈妈榜</span>
          <span class="tp-rank-me">你排名第 <strong>#{{ summary.myRank }}</strong></span>
        </h3>
        <p class="tp-rank-tip">数据来源：本周已发布攻略 + 孩子真实感受分均值</p>
        <a :href="`${TRAVEL_API}/leaderboard`" target="_blank" class="tp-link-btn">查看完整榜单 →</a>
      </div>
      <div v-else class="tp-section tp-rank-section">
        <h3 class="tp-section-title">🏆 本周妈妈榜</h3>
        <p class="tp-rank-tip">还没上榜 · 完成一次出行 + 发布攻略即可上榜</p>
      </div>

      <!-- 勋章稀有度分布 -->
      <div v-if="summary && summary.badges > 0" class="tp-section">
        <h3 class="tp-section-title">勋章稀有度</h3>
        <div class="tp-rarity-bar">
          <div
            v-for="r in ['diamond', 'gold', 'silver', 'bronze']"
            :key="r"
            class="tp-rarity-pill"
            :style="{ background: RARITY_META[r].color + '15', color: RARITY_META[r].color }">
            <span class="tp-rarity-emoji">{{ RARITY_META[r].emoji }}</span>
            <span class="tp-rarity-num">{{ summary.byRarity[r] || 0 }}</span>
            <span class="tp-rarity-label">{{ RARITY_META[r].label }}</span>
          </div>
        </div>
      </div>

      <!-- 旅行明细 -->
      <div class="tp-section">
        <h3 class="tp-section-title">旅行明细</h3>
        <div v-if="plans.length === 0" class="tp-empty">还没有旅行记录</div>
        <ul v-else class="tp-plan-list">
          <li v-for="p in plans.slice(0, 5)" :key="p.id" class="tp-plan-row">
            <span class="tp-plan-title">{{ p.title }}</span>
            <span class="tp-plan-meta">
              <span class="tp-plan-status" :class="`s-${p.status}`">{{ p.status }}</span>
              <span class="tp-plan-age">{{ ageBucket(p.childAges) }}</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- 勋章动态 3 条 -->
      <div v-if="recentActivities.length > 0" class="tp-section">
        <h3 class="tp-section-title">近期勋章动态</h3>
        <ul class="tp-activity-list">
          <li v-for="a in recentActivities" :key="a.id" class="tp-activity">
            <span class="tp-activity-tag" :style="{ background: ACTIVITY_META[a.type]?.color + '20', color: ACTIVITY_META[a.type]?.color }">
              {{ ACTIVITY_META[a.type]?.emoji ?? '·' }} {{ ACTIVITY_META[a.type]?.label ?? a.type }}
            </span>
            <span class="tp-activity-text">{{ a.text }}</span>
            <span class="tp-activity-time">{{ timeAgo(a.createdAt) }}</span>
          </li>
        </ul>
      </div>

      <!-- 亲子勋章墙（按稀有度排，v1.5 已有） -->
      <div v-if="recentBadges.length > 0" class="tp-section">
        <h3 class="tp-section-title">亲子勋章（脱敏展示，按稀有度排）</h3>
        <ul class="tp-badge-list">
          <li v-for="b in recentBadges.slice(0, 8)" :key="b.name" class="tp-badge">
            <span class="tp-badge-icon">{{ b.icon }}</span>
            <span class="tp-badge-name">{{ b.name }}</span>
            <span class="tp-badge-rarity" :style="{ color: RARITY_META[b.rarity]?.color }">
              {{ RARITY_META[b.rarity]?.emoji }}{{ RARITY_META[b.rarity]?.label }}
            </span>
          </li>
        </ul>
        <p class="tp-privacy-note">按 v1.4 第十五节 B + v2.0 加强 5 条：不显示孩子年龄 / 真实姓名 / 照片</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.travel-panel {
  background: #fff;
  border-radius: 24rpx;
  border: 1rpx solid #e2e8f0;
  padding: 32rpx;
  margin-top: 24rpx;
}
.tp-head { margin-bottom: 24rpx; }
.tp-title { font-size: 32rpx; font-weight: 700; color: #0f172a; margin: 0; }
.tp-sub { font-size: 22rpx; color: #94a3b8; }

.tp-loading, .tp-error { padding: 48rpx 24rpx; text-align: center; color: #94a3b8; font-size: 24rpx; }
.tp-error { color: #ef4444; }

/* 5 块统计 */
.tp-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; margin-bottom: 24rpx; }
.tp-stat { display: flex; flex-direction: column; align-items: center; padding: 20rpx 6rpx; background: linear-gradient(135deg, #f0fdf4, #fff); border-radius: 14rpx; }
.tp-stat-num { font-size: 36rpx; font-weight: 800; line-height: 1.1; }
.tp-stat-label { font-size: 20rpx; color: #64748b; margin-top: 2rpx; }

/* Section 共用 */
.tp-section { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #f1f5f9; }
.tp-section:first-of-type { border-top: 0; padding-top: 0; }
.tp-section-title { font-size: 26rpx; color: #475569; font-weight: 600; margin: 0 0 14rpx; display: flex; align-items: center; gap: 12rpx; }

/* 排行榜 section */
.tp-rank-section { background: linear-gradient(135deg, #fef3c7, #fff7ed); border-radius: 14rpx; padding: 20rpx; border-top: 0; }
.tp-rank-me { font-size: 24rpx; color: #92400e; font-weight: 500; }
.tp-rank-me strong { color: #ea580c; font-size: 28rpx; }
.tp-rank-tip { font-size: 22rpx; color: #92400e; margin: 0 0 12rpx; }
.tp-link-btn { display: inline-block; padding: 8rpx 20rpx; background: #ea580c; color: #fff; border-radius: 8rpx; font-size: 22rpx; text-decoration: none; font-weight: 500; }
.tp-link-btn:hover { background: #c2410c; }

/* 稀有度分布 */
.tp-rarity-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.tp-rarity-pill { display: flex; flex-direction: column; align-items: center; padding: 14rpx 8rpx; border-radius: 12rpx; }
.tp-rarity-emoji { font-size: 32rpx; line-height: 1; }
.tp-rarity-num { font-size: 28rpx; font-weight: 800; line-height: 1.1; margin-top: 4rpx; }
.tp-rarity-label { font-size: 20rpx; margin-top: 2rpx; }

/* 旅行明细 */
.tp-plan-list { list-style: none; padding: 0; margin: 0; }
.tp-plan-row { display: flex; justify-content: space-between; padding: 14rpx 0; border-bottom: 1rpx solid #f1f5f9; }
.tp-plan-title { font-size: 24rpx; color: #0f172a; }
.tp-plan-meta { display: flex; gap: 10rpx; align-items: center; }
.tp-plan-status { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 10rpx; background: #f1f5f9; color: #64748b; }
.tp-plan-status.s-completed, .tp-plan-status.s-published { background: #dcfce7; color: #166534; }
.tp-plan-age { font-size: 20rpx; color: #64748b; }

/* 活动动态 */
.tp-activity-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12rpx; }
.tp-activity { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; border-bottom: 1rpx solid #f1f5f9; }
.tp-activity:last-child { border-bottom: 0; }
.tp-activity-tag { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; font-weight: 500; flex-shrink: 0; }
.tp-activity-text { font-size: 24rpx; color: #475569; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-activity-time { font-size: 20rpx; color: #94a3b8; flex-shrink: 0; }

/* 勋章墙 */
.tp-badge-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; }
.tp-badge { display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 18rpx 10rpx; background: linear-gradient(135deg, #fef3c7, #fff); border-radius: 14rpx; border: 1rpx solid #fde68a; }
.tp-badge-icon { font-size: 40rpx; }
.tp-badge-name { font-size: 22rpx; font-weight: 700; color: #0f172a; text-align: center; }
.tp-badge-rarity { font-size: 18rpx; font-weight: 700; }
.tp-empty { font-size: 22rpx; color: #94a3b8; padding: 12rpx 0; }
.tp-privacy-note { font-size: 18rpx; color: #94a3b8; margin-top: 14rpx; text-align: center; }
</style>
