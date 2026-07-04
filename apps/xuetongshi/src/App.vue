<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { knowledgeIndex, categories, categoryColors, dailyQuotes, type TopicMeta } from './data/knowledge-meta'
import type { Topic, Section } from './data/knowledge'
import { speak, stopSpeaking } from './lib/audio'
import { filterApps } from '@shared/composables/useSearch'
import { reportLearningProgress, getActiveChildId } from '@shared/composables/useLearningProgress'
import { useLearningStats } from '@shared/composables/useLearningStats'
import { useAuth } from '@shared/composables/useAuth'
import HeaderBar from '@shared/components/HeaderBar.vue'
import AppSearchResults from '@shared/components/AppSearchResults.vue'
import ContentSearchResults from '@shared/components/ContentSearchResults.vue'
import FooterBar from '@shared/components/FooterBar.vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import KnowledgeIllustration from './components/KnowledgeIllustration.vue'
import AnimationSlot from './components/AnimationSlot.vue'
import ReadingChallenge from '@shared/components/ReadingChallenge.vue'
import PointReader from '@shared/components/PointReader.vue'

// Navigation
type View = 'home' | 'detail' | 'reader' | 'search'
const currentView = ref<View>('home')
const currentTopic = ref<Topic | null>(null)
const currentSection = ref<Section | null>(null)
const readerEntryTime = ref(0)

// Previous/next section navigation
const sectionIndex = computed(() => {
  if (!currentTopic.value || !currentSection.value) return -1
  return currentTopic.value.sections.findIndex(s => s.id === currentSection.value?.id)
})
const hasPrev = computed(() => sectionIndex.value > 0)
const hasNext = computed(() => {
  if (!currentTopic.value) return false
  return sectionIndex.value >= 0 && sectionIndex.value < currentTopic.value.sections.length - 1
})
function goPrevSection() {
  if (!hasPrev.value || !currentTopic.value) return
  stopSpeaking()
  currentSection.value = currentTopic.value.sections[sectionIndex.value - 1]
  pushHash('reader', currentTopic.value.id, currentSection.value.id)
}
function goNextSection() {
  if (!hasNext.value || !currentTopic.value) return
  stopSpeaking()
  currentSection.value = currentTopic.value.sections[sectionIndex.value + 1]
  pushHash('reader', currentTopic.value.id, currentSection.value.id)
}
const showChallenge = ref(false) // 答题功能暂时隐藏，待后续优化再启用
const challengeSectionRef = ref('')
const { token, user } = useAuth()
const stats = useLearningStats('xuetongshi')

// Lazy-loaded full data (with section content)
const fullData = ref<Topic[] | null>(null)
const loadingData = ref(false)
let fullDataPromise: Promise<void> | null = null

async function ensureFullData() {
  if (fullData.value) return
  if (fullDataPromise) return fullDataPromise
  loadingData.value = true
  fullDataPromise = import('./data/knowledge').then(mod => {
    fullData.value = mod.knowledgeData
    loadingData.value = false
  })
  await fullDataPromise
}

watch(currentView, (newView, oldView) => {
  if (oldView === 'reader' && newView !== 'reader' && readerEntryTime.value > 0) {
    const childId = getActiveChildId()
    if (childId) {
      const elapsed = Math.round((Date.now() - readerEntryTime.value) / 60000)
      reportLearningProgress(childId, 'general', 1, Math.max(1, elapsed))
    }
    readerEntryTime.value = 0
    // 答题功能暂时隐藏，待后续优化再启用：if (challengeSectionRef.value) showChallenge.value = true
  }
  if (newView === 'reader') {
    readerEntryTime.value = Date.now()
    if (currentTopic.value && currentSection.value) {
      challengeSectionRef.value = `general:${currentTopic.value.id}:${currentSection.value.id}`
    }
  }
})

const activeCategory = ref('全部')
const activeDifficulty = ref<'all' | 'P1' | 'P2' | 'P3'>('all')
const searchQuery = ref('')
const apiResults = ref<any[]>([])
const searchResults = ref<{ topic: Topic; sections: Section[] }[]>([])

// --- 难度等级（按类目统一分级） ---
// P1 入门：基础安全/生活常识/日常认知
// P2 通识：自然科学/历史/文化/艺术
// P3 深度：抽象思维/经济规律/前沿科技
const getDifficulty = (t: TopicMeta): 'P1' | 'P2' | 'P3' => {
  // 中国传统文化 ct-* 用静态映射
  if (t.id.startsWith('ct-')) {
    const ctP3 = new Set(['ct-chinese-medicine', 'ct-chinese-martial-arts', 'ct-four-great',
                          'ct-chinese-architecture', 'ct-chinese-porcelain', 'ct-silk-road',
                          'ct-four-classics', 'ct-mythology'])
    if (ctP3.has(t.id)) return 'P3'
    const ctP1 = new Set(['ct-water-safety', 'ct-electricity-safety', 'ct-food-safety',
                          'ct-fire-safety', 'ct-traffic-safety', 'ct-first-aid',
                          'ct-zodiac', 'ct-solar-terms-spring', 'ct-solar-terms-summer',
                          'ct-solar-terms-autumn', 'ct-solar-terms-winter',
                          'ct-lantern-festival', 'ct-qixi', 'ct-papermaking', 'ct-chinese-chess'])
    if (ctP1.has(t.id)) return 'P1'
    return 'P2'
  }
  // 健康生活 → P1
  if (t.category === '健康生活') return 'P1'
  // 逻辑思维 + 经济社会 → P3
  if (t.category === '逻辑思维' || t.category === '经济社会') return 'P3'
  // 科技工程：基础 → P2，前沿 → P3
  if (t.category === '科技工程') {
    const techP3 = new Set(['5g-iot', 'blockchain', 'quantum', 'nano-tech', 'biotech', 'env-eng'])
    return techP3.has(t.id) ? 'P3' : 'P2'
  }
  // 自然：基础动物认知 → P1，专业生态 → P2
  if (t.category === '自然') {
    const natureP1 = new Set(['insects', 'amphibians', 'microbes', 'marine-life', 'ecosystem',
                              'insect-world', 'amphibians-reptiles', 'mammals', 'bird-world',
                              'rare-animals'])
    return natureP1.has(t.id) ? 'P1' : 'P2'
  }
  // 其余类目（地理/历史人物/科学/艺术/语言文字）→ P2
  return 'P2'
}

const difficultyLabel: Record<'P1' | 'P2' | 'P3', { name: string; color: string; emoji: string }> = {
  P1: { name: '入门', color: '#10b981', emoji: '🌱' },
  P2: { name: '进阶', color: '#f59e0b', emoji: '📚' },
  P3: { name: '深度', color: '#ef4444', emoji: '🏆' },
}

const filteredApps = computed(() => filterApps(searchQuery.value))

// Daily quote
const dailyIndex = ref(Math.floor(Math.random() * dailyQuotes.length))

// Favorites
const favoriteIds = ref<string[]>(JSON.parse(localStorage.getItem('xuetongshi_fav') || '[]'))
function toggleFavorite(id: string) {
  const i = favoriteIds.value.indexOf(id)
  i >= 0 ? favoriteIds.value.splice(i, 1) : favoriteIds.value.push(id)
  localStorage.setItem('xuetongshi_fav', JSON.stringify(favoriteIds.value))
}
function isFavorite(id: string) { return favoriteIds.value.includes(id) }

// --- Hash-based URL navigation ---
function pushHash(view: string, topicId?: string, sectionId?: string) {
  let hash = ''
  if (view === 'detail' && topicId) hash = 'detail/' + topicId
  else if (view === 'reader' && topicId && sectionId) hash = 'reader/' + topicId + '/' + sectionId
  else if (view === 'reader' && sectionId) hash = 'reader/' + sectionId  // 兼容旧 hash
  history.pushState(null, '', hash ? '#' + hash : window.location.pathname)
}

async function restoreFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const parts = hash.split('/')
  const view = parts[0]
  if (view === 'detail' && parts[1]) {
    await ensureFullData()
    if (!fullData.value) return
    const item = fullData.value.find(t => t.id === parts[1])
    if (item) { currentTopic.value = item; currentView.value = 'detail' }
  } else if (view === 'reader' && parts[1]) {
    await ensureFullData()
    if (!fullData.value) return
    // 新格式 reader/topicId/sectionId，兼容旧 reader/sectionId
    let topicId, sectionId
    if (parts.length >= 3) {
      topicId = parts[1]
      sectionId = parts[2]
    } else {
      sectionId = parts[1]
    }
    for (const t of fullData.value) {
      if (topicId && t.id !== topicId) continue
      const sec = t.sections.find(s => s.id === sectionId)
      if (sec) { currentTopic.value = t; currentSection.value = sec; currentView.value = 'reader'; break }
    }
  }
}

function openDetail(t: Topic) {
  stopSpeaking()
  stats.markOpened(t.category)
  stats.markRead(t.id)
  currentTopic.value = t
  currentSection.value = null
  currentView.value = 'detail'
  pushHash('detail', t.id)
}

async function openDetailFromMeta(meta: TopicMeta) {
  if (loadingData.value) return
  stopSpeaking()
  await ensureFullData()
  const t = fullData.value?.find(x => x.id === meta.id)
  if (t) openDetail(t)
}

function openReader(s: Section) {
  currentSection.value = s
  currentView.value = 'reader'
  pushHash('reader', currentTopic.value?.id, s.id)
}

function goHome() {
  stopSpeaking()
  currentView.value = 'home'
  currentTopic.value = null
  currentSection.value = null
  history.pushState(null, '', window.location.pathname)
}

function goToSection(t: Topic, s: Section) {
  stats.markOpened(t.category)
  stats.markRead(t.id)
  currentTopic.value = t
  currentSection.value = s
  currentView.value = 'reader'
  pushHash('reader', t.id, s.id)
}

function goBack() {
  stopSpeaking()
  if (currentView.value === 'search') { goHome(); return }
  // reader view → 回当前 topic 的 detail 页（不是历史里的上一个 hash）
  if (currentView.value === 'reader' && currentTopic.value) {
    currentSection.value = null
    currentView.value = 'detail'
    pushHash('detail', currentTopic.value.id)
    return
  }
  history.back()
}

function onPopState() {
  const hash = window.location.hash.slice(1)
  if (!hash) {
    currentView.value = 'home'
    currentTopic.value = null
    currentSection.value = null
    return
  }
  restoreFromHash()
}

// --- Search (local, no redirect) ---
async function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  await ensureFullData()
  const list = fullData.value
  if (!list) return
  const lower = q.toLowerCase()
  const results: { topic: Topic; sections: Section[] }[] = []

  for (const topic of list) {
    const matched: Section[] = []
    const topicMatch = topic.title.includes(lower) || topic.tags.some(t => t.toLowerCase().includes(lower))
    for (const sec of topic.sections) {
      if (sec.title.includes(lower) || sec.content.includes(lower) || topicMatch) {
        matched.push(sec)
      }
    }
    if (matched.length > 0) {
      results.push({ topic, sections: matched })
    }
  }

  searchResults.value = results
  currentView.value = 'search'
  // API search
  try {
    const _res = await fetch('/api/search?q=' + encodeURIComponent(q))
    const _data = await _res.json()
    apiResults.value = _data.data || []
  } catch { apiResults.value = [] }
  stopSpeaking()
  history.replaceState(null, '', window.location.pathname)
}

// HeaderBar 搜索回调（取代无效的 @search 事件）
function handleSearch(q: string) {
  searchQuery.value = q
  doSearch()
}

// --- Home filtering ---
const filteredTopics = computed(() => {
  let list = knowledgeIndex
  if (activeCategory.value !== '全部') list = list.filter(t => t.category === activeCategory.value)
  if (activeDifficulty.value !== 'all') list = list.filter(t => getDifficulty(t) === activeDifficulty.value)
  return list
})

const categoriesWithTopics = computed(() => {
  const cats = activeCategory.value === '全部' ? categories : [activeCategory.value]
  return cats.map(cat => ({
    category: cat,
    color: categoryColors[cat] || '#64748b',
    items: filteredTopics.value.filter(t => t.category === cat)
  })).filter(g => g.items.length > 0)
})

// --- Audio ---
const speaking = ref(false)
function playText(text: string) {
  stopSpeaking()
  if (!text.trim()) return
  speaking.value = true
  speak(text, 0.8, () => { speaking.value = false })
}
function stopAudio() { stopSpeaking(); speaking.value = false }
function getReaderContent(): string { return currentSection.value?.content || '' }

onMounted(async () => {
  window.addEventListener('beforeunload', stopSpeaking)
  window.addEventListener('popstate', onPopState)

  // Check for ?q= param from main-site
  const params = new URLSearchParams(window.location.search)
  const qParam = params.get('q')
  if (qParam) {
    searchQuery.value = qParam
    await doSearch()
    history.replaceState(null, '', window.location.pathname)
    return
  }

  await restoreFromHash()
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', stopSpeaking)
  window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <YouthModeGate>
  <div class="page" style="--hd-accent:#2563eb;--hd-accent-hover:#1d4ed8;--hd-accent-light:#bfdbfe;--hd-accent-shadow:rgba(59,130,246,0.1);--hd-accent-bg:#f0f9ff">
    <HeaderBar v-model="searchQuery" placeholder="搜索知识..." :on-search="handleSearch" />

    <!-- ===== HOME VIEW ===== -->
    <template v-if="currentView === 'home'">
      <section class="ts-hero">
        <div class="ts-hero-inner animate-fadeInUp">
          <div class="ts-hero-row">
            <div class="ts-hero-left">
              <h1 class="ts-hero-title">学通识</h1>
              <p class="ts-hero-desc">博学多识，拓展视野</p>
            </div>
            <div class="ts-hero-right">
              <div class="ts-quote-box">
                <p class="ts-quote-text">{{ dailyQuotes[dailyIndex].text }}</p>
                <p class="ts-quote-source">—— {{ dailyQuotes[dailyIndex].source }}</p>
              </div>
            </div>
          </div>
          <div class="ts-tags animate-fadeIn">
            <button v-for="cat in ['全部', ...categories]" :key="cat" @click="activeCategory = cat"
              class="ts-tag" :class="activeCategory === cat ? 'ts-tag-active' : ''">
              {{ cat }}
            </button>
          </div>
          <div class="ts-diff-tags animate-fadeIn">
            <span class="ts-diff-label">难度：</span>
            <button v-for="d in [{k:'all',n:'全部',c:'#64748b',e:'📋'},{k:'P1',n:'入门',c:difficultyLabel.P1.color,e:difficultyLabel.P1.emoji},{k:'P2',n:'进阶',c:difficultyLabel.P2.color,e:difficultyLabel.P2.emoji},{k:'P3',n:'深度',c:difficultyLabel.P3.color,e:difficultyLabel.P3.emoji}]" :key="d.k"
              @click="activeDifficulty = d.k as any"
              class="ts-diff-tag"
              :class="activeDifficulty === d.k ? 'ts-diff-tag-active' : ''"
              :style="activeDifficulty === d.k ? { backgroundColor: d.c, color: 'white', borderColor: d.c } : { color: d.c, borderColor: d.c + '40' }">
              <span class="ts-diff-emoji">{{ d.e }}</span>{{ d.n }}
            </button>
          </div>
        </div>
      </section>

      <!-- Learning Progress -->
      <div class="ls-bar animate-fadeIn">
        <template v-if="token && user">
          <span class="ls-user">{{ user.nickname || user.username }}</span>
          <span class="ls-dot"></span>
          <span>🌍 已了解 {{ stats.openedCount }}/{{ categories.length }} 个领域</span>
          <span class="ls-dot"></span>
          <span>📚 已学习 {{ stats.readCount }}/{{ knowledgeIndex.length }} 个条目</span>
        </template>
        <template v-else>
          <span>🌍 学习进度：0/{{ categories.length }} 个领域，0/{{ knowledgeIndex.length }} 个条目 — <a href="https://grandand.com?login=1" class="ls-login-link">登录后同步记录</a></span>
        </template>
      </div>

      <section class="ts-grid-section" v-for="g in categoriesWithTopics" :key="g.category">
        <h2 class="section-title">
          <span class="section-title-dot" :style="{ backgroundColor: g.color }"></span>
          {{ g.category }}（{{ g.items.length }}）
        </h2>
        <div class="ts-grid">
          <div v-for="t in g.items" :key="t.id" class="ts-card" @click="openDetailFromMeta(t)">
            <div class="ts-card-top" :style="{ backgroundColor: g.color + '18' }">
              <span class="ts-card-diff" :style="{ backgroundColor: difficultyLabel[getDifficulty(t)].color }">
                {{ difficultyLabel[getDifficulty(t)].emoji }}{{ difficultyLabel[getDifficulty(t)].name }}
              </span>
              <svg class="ts-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="ts-card-title">{{ t.title }}</h3>
            <span class="ts-card-cat" :style="{ backgroundColor: g.color + '18', color: g.color }">{{ t.category }}</span>
            <p class="ts-card-summary">{{ t.summary }}</p>
            <span class="ts-card-count">{{ t.sectionCount }} 节</span>
          </div>
        </div>
        <p v-if="g.items.length === 0" class="ts-empty">暂无内容</p>
      </section>
      <p v-if="categoriesWithTopics.length === 0" class="ts-empty" style="padding:60px 24px">没有找到匹配的知识</p>
    </template>

    <!-- ===== SEARCH RESULTS VIEW ===== -->
    <template v-if="currentView === 'search'">
      <div class="ts-search-results">
        <div class="ts-search-header">
          <button class="ts-back" @click="goBack()">← 返回</button>
        </div>
        <div class="ts-search-summary">搜索 "{{ searchQuery }}"</div>

        <!-- Content search results -->
        <div v-if="searchResults.length > 0" class="ts-section">
          <h3 class="ts-section-title">📚 内容搜索结果</h3>
          <div v-for="r in searchResults" :key="r.topic.id" class="ts-search-group">
            <div class="ts-search-topic" @click="openDetail(r.topic)">
              <span class="ts-search-topic-name">{{ r.topic.title }}</span>
              <span class="ts-search-topic-cat" :style="{ color: categoryColors[r.topic.category] }">{{ r.topic.category }}</span>
            </div>
            <div class="ts-search-sections">
              <div v-for="sec in r.sections" :key="r.topic.id + '-' + sec.id" class="ts-search-item" @click="goToSection(r.topic, sec)">
                <div class="ts-search-item-title">{{ r.topic.title }} · {{ sec.title }}</div>
                <div class="ts-search-item-preview">{{ sec.content.substring(0, 80) }}{{ sec.content.length > 80 ? '...' : '' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredApps.length === 0 && searchResults.length === 0" class="ts-empty" style="padding:60px 24px">
          没有找到相关内容
        </div>
      </div>
    </template>

    <!-- ===== LOADING ===== -->
    <template v-if="loadingData && (currentView === 'detail' || currentView === 'reader')">
      <div class="ts-empty" style="padding:80px 24px">📖 正在加载内容...</div>
    </template>

    <!-- ===== DETAIL VIEW ===== -->
    <template v-if="!loadingData && currentView === 'detail' && currentTopic">
      <div class="ts-detail-wrap">
        <button class="ts-back" @click="goHome()">← 返回</button>
        <div class="ts-detail-card">
          <div class="ts-detail-grid">
            <div class="ts-detail-content">
              <h1 class="ts-detail-title">{{ currentTopic.title }}</h1>
              <p class="ts-detail-meta">{{ currentTopic.category }}</p>
              <div class="ts-detail-tags">
                <span v-for="tag in currentTopic.tags" :key="tag" class="ts-detail-tag">{{ tag }}</span>
              </div>
              <p class="ts-detail-summary">{{ currentTopic.summary }}</p>
            </div>
            <div class="ts-detail-illu">
              <AnimationSlot
                :topic-id="currentTopic.id"
                :topic-title="currentTopic.title"
                :category="currentTopic.category"
                :color="categoryColors[currentTopic.category] || '#94a3b8'"
              />
            </div>
          </div>
        </div>

        <h3 class="ts-sections-title">知识点（{{ currentTopic.sections.length }}）</h3>
        <div class="ts-sections">
          <div v-for="sec in currentTopic.sections" :key="sec.id" class="ts-section-item" @click="openReader(sec)">
            <div class="ts-section-info">
              <span class="ts-section-name">{{ sec.title }}</span>
              <p class="ts-section-preview">{{ sec.content.substring(0, 50) }}{{ sec.content.length > 50 ? '...' : '' }}</p>
            </div>
            <button class="ts-section-fav" @click.stop="toggleFavorite(currentTopic!.id + '-' + sec.id)"
              :style="{ color: isFavorite(currentTopic!.id + '-' + sec.id) ? '#eab308' : '#94a3b8' }">
              {{ isFavorite(currentTopic!.id + '-' + sec.id) ? '★' : '☆' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== READER VIEW ===== -->
    <template v-if="!loadingData && currentView === 'reader' && currentSection">
      <div class="ts-reader-wrap">
        <div class="ts-reader-header">
          <button class="ts-back" @click="goBack()">← 返回</button>
          <span class="ts-reader-title">{{ currentTopic?.title }} · {{ currentSection.title }}</span>
          <div class="ts-nav-inline">
            <button class="ts-nav-arrow-btn" :disabled="!hasPrev" @click="goPrevSection()">‹</button>
            <span class="ts-nav-pos">{{ sectionIndex + 1 }}/{{ currentTopic?.sections.length || 0 }}</span>
            <button class="ts-nav-arrow-btn" :disabled="!hasNext" @click="goNextSection()">›</button>
          </div>
        </div>

        <div class="ts-content-sections">
          <div class="ts-content-block">
            <div class="ts-content-label">
              <span>{{ currentSection.title }}</span>
              <button class="ts-block-play" @click="speaking ? stopAudio() : playText(currentSection.content)">{{ speaking ? '⏹' : '▶' }}</button>
            </div>
            <div class="ts-content-grid">
              <div class="ts-content-text">
                <PointReader :text="currentSection.content" />
              </div>
              <div class="ts-content-illu">
                <AnimationSlot
                  :topic-id="currentSection.id"
                  :topic-title="currentSection.title"
                  :category="currentTopic?.category || ''"
                  :color="categoryColors[currentTopic?.category || ''] || '#94a3b8'"
                  :parent-topic-id="currentTopic?.id || ''"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== Copyright ===== -->
    <div v-if="currentView === 'home'" class="hd-copyright"><p>通识内容为百科知识汇编，仅供学习参考。部分资料参考公开文献，如涉及版权请联系我们处理。 · <a href="https://grandand.com/legal#complaint" style="color:#94a3b8;text-decoration:underline;">侵权投诉</a></p></div>
    <!-- ===== FOOTER ===== -->
    <FooterBar v-if="currentView === 'home'" />
    <ReadingChallenge
      :visible="showChallenge"
      subject="general"
      :sectionRef="challengeSectionRef"
      server-url="https://tiaozhan.grandand.com"
      @close="showChallenge = false"
    />
  </div>
  </YouthModeGate>
</template>

<style>
/* ===== Shared ===== */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out both; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased;
}

/* ===== Hero ===== */
.ts-hero {
  background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
  padding: 28px 0 24px; border-bottom: 1px solid #67e8f9;
}
.ts-hero-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.ts-hero-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 24px; }
.ts-hero-left { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.ts-hero-title { font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 1px; }
.ts-hero-desc { font-size: 15px; color: #64748b; line-height: 1.6; }
.ts-hero-right { flex-shrink: 0; }
.ts-quote-box { text-align: right; white-space: nowrap; }
.ts-quote-text { font-size: 18px; font-weight: 700; color: #06b6d4; letter-spacing: 1px; }
.ts-quote-source { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.ts-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.ts-tag {
  padding: 5px 16px; border-radius: 10px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: 2px solid #e2e8f0; background: white; color: #475569; transition: all 0.2s;
}
.ts-tag:hover { border-color: #06b6d4; color: #06b6d4; }
.ts-tag-active { background: #06b6d4; color: white; border-color: #06b6d4; }
.ts-tag-active:hover { background: #0891b2; border-color: #0891b2; color: white; }

/* ===== Learning Stats Bar ===== */
.ls-bar {
  max-width: 1200px; margin: 0 auto; padding: 16px 24px;
  display: flex; align-items: center; gap: 12px;
  font-size: 15px; font-weight: 500; color: #334155; background: white;
  border-bottom: 1px solid #e2e8f0;
}
.ls-dot {
  width: 4px; height: 4px; border-radius: 50%; background: #cbd5e1;
}
.ls-user {
  font-weight: 700; color: #06b6d4; font-size: 15px;
}
.ls-login-link {
  color: #06b6d4; text-decoration: none; font-weight: 500;
}
.ls-login-link:hover { text-decoration: underline; }

/* ===== Grid ===== */
.ts-grid-section { max-width: 1200px; margin: 0 auto; padding: 32px 24px 8px; }
.section-title { font-size: 20px; font-weight: 700; margin-bottom: 18px; color: #0f172a; display: flex; align-items: center; gap: 10px; }
.section-title-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.ts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.ts-card {
  background: white; border-radius: 16px; padding: 24px 20px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.3s;
}
.ts-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-3px); }
.ts-card-top {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
  position: relative;
}
.ts-card-diff {
  position: absolute;
  top: -8px; right: -8px;
  padding: 2px 7px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  white-space: nowrap;
}
.ts-card-icon { width: 28px; height: 28px; color: #06b6d4; }
.ts-card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
.ts-card-cat {
  display: inline-block; padding: 2px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; margin-bottom: 8px;
}
.ts-card-summary { font-size: 12px; color: #94a3b8; line-height: 1.5; }
.ts-card-count { display: block; margin-top: 8px; font-size: 11px; color: #64748b; font-weight: 500; }

/* 难度筛选 */
.ts-diff-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
.ts-diff-label { font-size: 12px; color: #64748b; font-weight: 500; }
.ts-diff-tag {
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  background: white;
  border: 1.5px solid;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.ts-diff-tag:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.ts-diff-emoji { font-size: 11px; }
.ts-empty { text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; }

/* ===== Search Results ===== */
.ts-search-results { max-width: 1200px; margin: 0 auto; padding: 24px; }
.ts-search-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.ts-search-summary { font-size: 14px; color: #64748b; }
.ts-search-group { margin-bottom: 20px; }
.ts-search-topic {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: #f0f9ff; border-radius: 10px;
  cursor: pointer; margin-bottom: 6px; transition: background 0.2s;
}
.ts-search-topic:hover { background: #ecfeff; }
.ts-search-topic-name { font-size: 15px; font-weight: 600; color: #0f172a; }
.ts-search-topic-cat { font-size: 12px; font-weight: 500; }
.ts-search-sections { display: flex; flex-direction: column; gap: 4px; padding-left: 12px; }
.ts-search-item {
  padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: background 0.2s;
}
.ts-search-item:hover { background: #f1f5f9; }
.ts-search-item-title { font-size: 13px; font-weight: 500; color: #06b6d4; margin-bottom: 2px; }
.ts-search-item-preview { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ts-section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }

/* ===== Detail ===== */
.ts-detail-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.ts-back { background: none; border: none; font-size: 13px; color: #06b6d4; cursor: pointer; padding: 4px 0; display: block; white-space: nowrap; }
.ts-back:hover { color: #0891b2; }
.ts-detail-card { background: white; border-radius: 18px; padding: 28px; margin: 16px 24px; border: 1px solid #e2e8f0; }
.ts-detail-grid { display: grid; grid-template-columns: 1fr 240px; gap: 24px; align-items: start; }
.ts-detail-content { min-width: 0; }
.ts-detail-illu { position: sticky; top: 16px; }
.ts-detail-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
.ts-detail-meta { font-size: 13px; color: #64748b; margin-bottom: 10px; }
.ts-detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.ts-detail-tag { padding: 2px 10px; background: #cffafe; color: #06b6d4; border-radius: 8px; font-size: 11px; font-weight: 500; }
.ts-detail-summary { font-size: 13px; color: #64748b; line-height: 1.7; }
.ts-sections-title { font-size: 16px; font-weight: 600; margin: 0 0 10px; color: #0f172a; padding: 0 24px; }
.ts-sections { display: flex; flex-direction: column; gap: 8px; padding: 0 24px 24px; }
.ts-section-item {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border-radius: 14px; padding: 14px 18px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
}
.ts-section-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #67e8f9; }
.ts-section-info { flex: 1; min-width: 0; }
.ts-section-name { font-size: 14px; font-weight: 600; color: #0f172a; display: block; margin-bottom: 3px; }
.ts-section-preview { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ts-section-fav {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: #f8fafc; font-size: 18px; cursor: pointer;
  flex-shrink: 0; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.ts-section-fav:hover { background: #ecfeff; transform: scale(1.15); }

/* ===== Reader ===== */
.ts-reader-wrap { max-width: 1200px; margin: 0 auto; padding: 24px; }
.ts-reader-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.ts-reader-header .ts-back { margin-bottom: 0; }
.ts-reader-title { font-size: 15px; font-weight: 600; color: #475569; flex: 1; }
.ts-content-sections { display: flex; flex-direction: column; gap: 20px; }

/* Inline previous / next arrows in header */
.ts-nav-inline {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}
.ts-nav-arrow-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: white; border: 2px solid #e2e8f0;
  font-size: 18px; font-weight: 700; color: #0f172a;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; padding: 0;
}
.ts-nav-arrow-btn:hover:not(:disabled) { border-color: #06b6d4; color: #06b6d4; background: #ecfeff; }
.ts-nav-arrow-btn:active:not(:disabled) { transform: translateY(1px); }
.ts-nav-arrow-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ts-nav-pos { font-size: 12px; color: #94a3b8; font-weight: 500; min-width: 40px; text-align: center; }
.ts-content-block { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; }
.ts-content-label {
  font-size: 14px; font-weight: 700; color: #06b6d4;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 2px solid #cffafe;
  display: flex; align-items: center; justify-content: space-between;
}
.ts-content-text { font-size: 14px; line-height: 1.9; color: #475569; white-space: pre-line; }
.ts-content-grid { display: grid; grid-template-columns: 1fr 200px; gap: 20px; align-items: start; margin-top: 8px; }
.ts-content-illu { position: sticky; top: 16px; }
.ts-block-play {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: #cffafe; color: #06b6d4; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.ts-block-play:hover { background: #06b6d4; color: white; }
.ts-reader-actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }
.ts-action-btn { padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; }
.ts-action-play { background: #06b6d4; color: white; }
.ts-action-play:hover { background: #0891b2; }

.hd-copyright { max-width: 1200px; margin: 0 auto; padding: 20px 24px 8px; text-align: center; }
.hd-copyright p { font-size: 11px; color: #94a3b8; line-height: 1.7; }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .ts-hero { padding: 20px 0 16px; }
  .ts-hero-title { font-size: 26px; }
  .ts-hero-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .ts-hero-right { width: 100%; }
  .ts-hero-left { flex-direction: column; align-items: flex-start; gap: 4px; }
  .ts-quote-box { text-align: left; white-space: normal; }
  .ts-quote-text { font-size: 16px; }
  .ts-grid { grid-template-columns: repeat(2, 1fr); }
  .ts-detail-card { margin: 12px 12px; padding: 20px; }
  .ts-detail-grid { grid-template-columns: 1fr; }
  .ts-detail-illu { position: static; }
  .ts-sections-title { margin: 0 12px 10px; }
  .ts-sections { padding: 0 12px 16px; }
  .ts-reader-wrap { padding: 14px; }
  .ts-content-block { padding: 16px; }
  .ts-content-grid { grid-template-columns: 1fr; }
  .ts-content-illu { position: static; }
  .ts-search-results { padding: 14px; }
}
</style>
