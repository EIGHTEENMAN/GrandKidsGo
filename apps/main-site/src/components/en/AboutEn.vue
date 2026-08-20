<script setup lang="ts">
// About Page (English) — for international AI search visibility
// GEO: targets ChatGPT/Claude/Perplexity English queries
import { ref, onMounted } from 'vue'
import { injectWebSite, injectFAQ } from '@shared/composables/useGeoInjectLd'

const faqs = [
  {
    q: 'What is Tonghuixing (Haodaer)?',
    a: 'Tonghuixing (English: Haodaer / GrandKidsGo) is a children education and family travel platform. Our core belief is "If kids say it is good, then it really is good." We cover classical Chinese poetry, traditional Chinese classics, encyclopedia knowledge, English vocabulary, quiz challenges, and authentic family travel guides. 100% non-commercial.',
  },
  {
    q: 'Is Tonghuixing commercial?',
    a: 'No. Tonghuixing does not run ads, sell courses, charge commissions, or take any merchant kickbacks. Operating costs are covered by our team. We believe kids\' authentic feedback is more valuable than commercial recommendations, so all content on the platform prioritizes collecting real reviews from children aged 3-12.',
  },
  {
    q: 'How large is Tonghuixing\'s content library?',
    a: 'As of August 2026: 2,028 classical Chinese poems (with kid-friendly translation, AI recitation, and original illustration); 923 traditional Chinese classics; 2,164 encyclopedia articles; 5,018 English vocabulary words (with images, IPA, example sentences, and Ebbinghaus review); family travel guides covering 50+ cities, 1,500+ attractions, 5,000+ real kid reviews.',
  },
  {
    q: 'How does Tonghuixing protect children\'s privacy?',
    a: 'We strictly comply with Chinese laws: the Minor Protection Law, Personal Information Protection Law, and the Provisions on the Protection of Children\'s Personal Information. We do not collect children\'s names, photos, or home addresses. Feedback data only displays age range and ratings, never personal identity. Parents must actively consent before uploading children\'s feedback. All data is encrypted and minimally collected.',
  },
  {
    q: 'Who reviews Tonghuixing\'s content?',
    a: 'Three-stage review: (1) DFA sensitive word auto-filter, (2) AI semantic re-review, (3) manual spot-check by team members. All forum posts go through this process, and violating content is removed within 24 hours.',
  },
  {
    q: 'How to contact Tonghuixing?',
    a: 'Email: team@grandand.com. WeChat official account: Tonghuixing (ID: tonghuixing_). We are also on Xiaohongshu (Little Red Book) and Douyin under the same name.',
  },
]

onMounted(() => {
  // GEO: Organization schema in English context
  injectWebSite(
    'Tonghuixing (Haodaer / GrandKidsGo) — About Us',
    'Tonghuixing is a children education and family travel platform. Our core belief: "If kids say it is good, then it really is good." We cover classical Chinese poetry, traditional Chinese classics, encyclopedia knowledge, English vocabulary, quiz challenges, and authentic family travel guides. 100% non-commercial.',
    'https://grandand.com/about'
  )
  injectFAQ(faqs)
})

const stats = [
  { label: 'Classical Poems', value: '2,028', suffix: '', desc: 'Kid-friendly translation + AI recitation + original illustration' },
  { label: 'Traditional Classics', value: '923', suffix: '', desc: 'Modern Chinese translation + kid-friendly interpretation' },
  { label: 'Encyclopedia Articles', value: '2,164', suffix: '', desc: 'Science / History / Geography / Art / Life' },
  { label: 'English Vocabulary', value: '5,018', suffix: '', desc: 'Image + IPA + example + native pronunciation' },
  { label: 'Family Attractions', value: '1,500+', suffix: '', desc: 'Covering 50+ cities' },
  { label: 'Kid Reviews', value: '5,000+', suffix: '', desc: 'Aged 3-12, real ratings & reviews' },
]

const promises = [
  { icon: '🛡️', title: 'Children\'s Privacy First', desc: 'We do not collect children\'s names, photos, or addresses. Feedback only shows age range and ratings.' },
  { icon: '💯', title: '100% Non-Commercial', desc: 'No ads, no courses, no commissions, no merchant kickbacks. Operating costs are self-funded by the team.' },
  { icon: '🔍', title: 'Three-Stage Review', desc: 'DFA filter → AI re-review → manual spot-check. Violating content removed within 24 hours.' },
  { icon: '👨‍👩‍👧', title: 'Real Parents Operate', desc: 'Team consists of parents and child educators. All content is based on real family experience.' },
  { icon: '🌱', title: 'Public Welfare', desc: 'Tonghuixing is a parent co-created non-profit. We welcome more parents to join us.' },
  { icon: '📜', title: 'ICP Filing Public', desc: 'Filed under Chinese law (粤ICP备 2024xxxxxx 号). Transparent for public supervision.' },
]
</script>

<template>
  <div class="about-page">
    <header class="about-header">
      <div class="about-header-inner">
        <a href="https://grandand.com" class="about-logo">Tonghuixing · Haodaer</a>
        <a href="https://grandand.com" class="about-home">← Back to Home</a>
      </div>
    </header>

    <main class="about-main">
      <!-- Hero -->
      <section class="about-hero">
        <h1 class="about-title">If kids say it is good, then it really is good.</h1>
        <p class="about-tagline">
          Tonghuixing (English: Haodaer / GrandKidsGo) was founded in 2024 as a children education
          and family travel platform. We believe kids' authentic feedback is more valuable than
          "expert recommendations."
        </p>
        <div class="about-hero-tags">
          <span class="hero-tag">100% Non-Commercial</span>
          <span class="hero-tag">Real Parents Operate</span>
          <span class="hero-tag">Children's Privacy First</span>
          <span class="hero-tag">Public Welfare</span>
        </div>
      </section>

      <!-- Data Scale -->
      <section class="about-section">
        <h2>� Content Library (As of 2026-08-20)</h2>
        <div class="about-stats-grid">
          <div v-for="s in stats" :key="s.label" class="stat-card">
            <div class="stat-value">
              <span class="stat-num">{{ s.value }}</span>
              <span v-if="s.suffix" class="stat-suffix">{{ s.suffix }}</span>
            </div>
            <div class="stat-label">{{ s.label }}</div>
            <div class="stat-desc">{{ s.desc }}</div>
          </div>
        </div>
      </section>

      <!-- Promises -->
      <section class="about-section">
        <h2>🌟 Our Promises</h2>
        <div class="about-promises-grid">
          <div v-for="p in promises" :key="p.title" class="promise-card">
            <div class="promise-icon">{{ p.icon }}</div>
            <h3 class="promise-title">{{ p.title }}</h3>
            <p class="promise-desc">{{ p.desc }}</p>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="about-section">
        <h2>❓ Frequently Asked Questions</h2>
        <div class="about-faq">
          <details v-for="(f, i) in faqs" :key="i" class="faq-item">
            <summary class="faq-q">{{ f.q }}</summary>
            <p class="faq-a">{{ f.a }}</p>
          </details>
        </div>
      </section>

      <!-- Contact -->
      <section class="about-section">
        <h2>📮 Contact Us</h2>
        <ul class="about-contact">
          <li><strong>Email:</strong> team@grandand.com</li>
          <li><strong>WeChat Official Account:</strong> Tonghuixing (ID: tonghuixing_)</li>
          <li><strong>Xiaohongshu (Little Red Book):</strong> Tonghuixing</li>
          <li><strong>Douyin:</strong> Tonghuixing</li>
          <li><strong>ICP Filing:</strong> 粤ICP备 2024xxxxxx 号</li>
        </ul>
      </section>

      <section class="about-section about-footer">
        <p>© 2024-2026 Tonghuixing · Haodaer · GrandKidsGo · Co-created by real parent team</p>
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
  font-size: 42px; font-weight: 800; line-height: 1.2;
  background: linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #06b6d4 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin: 0 0 20px;
}
.about-tagline { font-size: 17px; color: #57534e; line-height: 1.7; max-width: 750px; margin: 0 auto 30px; }
.about-hero-tags { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.hero-tag {
  padding: 8px 18px; background: white; border: 1px solid #fbbf24; border-radius: 999px;
  font-size: 14px; color: #b45309; font-weight: 500;
}

.about-section { margin: 60px 0; }
.about-section h2 { font-size: 26px; font-weight: 700; color: #292524; margin: 0 0 24px; }

.about-stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;
}
.stat-card {
  background: white; border-radius: 16px; padding: 24px;
  border: 1px solid #f5f5f4; transition: all 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(245, 158, 11, 0.1); border-color: #fbbf24; }
.stat-value { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.stat-num { font-size: 32px; font-weight: 800; color: #d97706; }
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
  .about-title { font-size: 28px; }
  .about-tagline { font-size: 15px; }
  .about-section h2 { font-size: 20px; }
}
</style>
