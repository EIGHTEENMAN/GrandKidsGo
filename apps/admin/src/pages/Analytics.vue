<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

const startDate = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
const endDate = ref(new Date().toISOString().slice(0, 10))
const loading = ref(false)

const data = ref<any>({})

const charts: Record<string, any> = {}

const chartDefs = [
  'chart-user-growth',
  // HIDDEN: forum/store charts, will re-enable later
  // 'chart-post-growth',
  // 'chart-comment-growth',
  // 'chart-like-growth',
  // 'chart-order-growth',
  'chart-points-growth',
  'chart-usage-pie',
  'chart-usage-growth',
]

function authHeaders() {
  return { Authorization: 'Bearer ' + sessionStorage.getItem('admin_token') }
}

const appLabels: Record<string, string> = {
  xueguoxue: '学国学', xueshici: '学诗词', xuetongshi: '学通识',
  english: '学英语', tiaozhan: '来挑战', travel: '走天下',
}

const appColors: Record<string, string> = {
  xueguoxue: '#f59e0b', xueshici: '#06b6d4', xuetongshi: '#8b5cf6',
  english: '#ec4899', tiaozhan: '#ef4444', travel: '#2563eb',
}

const appColorList = ['#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444', '#2563eb']

function appLabel(name: string) {
  return appLabels[name] || name
}

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('startDate', startDate.value)
    params.set('endDate', endDate.value)
    const r = await fetch('/api/admin/analytics/overview?' + params.toString(), { headers: authHeaders() })
    data.value = await r.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  await nextTick()
  renderCharts()
  setTimeout(() => chartDefs.forEach(id => charts[id]?.resize()), 100)
}

function initChart(elId: string) {
  const el = document.getElementById(elId)
  if (!el) return null
  charts[elId]?.dispose()
  const chart = echarts.init(el)
  charts[elId] = chart
  return chart
}

function lineOpt(title: string, dates: string[], values: number[], color: string) {
  return {
    title: { text: title, textStyle: { fontSize: 14, fontWeight: 600 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#94a3b8' } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, color: '#94a3b8' } },
    series: [{
      type: 'line', smooth: true, data: values,
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '33' }, { offset: 1, color: color + '00' }] }
      },
      itemStyle: { color },
    }],
  }
}

function renderCharts() {
  // User growth
  const ug = data.value.users?.growth || []
  const ch1 = initChart('chart-user-growth')
  if (ch1) ch1.setOption(lineOpt('用户增长趋势', ug.map((g: any) => g.d), ug.map((g: any) => g.cnt), '#2563eb'))

  // HIDDEN: forum charts (post/comment/like growth), will re-enable later
  // const pg = data.value.forum?.postGrowth || []
  // const ch2 = initChart('chart-post-growth')
  // if (ch2) ch2.setOption(lineOpt('帖子增长趋势', pg.map((g: any) => g.d), pg.map((g: any) => g.cnt), '#f59e0b'))
  // const cg = data.value.forum?.commentGrowth || []
  // const ch3 = initChart('chart-comment-growth')
  // if (ch3) ch3.setOption(lineOpt('评论增长趋势', cg.map((g: any) => g.d), cg.map((g: any) => g.cnt), '#06b6d4'))
  // const lg = data.value.forum?.likeGrowth || []
  // const ch4 = initChart('chart-like-growth')
  // if (ch4) ch4.setOption(lineOpt('点赞增长趋势', lg.map((g: any) => g.d), lg.map((g: any) => g.cnt), '#ec4899'))

  // HIDDEN: store order chart, will re-enable later
  // const og = data.value.store?.orderGrowth || []
  // const ch5 = initChart('chart-order-growth')
  // if (ch5) ch5.setOption(lineOpt('商城订单趋势', og.map((g: any) => g.d), og.map((g: any) => g.cnt), '#8b5cf6'))

  // Points growth
  const ptg = data.value.points?.growth || []
  const ch6 = initChart('chart-points-growth')
  if (ch6) {
    ch6.setOption({
      title: { text: '积分增长趋势', textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['累积', '兑换'], bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, bottom: 50, top: 40 },
      xAxis: { type: 'category', data: ptg.map((g: any) => g.d), axisLabel: { fontSize: 11, color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11, color: '#94a3b8' } },
      series: [
        {
          name: '累积', type: 'line', smooth: true, data: ptg.map((g: any) => g.earned),
          lineStyle: { color: '#16a34a', width: 2 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,163,74,0.2)' }, { offset: 1, color: 'rgba(22,163,74,0)' }] } },
          itemStyle: { color: '#16a34a' },
        },
        {
          name: '兑换', type: 'line', smooth: true, data: ptg.map((g: any) => g.spent),
          lineStyle: { color: '#dc2626', width: 2 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(220,38,38,0.2)' }, { offset: 1, color: 'rgba(220,38,38,0)' }] } },
          itemStyle: { color: '#dc2626' },
        },
      ],
    })
  }

  // Usage pie chart
  const byApp = data.value.usage?.byApp || []
  const ch7 = initChart('chart-usage-pie')
  if (ch7) {
    ch7.setOption({
      title: { text: '各子应用使用分布', textStyle: { fontSize: 14, fontWeight: 600 }, left: 'center' },
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${p.value} 次 (${p.percent}%)` },
      series: [{
        type: 'pie', radius: ['36%', '60%'], center: ['50%', '55%'],
        data: byApp.map((a: any) => ({
          name: appLabel(a.app_name),
          value: a.cnt,
          itemStyle: { color: appColors[a.app_name] || '#94a3b8' },
        })),
        label: { fontSize: 12, color: '#64748b', formatter: '{b}\n{c} 次' },
        emphasis: { label: { fontSize: 14, fontWeight: 'bold' } },
      }],
    })
  }

  // Sub-app usage growth trend (multi-line chart)
  const ag = data.value.usage?.appGrowth || []
  const ch8 = initChart('chart-usage-growth')
  if (ch8) {
    // Collect unique dates & apps
    const allDates = [...new Set<string>(ag.map((g: any) => g.d))].sort()
    const appsInData = [...new Set<string>(ag.map((g: any) => g.app_name))]
    const series = appsInData.map((app, idx) => ({
      name: appLabel(app),
      type: 'line' as const,
      smooth: true,
      data: allDates.map(d => {
        const match = ag.find((g: any) => g.d === d && g.app_name === app)
        return match ? match.cnt : 0
      }),
      lineStyle: { color: appColors[app] || appColorList[idx % appColorList.length], width: 2 },
      itemStyle: { color: appColors[app] || appColorList[idx % appColorList.length] },
    }))

    ch8.setOption({
      title: { text: '各子应用使用增长趋势', textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: 'axis' },
      legend: { data: appsInData.map(a => appLabel(a)), bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, bottom: 50, top: 40 },
      xAxis: { type: 'category', data: allDates, axisLabel: { fontSize: 11, color: '#94a3b8' } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, color: '#94a3b8' } },
      series,
    })
  }
}

function handleResize() {
  chartDefs.forEach(id => charts[id]?.resize())
}

function onPreset(days: number) {
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  startDate.value = start.toISOString().slice(0, 10)
  endDate.value = end.toISOString().slice(0, 10)
  fetchData()
}

function fmt(n: number | undefined | null) {
  if (n == null) return '-'
  return n.toLocaleString()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  chartDefs.forEach(id => charts[id]?.dispose())
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <!-- Time Filters -->
  <div class="card" style="margin-bottom:16px">
    <div class="toolbar">
      <div class="filter-group">
        <span class="filter-label">开始</span>
        <input v-model="startDate" type="date" class="input" style="padding:6px 10px" />
      </div>
      <div class="filter-group">
        <span class="filter-label">结束</span>
        <input v-model="endDate" type="date" class="input" style="padding:6px 10px" />
      </div>
      <div class="filter-group" style="gap:4px">
        <button class="btn btn-sm btn-outline" @click="onPreset(7)">7天</button>
        <button class="btn btn-sm btn-outline" @click="onPreset(30)">30天</button>
        <button class="btn btn-sm btn-outline" @click="onPreset(90)">90天</button>
      </div>
      <button class="btn btn-primary" @click="fetchData">查询</button>
    </div>
  </div>

  <div v-if="loading" class="loading-state">加载中...</div>

  <template v-if="!loading">
    <!-- Stats Cards -->
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
      <div class="stat-card">
        <div class="stat-label">注册用户</div>
        <div class="stat-value" style="color:#2563eb">{{ fmt(data.users?.total) }}</div>
      </div>
      <!-- HIDDEN: forum/store stats, will re-enable later
      <div class="stat-card">
        <div class="stat-label">帖子总数</div>
        <div class="stat-value" style="color:#f59e0b">{{ fmt(data.forum?.totalPosts) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">评论总数</div>
        <div class="stat-value" style="color:#06b6d4">{{ fmt(data.forum?.totalComments) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">点赞总数</div>
        <div class="stat-value" style="color:#ec4899">{{ fmt(data.forum?.totalLikes) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">商城订单</div>
        <div class="stat-value" style="color:#8b5cf6">{{ fmt(data.store?.totalOrders) }}</div>
      </div>
      -->
      <div class="stat-card">
        <div class="stat-label">积分累积</div>
        <div class="stat-value" style="color:#16a34a">{{ fmt(data.points?.totalEarned) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">积分兑换</div>
        <div class="stat-value" style="color:#dc2626">{{ fmt(data.points?.totalSpent) }}</div>
      </div>
    </div>

    <!-- Charts: Row 1 (3-col) + Row 2 (3-col) + Row 3 (2-col) -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="padding:16px">
        <div id="chart-user-growth" style="height:260px"></div>
      </div>
      <!-- HIDDEN: forum/store charts, will re-enable later
      <div class="card" style="padding:16px">
        <div id="chart-post-growth" style="height:260px"></div>
      </div>
      <div class="card" style="padding:16px">
        <div id="chart-comment-growth" style="height:260px"></div>
      </div>
      <div class="card" style="padding:16px">
        <div id="chart-like-growth" style="height:260px"></div>
      </div>
      <div class="card" style="padding:16px">
        <div id="chart-order-growth" style="height:260px"></div>
      </div>
      -->
      <div class="card" style="padding:16px">
        <div id="chart-points-growth" style="height:260px"></div>
      </div>
    </div>

    <!-- Row: usage distribution + usage growth trend -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card" style="padding:16px">
        <div id="chart-usage-pie" style="height:300px"></div>
      </div>
      <div class="card" style="padding:16px">
        <div id="chart-usage-growth" style="height:300px"></div>
      </div>
    </div>
  </template>
</template>
