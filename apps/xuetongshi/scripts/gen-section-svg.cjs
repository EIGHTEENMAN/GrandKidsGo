#!/usr/bin/env node
/**
 * 学通识 section 级 SVG 占位图批量生成
 *
 * 为 243 个 topic × 平均 10 节 = ~2400 张 SVG
 * 路径：public/images/sections/{topicId}-{sectionId}.svg
 *
 * 用法：node scripts/gen-section-svg.cjs [--topic id] [--force]
 */
const fs = require('fs')
const path = require('path')

const DATA = path.join(__dirname, '../src/data/knowledge.ts')
const OUT = path.join(__dirname, '../public/images/sections')

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const text = fs.readFileSync(DATA, 'utf-8')

// 类目配色（与 gen-knowledge-svg 同步）
const catStyle = {
  '中国传统文化': { bg: '#fef3c7', accent: '#d97706', emoji: '📜' },
  '健康生活': { bg: '#fdf2f8', accent: '#ec4899', emoji: '❤️' },
  '历史人物': { bg: '#fff7ed', accent: '#ea580c', emoji: '👤' },
  '地理': { bg: '#eff6ff', accent: '#2563eb', emoji: '🌍' },
  '科学': { bg: '#f0f9ff', accent: '#0284c7', emoji: '🔬' },
  '科技工程': { bg: '#f5f3ff', accent: '#7c3aed', emoji: '⚙️' },
  '经济社会': { bg: '#f0fdf4', accent: '#16a34a', emoji: '💰' },
  '自然': { bg: '#ecfdf5', accent: '#059669', emoji: '🌿' },
  '艺术': { bg: '#fce7f3', accent: '#be185d', emoji: '🎨' },
  '语言文字': { bg: '#f0fdfa', accent: '#14b8a6', emoji: '✍️' },
  '逻辑思维': { bg: '#fff7ed', accent: '#f97316', emoji: '🧠' },
}

const escapeXml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 解析 topic
const topicRe = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*category:\s*'([^']+)'[\s\S]*?sections:\s*\[/g
let m
const topics = []
while ((m = topicRe.exec(text)) !== null) {
  const topicId = m[1]
  const topicTitle = m[2]
  const cat = m[3]
  // 找 sections 数组
  const start = m.index + m[0].length
  let depth = 1, i = start, inS = false, sC = null
  for (; i < text.length && depth > 0; i++) {
    const c = text[i]
    if (inS) { if (c === '\\') { i++; continue } if (c === sC) inS = false; continue }
    if (c === '"' || c === "'" || c === '`') { inS = true; sC = c; continue }
    if (c === '[') depth++
    else if (c === ']') depth--
  }
  const body = text.slice(start, i - 1)
  // 找所有 section id+title
  const secRe = /id:\s*'([^']+)',\s*title:\s*'([^']+)'/g
  let sm
  const sections = []
  while ((sm = secRe.exec(body)) !== null) {
    sections.push({ id: sm[1], title: sm[2] })
  }
  topics.push({ id: topicId, title: topicTitle, cat, sections })
}

const args = process.argv.slice(2)
let filterTopic = null
if (args[0] === '--topic' && args[1]) filterTopic = args[1]
const force = args.includes('--force')

let total = 0
let skipped = 0
let failed = 0

for (const t of topics) {
  if (filterTopic && t.id !== filterTopic) continue
  const s = catStyle[t.cat] || { bg: '#f1f5f9', accent: '#64748b', emoji: '📖' }
  for (const sec of t.sections) {
    const fname = `${t.id}-${sec.id}.svg`
    const outFile = path.join(OUT, fname)
    if (fs.existsSync(outFile) && !force) {
      skipped++
      continue
    }
    // 简洁版：取 section 标题前 1 字 + 全文 + topic 名
    const char = sec.title.slice(0, 1)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${s.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.5" />
    </linearGradient>
    <radialGradient id="circle" cx="50%" cy="40%" r="40%">
      <stop offset="0%" style="stop-color:${s.accent};stop-opacity:0.18" />
      <stop offset="100%" style="stop-color:${s.accent};stop-opacity:0" />
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)" />
  <circle cx="400" cy="240" r="220" fill="url(#circle)" />
  <g opacity="0.08" stroke="${s.accent}" stroke-width="1.2" fill="none">
    <path d="M 80 480 Q 250 450, 400 480 T 720 480" />
    <path d="M 80 510 Q 250 490, 400 510 T 720 510" />
  </g>
  <text x="400" y="270" font-family="serif" font-size="200" font-weight="900" fill="${s.accent}" text-anchor="middle" opacity="0.2">${escapeXml(char)}</text>
  <text x="400" y="400" font-family="sans-serif" font-size="28" font-weight="700" fill="${s.accent}" text-anchor="middle" opacity="0.85">${escapeXml(sec.title)}</text>
  <text x="400" y="440" font-family="sans-serif" font-size="18" fill="#64748b" text-anchor="middle" opacity="0.6">${escapeXml(t.title)}</text>
  <text x="400" y="560" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle" opacity="0.6">童慧行 · 学通识</text>
</svg>`
    try {
      fs.writeFileSync(outFile, svg, 'utf-8')
      total++
    } catch (e) {
      failed++
    }
  }
}

const totalTopics = filterTopic ? 1 : topics.length
console.log(`✅ section SVG 生成完成: ${total} 生成 | ${skipped} 跳过 | ${failed} 失败`)
console.log(`📁 输出: ${OUT}`)
console.log(`📊 处理: ${totalTopics} topics`)
