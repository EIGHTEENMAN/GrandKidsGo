<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface FAQItem {
  q: string
  a: string
}

const faqs: FAQItem[] = [
  {
    q: '童慧行是什么？',
    a: '童慧行（grandand.com）是一个专为儿童和家长打造的成长陪伴平台。我们提供学诗词、学国学、学通识、学英语四个学习站点，以及亲子旅行攻略、答题挑战、社区论坛和积分商城等服务。'
  },
  {
    q: '孩子可以单独使用吗？',
    a: '可以。14 岁以下儿童需经家长同意注册并使用。家长可以在「个人中心 - 青少年模式」中设置每日使用时长、夜间模式、社交限制等参数，确保孩子安全健康地使用平台。'
  },
  {
    q: '是否需要付费？',
    a: '目前所有内容、攻略、社区功能完全免费。'
  },
  {
    q: '如何注册账号？',
    a: '点击右上角"登录 / 注册"，输入手机号获取验证码即可。家长账号可添加多个儿童子账号，分别记录每个孩子的学习进度。'
  },
  {
    q: '如何保护孩子的隐私？',
    a: '我们严格遵守《个人信息保护法》和《儿童个人信息网络保护规定》。14 岁以下儿童注册需家长同意并填写《家长同意书》，平台默认开启青少年模式（每日 40 分钟使用时长、夜间禁用、社交限制）。详细说明请查看 服务条款 / 隐私政策 / 儿童个人信息保护 三项公示。'
  },
  {
    q: '学诗词的内容来源？',
    a: '学诗词精选 2026 首经典诗作，涵盖诗经、楚辞、唐诗、宋词等十一朝代。每首诗包含原文、译文、赏析三段内容，配备专业 TTS 音频（按诗的情绪和性别提供 12 种音色组合）。'
  },
  {
    q: '学英语的单词量为什么显示 3340？',
    a: '目前童慧行学英语覆盖 3340 个常用英语单词，配备例句和英语男声 TTS 朗读。我们按主题分类（如动物、植物、日常物品等），适合 6-12 岁儿童循序渐进学习。后续会持续扩充。'
  },
  {
    q: '遇到问题如何联系客服？',
    a: '请通过 服务条款 / 联系我们 页面查看联系方式，或在论坛「童慧行官方」板块留言。我们会在 24 小时内响应。'
  }
]

const activeIdx = ref<number | null>(null)

onMounted(() => {
  const hash = window.location.hash.replace('#', '')
  const idx = parseInt(hash.replace('q', ''))
  if (!isNaN(idx) && idx >= 0 && idx < faqs.length) {
    activeIdx.value = idx
    setTimeout(() => {
      document.getElementById(`q${idx}`)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }
})

function toggle(i: number) {
  activeIdx.value = activeIdx.value === i ? null : i
}
</script>

<template>
  <div class="faq-page">
    <header class="faq-header">
      <div class="faq-header-inner">
        <a href="https://grandand.com" class="faq-logo">童慧行</a>
        <a href="https://grandand.com" class="faq-home">← 返回首页</a>
      </div>
    </header>

    <main class="faq-main">
      <h1 class="faq-title">常见问题</h1>
      <p class="faq-update">最后更新：2026 年 6 月 27 日</p>

      <div class="faq-list">
        <div
          v-for="(item, i) in faqs"
          :key="i"
          :id="`q${i}`"
          class="faq-item"
          :class="{ active: activeIdx === i }"
        >
          <button class="faq-q" @click="toggle(i)">
            <span class="faq-q-text">{{ i + 1 }}. {{ item.q }}</span>
            <span class="faq-q-icon">{{ activeIdx === i ? '−' : '+' }}</span>
          </button>
          <div v-if="activeIdx === i" class="faq-a">{{ item.a }}</div>
        </div>
      </div>

      <div class="faq-footer">
        <p>没找到答案？<a href="https://grandand.com/legal#contact">联系我们</a></p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.faq-page {
  min-height: 100vh;
  background: #fafafa;
}
.faq-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  height: 56px;
  display: flex;
  align-items: center;
}
.faq-header-inner {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.faq-logo {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
  text-decoration: none;
}
.faq-home {
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
}
.faq-home:hover { color: #059669; }

.faq-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 16px 80px;
}
.faq-title {
  font-size: 32px;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px;
}
.faq-update {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 24px;
}
.faq-list {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}
.faq-item {
  border-bottom: 1px solid #f3f4f6;
}
.faq-item:last-child { border-bottom: none; }
.faq-q {
  width: 100%;
  background: none;
  border: none;
  padding: 18px 20px;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #111;
  transition: background 0.15s;
}
.faq-q:hover { background: #f9fafb; }
.faq-item.active .faq-q { color: #059669; }
.faq-q-text { flex: 1; padding-right: 12px; }
.faq-q-icon {
  font-size: 22px;
  color: #9ca3af;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}
.faq-a {
  padding: 0 20px 20px;
  font-size: 15px;
  color: #4b5563;
  line-height: 1.7;
}
.faq-footer {
  margin-top: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}
.faq-footer a {
  color: #059669;
  text-decoration: none;
  font-weight: 500;
}
.faq-footer a:hover { text-decoration: underline; }
</style>