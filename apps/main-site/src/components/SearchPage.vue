<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navLinks } from '@shared/config/navLinks'

const q = ref('')
const results = ref<any[]>([])
const contentResults = ref<any[]>([])
const loading = ref(true)
const contentLoading = ref(true)

const filteredApps = computed(() => {
  if (!q.value.trim()) return []
  const kw = q.value.trim().toLowerCase()

  const appMatches = apps.filter(a => a.name.includes(kw) || a.desc.includes(kw)).map(a => ({type:'app',...a}))

  const classicMatches = classicItems.filter(c =>
    c.id.includes(kw) || c.author.includes(kw)
  ).map(c => ({...c, name: c.id, desc: c.app, type:'国学经典', icon:'📚', href:'https://xueguoxue.grandand.com?q='+encodeURIComponent(c.id)}))

  const poetMatches = poetItems.filter(p =>
    p.name.includes(kw) || p.dynasty.includes(kw)
  ).map(p => ({...p, title:p.name, desc: p.dynasty, type:'诗人', icon:'📜', href:'https://xueshici.grandand.com?q='+encodeURIComponent(p.name)}))

  const knowledgeMatches = knowledgeItems.filter(k =>
    k.title.includes(kw)
  ).map(k => ({...k, name: k.title, desc: k.app, type:'百科', icon:'🔭', href:'https://xuetongshi.grandand.com?q='+encodeURIComponent(k.title)}))

  return [...appMatches, ...classicMatches, ...poetMatches, ...knowledgeMatches]
})

  // Content search indices
  const classicItems = [
    {id:'三字经',author:'王应麟',app:'学国学'},{id:'弟子规',author:'李毓秀',app:'学国学'},{id:'千字文',author:'周兴嗣',app:'学国学'},
    {id:'百家姓',author:'佚名',app:'学国学'},{id:'增广贤文',author:'佚名',app:'学国学'},{id:'声律启蒙',author:'车万育',app:'学国学'},
    {id:'幼学琼林',author:'程登吉',app:'学国学'},{id:'朱子家训',author:'朱柏庐',app:'学国学'},{id:'小儿语',author:'吕得胜',app:'学国学'},
    {id:'笠翁对韵',author:'李渔',app:'学国学'},{id:'龙文鞭影',author:'萧良有',app:'学国学'},{id:'童蒙须知',author:'朱熹',app:'学国学'},
    {id:'名贤集',author:'佚名',app:'学国学'},{id:'神童诗',author:'汪洙',app:'学国学'},{id:'千家诗',author:'谢枋得编',app:'学国学'},
    {id:'童蒙训',author:'吕本中',app:'学国学'},{id:'小学诗',author:'佚名',app:'学国学'},{id:'性理字训',author:'程端蒙',app:'学国学'},
    {id:'论语',author:'孔子及弟子',app:'学国学'},{id:'大学',author:'曾子',app:'学国学'},{id:'中庸',author:'子思',app:'学国学'},
    {id:'孟子',author:'孟子',app:'学国学'},{id:'诗经',author:'孔子编订',app:'学国学'},{id:'尚书',author:'佚名',app:'学国学'},
    {id:'礼记',author:'戴圣编',app:'学国学'},{id:'周易',author:'周文王等',app:'学国学'},{id:'春秋左传',author:'左丘明',app:'学国学'},
    {id:'孝经',author:'曾子',app:'学国学'},{id:'仪礼',author:'佚名',app:'学国学'},{id:'周礼',author:'佚名',app:'学国学'},
    {id:'尔雅',author:'佚名',app:'学国学'},{id:'孔子家语',author:'王肃编',app:'学国学'},{id:'孟子字义疏证',author:'戴震',app:'学国学'},
    {id:'道德经',author:'老子',app:'学国学'},{id:'庄子',author:'庄子',app:'学国学'},{id:'列子',author:'列御寇',app:'学国学'},
    {id:'抱朴子',author:'葛洪',app:'学国学'},{id:'淮南子',author:'刘安',app:'学国学'},{id:'鬼谷子',author:'鬼谷子',app:'学国学'},
    {id:'山海经',author:'佚名',app:'学国学'},{id:'黄帝内经',author:'佚名',app:'学国学'},{id:'阴符经',author:'佚名',app:'学国学'},
    {id:'史记',author:'司马迁',app:'学国学'},{id:'汉书',author:'班固',app:'学国学'},{id:'资治通鉴',author:'司马光',app:'学国学'},
    {id:'三国志',author:'陈寿',app:'学国学'},{id:'孙子兵法',author:'孙武',app:'学国学'},
  ]
  const poetItems = [
    {name:'李白',dynasty:'唐',app:'学诗词'},{name:'杜甫',dynasty:'唐',app:'学诗词'},{name:'王维',dynasty:'唐',app:'学诗词'},
    {name:'白居易',dynasty:'唐',app:'学诗词'},{name:'杜牧',dynasty:'唐',app:'学诗词'},{name:'李商隐',dynasty:'唐',app:'学诗词'},
    {name:'王昌龄',dynasty:'唐',app:'学诗词'},{name:'孟浩然',dynasty:'唐',app:'学诗词'},{name:'韩愈',dynasty:'唐',app:'学诗词'},
    {name:'刘禹锡',dynasty:'唐',app:'学诗词'},{name:'岑参',dynasty:'唐',app:'学诗词'},{name:'高适',dynasty:'唐',app:'学诗词'},
    {name:'王之涣',dynasty:'唐',app:'学诗词'},{name:'贺知章',dynasty:'唐',app:'学诗词'},{name:'柳宗元',dynasty:'唐',app:'学诗词'},
    {name:'李贺',dynasty:'唐',app:'学诗词'},{name:'张若虚',dynasty:'唐',app:'学诗词'},{name:'骆宾王',dynasty:'唐',app:'学诗词'},
    {name:'卢照邻',dynasty:'唐',app:'学诗词'},{name:'杨炯',dynasty:'唐',app:'学诗词'},{name:'陈子昂',dynasty:'唐',app:'学诗词'},
    {name:'张九龄',dynasty:'唐',app:'学诗词'},{name:'温庭筠',dynasty:'唐',app:'学诗词'},{name:'韦应物',dynasty:'唐',app:'学诗词'},
    {name:'孟郊',dynasty:'唐',app:'学诗词'},{name:'贾岛',dynasty:'唐',app:'学诗词'},{name:'曹操',dynasty:'魏晋',app:'学诗词'},
    {name:'曹植',dynasty:'魏晋',app:'学诗词'},{name:'陶渊明',dynasty:'魏晋',app:'学诗词'},{name:'苏轼',dynasty:'宋',app:'学诗词'},
    {name:'辛弃疾',dynasty:'宋',app:'学诗词'},{name:'李清照',dynasty:'宋',app:'学诗词'},{name:'陆游',dynasty:'宋',app:'学诗词'},
    {name:'王安石',dynasty:'宋',app:'学诗词'},{name:'欧阳修',dynasty:'宋',app:'学诗词'},{name:'柳永',dynasty:'宋',app:'学诗词'},
    {name:'秦观',dynasty:'宋',app:'学诗词'},{name:'周邦彦',dynasty:'宋',app:'学诗词'},{name:'范仲淹',dynasty:'宋',app:'学诗词'},
    {name:'晏殊',dynasty:'宋',app:'学诗词'},{name:'岳飞',dynasty:'宋',app:'学诗词'},{name:'文天祥',dynasty:'宋',app:'学诗词'},
    {name:'姜夔',dynasty:'宋',app:'学诗词'},{name:'杨万里',dynasty:'宋',app:'学诗词'},{name:'范成大',dynasty:'宋',app:'学诗词'},
    {name:'纳兰性德',dynasty:'清',app:'学诗词'},{name:'龚自珍',dynasty:'清',app:'学诗词'},{name:'郑板桥',dynasty:'清',app:'学诗词'},
    {name:'袁枚',dynasty:'清',app:'学诗词'},{name:'鲁迅',dynasty:'近代',app:'学诗词'},{name:'毛泽东',dynasty:'近代',app:'学诗词'},
    {name:'艾青',dynasty:'近代',app:'学诗词'},{name:'徐志摩',dynasty:'近代',app:'学诗词'},{name:'郭沫若',dynasty:'近代',app:'学诗词'},
    {name:'刘邦',dynasty:'汉',app:'学诗词'},{name:'项羽',dynasty:'秦',app:'学诗词'},{name:'屈原',dynasty:'战国',app:'学诗词'},
    {name:'宋玉',dynasty:'战国',app:'学诗词'},{name:'李煜',dynasty:'五代',app:'学诗词'},{name:'马致远',dynasty:'元',app:'学诗词'},
    {name:'关汉卿',dynasty:'元',app:'学诗词'},{name:'王实甫',dynasty:'元',app:'学诗词'},{name:'元好问',dynasty:'金',app:'学诗词'},
    {name:'于谦',dynasty:'明',app:'学诗词'},{name:'唐寅',dynasty:'明',app:'学诗词'},{name:'元稹',dynasty:'唐',app:'学诗词'},
    {name:'杜牧',dynasty:'唐',app:'学诗词'},{name:'李绅',dynasty:'唐',app:'学诗词'},{name:'张志和',dynasty:'唐',app:'学诗词'},
    {name:'王翰',dynasty:'唐',app:'学诗词'},{name:'林升',dynasty:'宋',app:'学诗词'},{name:'叶绍翁',dynasty:'宋',app:'学诗词'},
    {name:'翁卷',dynasty:'宋',app:'学诗词'},{name:'赵师秀',dynasty:'宋',app:'学诗词'},{name:'朱熹',dynasty:'宋',app:'学诗词'},
    {name:'曾几',dynasty:'宋',app:'学诗词'},{name:'王安石',dynasty:'宋',app:'学诗词'},{name:'王观',dynasty:'宋',app:'学诗词'},
    {name:'刘长卿',dynasty:'唐',app:'学诗词'},{name:'崔颢',dynasty:'唐',app:'学诗词'},{name:'崔护',dynasty:'唐',app:'学诗词'},
  ]
  const knowledgeItems = [
    {title:'太阳系',app:'学通识'},{title:'人体奥秘',app:'学通识'},{title:'力与运动',app:'学通识'},
    {title:'物质与元素',app:'学通识'},{title:'声光电磁',app:'学通识'},{title:'能量与能源',app:'学通识'},
    {title:'地球与地质',app:'学通识'},{title:'天气与气候',app:'学通识'},{title:'动物世界',app:'学通识'},
    {title:'植物王国',app:'学通识'},{title:'微生物',app:'学通识'},{title:'遗传与进化',app:'学通识'},
    {title:'数学启蒙',app:'学通识'},{title:'逻辑与推理',app:'学通识'},{title:'科学方法',app:'学通识'},
    {title:'技术与发明',app:'学通识'},{title:'计算机与编程',app:'学通识'},{title:'宇宙探索',app:'学通识'},
    {title:'地壳运动',app:'学通识'},{title:'海洋世界',app:'学通识'},{title:'恐龙时代',app:'学通识'},
    {title:'鸟类世界',app:'学通识'},{title:'昆虫王国',app:'学通识'},{title:'生态与环保',app:'学通识'},
    {title:'清洁能源',app:'学通识'},{title:'机器人',app:'学通识'},{title:'人工智能',app:'学通识'},
    {title:'建筑与结构',app:'学通识'},{title:'交通与运输',app:'学通识'},{title:'通信技术',app:'学通识'},
    {title:'世界地理',app:'学通识'},{title:'中国地理',app:'学通识'},{title:'世界历史',app:'学通识'},
    {title:'中国古代史',app:'学通识'},{title:'艺术与音乐',app:'学通识'},{title:'神话传说',app:'学通识'},
    {title:'节日与习俗',app:'学通识'},{title:'金融与理财',app:'学通识'},{title:'时间与日历',app:'学通识'},
    {title:'测量与单位',app:'学通识'},{title:'概率与统计',app:'学通识'},{title:'营养与健康',app:'学通识'},
    {title:'水循环',app:'学通识'},{title:'食物链',app:'学通识'},{title:'光合作用',app:'学通识'},
    {title:'生态系统',app:'学通识'},{title:'垃圾分类',app:'学通识'},{title:'天气预报',app:'学通识'},
    {title:'地图与导航',app:'学通识'},{title:'航空航天',app:'学通识'},
  ]
const apps = [
  { name: '学国学', desc: '经典启蒙，明智修身', icon: '📚', href: 'https://xueguoxue.grandand.com', color: '#8b5cf6' },
  { name: '学诗词', desc: '唐诗宋词，古韵童声', icon: '📜', href: 'https://xueshici.grandand.com', color: '#f59e0b' },
  { name: '学通识', desc: '天文地理，万物百科', icon: '🔭', href: 'https://xuetongshi.grandand.com', color: '#06b6d4' },
  { name: '学英语', desc: '趣味单词，自然拼读', icon: '🔤', href: 'https://english.grandand.com', color: '#ec4899' },
  { name: '来挑战', desc: '答题对战，益智闯关', icon: '⚡', href: 'https://tiaozhan.grandand.com', color: '#ef4444' },
  { name: '走天下', desc: '亲子旅行攻略分享', icon: '✈️', href: 'https://travel.grandand.com', color: '#3b82f6' },
]

const searchInput = ref('')

function getContentUrl(doc: any): string {
  const baseUrl = doc.sourceUrl || ''
  const source = doc.source || ''
  if (source === 'shici') return baseUrl + '#detail/' + doc.id.replace('shici-', '')
  if (source === 'guoxue') return baseUrl + '#reader/' + doc.id.replace('guoxue-', '')
  if (source === 'tongshi') return baseUrl + '#reader/' + doc.id.replace('tongshi-', '')
  return baseUrl + '?q=' + encodeURIComponent(doc.title)
}


function doSearch() {
  if (searchInput.value.trim()) {
    window.location.href = '/search?q=' + encodeURIComponent(searchInput.value.trim())
  }
}

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

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const kw = params.get('q') || params.get('search') || ''
  q.value = kw
  searchInput.value = kw

  if (!kw.trim()) {
    loading.value = false
    contentLoading.value = false
    return
  }

  contentLoading.value = true
  loading.value = false

  // Fetch content results
  try {
    const r = await fetch('/api/search?q=' + encodeURIComponent(kw))
    const d = await r.json()
    contentResults.value = d.data || []
  } catch {
    contentResults.value = []
  }
  contentLoading.value = false


})
</script>

<template>
  <div class="search-page">
    <!-- Header -->
    <header class="s-header">
      <div class="s-header-inner">
        <a href="https://grandand.com" class="s-logo">童慧行</a>
        <form class="s-search-form" @submit.prevent="doSearch">
          <svg class="s-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" @click="doSearch">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchInput"
            placeholder="搜索"
            class="s-search-input"
          />
        </form>
        <nav class="s-app-nav">
          <a href="https://xueguoxue.grandand.com" class="s-app-nav-link">学国学</a>
          <a href="https://xueshici.grandand.com" class="s-app-nav-link">学诗词</a>
          <a href="https://xuetongshi.grandand.com" class="s-app-nav-link">学通识</a>
          <a href="https://english.grandand.com" class="s-app-nav-link">学英语</a>
          <a href="https://tiaozhan.grandand.com" class="s-app-nav-link">来挑战</a>
          <a href="https://travel.grandand.com" class="s-app-nav-link">走天下</a>
        </nav>
        <div class="s-header-links">
          <a v-for="link in navLinks.filter(l => !l.hidden)" :key="link.label" :href="link.href" class="s-header-link">{{ link.icon }} {{ link.label }}</a>
        </div>
        <a href="https://grandand.com" class="s-home-btn">🏠 首页</a>
      </div>
    </header>

    <!-- Results -->
    <main class="s-main" v-if="q.trim()">
      <div class="s-container">
        <h2 class="s-keyword">搜索 "{{ q }}"</h2>

        <!-- App Results -->
        <section class="s-section">
          <h3 class="s-section-title">🎯 应用搜索结果</h3>
          <div v-if="filteredApps.length === 0" class="s-empty">没有找到匹配的应用</div>
          <div v-else class="s-app-grid">
            <a
              v-for="app in filteredApps"
              :key="app.name"
              :href="app.href"
              target="_self"
              rel="noopener noreferrer"
              class="s-app-card"
            >
              <div class="s-app-icon" :style="{ backgroundColor: app.color + '18' }">
                <span class="s-app-emoji">{{ app.icon }}</span>
              </div>
              <h4 class="s-app-name">{{ app.name }}</h4>
              <p class="s-app-desc">{{ app.desc }}</p>
            </a>
          </div>
        </section>

        <!-- Guide Results -->
        <!-- Content Results -->
        <section class="s-section" v-if="q.trim()">
          <h3 class="s-section-title">📚 内容搜索结果</h3>
          <div v-if="contentLoading" class="s-empty">搜索中...</div>
          <div v-else-if="contentResults.length === 0" class="s-empty">没有找到相关内容</div>
          <div v-else class="s-content-list">
            <a v-for="doc in contentResults" :key="doc.id" :href="getContentUrl(doc)" target="_self" class="s-content-item">
              <div class="s-content-icon" :style="{ backgroundColor: getSourceColor(doc.source) + '15' }">
                <span class="s-content-emoji">{{ getTypeIcon(doc.type) }}</span>
              </div>
              <div class="s-content-info">
                <h4 class="s-content-title">
                  {{ doc.title }}
                  <span class="s-content-type" :style="{ color: getSourceColor(doc.source) }">{{ doc.type }}</span>
                </h4>
                <p class="s-content-summary">{{ getExcerpt(doc, q) }}</p>
                <div class="s-content-meta">
                  <span v-if="doc.author">{{ doc.author }}</span>
                  <span v-if="doc.translation">· {{ doc.translation }}</span>
                </div>
              </div>
              <div class="s-content-arrow">→</div>
            </a>
          </div>
        </section>


      </div>
    </main>

    <!-- No query -->
    <main class="s-main" v-else>
      <div class="s-container s-empty-state">
        <div class="s-empty-icon">🔍</div>
        <p>输入关键词搜索</p>
      </div>
    </main>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: #f8fafc; color: #0f172a;
}

.s-container { max-width: 1200px; margin: 0 auto; padding: 40px 24px 60px; }
.s-keyword { font-size: 22px; font-weight: 700; margin-bottom: 32px; color: #0f172a; }
.s-section { margin-bottom: 40px; }
.s-section-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #0f172a; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
.s-empty { text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 15px; }
.s-empty-state { text-align: center; padding: 100px 20px; }
.s-empty-icon { font-size: 48px; margin-bottom: 16px; }
.s-empty-state p { font-size: 16px; color: #94a3b8; }
.s-app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.s-app-card {
  background: white; border-radius: 16px; padding: 28px 24px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  text-decoration: none; color: inherit; border: 1px solid #e2e8f0;
  transition: all 0.3s;
}
.s-app-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-3px); }
.s-app-icon {
  width: 64px; height: 64px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
}
.s-app-emoji { font-size: 32px; }
.s-app-name { font-size: 17px; font-weight: 700; margin-bottom: 6px; }
.s-app-desc { font-size: 13px; color: #94a3b8; }
.s-guide-list { display: flex; flex-direction: column; gap: 12px; }
.s-guide-item {
  display: flex; gap: 16px; background: white; border-radius: 14px; overflow: hidden;
  text-decoration: none; color: inherit; border: 1px solid #e2e8f0;
  transition: all 0.2s;
}
.s-guide-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); border-color: #bfdbfe; }
.s-guide-cover { width: 140px; min-height: 80px; flex-shrink: 0; }
.s-guide-cover img { width: 100%; height: 100%; object-fit: cover; }
.s-guide-content { padding: 16px 0 16px 0; flex: 1; }
.s-guide-title { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.s-guide-summary { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.s-guide-meta { font-size: 12px; color: #94a3b8; }

.s-content-list { display: flex; flex-direction: column; gap: 10px; }
.s-content-item {
  display: flex; align-items: center; gap: 14px; background: white;
  border-radius: 14px; padding: 16px 20px; text-decoration: none; color: inherit;
  border: 1px solid #e2e8f0; transition: all 0.2s;
}
.s-content-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); border-color: #bfdbfe; }
.s-content-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.s-content-emoji { font-size: 22px; }
.s-content-info { flex: 1; min-width: 0; }
.s-content-title { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 3px; }
.s-content-type { font-size: 11px; margin-left: 8px; font-weight: 500; }
.s-content-summary { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s-content-meta { font-size: 12px; color: #94a3b8; margin-top: 3px; }
.s-content-arrow { font-size: 14px; color: #cbd5e1; flex-shrink: 0; }
.s-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}
.s-header-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; gap: 16px;
}
.s-logo { font-size: 32px; font-weight: 800; color: #2563eb; text-decoration: none; white-space: nowrap; }
.s-search-form {
  display: flex; align-items: center; gap: 6px; flex: 1; max-width: 400px;
  background: #f1f5f9; border-radius: 10px; padding: 8px 14px;
  border: 1px solid transparent; transition: all 0.2s;
}
.s-search-form:focus-within {
  background: #fff; border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.s-search-icon { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; }
.s-search-input {
  border: none; background: transparent; outline: none;
  font-size: 14px; flex: 1; color: #334155;
}
.s-main { min-height: calc(100vh - 120px); }
.s-app-nav {
  display: flex; gap: 4px;
}
.s-app-nav-link {
  padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
  text-decoration: none; color: #64748b; transition: all 0.2s;
}
.s-app-nav-link:hover { background: #e2e8f0; color: #0f172a; }
.s-header-links { display: flex; gap: 8px; margin-left: auto; }
.s-header-link {
  padding: 8px 18px; border-radius: 10px; font-size: 14px; font-weight: 500;
  text-decoration: none; color: #64748b; transition: all 0.2s;
}
.s-header-link:hover { background: #f1f5f9; color: #0f172a; }

.s-home-btn {
  padding: 8px 20px; background: #2563eb; color: white; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
  text-decoration: none; transition: background 0.2s; white-space: nowrap;
}
.s-home-btn:hover { background: #1d4ed8; }
@media (max-width: 768px) {
  .s-app-grid { grid-template-columns: 1fr; }
  .s-guide-cover { width: 80px; }

}
</style>
