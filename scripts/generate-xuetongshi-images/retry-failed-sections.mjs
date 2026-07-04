#!/usr/bin/env node
/**
 * 学通识 sections retry — 重试 fill-missing-status.json 中失败项
 * 不依赖 knowledge.ts，直接读 status 文件
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
if (!API_KEY) { console.error('MINIMAX_API_KEY 未设置'); process.exit(1) }

const KNOWLEDGE_TS = resolve(__dirname, '../../apps/xuetongshi/src/data/knowledge.ts')
const SECTIONS_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/sections')
const STATUS_FILE = resolve(__dirname, 'fill-missing-status.json')

// 解析 knowledge.ts 拿 topic.title 和 section.title/category/summary
function parseKnowledge() {
  const content = readFileSync(KNOWLEDGE_TS, 'utf-8')
  const result = {}
  const topicRe = /\{\s*id:\s*['"]([a-z0-9-]+)['"]\s*,\s*title:\s*['"]([^'"]+)['"][^}]*?category:\s*['"]([^'"]+)['"][\s\S]*?sections:\s*\[/g
  for (const m of content.matchAll(topicRe)) {
    const topicId = m[1]
    const topicTitle = m[2]
    const category = m[3]
    const startIdx = m.index + m[0].length
    let depth = 1, i = startIdx
    while (i < content.length && depth > 0) {
      if (content[i] === '[') depth++
      else if (content[i] === ']') depth--
      i++
    }
    const block = content.slice(startIdx, i - 1)
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
  }
  throw new Error('AI 未识别响应')
}

const baseStyle = `Canon EOS R5, 85mm f/1.4, golden hour lighting, National Geographic Kids photography style.
Realistic photo, NO illustration, NO watercolor, NO cartoon, NO 3D render.
Sharp focus, vivid natural colors, child-friendly educational content.`

async function main() {
  const knowledge = parseKnowledge()
  const status = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'))
  const failedIds = Object.entries(status)
    .filter(([k, v]) => v.status === 'fail')
    .map(([k]) => k)

  console.log(`失败任务: ${failedIds.length}`)
  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

  let ok = 0, fail = 0
  for (let i = 0; i < failedIds.length; i++) {
    const fullId = failedIds[i]
    // 解析 fullId: {parentId}-{sectionId}
    const idx = fullId.lastIndexOf('-')
    const topicId = fullId.substring(0, idx)
    const sectionId = fullId.substring(idx + 1)
    const tinfo = knowledge[topicId]
    const sinfo = tinfo?.sections[sectionId]
    if (!tinfo || !sinfo) {
      log(`[${i + 1}/${failedIds.length}] ${fullId} ⚠ not found in knowledge.ts`)
      continue
    }

    const prompt = `${baseStyle}

Subject: ${sinfo.title} (${tinfo.category})
${sinfo.summary ? `Context: ${sinfo.summary.slice(0, 200)}` : ''}

DEPICT "${sinfo.title}" LITERALLY.`

    try {
      const buf = await generateImage(prompt)
      const stats = await sharp(buf).stats()
      const avg = stats.channels.reduce((s, c) => s + c.mean, 0) / stats.channels.length
      if (avg < 5 || avg > 250) {
        log(`[${i + 1}/${failedIds.length}] ${fullId} ⚠ blank avg=${avg.toFixed(1)}`)
        status[fullId] = { status: 'fail', error: 'blank image' }
        fail++
        continue
      }
      const processed = await sharp(buf).resize(800).jpeg({ quality: 82 }).toBuffer()
      writeFileSync(join(SECTIONS_DIR, `${fullId}.jpg`), processed)
      log(`[${i + 1}/${failedIds.length}] ${fullId} ✅ ${(processed.length / 1024).toFixed(0)}KB`)
      status[fullId] = { status: 'ok', size: processed.length }
      ok++
    } catch (e) {
      log(`[${i + 1}/${failedIds.length}] ${fullId} ❌ ${e.message}`)
      status[fullId] = { status: 'fail', error: e.message }
      fail++
    }

    await new Promise(r => setTimeout(r, 3000))
  }

  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
  console.log(`\nDONE: ok=${ok} fail=${fail}`)
}

main().catch(e => { console.error(e); process.exit(1) })