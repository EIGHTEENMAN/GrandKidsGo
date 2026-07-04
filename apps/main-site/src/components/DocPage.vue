<script setup lang="ts">
import { ref, onMounted } from 'vue'

const doc = ref<any>(null)
const loading = ref(true)
const error = ref('')
const docSearchQuery = ref('')

function docDoSearch() {
  if (docSearchQuery.value.trim()) {
    window.location.href = '/search?q=' + encodeURIComponent(docSearchQuery.value.trim())
  }
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id') || ''
  if (!id) { error.value = '缺少文档ID'; loading.value = false; return }
  try {
    const r = await fetch('/api/search/doc?id=' + encodeURIComponent(id))
    const d = await r.json()
    if (d.code === 'OK' && d.data) doc.value = d.data
    else error.value = '文档不存在'
  } catch { error.value = '加载失败，请稍后重试' }
  loading.value = false
})

function srcColor(source: string): string {
  const m: Record<string,string> = { shici:'#f59e0b', guoxue:'#8b5cf6', tongshi:'#06b6d4', english:'#ec4899', tiaozhan:'#ef4444' }
  return m[source] || '#2563eb'
}
function typeIcon(t: string): string {
  const m: Record<string,string> = { '诗词':'📜','国学经典':'📚','通识百科':'🔭','英语单词':'🔤','挑战':'⚡' }
  return m[t] || '📄'
}
</script>

<template>
  <div class="doc-page">
    <header class="doc-header">
      <div class="doc-header-inner">
        <a href="https://grandand.com" class="doc-logo">童慧行</a>
        <form class="doc-search" @submit.prevent="docDoSearch">
          <svg class="doc-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" @click="docDoSearch">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="docSearchQuery" placeholder="搜索" class="doc-search-input" />
        </form>
        <a href="/" class="doc-back-btn">← 返回首页</a>
        <a :href="doc?.sourceUrl" target="_blank" class="doc-source-link" v-if="doc">
          前往 {{ doc.sourceName }} →
        </a>
      </div>
    </header>

    <main class="doc-main" v-if="loading">
      <div class="doc-status"><div class="spinner"></div><p>加载中...</p></div>
    </main>
    <main class="doc-main" v-else-if="error">
      <div class="doc-status"><p>{{ error }}</p><a href="/" class="doc-back-home">返回首页</a></div>
    </main>
    <main class="doc-main" v-else-if="doc">
      <div class="doc-container">
        <div class="doc-meta">
          <span class="doc-type" :style="{ background: srcColor(doc.source)+'18', color: srcColor(doc.source) }">
            {{ typeIcon(doc.type) }} {{ doc.type }}
          </span>
          <span class="doc-tag" v-for="t in doc.tags" :key="t">{{ t }}</span>
        </div>
        <h1 class="doc-title">{{ doc.title }}</h1>
        <div class="doc-byline" v-if="doc.author">
          <span>{{ doc.author }}</span><span v-if="doc.dynasty" style="margin-left:8px;color:#94a3b8">{{ doc.dynasty }}</span>
        </div>
        <div class="doc-trans" v-if="doc.translation">
          <strong>释义：</strong>{{ doc.translation }}
        </div>
        <div class="doc-box">
          <pre class="doc-text">{{ doc.content }}</pre>
        </div>
        <div class="doc-summary" v-if="doc.summary">
          <strong>赏析：</strong>{{ doc.summary }}
        </div>
        <div class="doc-actions">
          <a :href="doc.sourceUrl" target="_blank" class="doc-btn" :style="{ background: srcColor(doc.source) }">
            在「{{ doc.sourceName }}」中查看 →
          </a>
          <a href="/" class="doc-back">← 返回首页</a>
        </div>
      </div>
    </main>
    <main class="doc-main" v-else>
      <div class="doc-status"><p>文档不存在</p><a href="/" class="doc-back-home">返回首页</a></div>
    </main>
  </div>
</template>

<style scoped>
.doc-page{min-height:100vh;background:#f8fafc}
.doc-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0}
.doc-header-inner{max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;gap:16px}
.doc-logo{font-size:32px;font-weight:800;color:#2563eb;text-decoration:none}
.doc-search{display:flex;align-items:center;gap:6px;background:#f1f5f9;border-radius:10px;padding:6px 12px;transition:all .2s;border:1px solid transparent;flex:1;max-width:320px}
.doc-search:focus-within{background:#fff;border-color:#bfdbfe;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.doc-search-icon{width:16px;height:16px;color:#94a3b8;flex-shrink:0;cursor:pointer}
.doc-search-input{border:none;background:transparent;outline:none;font-size:13px;width:160px;color:#334155}
.doc-search-input::placeholder{color:#94a3b8}
.doc-back-btn{font-size:14px;color:#64748b;text-decoration:none;margin-left:auto}
.doc-back-btn:hover{color:#0f172a}
.doc-source-link{font-size:14px;color:#64748b;text-decoration:none;white-space:nowrap}
.doc-source-link:hover{color:#0f172a}
.doc-main{min-height:calc(100vh - 60px)}
.doc-container{max-width:800px;margin:0 auto;padding:40px 24px 80px}
.doc-status{text-align:center;padding:100px 20px;color:#94a3b8}
.spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 16px}
@keyframes s{to{transform:rotate(360deg)}}
.doc-back-home{display:inline-block;margin-top:16px;padding:10px 24px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-size:14px}
.doc-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
.doc-type{padding:4px 14px;border-radius:20px;font-size:13px;font-weight:500}
.doc-tag{padding:3px 10px;border-radius:12px;font-size:12px;background:#f1f5f9;color:#64748b}
.doc-title{font-size:32px;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.3}
.doc-byline{margin-bottom:20px;font-size:15px;color:#64748b}
.doc-trans{margin-bottom:24px;padding:12px 18px;background:#f0f9ff;border-radius:10px;font-size:15px;color:#166534;border-left:3px solid #3b82f6}
.doc-box{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.03)}
.doc-text{font-size:18px;line-height:2;color:#1e293b;white-space:pre-wrap;font-family:inherit}
.doc-summary{padding:20px 24px;background:#f8fafc;border-radius:12px;font-size:15px;line-height:1.8;color:#475569;margin-bottom:40px}
.doc-actions{display:flex;gap:12px;align-items:center}
.doc-btn{display:inline-block;padding:12px 24px;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500;transition:opacity .2s}
.doc-btn:hover{opacity:.9}
.doc-back{font-size:14px;color:#64748b;text-decoration:none}
.doc-back:hover{color:#0f172a}
@media(max-width:600px){
.doc-header-inner{padding:12px 16px;gap:10px}
.doc-search{display:none}
.doc-title{font-size:24px}
.doc-text{font-size:16px}
.doc-box{padding:20px}
.doc-actions{flex-direction:column;align-items:flex-start}
}
</style>
