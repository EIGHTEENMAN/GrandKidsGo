<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const overview = [
  { subject: '诗词', count: 5917, types: 5, source: 'xueshici/src/data/poems.ts（934 首）' },
  { subject: '国学', count: 2801, types: 4, source: 'xueguoxue/src/data/classics.ts（92 部）' },
  { subject: '英语', count: 2000, types: 3, source: 'english/src/data/words.ts（3000 词）' },
  { subject: '通识', count: 3477, types: 4, source: 'xuetongshi/src/data/knowledge.ts（243 主题）' },
]

interface RuleRow {
  type: string
  template: string
  target: string
  difficulty: string
  strategy: string
}

const shiciRules: RuleRow[] = [
  { type: '下一句', template: '「{上句}」的下一句是？', target: '2,200', difficulty: '知名作者=1 / 唐宋=1 / 其他=2', strategy: '同诗 → 同作者 → 同朝代 → 任意' },
  { type: '作者是谁', template: '「{诗句}」是哪位诗人写的？', target: '1,102', difficulty: '极知名作者=1 / 其他=2', strategy: '同朝代作者 → 其他作者' },
  { type: '出自哪首诗', template: '「{诗句}」出自哪首诗？', target: '1,100', difficulty: '随机 [1, 2, 2]', strategy: '同作者其他诗 → 全部诗' },
  { type: '意境题', template: '《{诗名}》营造了怎样的意境？', target: '620', difficulty: '固定 2', strategy: '按标签映射（田园/边塞/爱情等 28 类）+ 知名诗人风格兜底' },
  { type: '理解题', template: '下列哪项是对《{诗名}》的正确理解？', target: '897', difficulty: '固定 2', strategy: '同诗其他章节理解 → 其他诗理解' },
]

const guoxueRules: RuleRow[] = [
  { type: '出自哪部经典', template: '「{原文}」出自哪部经典？', target: '1,000', difficulty: '固定 2', strategy: '同分类经典（蒙学/经/史/子/医）→ 全部' },
  { type: '经典作者', template: '经典《{书名}》的作者是谁？', target: '~92', difficulty: '固定 2', strategy: '同朝代作者 → 全部' },
  { type: '经典常识', template: '以下哪部经典的介绍是："{概要/译文}"？', target: '~200', difficulty: '固定 2', strategy: '同分类经典 → 全部' },
  { type: '评述', template: '"{点评}"——这是对哪部经典的评价？', target: '~200', difficulty: '固定 2', strategy: '同分类经典 → 全部' },
]

const englishRules: RuleRow[] = [
  { type: '中→英', template: '"{中文}" 的英文是？', target: '800', difficulty: '难度≤3=1 / ≤6=2 / else=3', strategy: '同难度单词 → 相邻难度 → 全部' },
  { type: '英→中', template: '"{英文}" 的中文意思是？', target: '800', difficulty: '同上', strategy: '同难度释义 → 全部释义' },
  { type: '选词填空', template: '选择正确的词填空：____', target: '400', difficulty: '同上', strategy: '同难度单词 → 全部单词' },
]

const tongshiRules: RuleRow[] = [
  { type: '定义题', template: '"{描述}是指什么？" / "什么是{描述}？"', target: '不定', difficulty: '科学=2 / 常识=1', strategy: '同主题章节标题 → 同大类标题' },
  { type: '最高级题', template: '"最{特点}是什么？"', target: '不定', difficulty: '科学=2 / 常识=1', strategy: '同主题章节标题 → 同大类标题' },
  { type: '数字/数量题', template: '"{主题}约为多少？"（仅科学类）', target: '不定', difficulty: '固定 2', strategy: '同主题其他数字值' },
  { type: '为什么题', template: '"为什么{现象}？"', target: '~22', difficulty: '科学=2 / 常识=1', strategy: '同主题章节标题 → 同大类标题' },
]

const diffColors = (d: string) => {
  if (d.includes('3')) return 'tag-red'
  if (d.includes('2')) return 'tag-yellow'
  if (d.includes('1')) return 'tag-green'
  return 'tag-gray'
}
</script>

<template>
  <!-- 页内标签页导航 -->
  <div class="tab-bar" style="margin-bottom:16px">
    <router-link to="/questions" class="tab-item" :class="{ active: $route.path === '/questions' }">📋 题库列表</router-link>
    <router-link to="/questions/rules" class="tab-item" :class="{ active: $route.path === '/questions/rules' }">📖 出题规则</router-link>
  </div>
  <!-- 顶部操作栏 -->
  <div class="card" style="margin-bottom:16px">
    <div class="toolbar" style="margin-bottom:0">
      <button class="btn btn-outline btn-sm" @click="router.push('/questions')">← 返回题库</button>
      <div style="font-size:13px;color:#64748b;margin-left:8px">出题规则 — 记录当前题库的题目生成标准</div>
    </div>
  </div>

  <!-- 概况统计 -->
  <div class="stat-grid">
    <div v-for="s in overview" :key="s.subject" class="stat-card">
      <div class="stat-label">{{ s.subject }}</div>
      <div class="stat-value">{{ s.count.toLocaleString() }}<span style="font-size:14px;color:#94a3b8;font-weight:400"> 题</span></div>
      <div class="stat-sub">{{ s.types }} 种题型 · {{ s.source }}</div>
    </div>
  </div>

  <!-- 诗词 -->
  <div class="card" style="margin-bottom:16px">
    <div class="section-header">
      <h3 class="section-title">📜 诗词</h3>
      <span class="tag tag-blue">shici · 5,917 题</span>
    </div>
    <table class="data-table">
      <thead><tr><th style="width:100px">题型</th><th>问题模板</th><th style="width:80px">数量</th><th style="width:140px">难度</th><th>干扰项优先级</th></tr></thead>
      <tbody>
        <tr v-for="r in shiciRules" :key="r.type">
          <td><span class="tag tag-purple">{{ r.type }}</span></td>
          <td><code style="font-size:12px;background:#f8fafc;padding:2px 6px;border-radius:4px;color:#475569">{{ r.template }}</code></td>
          <td>{{ r.target }}</td>
          <td><span :class="['tag', diffColors(r.difficulty)]">{{ r.difficulty }}</span></td>
          <td style="color:#64748b">{{ r.strategy }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 国学 -->
  <div class="card" style="margin-bottom:16px">
    <div class="section-header">
      <h3 class="section-title">📚 国学</h3>
      <span class="tag tag-blue">guoxue · 2,801 题</span>
    </div>
    <table class="data-table">
      <thead><tr><th style="width:100px">题型</th><th>问题模板</th><th style="width:80px">数量</th><th style="width:140px">难度</th><th>干扰项优先级</th></tr></thead>
      <tbody>
        <tr v-for="r in guoxueRules" :key="r.type">
          <td><span class="tag tag-purple">{{ r.type }}</span></td>
          <td><code style="font-size:12px;background:#f8fafc;padding:2px 6px;border-radius:4px;color:#475569">{{ r.template }}</code></td>
          <td>{{ r.target }}</td>
          <td><span :class="['tag', diffColors(r.difficulty)]">{{ r.difficulty }}</span></td>
          <td style="color:#64748b">{{ r.strategy }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 英语 -->
  <div class="card" style="margin-bottom:16px">
    <div class="section-header">
      <h3 class="section-title">🔤 英语</h3>
      <span class="tag tag-blue">english · 2,000 题</span>
    </div>
    <table class="data-table">
      <thead><tr><th style="width:100px">题型</th><th>问题模板</th><th style="width:80px">数量</th><th style="width:200px">难度</th><th>干扰项优先级</th></tr></thead>
      <tbody>
        <tr v-for="r in englishRules" :key="r.type">
          <td><span class="tag tag-purple">{{ r.type }}</span></td>
          <td><code style="font-size:12px;background:#f8fafc;padding:2px 6px;border-radius:4px;color:#475569">{{ r.template }}</code></td>
          <td>{{ r.target }}</td>
          <td><span :class="['tag', diffColors(r.difficulty)]">{{ r.difficulty }}</span></td>
          <td style="color:#64748b">{{ r.strategy }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 通识 -->
  <div class="card">
    <div class="section-header">
      <h3 class="section-title">🌍 通识</h3>
      <span class="tag tag-blue">general/science · 3,477 题</span>
    </div>
    <table class="data-table">
      <thead><tr><th style="width:100px">题型</th><th>问题模板</th><th style="width:80px">数量</th><th style="width:200px">难度</th><th>干扰项优先级</th></tr></thead>
      <tbody>
        <tr v-for="r in tongshiRules" :key="r.type">
          <td><span class="tag tag-purple">{{ r.type }}</span></td>
          <td><code style="font-size:12px;background:#f8fafc;padding:2px 6px;border-radius:4px;color:#475569">{{ r.template }}</code></td>
          <td>{{ r.target }}</td>
          <td><span :class="['tag', diffColors(r.difficulty)]">{{ r.difficulty }}</span></td>
          <td style="color:#64748b">{{ r.strategy }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
