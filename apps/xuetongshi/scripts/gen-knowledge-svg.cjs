#!/usr/bin/env node
/**
 * 学通识 SVG 占位图批量生成
 *
 * 为 243 个 topic 各生成一张 SVG 占位图（按 category 配色）
 *
 * 用法：node scripts/gen-knowledge-svg.cjs [--all | --ids id1,id2]
 */
const fs = require('fs')
const path = require('path')

const META = path.join(__dirname, '../src/data/knowledge-meta.ts')
const OUT = path.join(__dirname, '../public/images/knowledge')

// 解析 meta
const metaText = fs.readFileSync(META, 'utf-8')
const topicRe = /"id":\s*"([^"]+)",\s*"title":\s*"([^"]+)",\s*"category":\s*"([^"]+)"[\s\S]*?"color":\s*"([^"]+)"/g
const topics = []
let m
while ((m = topicRe.exec(metaText)) !== null) {
  topics.push({ id: m[1], title: m[2], cat: m[3], color: m[4] })
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

// 类目配色（更鲜明的水墨淡彩风）
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

// SVG 生成（简洁水墨淡彩风）
function generateSvg(topic) {
  const s = catStyle[topic.cat] || { bg: '#f1f5f9', accent: '#64748b', emoji: '📖' }
  const char = topic.title.slice(0, 1)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${s.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.6" />
    </linearGradient>
    <radialGradient id="circle" cx="50%" cy="40%" r="40%">
      <stop offset="0%" style="stop-color:${s.accent};stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:${s.accent};stop-opacity:0" />
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)" />
  <circle cx="512" cy="400" r="280" fill="url(#circle)" />
  <g opacity="0.08" stroke="${s.accent}" stroke-width="1.5" fill="none">
    <path d="M 100 700 Q 300 650, 500 700 T 924 700" />
    <path d="M 100 750 Q 300 720, 500 750 T 924 750" />
    <path d="M 100 800 Q 300 770, 500 800 T 924 800" />
  </g>
  <text x="512" y="430" font-family="serif" font-size="280" font-weight="900" fill="${s.accent}" text-anchor="middle" opacity="0.18">${escapeXml(char)}</text>
  <text x="512" y="600" font-family="sans-serif" font-size="48" font-weight="700" fill="${s.accent}" text-anchor="middle" opacity="0.85">${escapeXml(topic.title)}</text>
  <text x="512" y="660" font-family="sans-serif" font-size="28" fill="#64748b" text-anchor="middle" opacity="0.7">${escapeXml(topic.cat)}</text>
  <text x="512" y="940" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle" opacity="0.6">童慧行 · 学通识</text>
</svg>`
}

// 解析命令行
const args = process.argv.slice(2)
let filter = null
if (args[0] === '--ids' && args[1]) {
  filter = args[1].split(',')
}

let total = 0
let skipped = 0
let failed = 0
const mode = filter ? '指定' : '全部'
console.log(`学通识 SVG 占位生成 (${mode} ${filter ? filter.length : topics.length} 个)`)

for (const t of topics) {
  if (filter && !filter.includes(t.id)) continue
  const outFile = path.join(OUT, t.id + '.svg')
  if (fs.existsSync(outFile) && !args.includes('--force')) {
    skipped++
    continue
  }
  try {
    fs.writeFileSync(outFile, generateSvg(t), 'utf-8')
    total++
  } catch (e) {
    failed++
    console.error(`❌ ${t.id}: ${e.message}`)
  }
}

console.log(`✅ 完成: ${total} 生成 | ${skipped} 跳过 | ${failed} 失败`)
console.log(`📁 输出: ${OUT}`)
