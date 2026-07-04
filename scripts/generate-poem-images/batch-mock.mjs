#!/usr/bin/env node
/**
 * 批量生成诗配画 SVG 占位图
 * 用于缺失配图的新增诗词（ID > 1004）
 *
 * 用法：node batch-mock.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const STATUS_PATH = path.join(__dirname, 'generation-status.json')
const POEMS_PATH = path.join(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json')
const OUTPUT_DIR = path.join(__dirname, '../../apps/xueshici/public/images/poems')

const colors = [
  ['#fef3c7', '#d97706'],
  ['#ecfdf5', '#059669'],
  ['#eff6ff', '#2563eb'],
  ['#fdf2f8', '#db2777'],
  ['#f5f3ff', '#7c3aed'],
  ['#fefce8', '#ca8a04'],
  ['#f0fdf4', '#16a34a'],
  ['#fff7ed', '#ea580c'],
  ['#fce7f3', '#be185d'],
  ['#f0f9ff', '#0284c7'],
]

function generateSvg(poem, idx) {
  const [bg, accent] = colors[idx % colors.length]
  const char = poem.title.charAt(0)
  const title = escapeXml(poem.title)
  const author = escapeXml(`${poem.author} · ${poem.dynasty}`)
  const summary = escapeXml((poem.summary || '').slice(0, 30))

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mount" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent};stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:${accent};stop-opacity:0.05" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)" />
  <path d="M0 700 Q150 500 300 600 Q400 550 500 500 Q600 450 750 550 Q850 500 1024 600 L1024 1024 L0 1024 Z" fill="url(#mount)" opacity="0.3"/>
  <path d="M0 750 Q200 600 400 680 Q550 600 700 650 Q800 600 1024 680 L1024 1024 L0 1024 Z" fill="url(#mount)" opacity="0.5"/>
  <circle cx="512" cy="350" r="120" fill="${accent}" opacity="0.08"/>
  <circle cx="512" cy="350" r="80" fill="${accent}" opacity="0.06"/>
  <text x="512" y="340" text-anchor="middle" font-family="serif" font-size="48" fill="${accent}" opacity="0.4">${char}</text>
  <text x="512" y="900" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${accent}" opacity="0.5">《${title}》${author}</text>
  <path d="M350 480 Q380 460 400 480" stroke="${accent}" stroke-width="2" fill="none" opacity="0.2"/>
  <path d="M600 450 Q630 430 650 450" stroke="${accent}" stroke-width="2" fill="none" opacity="0.2"/>
  <text x="512" y="520" text-anchor="middle" font-family="sans-serif" font-size="18" fill="${accent}" opacity="0.2">${summary}</text>
</svg>`
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function main() {
  console.log('=== 批量生成诗配画 SVG 占位图 ===\n')

  // 加载诗词
  const poems = JSON.parse(fs.readFileSync(POEMS_PATH, 'utf-8'))
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'))

  // 找出需要生成的诗词（pending 状态的）
  const pendingIds = []
  for (const [id, info] of Object.entries(status.poems)) {
    if (info.status === 'pending') pendingIds.push(Number(id))
  }
  pendingIds.sort((a, b) => a - b)

  console.log(`待生成 SVG 占位图: ${pendingIds.length} 首`)
  console.log(`ID 范围: ${pendingIds[0]} - ${pendingIds[pendingIds.length-1]}\n`)

  if (pendingIds.length === 0) {
    console.log('✅ 没有需要生成的诗词')
    return
  }

  let success = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < pendingIds.length; i++) {
    const id = pendingIds[i]
    const poem = poems.find(p => p.id === id)

    if (!poem) {
      console.log(`  [${i+1}/${pendingIds.length}] ✗ ID ${id}: 找不到诗词`)
      failed++
      continue
    }

    const svgPath = path.join(OUTPUT_DIR, `${id}.svg`)
    const mockMarkPath = path.join(OUTPUT_DIR, `${id}.webp.mock`)

    // Skip if SVG already exists
    if (fs.existsSync(svgPath)) {
      skipped++
      continue
    }

    const svg = generateSvg(poem, id)
    fs.writeFileSync(svgPath, svg)
    fs.writeFileSync(mockMarkPath, new Date().toISOString())

    // Update tracker status to "skipped" (svg placeholder instead of real image)
    status.poems[String(id)].status = 'skipped'
    status.poems[String(id)].completedAt = new Date().toISOString()

    success++

    if (success % 100 === 0) {
      console.log(`  [${i+1}/${pendingIds.length}] ✓ 已生成 ${success} 个 SVG`)
      // Periodic save
      status.updatedAt = new Date().toISOString()
      fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2))
    }
  }

  // Final save
  status.updatedAt = new Date().toISOString()
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2))

  console.log(`\n✅ 生成完成`)
  console.log(`  成功: ${success}`)
  console.log(`  跳过: ${skipped}`)
  console.log(`  失败: ${failed}`)

  // Stats
  const done = Object.values(status.poems).filter(p => p.status === 'done').length
  const skippedCount = Object.values(status.poems).filter(p => p.status === 'skipped').length
  const stillPending = Object.values(status.poems).filter(p => p.status === 'pending').length
  console.log(`\n📊 总进度: 完成 ${done} / 占位 ${skippedCount} / 待生成 ${stillPending} / 共 ${Object.keys(status.poems).length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
