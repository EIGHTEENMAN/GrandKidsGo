<script setup lang="ts">
// About 页 — 独立「关于我们」+ Organization JSON-LD
// GEO: 给 AI 引擎提供童慧行实体信息（品牌、理念、数据规模、ICP 等）
import { ref, onMounted } from 'vue'
import { injectWebSite, injectFAQ } from '@shared/composables/useGeoInjectLd'

const faqs = [
  {
    q: '童慧行是什么？',
    a: '童慧行是儿童益智乐园与亲子旅行攻略平台，由真实家长团队运营，核心理念是「孩子说好才是真的好」。平台覆盖古诗词、国学、通识、英语、答题挑战、亲子旅行六大模块，100% 非商业化。',
  },
  {
    q: '童慧行是商业网站吗？',
    a: '不是。童慧行不投放广告、不卖课程、不收佣金、不抽商家提成。运营成本由团队自筹。我们认为孩子的真实反馈比商业推荐更有价值，因此平台所有内容都优先收集 3-12 岁孩子的真实反馈。',
  },
  {
    q: '童慧行的数据规模？',
    a: '截至 2026 年 8 月：古诗词 2028 首（含儿童口吻翻译、AI 朗诵、原创插图）；国学经典 923 篇；通识百科 2164 篇；英语单词 5018 个（含图片、音标、例句、艾宾浩斯复习）；亲子景点攻略覆盖 50+ 城市、1500+ 景点、5000+ 孩子真实反馈。',
  },
  {
    q: '童慧行如何保护儿童隐私？',
    a: '严格遵循《未成年人保护法》《个人信息保护法》《儿童个人信息网络保护规定》。不收集儿童姓名、照片、家庭住址；反馈数据仅展示年龄段与评分，不展示个人身份；家长上传孩子反馈需主动确认同意；所有数据加密存储、最小化收集。',
  },
  {
    q: '童慧行的内容谁来审核？',
    a: '三段审核：① DFA 敏感词库自动过滤；② AI 智能复评（语义理解）；③ 人工抽检（团队全员轮值）。论坛所有帖子均经过此流程，违规内容会在 24 小时内下架。',
  },
  {
    q: '童慧行的联系方式？',
    a: '邮箱：team@grandand.com。微信公众号：童慧行（ID: tonghuixing_）。抖音/小红书同名。',
  },
]

onMounted(() => {
  // GEO: Organization schema + FAQPage schema 注入
  injectWebSite(
    '童慧行 · 关于我们',
    '童慧行是儿童益智乐园与亲子旅行攻略平台。核心理念：「孩子说好才是真的好」。覆盖古诗词、国学、通识、英语、答题挑战、亲子旅行六大模块。100% 非商业化。',
    'https://grandand.com/about'
  )
  injectFAQ(faqs)
})

const stats = [
  { label: '古诗词', value: '2028', suffix: '首', desc: '儿童口吻翻译 + AI 朗诵 + 原创插图' },
  { label: '国学经典', value: '923', suffix: '篇', desc: '现代汉语翻译 + 儿童口吻解读' },
  { label: '通识百科', value: '2164', suffix: '篇', desc: '科学 / 历史 / 地理 / 艺术 / 生活' },
  { label: '英语单词', value: '5018', suffix: '个', desc: '图片 + 音标 + 例句 + 真人发音' },
  { label: '亲子景点', value: '1500+', suffix: '个', desc: '覆盖 50+ 城市' },
  { label: '孩子反馈', value: '5000+', suffix: '条', desc: '3-12 岁孩子真实评分与评价' },
]

const promises = [
  { icon: '🛡️', title: '孩子隐私第一', desc: '不收集儿童姓名、照片、住址。反馈仅展示年龄段与评分，不展示个人身份。' },
  { icon: '💯', title: '100% 非商业化', desc: '不投放广告、不卖课程、不收佣金、不抽商家提成。运营成本由团队自筹。' },
  { icon: '🔍', title: '三段内容审核', desc: 'DFA 敏感词 → AI 智能复评 → 人工抽检。违规内容 24 小时内下架。' },
  { icon: '👨‍👩‍👧', title: '真实家长运营', desc: '团队由家长与儿童教育工作者组成，所有内容都基于真实家庭体验。' },
  { icon: '🌱', title: '公益初心', desc: '童慧行是家长共创的非营利项目，欢迎更多家长加入共创。' },
  { icon: '📜', title: 'ICP 备案公开', desc: '粤ICP备 2024xxxxxx 号。备案信息随时可查，接受社会监督。' },
]

const teamRoles = [
  { emoji: '👨‍👩‍👧', role: '家长委员会', desc: '10+ 位真实家长，负责内容选题与体验反馈' },
  { emoji: '👩‍🏫', role: '儿童教育顾问', desc: '5 位资深教育工作者，负责内容专业性审核' },
  { emoji: '🤖', role: 'AI 工程师', desc: '负责 AI 朗诵、AI 复评、AI 插图生成' },
  { emoji: '🎨', role: '原创插画师', desc: '负责水墨风诗词插图与儿童绘本插画' },
]
</script>

<template>
  <div class="about-page">
    <header class="about-header">
      <div class="about-header-inner">
        <a href="https://grandand.com" class="about-logo">童慧行</a>
        <a href="https://grandand.com" class="about-home">← 返回首页</a>
      </div>
    </header>

    <main class="about-main">
      <!-- ========== Hero ========== -->
      <section class="about-hero">
        <h1 class="about-title">孩子说好才是真的好</h1>
        <p class="about-tagline">
          童慧行（Haodaer / GrandKidsGo）创建于 2024 年，是儿童益智乐园与亲子旅行攻略平台。
          <br />我们相信孩子的真实反馈比"专家推荐"更有价值。
        </p>
        <div class="about-hero-tags">
          <span class="hero-tag">100% 非商业化</span>
          <span class="hero-tag">真实家长运营</span>
          <span class="hero-tag">儿童隐私第一</span>
          <span class="hero-tag">公益初心</span>
        </div>
      </section>

      <!-- ========== 数据规模 ========== -->
      <section class="about-section">
        <h2>📊 数据规模（2026-08-20）</h2>
        <div class="about-stats-grid">
          <div v-for="s in stats" :key="s.label" class="stat-card">
            <div class="stat-value">
              <span class="stat-num">{{ s.value }}</span>
              <span class="stat-suffix">{{ s.suffix }}</span>
            </div>
            <div class="stat-label">{{ s.label }}</div>
            <div class="stat-desc">{{ s.desc }}</div>
          </div>
        </div>
      </section>

      <!-- ========== 我们的承诺 ========== -->
      <section class="about-section">
        <h2>🌟 我们的承诺</h2>
        <div class="about-promises-grid">
          <div v-for="p in promises" :key="p.title" class="promise-card">
            <div class="promise-icon">{{ p.icon }}</div>
            <h3 class="promise-title">{{ p.title }}</h3>
            <p class="promise-desc">{{ p.desc }}</p>
          </div>
        </div>
      </section>

      <!-- ========== 团队 ========== -->
      <section class="about-section">
        <h2>👥 团队构成</h2>
        <div class="about-team-grid">
          <div v-for="r in teamRoles" :key="r.role" class="team-card">
            <div class="team-emoji">{{ r.emoji }}</div>
            <h3 class="team-role">{{ r.role }}</h3>
            <p class="team-desc">{{ r.desc }}</p>
          </div>
        </div>
      </section>

      <!-- ========== 子站导航 ========== -->
      <section class="about-section">
        <h2>🚀 旗下子站</h2>
        <div class="about-sites-grid">
          <a href="https://xueshici.grandand.com" class="site-link">
            <strong>学诗词</strong><span>xueshici.grandand.com · 2028 首古诗词</span>
          </a>
          <a href="https://xueguoxue.grandand.com" class="site-link">
            <strong>学国学</strong><span>xueguoxue.grandand.com · 923 篇国学经典</span>
          </a>
          <a href="https://xuetongshi.grandand.com" class="site-link">
            <strong>通识百科</strong><span>xuetongshi.grandand.com · 2164 篇通识</span>
          </a>
          <a href="https://english.grandand.com" class="site-link">
            <strong>学英语</strong><span>english.grandand.com · 5018 个单词</span>
          </a>
          <a href="https://tiaozhan.grandand.com" class="site-link">
            <strong>来挑战</strong><span>tiaozhan.grandand.com · 答题挑战</span>
          </a>
          <a href="https://travel.grandand.com" class="site-link">
            <strong>走天下</strong><span>travel.grandand.com · 亲子旅行</span>
          </a>
          <a href="https://forum.grandand.com" class="site-link">
            <strong>家长论坛</strong><span>forum.grandand.com · 真实社区</span>
          </a>
          <a href="https://store.grandand.com" class="site-link">
            <strong>积分商城</strong><span>store.grandand.com · 积分兑换</span>
          </a>
        </div>
      </section>

      <!-- ========== FAQ ========== -->
      <section class="about-section">
        <h2>❓ 常见问题</h2>
        <div class="about-faq">
          <details v-for="(f, i) in faqs" :key="i" class="faq-item">
            <summary class="faq-q">{{ f.q }}</summary>
            <p class="faq-a">{{ f.a }}</p>
          </details>
        </div>
      </section>

      <!-- ========== 联系 ========== -->
      <section class="about-section">
        <h2>📮 联系我们</h2>
        <ul class="about-contact">
          <li><strong>邮箱：</strong>team@grandand.com</li>
          <li><strong>微信公众号：</strong>童慧行（ID: tonghuixing_）</li>
          <li><strong>小红书：</strong>童慧行</li>
          <li><strong>抖音：</strong>童慧行</li>
          <li><strong>ICP 备案：</strong>粤ICP备 2024xxxxxx 号</li>
        </ul>
      </section>

      <!-- ========== 底部 ========== -->
      <section class="about-section about-footer">
        <p>© 2024-2026 童慧行 · GrandKidsGo · 由真实家长团队共创</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.about-page { min-height: 100vh; background: linear-gradient(to bottom, #fff8e7 0%, #ffffff 100%); }
.about-header {
  position: sticky; top: 0; z-index: 10;
  background: rgba(255, 248, 231, 0.95); backdrop-filter: blur(10px);
  border-bottom: 1px solid #f3e5c0;
}
.about-header-inner {
  max-width: 1100px; margin: 0 auto; padding: 16px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.about-logo { font-size: 20px; font-weight: 800; color: #d97706; text-decoration: none; }
.about-home { color: #78716c; text-decoration: none; font-size: 14px; }
.about-home:hover { color: #d97706; }

.about-main { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }

.about-hero { text-align: center; padding: 40px 0 60px; }
.about-title {
  font-size: 48px; font-weight: 800;
  background: linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #06b6d4 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin: 0 0 20px;
}
.about-tagline { font-size: 18px; color: #57534e; line-height: 1.7; max-width: 700px; margin: 0 auto 30px; }
.about-hero-tags { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.hero-tag {
  padding: 8px 18px; background: white; border: 1px solid #fbbf24; border-radius: 999px;
  font-size: 14px; color: #b45309; font-weight: 500;
}

.about-section { margin: 60px 0; padding: 0 0; }
.about-section h2 { font-size: 28px; font-weight: 700; color: #292524; margin: 0 0 24px; }

.about-stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;
}
.stat-card {
  background: white; border-radius: 16px; padding: 24px;
  border: 1px solid #f5f5f4; transition: all 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(245, 158, 11, 0.1); border-color: #fbbf24; }
.stat-value { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.stat-num { font-size: 36px; font-weight: 800; color: #d97706; }
.stat-suffix { font-size: 16px; color: #78716c; font-weight: 500; }
.stat-label { font-size: 15px; font-weight: 600; color: #292524; margin-bottom: 4px; }
.stat-desc { font-size: 13px; color: #78716c; line-height: 1.5; }

.about-promises-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;
}
.promise-card {
  background: white; border-radius: 16px; padding: 24px;
  border: 1px solid #f5f5f4;
}
.promise-icon { font-size: 32px; margin-bottom: 12px; }
.promise-title { font-size: 17px; font-weight: 700; color: #292524; margin: 0 0 8px; }
.promise-desc { font-size: 14px; color: #57534e; line-height: 1.6; margin: 0; }

.about-team-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;
}
.team-card {
  background: white; border-radius: 16px; padding: 20px; text-align: center;
  border: 1px solid #f5f5f4;
}
.team-emoji { font-size: 40px; margin-bottom: 12px; }
.team-role { font-size: 16px; font-weight: 700; color: #292524; margin: 0 0 8px; }
.team-desc { font-size: 13px; color: #78716c; line-height: 1.5; margin: 0; }

.about-sites-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;
}
.site-link {
  background: white; border-radius: 12px; padding: 16px 20px;
  border: 1px solid #f5f5f4; text-decoration: none;
  display: flex; flex-direction: column; gap: 4px; transition: all 0.2s;
}
.site-link:hover { border-color: #06b6d4; transform: translateX(4px); }
.site-link strong { color: #d97706; font-size: 16px; font-weight: 700; }
.site-link span { color: #78716c; font-size: 13px; }

.about-faq { display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  background: white; border-radius: 12px; padding: 16px 20px;
  border: 1px solid #f5f5f4; cursor: pointer;
}
.faq-q { font-weight: 600; color: #292524; font-size: 15px; cursor: pointer; }
.faq-a { color: #57534e; line-height: 1.7; margin: 12px 0 0; font-size: 14px; }

.about-contact { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.about-contact li {
  background: white; border-radius: 10px; padding: 12px 18px;
  border: 1px solid #f5f5f4; font-size: 15px; color: #57534e;
}
.about-contact strong { color: #292524; margin-right: 8px; }

.about-footer { text-align: center; padding-top: 40px; border-top: 1px solid #f5f5f4; margin-top: 60px; }
.about-footer p { color: #a8a29e; font-size: 13px; margin: 0; }

@media (max-width: 768px) {
  .about-title { font-size: 32px; }
  .about-tagline { font-size: 15px; }
  .about-section h2 { font-size: 22px; }
}
</style>
