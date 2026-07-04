<script setup lang="ts">
defineProps<{
  results: any[]
  query: string
}>()

function getSourceColor(source: string): string {
  const colors: Record<string, string> = { shici:'#f59e0b', guoxue:'#8b5cf6', tongshi:'#06b6d4', english:'#ec4899', tiaozhan:'#ef4444' }
  return colors[source] || '#2563eb'
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = { '诗词':'📜', '国学经典':'📚', '通识百科':'🔭', '英语单词':'🔤', '挑战':'⚡' }
  return icons[type] || '📄'
}

function getExcerpt(doc: any, kw: string): string {
  if (!kw.trim() || !doc.content) return doc.summary || ''
  const text = doc.content
  const idx = text.indexOf(kw)
  if (idx === -1) return doc.summary || ''
  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + kw.length + 30)
  let excerpt = text.substring(start, end)
  if (start > 0) excerpt = '...' + excerpt
  if (end < text.length) excerpt = excerpt + '...'
  return excerpt
}

function getContentUrl(doc: any): string {
  const baseUrl = doc.sourceUrl || ''
  const source = doc.source || ''
  if (source === 'shici') return baseUrl + '#detail/' + doc.id.replace('shici-', '')
  if (source === 'guoxue') return baseUrl + '#reader/' + doc.id.replace('guoxue-', '')
  if (source === 'tongshi') return baseUrl + '#reader/' + doc.id.replace('tongshi-', '')
  return baseUrl + '?q=' + encodeURIComponent(doc.title)
}
</script>

<template>
  <div v-if="results.length > 0" class="shared-content-section">
    <h3 class="shared-section-title">📚 内容搜索结果</h3>
    <div class="shared-content-list">
      <a v-for="doc in results" :key="doc.id" :href="getContentUrl(doc)" target="_self" class="shared-content-item">
        <div class="shared-content-icon" :style="{ backgroundColor: getSourceColor(doc.source) + '15' }">
          <span class="shared-content-emoji">{{ getTypeIcon(doc.type) }}</span>
        </div>
        <div class="shared-content-info">
          <h4 class="shared-content-title">
            {{ doc.title }}
            <span class="shared-content-type" :style="{ color: getSourceColor(doc.source) }">{{ doc.type }}</span>
          </h4>
          <p class="shared-content-summary">{{ getExcerpt(doc, query) }}</p>
          <div class="shared-content-meta">
            <span v-if="doc.author">{{ doc.author }}</span>
            <span v-if="doc.translation">· {{ doc.translation }}</span>
          </div>
        </div>
        <div class="shared-content-arrow">→</div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.shared-content-section { margin-bottom: 32px; }
.shared-section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #0f172a; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
.shared-content-list { display: flex; flex-direction: column; gap: 10px; }
.shared-content-item {
  display: flex; align-items: center; gap: 14px; background: white;
  border-radius: 14px; padding: 16px 20px; text-decoration: none; color: inherit;
  border: 1px solid #e2e8f0; transition: all 0.2s;
}
.shared-content-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); border-color: #bfdbfe; }
.shared-content-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.shared-content-emoji { font-size: 22px; }
.shared-content-info { flex: 1; min-width: 0; }
.shared-content-title { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 3px; }
.shared-content-type { font-size: 11px; margin-left: 8px; font-weight: 500; }
.shared-content-summary { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shared-content-meta { font-size: 12px; color: #94a3b8; margin-top: 3px; }
.shared-content-arrow { font-size: 14px; color: #cbd5e1; flex-shrink: 0; }
</style>
