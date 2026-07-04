#!/usr/bin/env node
/**
 * 学通识真图补齐 — 专门补缺失的 sections 图（383 张）
 *
 * 策略：跳过 wiki 搜索（耗时），直接 AI 生成（速度优先）
 * 风格 v2：写实摄影，对标 DK / National Geographic Kids
 *
 * 用法：
 *   node fill-missing-sections.mjs           # 补所有缺失
 *   node fill-missing-sections.mjs --limit 10  # 只跑前 10 张测试
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

// secrets.env
const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  const envText = readFileSync(userEnvPath, 'utf-8')
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const API_KEY = process.env.MINIMAX_API_KEY
if (!API_KEY) {
  console.error('MINIMAX_API_KEY 未设置')
  process.exit(1)
}

const args = process.argv.slice(2)
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : Infinity

const KNOWLEDGE_TS = resolve(__dirname, '../../apps/xuetongshi/src/data/knowledge.ts')
const SECTIONS_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/sections')

// 解析 knowledge.ts 的 topics + sections
function parseKnowledge() {
  const content = readFileSync(KNOWLEDGE_TS, 'utf-8')
  const result = {}
  // 状态机：找 { id: 'XX', ..., sections: [ ... ] }
  // 简化：用 regex 找 { id: 'XX', title: 'YY', ...  } 块
  const topicRe = /\{\s*id:\s*['"]([a-z0-9-]+)['"]\s*,\s*title:\s*['"]([^'"]+)['"][^}]*?category:\s*['"]([^'"]+)['"][\s\S]*?sections:\s*\[/g
  for (const m of content.matchAll(topicRe)) {
    const topicId = m[1]
    const topicTitle = m[2]
    const category = m[3]
    // 找 sections: [...] 范围
    const startIdx = m.index + m[0].length
    let depth = 1, i = startIdx
    while (i < content.length && depth > 0) {
      if (content[i] === '[') depth++
      else if (content[i] === ']') depth--
      i++
    }
    const block = content.slice(startIdx, i - 1)
    // 找每个 { id: 'XX', title: 'YY', ... summary: '...' 或 content: '...'
    const secRe = /\{\s*id:\s*['"]([a-z0-9-]+)['"]\s*,\s*title:\s*['"]([^'"]+)['"][\s\S]*?(?:summary:\s*['"]([^'"]*)['"]|content:\s*['"]([^'"]*)['"])/g
    for (const sm of block.matchAll(secRe)) {
      const sid = sm[1]
      const stitle = sm[2]
      const ssummary = sm[3] || sm[4] || ''
      if (!result[topicId]) result[topicId] = { title: topicTitle, category, sections: {} }
      result[topicId].sections[sid] = { title: stitle, summary: ssummary }
    }
  }
  return result
}

// 找缺失
function findMissing(knowledge) {
  if (!existsSync(SECTIONS_DIR)) mkdirSync(SECTIONS_DIR, { recursive: true })
  const files = readdirSync(SECTIONS_DIR).filter(f => f.endsWith('.jpg'))
  const existingIds = new Set(files.map(f => f.replace(/\.jpg$/, '')))

  const missing = []
  for (const [topicId, info] of Object.entries(knowledge)) {
    for (const [sid, sinfo] of Object.entries(info.sections)) {
      const fullId = `${topicId}-${sid}`
      if (!existingIds.has(fullId)) {
        missing.push({ topicId, sectionId: sid, fullId, title: sinfo.title, category: info.category, summary: sinfo.summary })
      }
    }
  }
  return missing
}

// 调用 MiniMax AI 生成图片
async function generateImage(prompt) {
  const res = await fetch('https://api.minimaxi.com/v1/image_generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'image-01', prompt, aspect_ratio: '16:9' }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.data?.image_urls?.[0]) {
    const r = await fetch(data.data.image_urls[0])
    return Buffer.from(await r.arrayBuffer())
  } else if (data.data?.image_base64?.[0]) {
    return Buffer.from(data.data.image_base64[0], 'base64')
  } else if (data.image_base64) {
    return Buffer.from(data.image_base64, 'base64')
  }
  throw new Error('AI 未识别响应')
}

const baseStyle = `Canon EOS R5, 85mm f/1.4, golden hour lighting, National Geographic Kids photography style.
Realistic photo, NO illustration, NO watercolor, NO cartoon, NO 3D render.
Sharp focus, vivid natural colors, child-friendly educational content.`

async function main() {
  console.log('解析 knowledge.ts...')
  const knowledge = parseKnowledge()
  const topicCount = Object.keys(knowledge).length
  const secCount = Object.values(knowledge).reduce((s, t) => s + Object.keys(t.sections).length, 0)
  console.log(`  ${topicCount} 个 topic, ${secCount} 个 section`)

  const missing = findMissing(knowledge)
  console.log(`缺 sections 图: ${missing.length} 张`)
  const toProcess = missing.slice(0, limit)
  console.log(`本次处理: ${toProcess.length} 张`)

  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
  const statusFile = resolve(__dirname, 'fill-missing-status.json')
  let status = {}
  if (existsSync(statusFile)) {
    try { status = JSON.parse(readFileSync(statusFile, 'utf-8')) } catch {}
  }

  let ok = 0, fail = 0, skip = 0
  const start = Date.now()

  for (let i = 0; i < toProcess.length; i++) {
    const task = toProcess[i]
    const outPath = join(SECTIONS_DIR, `${task.fullId}.jpg`)

    if (status[task.fullId]?.status === 'ok' && existsSync(outPath)) {
      skip++
      continue
    }

    // 跳过 SVG 已有的（生成 SVG 优先的应用场景）
    // 这里直接生成 jpg

    const prompt = `${baseStyle}

Subject: ${task.title} (${task.category || ''})
${task.summary ? `Context: ${task.summary.slice(0, 200)}` : ''}

DEPICT "${task.title}" LITERALLY — show the actual thing or scene directly, not abstract.`

    try {
      const buf = await generateImage(prompt)
      // 检测全黑/全白
      const meta = await sharp(buf).metadata()
      const stats = await sharp(buf).stats()
      const avg = stats.channels.reduce((s, c) => s + c.mean, 0) / stats.channels.length
      if (avg < 5 || avg > 250) {
        log(`[${i + 1}/${toProcess.length}] ${task.fullId} ⚠ 全黑/全白 avg=${avg.toFixed(1)}`)
        status[task.fullId] = { status: 'fail', error: 'blank image' }
        fail++
        continue
      }

      // 压缩到 800px 宽，jpg q=82
      const processed = await sharp(buf).resize(800).jpeg({ quality: 82 }).toBuffer()
      writeFileSync(outPath, processed)
      log(`[${i + 1}/${toProcess.length}] ${task.fullId} ✅ ${(processed.length / 1024).toFixed(0)}KB`)
      status[task.fullId] = { status: 'ok', size: processed.length }
      ok++
    } catch (e) {
      log(`[${i + 1}/${toProcess.length}] ${task.fullId} ❌ ${e.message}`)
      status[task.fullId] = { status: 'fail', error: e.message }
      fail++
    }

    // 每 20 张持久化状态
    if ((i + 1) % 20 === 0) writeFileSync(statusFile, JSON.stringify(status, null, 2))

    // API 限速：每张 2.5s
    await new Promise(r => setTimeout(r, 2500))
  }

  writeFileSync(statusFile, JSON.stringify(status, null, 2))
  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1)
  console.log(`\nDONE: ok=${ok} fail=${fail} skip=${skip} | ${elapsed}min`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})