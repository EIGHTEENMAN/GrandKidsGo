<script setup lang="ts">
// GEO 监控仪表盘
// 显示每日 AI 爬虫命中统计 + 关键页面被引用次数 + 提示优化建议
import { ref, onMounted, computed } from 'vue'
<<<<<<< HEAD
=======
import { Card, Table, Tag, Statistic, Row, Col, Alert, Space, Button, message } from 'ant-design-vue'
import { LineChartOutlined, GlobalOutlined, RobotOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85

interface BotStat {
  bot: string
  label: string
  hits: number
  top_urls: Array<{ url: string; hits: number }>
}

interface DailyReport {
  date: string
  total_hits: number
  by_bot: BotStat[]
}

const loading = ref(true)
const report = ref<DailyReport | null>(null)
<<<<<<< HEAD
const errorMsg = ref('')
=======
const last7Days = ref<DailyReport[]>([])
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85

// AI 关键页面被引用提示（运营提示）
const keyPages = [
  { url: 'https://xueshici.grandand.com/', label: '学诗词首页（小学必背 75 首）', priority: '★★★★★' },
  { url: 'https://xueguoxue.grandand.com/', label: '学国学首页（论语/三字经）', priority: '★★★★★' },
  { url: 'https://travel.grandand.com/places', label: '走天下·亲子宝典', priority: '★★★★★' },
  { url: 'https://travel.grandand.com/guides', label: '走天下·家长攻略', priority: '★★★★☆' },
  { url: 'https://grandand.com/about', label: '童慧行·关于我们', priority: '★★★★☆' },
  { url: 'https://grandand.com/en/about', label: 'About Tonghuixing (英文)', priority: '★★★★☆' },
  { url: 'https://travel.grandand.com/whitepaper/2026', label: '亲子游年度白皮书 2026', priority: '★★★★★' },
  { url: 'https://travel.grandand.com/data/kids-feedback-2026.csv', label: '孩子反馈数据集 CSV', priority: '★★★★★' },
]

const totalHitsToday = computed(() =>
  report.value?.by_bot.reduce((s, b) => s + b.hits, 0) ?? 0
)

async function loadToday() {
  loading.value = true
<<<<<<< HEAD
  errorMsg.value = ''
  try {
    const res = await fetch('/api/admin/geo-stats', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('admin_token') ?? ''}` },
=======
  try {
    // 调服务器端脚本生成的最新日志
    // 实际部署时这个端点会读 /grandkidsgo/logs/ai-bot-stats-YYYY-MM-DD.log
    const res = await fetch('/api/admin/geo-stats', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` },
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
    })
    if (res.ok) {
      const json = await res.json()
      report.value = json.data
    } else {
<<<<<<< HEAD
=======
      // 兜底：用模拟数据
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
      report.value = {
        date: new Date().toISOString().slice(0, 10),
        total_hits: 0,
        by_bot: [],
      }
    }
  } catch {
    report.value = {
      date: new Date().toISOString().slice(0, 10),
      total_hits: 0,
      by_bot: [],
    }
  } finally {
    loading.value = false
  }
}

async function runScriptNow() {
<<<<<<< HEAD
  errorMsg.value = '正在运行 AI 爬虫统计脚本...'
  try {
    const res = await fetch('/api/admin/geo-stats/refresh', { method: 'POST' })
    if (res.ok) {
      errorMsg.value = '统计已更新'
      await loadToday()
    } else {
      errorMsg.value = '脚本执行失败，请到服务器手动运行：bash /grandkidsgo/apps/travel-guide/scripts/ai-bot-stats.sh'
    }
  } catch {
    errorMsg.value = 'API 不可达，请到服务器手动运行：bash /grandkidsgo/apps/travel-guide/scripts/ai-bot-stats.sh'
=======
  message.loading('正在运行 AI 爬虫统计脚本...', 0)
  try {
    const res = await fetch('/api/admin/geo-stats/refresh', { method: 'POST' })
    if (res.ok) {
      message.success('统计已更新')
      await loadToday()
    } else {
      message.warning('脚本执行失败，请到服务器手动运行：bash /grandkidsgo/apps/travel-guide/scripts/ai-bot-stats.sh')
    }
  } catch {
    message.warning('API 不可达，请到服务器手动运行：bash /grandkidsgo/apps/travel-guide/scripts/ai-bot-stats.sh')
  } finally {
    message.destroy()
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
  }
}

onMounted(() => {
  loadToday()
})
<<<<<<< HEAD
=======

const botColumns = [
  { title: 'Bot UA', dataIndex: 'bot', key: 'bot', width: 200 },
  { title: '平台', dataIndex: 'label', key: 'label', width: 240 },
  { title: '今日命中', dataIndex: 'hits', key: 'hits', width: 120,
    sorter: (a: BotStat, b: BotStat) => b.hits - a.hits,
    customRender: ({ text }: any) => h('span', { class: 'font-bold text-lg' }, String(text)),
  },
]

const urlColumns = [
  { title: 'URL', dataIndex: 'url', key: 'url' },
  { title: '命中数', dataIndex: 'hits', key: 'hits', width: 100 },
]
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
</script>

<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 mb-1">
<<<<<<< HEAD
          🌍 GEO 监控仪表盘
=======
          <GlobalOutlined class="mr-2 text-blue-500" />
          GEO 监控仪表盘
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
        </h1>
        <p class="text-sm text-gray-500">
          AI 搜索引擎爬虫命中统计 · 今日：<strong>{{ report?.date || '-' }}</strong>
        </p>
      </div>
<<<<<<< HEAD
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        :disabled="loading"
        @click="runScriptNow"
      >
        ⚡ 立即刷新统计
      </button>
    </div>

    <div v-if="errorMsg" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
      {{ errorMsg }}
    </div>

    <div v-if="!loading && totalHitsToday === 0 && !errorMsg" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p class="font-medium text-amber-900">今日暂无 AI 爬虫命中数据</p>
      <p class="text-sm text-amber-700 mt-1">首次使用请到服务器执行：<code>bash /grandkidsgo/apps/travel-guide/scripts/ai-bot-stats.sh</code>。数据将持续累积。</p>
    </div>

    <!-- 顶部统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-5 rounded-xl border border-gray-200">
        <div class="text-xs text-gray-500 mb-1">今日 AI Bot 总命中</div>
        <div class="text-3xl font-bold text-blue-600">{{ totalHitsToday }}</div>
      </div>
      <div class="bg-white p-5 rounded-xl border border-gray-200">
        <div class="text-xs text-gray-500 mb-1">活跃 Bot 数</div>
        <div class="text-3xl font-bold text-emerald-600">{{ report?.by_bot.filter(b => b.hits > 0).length ?? 0 }}</div>
      </div>
      <div class="bg-white p-5 rounded-xl border border-gray-200">
        <div class="text-xs text-gray-500 mb-1">已优化 schema 类型</div>
        <div class="text-3xl font-bold text-amber-600">11 <span class="text-base font-normal text-gray-500">种</span></div>
      </div>
      <div class="bg-white p-5 rounded-xl border border-gray-200">
        <div class="text-xs text-gray-500 mb-1">关键页面 GEO 优先级</div>
        <div class="text-3xl font-bold text-purple-600">{{ keyPages.length }}</div>
      </div>
    </div>

    <!-- Bot 命中列表 -->
    <div class="bg-white rounded-xl border border-gray-200 mb-6 p-6">
      <h2 class="text-lg font-bold text-gray-900 mb-4">🤖 各 AI Bot 命中详情</h2>
      <div v-if="loading" class="text-center py-8 text-gray-400">加载中...</div>
      <div v-else-if="!report?.by_bot.length" class="text-center py-8 text-gray-400">暂无数据</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="px-4 py-2">Bot UA</th>
            <th class="px-4 py-2">平台</th>
            <th class="px-4 py-2 text-right">今日命中</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <template v-for="bot in report.by_bot" :key="bot.bot">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-mono text-xs">{{ bot.bot }}</td>
              <td class="px-4 py-2 text-gray-600">{{ bot.label }}</td>
              <td class="px-4 py-2 text-right font-bold text-lg" :class="bot.hits > 0 ? 'text-blue-600' : 'text-gray-400'">
                {{ bot.hits }}
              </td>
            </tr>
            <tr v-if="bot.top_urls?.length">
              <td colspan="3" class="px-4 py-2 bg-gray-50">
                <div class="text-xs text-gray-500 mb-1">Top URL:</div>
                <div v-for="u in bot.top_urls.slice(0, 5)" :key="u.url" class="text-xs font-mono text-gray-600 truncate">
                  <span class="text-blue-500">{{ u.hits }}×</span> {{ u.url }}
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 关键页面清单 -->
    <div class="bg-white rounded-xl border border-gray-200 mb-6 p-6">
      <h2 class="text-lg font-bold text-gray-900 mb-2">📋 童慧行 GEO 关键页面清单</h2>
      <p class="text-sm text-gray-500 mb-4">这些页面已配置完整 schema + 元信息，应优先被 AI 引擎抓取并引用。</p>
=======
      <Button type="primary" @click="runScriptNow" :loading="loading">
        <ThunderboltOutlined /> 立即刷新统计
      </Button>
    </div>

    <Alert
      v-if="!loading && totalHitsToday === 0"
      type="info"
      show-icon
      class="mb-4"
      message="今日暂无 AI 爬虫命中数据"
      description="首次使用请到服务器执行：bash /grandkidsgo/apps/travel-guide/scripts/ai-bot-stats.sh。数据将持续累积。"
    />

    <!-- 顶部统计 -->
    <Row :gutter="16" class="mb-6">
      <Col :span="6">
        <Card>
          <Statistic
            title="今日 AI Bot 总命中"
            :value="totalHitsToday"
            :value-style="{ color: '#3b82f6' }"
            prefix=<LineChartOutlined />>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="活跃 Bot 数"
            :value="report?.by_bot.filter(b => b.hits > 0).length ?? 0"
            :value-style="{ color: '#10b981' }"
            prefix=<RobotOutlined />>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="已优化 schema 类型"
            :value="11"
            :value-style="{ color: '#f59e0b' }"
            suffix="种"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="关键页面 GEO 优先级"
            :value="keyPages.length"
            :value-style="{ color: '#8b5cf6' }"
          />
        </Card>
      </Col>
    </Row>

    <!-- Bot 命中列表 -->
    <Card title="各 AI Bot 命中详情" class="mb-6">
      <Table
        :columns="botColumns"
        :data-source="report?.by_bot ?? []"
        :loading="loading"
        row-key="bot"
        :pagination="false"
        size="middle"
      >
        <template #expandedRowRender="{ record }">
          <Table
            :columns="urlColumns"
            :data-source="record.top_urls ?? []"
            row-key="url"
            :pagination="false"
            size="small"
          />
        </template>
      </Table>
    </Card>

    <!-- 关键页面清单 -->
    <Card title="童慧行 GEO 关键页面清单" class="mb-6">
      <p class="text-sm text-gray-500 mb-3">这些页面已配置完整 schema + 元信息，应优先被 AI 引擎抓取并引用。</p>
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
      <div class="space-y-2">
        <div v-for="p in keyPages" :key="p.url" class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition">
          <span class="text-amber-500 text-sm flex-shrink-0">{{ p.priority }}</span>
          <span class="text-sm font-mono text-gray-700 flex-1 truncate">{{ p.url }}</span>
          <span class="text-sm text-gray-500 flex-shrink-0">{{ p.label }}</span>
        </div>
      </div>
<<<<<<< HEAD
    </div>

    <!-- 优化建议 -->
    <div class="bg-white rounded-xl border border-gray-200 mb-6 p-6">
      <h2 class="text-lg font-bold text-gray-900 mb-4">💡 GEO 优化建议</h2>
      <div class="space-y-3">
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p class="font-medium text-emerald-900">✅ 已完成 P0/P1/P2 GEO 基础设施</p>
          <p class="text-sm text-emerald-700 mt-1">
            9 个子域 llms.txt + robots.txt + og-cover.svg + 11 种 schema 注入器 + 孩子反馈数据集 + 母婴设施数据集 + 亲子游年度白皮书 + 英文 About 页 + 静态 API v1 端点
          </p>
        </div>
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="font-medium text-blue-900">💡 持续优化方向</p>
          <p class="text-sm text-blue-700 mt-1">
            （1）每季度抽样在豆包/Kimi/ChatGPT 搜索核心关键词，记录被引用次数与引用的页面 URL；（2）扩展数据集覆盖（如儿童心理发展里程碑、研学课程数据）；（3）持续扩充英文版覆盖（诗词英文翻译、景点英文介绍）
          </p>
        </div>
        <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="font-medium text-amber-900">⚠️ 注意 ICP 备案拦截</p>
          <p class="text-sm text-amber-700 mt-1">
            如果连续 3 天 GPTBot/ClaudeBot 命中数仍为 0，请检查阿里云 ICP 备案状态 — 公网被拦截会导致 AI 爬虫无法到达。
          </p>
        </div>
      </div>
    </div>
=======
    </Card>

    <!-- 优化建议 -->
    <Card title="GEO 优化建议" class="mb-6">
      <Space direction="vertical" class="w-full">
        <Alert
          type="success"
          show-icon
          message="✅ 已完成 P0/P1/P2 GEO 基础设施"
          description="9 个子域 llms.txt + robots.txt + og-cover.svg + 11 种 schema 注入器 + 孩子反馈数据集 + 母婴设施数据集 + 亲子游年度白皮书 + 英文 About 页 + 静态 API v1 端点"
        />
        <Alert
          type="info"
          show-icon
          message="💡 持续优化方向"
          description="（1）每季度抽样在豆包/Kimi/ChatGPT 搜索核心关键词，记录被引用次数与引用的页面 URL；（2）扩展数据集覆盖（如儿童心理发展里程碑、研学课程数据）；（3）持续扩充英文版覆盖（诗词英文翻译、景点英文介绍）"
        />
        <Alert
          type="warning"
          show-icon
          message="⚠️ 注意 ICP 备案拦截"
          description="如果连续 3 天 GPTBot/ClaudeBot 命中数仍为 0，请检查阿里云 ICP 备案状态 — 公网被拦截会导致 AI 爬虫无法到达。"
        />
      </Space>
    </Card>
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
  </div>
</template>

<style scoped>
<<<<<<< HEAD
.font-mono { font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace; }
=======
.ant-card { border-radius: 12px; }
>>>>>>> 56005c5c9b83d24232c201f024da8cd970bc2f85
</style>
