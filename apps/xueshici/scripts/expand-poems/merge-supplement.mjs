#!/usr/bin/env node
// 补充最后一批诗词到 2000 首
// 输入：补充 JSON (data/llm/batch_supplement.json)
// 执行后直接更新 poems.ts

import fs from 'node:fs'
import path from 'node:path'

const LLM_DIR = path.join(import.meta.dirname, 'data', 'llm')
const POEMS_TS = path.join(import.meta.dirname, '..', '..', 'src', 'data', 'poems.ts')

const categoryColors = {
  "春秋战国": "#d97706", "汉": "#dc2626", "三国": "#f97316",
  "魏晋南北朝": "#8b5cf6", "唐": "#f59e0b", "宋": "#06b6d4",
  "元": "#ec4899", "明": "#ef4444", "清": "#1d4ed8", "近现代": "#64748b"
}

function fixJSON(s) { return s.replace(/,\s*([\]}])/g, '$1') }

function parsePoems(content) {
  return [...content.matchAll(/^\s{4}id: (\d+),/gm)].map(m => parseInt(m[1]))
}

async function main() {
  const existingContent = fs.readFileSync(POEMS_TS, 'utf-8')
  const existingIds = parsePoems(existingContent)
  const maxId = Math.max(...existingIds)
  const existingCount = existingIds.length

  const existingKeys = new Set()
  let cur = {}
  for (const line of existingContent.split('\n')) {
    const t = line.match(/^\s{4}title: "([^"]+)",$/)
    if (t) cur.title = t[1]
    const a = line.match(/^\s{4}author: "([^"]+)",$/)
    if (a) cur.author = a[1]
    const d = line.match(/^\s{4}dynasty: "([^"]+)",$/)
    if (d) { cur.dynasty = d[1]; existingKeys.add(`${cur.author}|${cur.title}|${cur.dynasty}`.replace(/\s/g, '')); cur = {} }
  }

  // Load supplement
  const supFile = path.join(LLM_DIR, 'batch_supplement.json')
  if (!fs.existsSync(supFile)) {
    console.log('⚠ 找不到 batch_supplement.json')
    return
  }

  const raw = fs.readFileSync(supFile, 'utf-8')
  const fixed = fixJSON(raw)
  let batch
  try { batch = JSON.parse(fixed) } catch(e) {
    console.log('✗ JSON 解析失败:', e.message)
    return
  }
  console.log(`补充候选: ${batch.length} 首\n`)

  // Dedup
  const deduped = []
  let dup = 0
  for (const p of batch) {
    const key = `${p.author}|${p.title}|${p.dynasty}`.replace(/\s/g, '')
    if (!existingKeys.has(key)) deduped.push(p)
    else dup++
  }
  console.log(`去重后: ${deduped.length} 首（跳过 ${dup}）`)

  if (deduped.length === 0) {
    console.log('⚠ 无新增')
    return
  }

  // Format entries
  const newEntries = deduped.map((p, idx) => {
    const poemId = maxId + 1 + idx
    const paragraphs = p.paragraphs || []
    const original = paragraphs.join('\n')
    const summary = paragraphs.slice(0, 2).join('\n').substring(0, 60)
    const color = categoryColors[p.dynasty] || '#64748b'
    const sectionTitle = p.rhythmic || p.title

    return `  {
    id: ${poemId},
    title: "${p.title}",
    author: "${p.author}",
    dynasty: "${p.dynasty}",
    category: "${p.dynasty}",
    summary: \`${summary}\`,
    tags: "古诗",
    color: "${color}",
    sections: [
      { id: 1, title: "${sectionTitle}", original: \`${original}\`, translation: \`${p.translation || ''}\`, interpretation: \`${p.interpretation || ''}\` }
    ]
  }`
  })

  // Merge
  const arrayStart = existingContent.indexOf('const poemData: Poem[] = [')
  const arrayEndPos = existingContent.lastIndexOf(']\n\n')
  const existingBody = existingContent.substring(arrayStart + 'const poemData: Poem[] = ['.length, arrayEndPos).replace(/,\s*$/, '')
  const newBody = existingBody + ',\n' + newEntries.join(',\n')
  const newTotal = existingCount + deduped.length

  // Update header
  const newIntro = `// haodaer-shici poem data - auto-generated\n// Contains ${newTotal} poems from 11 dynasties`
  const introStart = existingContent.indexOf('// haodaer')
  const introEnd = existingContent.indexOf('\n', existingContent.indexOf('// Contains')) + 1
  const afterOldIntro = existingContent.substring(introEnd).replace(/^\n+/, '')

  const final = existingContent.substring(0, introStart) + newIntro + '\n\n' +
    afterOldIntro.replace(/const poemData: Poem\[\] = \[[\s\S]*?\]\n\n/, `const poemData: Poem[] = [${newBody}\n]\n\n`)

  fs.writeFileSync(POEMS_TS, final, 'utf-8')

  console.log(`\n✓ 已合并 ${deduped.length} 首`)
  console.log(`总诗词数: ${newTotal} 首`)
}

main()
