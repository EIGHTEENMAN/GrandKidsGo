<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { classicIndex, categories, categoryColors, type ClassicMeta } from './data/classics-meta'
import type { Classic, Section } from './data/classics'
import { playSectionAudioWithFallback, stopAll, speak, stopSpeaking } from './lib/audio'
import { useAuth } from '@shared/composables/useAuth'
import { filterApps } from '@shared/composables/useSearch'
import { reportLearningProgress, getActiveChildId } from '@shared/composables/useLearningProgress'
import { useLearningStats } from '@shared/composables/useLearningStats'
import HeaderBar from '@shared/components/HeaderBar.vue'
import AppSearchResults from '@shared/components/AppSearchResults.vue'
import ContentSearchResults from '@shared/components/ContentSearchResults.vue'
import FooterBar from '@shared/components/FooterBar.vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import ReadingChallenge from '@shared/components/ReadingChallenge.vue'
import PointReader from '@shared/components/PointReader.vue'

// Auth state
const { token, user } = useAuth()

// Learning stats
const stats = useLearningStats('xueguoxue')

// Lazy-loaded full data
const fullData = ref<Classic[] | null>(null)
const loadingData = ref(false)
let fullDataPromise: Promise<void> | null = null

async function ensureFullData() {
  if (fullData.value) return
  if (fullDataPromise) return fullDataPromise
  loadingData.value = true
  fullDataPromise = import('./data/classics').then(mod => {
    fullData.value = mod.classicData
    loadingData.value = false
  })
  await fullDataPromise
}

// Navigation state
type View = 'home' | 'detail' | 'reader' | 'search'
const currentView = ref<View>('home')
const currentClassic = ref<Classic | null>(null)
const currentSection = ref<Section | null>(null)
const readerEntryTime = ref(0)

// Previous/next section navigation
const sectionIndex = computed(() => {
  if (!currentClassic.value || !currentSection.value) return -1
  return currentClassic.value.sections.findIndex(s => s.id === currentSection.value?.id)
})
const hasPrev = computed(() => sectionIndex.value > 0)
const hasNext = computed(() => {
  if (!currentClassic.value) return false
  return sectionIndex.value >= 0 && sectionIndex.value < currentClassic.value.sections.length - 1
})
function goPrevSection() {
  if (!hasPrev.value || !currentClassic.value) return
  stopSpeaking()
  currentSection.value = currentClassic.value.sections[sectionIndex.value - 1]
  saveHash()
}
function goNextSection() {
  if (!hasNext.value || !currentClassic.value) return
  stopSpeaking()
  currentSection.value = currentClassic.value.sections[sectionIndex.value + 1]
  saveHash()
}
const showChallenge = ref(false) // 答题功能暂时隐藏，待后续优化再启用
const challengeSectionRef = ref('')

watch(currentView, (newView, oldView) => {
  if (oldView === 'reader' && newView !== 'reader' && readerEntryTime.value > 0) {
    const childId = getActiveChildId()
    if (childId) {
      const elapsed = Math.round((Date.now() - readerEntryTime.value) / 60000)
      reportLearningProgress(childId, 'classics', 1, Math.max(1, elapsed))
    }
    readerEntryTime.value = 0
    // 答题功能暂时隐藏，待后续优化再启用：if (challengeSectionRef.value) showChallenge.value = true
  }
  if (newView === 'reader') {
    readerEntryTime.value = Date.now()
    if (currentClassic.value && currentSection.value) {
      challengeSectionRef.value = `guoxue:${currentClassic.value.id}:${currentSection.value.id}`
    }
  }
})

const activeCategory = ref('全部')
const searchQuery = ref('')
const apiResults = ref<any[]>([])
const searchResults = ref<{ classic: Classic; sections: Section[] }[]>([])

const filteredApps = computed(() => filterApps(searchQuery.value))

async function doSearch() {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return
  await ensureFullData()
  const list = fullData.value
  if (!list) return

  // Clean URL hash
  history.replaceState(null, '', window.location.pathname)

  const results: { classic: Classic; sections: Section[] }[] = []

  for (const c of list) {
    const sectionMatches = c.sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.original.toLowerCase().includes(q) ||
      s.translation.toLowerCase().includes(q) ||
      s.interpretation.toLowerCase().includes(q)
    )

    const classicMetaMatch =
      c.title.toLowerCase().includes(q) ||
      c.author.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))

    // If classic metadata matches, show all sections; if only sections match, show only matching sections
    const sectionsToShow = classicMetaMatch ? c.sections : sectionMatches

    if (sectionsToShow.length > 0) {
      results.push({ classic: c, sections: sectionsToShow })
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
}

// HeaderBar 搜索回调
function handleSearch(q: string) {
  searchQuery.value = q
  doSearch()
}

// Daily quote
const dailyQuotes = [
  { text: '学而时习之，不亦说乎', source: '《论语》' },
  { text: '温故而知新，可以为师矣', source: '《论语》' },
  { text: '千里之行，始于足下', source: '《道德经》' },
  { text: '玉不琢，不成器；人不学，不知义', source: '《三字经》' },
  { text: '上善若水', source: '《道德经》' },
]
const dailyIndex = ref(Math.floor(Math.random() * dailyQuotes.length))

// Favorites state
const favoriteIds = ref<string[]>(loadFavorites())

function loadFavorites(): string[] {
  try {
    const d = localStorage.getItem('xueguoxue_favorites')
    return d ? JSON.parse(d) : []
  } catch { return [] }
}

function saveFavorites() {
  localStorage.setItem('xueguoxue_favorites', JSON.stringify(favoriteIds.value))
}

function isFavorite(id: string): boolean {
  return favoriteIds.value.includes(id)
}

function toggleFavorite(id: string) {
  if (!token.value) { alert('请先登录后再收藏'); return }
  const idx = favoriteIds.value.indexOf(id)
  if (idx >= 0) favoriteIds.value.splice(idx, 1)
  else favoriteIds.value.push(id)
  saveFavorites()
}



// Filtered classics
const filteredClassics = computed(() => {
  let list = classicIndex
  if (activeCategory.value !== '全部') list = list.filter(c => c.category === activeCategory.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.title.includes(q) || c.author.includes(q) || c.tags.some(t => t.includes(q)))
  }
  return list
})

// 全站统计：经典书数 + 节选总数
const totalBooks = computed(() => classicIndex.length)
const totalSections = computed(() => {
  if (!fullData.value) return 0
  return fullData.value.reduce((sum, c) => sum + (c.sections?.length || 0), 0)
})

// Group classics by category for home display
const categoriesWithClassics = computed(() => {
  const cats = activeCategory.value === '全部' ? categories : [activeCategory.value]
  return cats.map(cat => ({
    category: cat,
    color: categoryColors[cat] || '#64748b',
    items: filteredClassics.value.filter(c => c.category === cat)
  })).filter(g => g.items.length > 0)
})

// Navigation
function openDetail(c: Classic) {
  stopSpeaking()
  stats.markOpened(c.id)
  currentClassic.value = c
  currentSection.value = null
  currentView.value = 'detail'
  saveHash()
}

async function openDetailFromMeta(meta: ClassicMeta) {
  if (loadingData.value) return
  stopSpeaking()
  await ensureFullData()
  const c = fullData.value?.find(x => x.id === meta.id)
  if (c) openDetail(c)
}

function openReader(s: Section) {
  stats.markRead(s.id)
  currentSection.value = s
  currentView.value = 'reader'
  saveHash()
}

function goHome() {
  stopSpeaking()
  currentView.value = 'home'
  currentClassic.value = null
  currentSection.value = null
  searchResults.value = []
  history.pushState(null, '', window.location.pathname)
}

function goBack() {
  stopSpeaking()
  if (currentView.value === 'reader' && currentClassic.value) {
    currentSection.value = null
    currentView.value = 'detail'
    saveHash()
    return
  }
  history.back()
}

function goToSection(c: Classic, s: Section) {
  stopSpeaking()
  stats.markRead(s.id)
  currentClassic.value = c
  currentSection.value = s
  currentView.value = 'reader'
  saveHash()
}

// Hash-based URL persistence for browser refresh / back-forward
function saveHash() {
  let hash = ''
  if (currentView.value === 'detail' && currentClassic.value) {
    hash = `detail/${currentClassic.value.id}`
  } else if (currentView.value === 'reader' && currentSection.value) {
    hash = `reader/${currentSection.value.id}`
  }
  history.pushState(null, '', hash ? '#' + hash : window.location.pathname)
}
async function restoreFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) {
    stopSpeaking()
    currentView.value = 'home'
    currentClassic.value = null
    currentSection.value = null
    searchResults.value = []
    return
  }
  const [view, id] = hash.split('/')
  if ((view === 'detail' || view === 'reader') && id) {
    await ensureFullData()
    if (!fullData.value) return
    if (view === 'detail') {
      const item = fullData.value.find(c => c.id === id)
      if (item) { currentClassic.value = item; currentView.value = 'detail' }
    } else if (view === 'reader') {
      for (const c of fullData.value) {
        const sec = c.sections.find(s => s.id === id)
        if (sec) { currentClassic.value = c; currentSection.value = sec; currentView.value = 'reader'; break }
      }
    }
  }
}

// Audio playback - 单实例互斥：一次只能播一段（原文/译文/解读 三选一）
// audio.ts 的 playMp3 已保证 stopAll 旧音频
const playingType = ref<'original' | 'translation' | 'interpretation' | 'full' | null>(null)
const speaking = ref(false)

function isPlaying(type: 'original' | 'translation' | 'interpretation'): boolean {
  return playingType.value === type
}

function playText(text: string, type?: 'original' | 'translation' | 'interpretation') {
  if (!text.trim()) return

  // 如果该 type 已在播 → 切回 toggle（停止）
  if (type && playingType.value === type) {
    stopAll()
    playingType.value = null
    speaking.value = false
    return
  }

  speaking.value = true
  if (type && currentClassic.value && currentSection.value) {
    playingType.value = type
    playSectionAudioWithFallback(
      currentClassic.value.title,
      currentSection.value.title,
      type,
      text,
      () => {
        playingType.value = null
        speaking.value = false
      }
    )
  } else {
    // Fallback to Web Speech (e.g. for full-text play all)
    playingType.value = 'full'
    speak(text, 0.8, () => {
      playingType.value = null
      speaking.value = false
    })
  }
}

function playOriginal() {
  if (!currentSection.value) return
  // 如果当前是 original 在播 → 停（toggle）；其他情况都直接播 original
  if (playingType.value === 'original') {
    stopAll()
    playingType.value = null
    speaking.value = false
  } else {
    playText(currentSection.value.original, 'original')
  }
}

function playTranslation() {
  if (!currentSection.value) return
  if (playingType.value === 'translation') {
    stopAll()
    playingType.value = null
    speaking.value = false
  } else {
    playText(currentSection.value.translation, 'translation')
  }
}

function playInterpretation() {
  if (!currentSection.value) return
  if (playingType.value === 'interpretation') {
    stopAll()
    playingType.value = null
    speaking.value = false
  } else {
    playText(currentSection.value.interpretation, 'interpretation')
  }
}

function stopAudio() {
  stopAll()
  playingType.value = null
  speaking.value = false
}

onMounted(async () => {
  favoriteIds.value = loadFavorites()
  window.addEventListener('beforeunload', stopAll)
  // Check for ?q= param from main-site search results
  const params = new URLSearchParams(window.location.search)
  const qParam = params.get('q')
  if (qParam) { searchQuery.value = qParam }

  // Restore view state from URL hash
  await restoreFromHash()
  window.addEventListener('popstate', () => { restoreFromHash() })
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', stopAll)
  window.removeEventListener('popstate', restoreFromHash)
})
</script>

<template>
  <YouthModeGate>
  <div class="page" style="--hd-accent:#2563eb;--hd-accent-hover:#1d4ed8;--hd-accent-light:#bfdbfe;--hd-accent-shadow:rgba(59,130,246,0.1);--hd-accent-bg:#f0f9ff">
    <HeaderBar v-model="searchQuery" :on-search="handleSearch" />

    <!-- ===== HOME VIEW ===== -->
    <template v-if="currentView === 'home'">
      <!-- Hero Banner (compact) -->
      <section class="gx-hero">
        <div class="gx-hero-inner animate-fadeInUp">
          <div class="gx-hero-row">
            <div class="gx-hero-left">
              <h1 class="gx-hero-title">学国学</h1>
              <p class="gx-hero-desc">经典启蒙，明智修身</p>
            </div>
            <div class="gx-hero-right">
              <div class="gx-quote-box">
                <p class="gx-quote-text">{{ dailyQuotes[dailyIndex].text }}</p>
                <p class="gx-quote-source">—— {{ dailyQuotes[dailyIndex].source }}</p>
              </div>
            </div>
          </div>
          <!-- Category Tags -->
          <div class="gx-tags animate-fadeIn">
            <button v-for="cat in ['全部', ...categories]" :key="cat" @click="activeCategory = cat"
              class="gx-tag" :class="activeCategory === cat ? 'gx-tag-active' : ''">
              {{ cat }}
            </button>
          </div>
        </div>
      </section>

      <!-- Learning Progress -->
      <div class="ls-bar animate-fadeIn">
        <template v-if="token && user">
          <span class="ls-user">{{ user.nickname || user.username }}</span>
          <span class="ls-dot"></span>
          <span>📖 已打开 {{ stats.openedCount }}/{{ totalBooks }} 本书</span>
          <span class="ls-dot"></span>
          <span>📝 已学习 {{ stats.readCount }}/{{ totalSections }} 个节选</span>
        </template>
        <template v-else>
          <span>📖 学习进度：0/{{ totalBooks }} 本书，0/{{ totalSections }} 个节选 — <a href="https://grandand.com?login=1" class="ls-login-link">登录后同步记录</a></span>
        </template>
      </div>

      <!-- Classics Grid by Category -->
      <section class="gx-grid-section" v-for="g in categoriesWithClassics" :key="g.category">
        <h2 class="section-title">
          <span class="section-title-dot" :style="{ backgroundColor: g.color }"></span>
          {{ g.category }}（{{ g.items.length }}）
        </h2>
        <div class="gx-grid">
          <div v-for="c in g.items" :key="c.id" class="gx-card" @click="openDetailFromMeta(c)">
            <div class="gx-card-top" :style="{ backgroundColor: g.color + '18' }">
              <span class="gx-card-emoji">📖</span>
            </div>
            <h3 class="gx-card-title">{{ c.title }}</h3>
            <p class="gx-card-author">{{ c.author }} · {{ c.dynasty }}</p>
            <span class="gx-card-cat" :style="{ backgroundColor: g.color + '18', color: g.color }">{{ c.category }}</span>
            <p class="gx-card-summary">{{ c.summary }}</p>
          </div>
        </div>
        <p v-if="g.items.length === 0" class="gx-empty">暂无典籍</p>
      </section>
      <p v-if="categoriesWithClassics.length === 0" class="gx-empty" style="padding:60px 24px">没有找到匹配的典籍</p>
    </template>

    <!-- ===== SEARCH RESULTS VIEW ===== -->
    <template v-if="currentView === 'search'">
      <div class="gx-detail-wrap">
        <button class="gx-back" @click="goBack()">← 返回</button>

        <div class="gx-search-summary">搜索 "{{ searchQuery }}"</div>

        <AppSearchResults :apps="filteredApps" />
        <ContentSearchResults :results="apiResults" :query="searchQuery" />

        <div v-if="searchResults.length > 0" class="gx-search-results">
          <h3 class="gx-section-title">📚 内容搜索结果</h3>
          <div v-for="result in searchResults" :key="result.classic.id" class="gx-search-group">
            <div class="gx-search-classic" @click="openDetail(result.classic)">
              <h3 class="gx-search-classic-title">{{ result.classic.title }}</h3>
              <span class="gx-search-classic-meta">{{ result.classic.author }} · {{ result.classic.dynasty }}</span>
            </div>
            <div class="gx-search-sections">
              <div v-for="sec in result.sections" :key="sec.id" class="gx-section-item" @click="goToSection(result.classic, sec)">
                <div class="gx-section-info">
                  <span class="gx-section-name">{{ sec.title }}</span>
                  <p class="gx-section-preview">{{ sec.original.split('\n')[0].substring(0, 50) }}{{ sec.original.split('\n')[0].length > 50 ? '...' : '' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredApps.length === 0 && searchResults.length === 0" class="gx-empty">
          <p>未找到相关内容</p>
        </div>
      </div>
    </template>

    <!-- ===== LOADING ===== -->
    <template v-if="loadingData && (currentView === 'detail' || currentView === 'reader')">
      <div class="gx-empty" style="padding:80px 24px">📖 正在加载内容...</div>
    </template>

    <!-- ===== DETAIL VIEW with Favorite ===== -->
    <template v-if="!loadingData && currentView === 'detail' && currentClassic">
      <div class="gx-detail-wrap">
        <button class="gx-back" @click="goHome()">← 返回</button>

        <div class="gx-detail-card">
          <h1 class="gx-detail-title">{{ currentClassic.title }}</h1>
          <p class="gx-detail-meta">{{ currentClassic.author }} · {{ currentClassic.dynasty }} · {{ currentClassic.category }}</p>
          <div class="gx-detail-tags">
            <span v-for="tag in currentClassic.tags" :key="tag" class="gx-detail-tag">{{ tag }}</span>
          </div>
          <p class="gx-detail-summary">{{ currentClassic.summary }}</p>
        </div>

        <h3 class="gx-sections-title">节选</h3>
        <div class="gx-sections">
          <div v-for="sec in currentClassic.sections" :key="sec.id" class="gx-section-item" @click="openReader(sec)">
            <div class="gx-section-info">
              <span class="gx-section-name">{{ sec.title }}</span>
              <p class="gx-section-preview">{{ sec.original.split('\n')[0].substring(0, 40) }}{{ sec.original.split('\n')[0].length > 40 ? '...' : '' }}</p>
            </div>
            <button class="gx-section-fav" @click.stop="toggleFavorite(currentClassic!.id + '-' + sec.id)"
              :style="{ color: isFavorite(currentClassic!.id + '-' + sec.id) ? '#eab308' : '#94a3b8' }">
              {{ isFavorite(currentClassic!.id + '-' + sec.id) ? '★' : '☆' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== READER VIEW (Vertical layout, no line-play) ===== -->
    <template v-if="!loadingData && currentView === 'reader' && currentSection">
      <div class="gx-reader-wrap">
        <div class="gx-reader-header">
          <button class="gx-back" @click="goBack()">← 返回</button>
          <span class="gx-reader-title">{{ currentClassic?.title }} · {{ currentSection.title }}</span>
          <div class="gx-nav-inline">
            <button class="gx-nav-arrow-btn" :disabled="!hasPrev" @click="goPrevSection()">‹</button>
            <span class="gx-nav-pos">{{ sectionIndex + 1 }}/{{ currentClassic?.sections.length || 0 }}</span>
            <button class="gx-nav-arrow-btn" :disabled="!hasNext" @click="goNextSection()">›</button>
          </div>
        </div>

        <!-- Vertical sections: 原文 / 翻译 / 解读 -->
        <div class="gx-content-sections">
          <div class="gx-content-block">
            <div class="gx-content-label">
              <span class="gx-content-label-text">📜 原文</span>
              <button class="gx-block-play"
                :class="isPlaying('original') ? 'gx-block-playing' : ''"
                @click="playOriginal()">
                <span v-if="isPlaying('original')">⏹ 停止朗读</span>
                <span v-else>▶ 朗读原文</span>
              </button>
            </div>
            <div class="gx-original-text">
              <p v-for="(line, i) in currentSection.original.split('\n')" :key="i" class="gx-original-line"><PointReader :text="line" /></p>
            </div>
          </div>
          <div class="gx-content-block">
            <div class="gx-content-label">
              <span class="gx-content-label-text">📖 译文</span>
              <button class="gx-block-play"
                :class="isPlaying('translation') ? 'gx-block-playing' : ''"
                @click="playTranslation()">
                <span v-if="isPlaying('translation')">⏹ 停止朗读</span>
                <span v-else>▶ 朗读译文</span>
              </button>
            </div>
            <p class="gx-translation-text">{{ currentSection.translation }} <span class="gx-ai-badge">AI</span></p>
          </div>
          <div class="gx-content-block">
            <div class="gx-content-label">
              <span class="gx-content-label-text">💡 解读</span>
              <button class="gx-block-play"
                :class="isPlaying('interpretation') ? 'gx-block-playing' : ''"
                @click="playInterpretation()">
                <span v-if="isPlaying('interpretation')">⏹ 停止朗读</span>
                <span v-else>▶ 朗读解读</span>
              </button>
            </div>
            <p class="gx-translation-text">{{ currentSection.interpretation }} <span class="gx-ai-badge">AI</span></p>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== Copyright ===== -->
    <div v-if="currentView === 'home'" class="hd-copyright"><p>平台上的古典文献均为公有领域作品。内容仅供学习参考，如涉及版权问题请联系我们处理。 · <a href="https://grandand.com/legal#complaint" style="color:#94a3b8;text-decoration:underline;">侵权投诉</a></p></div>
    <!-- ===== FOOTER ===== -->
    <FooterBar v-if="currentView === 'home'" />
    <ReadingChallenge
      :visible="showChallenge"
      subject="guoxue"
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

/* ===== Hero (compact) ===== */
.gx-hero {
  background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
  padding: 28px 0 24px;
  border-bottom: 1px solid #e0f2fe;
}
.gx-hero-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
}
.gx-hero-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; gap: 24px;
}
.gx-hero-left {
  display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
}
.gx-hero-title { font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 1px; }
.gx-hero-desc { font-size: 15px; color: #64748b; line-height: 1.6; }
.gx-hero-right { flex-shrink: 0; }

/* Daily Quote in hero */
.gx-quote-box {
  text-align: right; white-space: nowrap;
}
.gx-quote-text { font-size: 18px; font-weight: 700; color: #2563eb; letter-spacing: 1px; }
.gx-quote-source { font-size: 12px; color: #94a3b8; margin-top: 2px; }

.gx-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.gx-tag {
  padding: 5px 16px; border-radius: 10px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: 2px solid #e2e8f0; background: white;
  color: #475569; transition: all 0.2s;
}
.gx-tag:hover { border-color: #2563eb; color: #2563eb; }
.gx-tag-active { background: #2563eb; color: white; border-color: #2563eb; }
.gx-tag-active:hover { background: #1d4ed8; border-color: #1d4ed8; color: white; }

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
  font-weight: 700; color: #2563eb; font-size: 15px;
}
.ls-login-link {
  color: #2563eb; text-decoration: none; font-weight: 500;
}
.ls-login-link:hover { text-decoration: underline; }

/* ===== Grid Section ===== */
.gx-grid-section {
  max-width: 1200px; margin: 0 auto; padding: 32px 24px 8px;
}
.section-title {
  font-size: 20px; font-weight: 700; margin-bottom: 18px;
  color: #0f172a; display: flex; align-items: center; gap: 10px;
}
.section-title-dot {
  width: 10px; height: 10px; border-radius: 50%; display: inline-block;
}
.gx-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;
}
.gx-card {
  background: white; border-radius: 16px; padding: 24px 20px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  border: 1px solid #e2e8f0; cursor: pointer;
  transition: all 0.3s;
}
.gx-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-3px); }
.gx-card-top {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
}
.gx-card-emoji { font-size: 24px; }
.gx-card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
.gx-card-author { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.gx-card-cat {
  display: inline-block; padding: 2px 10px; border-radius: 8px;
  font-size: 11px; font-weight: 500; margin-bottom: 8px;
}
.gx-card-summary { font-size: 12px; color: #94a3b8; line-height: 1.5; }
.gx-empty {
  text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px;
}

/* ===== Detail View ===== */
.gx-detail-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.gx-back {
  background: none; border: none; font-size: 13px; color: #2563eb;
  cursor: pointer; padding: 4px 0; display: block; white-space: nowrap;
}
.gx-back:hover { color: #1d4ed8; }
.gx-detail-card {
  background: white; border-radius: 18px; padding: 28px; margin: 16px 0;
  border: 1px solid #e2e8f0;
}
.gx-detail-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
.gx-detail-meta { font-size: 13px; color: #64748b; margin-bottom: 10px; }
.gx-detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.gx-detail-tag {
  padding: 2px 10px; background: #f0f9ff; color: #2563eb;
  border-radius: 8px; font-size: 11px; font-weight: 500;
}
.gx-detail-summary { font-size: 13px; color: #64748b; line-height: 1.7; }
.gx-sections-title { font-size: 16px; font-weight: 600; margin: 0 0 10px; color: #0f172a; }
.gx-sections { display: flex; flex-direction: column; gap: 8px; padding: 0 0 24px; }
.gx-section-item {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border-radius: 14px; padding: 14px 18px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
}
.gx-section-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #bfdbfe; }
.gx-section-info { flex: 1; min-width: 0; }
.gx-section-name { font-size: 14px; font-weight: 600; color: #0f172a; display: block; margin-bottom: 3px; }
.gx-section-preview { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gx-section-fav {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: #f8fafc; font-size: 18px; cursor: pointer;
  flex-shrink: 0; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.gx-section-fav:hover { background: #fefce8; transform: scale(1.15); }

/* ===== Reader View (Vertical layout) ===== */
.gx-reader-wrap { max-width: 1200px; margin: 0 auto; padding: 24px; }
.gx-reader-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
}
.gx-reader-header .gx-back { margin-bottom: 0; }
.gx-reader-title { font-size: 15px; font-weight: 600; color: #475569; flex: 1; }

/* Inline previous / next arrows in header */
.gx-nav-inline {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}
.gx-nav-arrow-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: white; border: 2px solid #e2e8f0;
  font-size: 18px; font-weight: 700; color: #0f172a;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; padding: 0;
}
.gx-nav-arrow-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
.gx-nav-arrow-btn:active:not(:disabled) { transform: translateY(1px); }
.gx-nav-arrow-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.gx-nav-pos { font-size: 12px; color: #94a3b8; font-weight: 500; min-width: 40px; text-align: center; }

/* Vertical content sections */
.gx-content-sections { display: flex; flex-direction: column; gap: 20px; }
.gx-content-block {
  background: white; border-radius: 16px; padding: 24px;
  border: 1px solid #e2e8f0;
}
.gx-content-label {
  font-size: 14px; font-weight: 700; color: #2563eb;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 2px solid #dbeafe;
  display: flex; align-items: center; justify-content: space-between;
}
.gx-content-label-text { font-size: 14px; font-weight: 700; color: #2563eb; }
.gx-ai-badge {
  display: inline-block; margin-left: 6px; padding: 1px 5px;
  border-radius: 4px; font-size: 10px; font-weight: 700;
  color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  vertical-align: middle; line-height: 1.4;
}
.gx-original-text { font-family: "Noto Serif SC", "STSong", serif; }
.gx-original-line {
  font-size: 17px; line-height: 2.2; color: #0f172a;
}
.gx-translation-text {
  font-size: 14px; line-height: 1.9; color: #475569;
  white-space: pre-line;
}
.gx-block-play {
  padding: 6px 14px; border-radius: 20px; border: none;
  background: #dbeafe; color: #2563eb; font-size: 13px; font-weight: 600;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
  transition: all 0.2s;
}
.gx-block-play:hover { background: #2563eb; color: white; }
.gx-block-playing { background: #2563eb !important; color: white !important; }

/* ===== Search Results ===== */
.gx-search-summary {
  padding: 20px 0 16px; font-size: 15px; color: #475569;
}
.gx-search-summary p { line-height: 1.6; }
.gx-search-group {
  margin-bottom: 20px; background: white; border-radius: 16px;
  border: 1px solid #e2e8f0; overflow: hidden;
}
.gx-search-classic {
  padding: 14px 18px; cursor: pointer; border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: center; gap: 8px; transition: background 0.2s;
}
.gx-search-classic:hover { background: #f8fafc; }
.gx-search-classic-title { font-size: 15px; font-weight: 600; color: #2563eb; }
.gx-search-classic-meta { font-size: 12px; color: #94a3b8; }
.gx-search-sections .gx-section-item {
  border: none; border-radius: 0; border-bottom: 1px solid #f1f5f9;
}
.gx-search-sections .gx-section-item:last-child { border-bottom: none; }
.gx-section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }

.hd-copyright { max-width: 1200px; margin: 0 auto; padding: 20px 24px 8px; text-align: center; }
.hd-copyright p { font-size: 11px; color: #94a3b8; line-height: 1.7; }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .gx-hero { padding: 20px 0 16px; }
  .gx-hero-title { font-size: 26px; }
  .gx-hero-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .gx-hero-right { width: 100%; }
  .gx-hero-left { flex-direction: column; align-items: flex-start; gap: 4px; }
  .gx-quote-box { text-align: left; white-space: normal; }
  .gx-quote-text { font-size: 16px; }
  .gx-grid { grid-template-columns: repeat(2, 1fr); }
  .gx-detail-card { margin: 12px 12px; padding: 20px; }
  .gx-sections-title { margin: 0 12px 10px; }
  .gx-sections { padding: 0 12px 16px; }
  .gx-detail-summary { padding: 0 12px; }
  .gx-reader-wrap { padding: 14px; }
  .gx-content-block { padding: 16px; }
  .gx-original-line { font-size: 15px; }
}
</style>
