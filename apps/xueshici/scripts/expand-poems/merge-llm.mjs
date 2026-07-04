#!/usr/bin/env node
// 合并 LLM 生成诗到 poems.ts — 第二阶段
//
// 读取 data/llm/batch_*.json，去除尾部逗号/修复JSON问题，
// 去重后追加到 poems.ts，更新 header 计数。
//
// 用法: node merge-llm.mjs

import fs from 'node:fs'
import path from 'node:path'

const LLM_DIR = path.join(import.meta.dirname, 'data', 'llm')
const POEMS_TS = path.join(import.meta.dirname, '..', '..', 'src', 'data', 'poems.ts')

const categoryColors = {
  "春秋战国": "#d97706",
  "汉": "#dc2626",
  "三国": "#f97316",
  "魏晋南北朝": "#8b5cf6",
  "唐": "#f59e0b",
  "宋": "#06b6d4",
  "元": "#ec4899",
  "明": "#ef4444",
  "清": "#1d4ed8",
  "近现代": "#64748b"
}

// 去除 JSON 尾部逗号
function fixJSON(s) {
  return s.replace(/,\s*([\]}])/g, '$1')
}

// ===== 主流程 =====
async function main() {
  console.log('=== 合并 LLM 生成诗到 poems.ts ===\n')

  // 1. 读现有 poems.ts
  const existingContent = fs.readFileSync(POEMS_TS, 'utf-8')

  const idMatches = [...existingContent.matchAll(/^\s{4}id: (\d+),/gm)]
  const existingIds = idMatches.map(x => parseInt(x[1]))
  const maxExistingId = Math.max(...existingIds)
  const existingCount = existingIds.length

  const titleMatches = [...existingContent.matchAll(/^\s{4}title: "([^"]+)",$/gm)]
  const existingTitles = new Set(titleMatches.map(m => m[1]))

  // 构建 key set
  const lines = existingContent.split('\n')
  const existingKeys = new Set()
  let cur = {}
  for (const line of lines) {
    const t = line.match(/^\s{4}title: "([^"]+)",$/)
    if (t) cur.title = t[1]
    const a = line.match(/^\s{4}author: "([^"]+)",$/)
    if (a) cur.author = a[1]
    const d = line.match(/^\s{4}dynasty: "([^"]+)",$/)
    if (d) {
      cur.dynasty = d[1]
      existingKeys.add(`${cur.author}|${cur.title}|${cur.dynasty}`.replace(/\s/g, ''))
      cur = {}
    }
  }

  console.log(`现有: ${existingCount} 首 (ID 1-${maxExistingId})`)

  // 2. 加载所有 LLM batch
  if (!fs.existsSync(LLM_DIR)) {
    console.log('⚠ LLM 目录不存在')
    return
  }

  const batchFiles = fs.readdirSync(LLM_DIR)
    .filter(x => x.startsWith('batch_') && x.endsWith('.json'))
    .sort()

  if (batchFiles.length === 0) {
    console.log('⚠ 没有 batch 文件可处理')
    return
  }

  const allBatches = []
  for (const f of batchFiles) {
    const filePath = path.join(LLM_DIR, f)
    let raw = fs.readFileSync(filePath, 'utf-8')
    // 修复 JSON
    const fixed = fixJSON(raw)
    let batch
    try {
      batch = JSON.parse(fixed)
    } catch (e) {
      console.log(`  ✗ ${f}: JSON 解析失败: ${e.message}`)
      continue
    }
    allBatches.push({ file: f, data: batch })
    console.log(`  ${f}: ${batch.length} 首`)
  }

  const allPoems = allBatches.flatMap(b => b.data)
  console.log(`\n总 LLM 候选: ${allPoems.length} 首`)

  if (allPoems.length === 0) {
    console.log('\n⚠ 无数据可处理')
    return
  }

  // 3. 去重（仅按 author|title|dynasty 精确去重）
  const seen = new Set()
  const deduped = []
  let dupCount = 0

  for (const p of allPoems) {
    const key = `${p.author}|${p.title}|${p.dynasty}`.replace(/\s/g, '')
    if (existingKeys.has(key)) { dupCount++; continue }
    if (seen.has(key)) { dupCount++; continue }
    seen.add(key)
    deduped.push(p)
  }

  console.log(`去重结果: ${deduped.length} 首（跳过 ${dupCount} 重复）`)

  if (deduped.length === 0) {
    console.log('\n⚠ 无新增可合并')
    return
  }

  // 4. 检查完整性
  const missingTrans = deduped.filter(p => !p.translation || !p.interpretation)
  if (missingTrans.length > 0) {
    console.log(`\n⚠ ${missingTrans.length} 首缺少翻译/解读（仍会合并，但可改进）：`)
    for (const p of missingTrans.slice(0, 3)) {
      console.log(`  ${p.author} - ${p.title}: translation=${!!p.translation}, interpretation=${!!p.interpretation}`)
    }
  }

  // 5. 转为 poems.ts 格式
  const newEntries = deduped.map((p, idx) => {
    const poemId = maxExistingId + 1 + idx
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

  // 6. 合并
  const arrayStart = existingContent.indexOf('const poemData: Poem[] = [')
  const arrayEndPos = existingContent.lastIndexOf(']\n\n')

  if (arrayStart === -1 || arrayEndPos === -1) {
    console.log('\n⚠ 找不到数组边界')
    return
  }

  const existingBody = existingContent.substring(
    arrayStart + 'const poemData: Poem[] = ['.length,
    arrayEndPos
  ).replace(/,\s*$/, '')

  const newBody = existingBody + ',\n' + newEntries.join(',\n')

  const newTotal = existingCount + deduped.length
  const newIntro = `// haodaer-shici poem data - auto-generated\n// Contains ${newTotal} poems from 11 dynasties`

  // 精确替换 header 行
  const introStart = existingContent.indexOf('// haodaer')
  const introEnd = existingContent.indexOf('\n', existingContent.indexOf('// Contains')) + 1
  // introEnd 之后跳过空行
  const afterOldIntro = existingContent.substring(introEnd).replace(/^\n+/, '')

  // 找 poemData 声明
  const poemDataLine = afterOldIntro.indexOf('const poemData')
  if (poemDataLine === -1) {
    console.log('\n⚠ 找不到 poemData 声明')
    return
  }

  const beforePoemData = afterOldIntro.substring(0, poemDataLine)

  // 构建最终内容
  const final = existingContent.substring(0, introStart) + newIntro + '\n\n' + beforePoemData +
    `const poemData: Poem[] = [${newBody}\n]\n\n` +
    existingContent.substring(arrayEndPos + 4)  // skip ]\n\n

  fs.writeFileSync(POEMS_TS, final, 'utf-8')

  console.log(`\n✓ 成功合并 ${deduped.length} 首 LLM 诗到 poems.ts`)
  console.log(`  新 ID 范围: ${maxExistingId + 1}-${maxExistingId + deduped.length}`)
  console.log(`  总诗词数: ${newTotal} 首`)

  const dist = {}
  for (const p of deduped) dist[p.dynasty] = (dist[p.dynasty] || 0) + 1
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1])
  console.log(`\n新增朝代分布:`)
  for (const [d, c] of sorted) console.log(`  ${d}: ${c} 首`)
}

main()
