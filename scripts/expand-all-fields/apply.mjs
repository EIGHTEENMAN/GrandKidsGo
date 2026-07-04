/**
 * 把 expand-result.json 中的扩写结果应用到 classics.ts 和 poems.ts
 *
 * 简化策略：先定位到 section 块（id: 'xxx' 开始的整个对象），然后在块内
 * 替换 translation/interpretation 字段值
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
let filterSource = null
const srcIdx = args.indexOf('--source')
if (srcIdx >= 0) filterSource = args[srcIdx + 1]
let filterType = null
const typeIdx = args.indexOf('--type')
if (typeIdx >= 0) filterType = args[typeIdx + 1]

const FILES = {
  xueguoxue: resolve(__dirname, '../../apps/xueguoxue/src/data/classics.ts'),
  xueshici: resolve(__dirname, '../../apps/xueshici/src/data/poems.ts'),
}

const resultFile = resolve(__dirname, 'expand-result.json')

const results = JSON.parse(readFileSync(resultFile, 'utf-8'))
console.log(`📦 已加载 ${Object.keys(results).length} 条扩写结果`)

function validate(text) {
  if (!text) return 'empty'
  const clean = text.replace(/\\n/g, '').replace(/\\。/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
  if (clean.length < 110) return `too short (${clean.length}字)`
  if (!/[。，！？；：]/.test(clean)) return 'no punctuation'
  return null
}

// 按 source 分组
const bySource = { xueguoxue: [], xueshici: [] }
let validated = 0, skipped = 0
for (const [key, val] of Object.entries(results)) {
  const [source, id, fieldType] = key.split(':')
  if (filterSource && source !== filterSource) continue
  if (filterType && fieldType !== filterType) continue
  if (!bySource[source]) { skipped++; continue }
  const newText = val[fieldType]
  const err = validate(newText)
  if (err) { console.log(`  ⚠️  ${key} 校验失败: ${err}`); skipped++; continue }
  bySource[source].push({ key, id, fieldType, newText })
  validated++
}
console.log(`✓ 校验通过: ${validated} | ⚠️ 跳过: ${skipped}`)

// ===== 找 section 块 =====
function findSectionsXueguoxue(content) {
  // 返回 [{ id, start, end, fieldValues: { translation: {start, end, quote}, interpretation: ... } }]
  const sections = []
  const idRe = /\{\s*id:\s*'((?:jing|zi|shi|yi|meng)-\d+-s\d+)',\s*\n\s*title:\s*'/g
  let m
  while ((m = idRe.exec(content)) !== null) {
    sections.push({ id: m[1], idIndex: m.index, bodyStart: m.index + m[0].length })
  }
  for (let i = 0; i < sections.length; i++) {
    sections[i].bodyEnd = i + 1 < sections.length ? sections[i + 1].idIndex : content.length
  }
  return sections
}

function findSectionsXueshici(content) {
  return [] // 不使用，由 applyReplaceXueshici 替代
}

function extractFieldFromBlock(block, key) {
  // 找 key: <quote>...<quote>，容忍任意空白
  const re = new RegExp('(?:^|[\\s,])' + key + ':\\s*(.)', 'g')
  let m
  while ((m = re.exec(block)) !== null) {
    const quote = m[1]
    const start = m.index + m[0].length
    let i = start, escape = false
    for (; i < block.length; i++) {
      const ch = block[i]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === quote) break
    }
    return { value: block.slice(start, i), quote, valueStart: start, valueEnd: i }
  }
  return null
}

function applyReplaceXueguoxue(content, items) {
  // 先找所有 sections
  const sections = findSectionsXueguoxue(content)
  const sectionMap = new Map()
  for (const s of sections) sectionMap.set(s.id, s)

  // 先收集所有替换点（位置 + 新值），再从后往前排序替换
  const ops = []
  for (const item of items) {
    const sec = sectionMap.get(item.id)
    if (!sec) { continue }
    const block = content.slice(sec.bodyStart, sec.bodyEnd)
    const fieldInfo = extractFieldFromBlock(block, item.fieldType)
    if (!fieldInfo) { continue }
    if (fieldInfo.quote !== "'") { continue }
    const absStart = sec.bodyStart + fieldInfo.valueStart
    const absEnd = sec.bodyStart + fieldInfo.valueEnd
    const newValue = item.newText.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    ops.push({ absStart, absEnd, newValue, key: item.key })
  }

  // 从后往前替换（保持前面的位置不变）
  ops.sort((a, b) => b.absStart - a.absStart)
  let modified = content
  let applied = 0, failed = 0
  const failedIds = []
  for (const op of ops) {
    modified = modified.slice(0, op.absStart) + op.newValue + modified.slice(op.absEnd)
    applied++
  }
  // 检查未匹配的
  for (const item of items) {
    if (!ops.find(o => o.key === item.key)) failedIds.push(item.key)
  }
  failed = failedIds.length

  return { text: modified, applied, failed, failedIds }
}

function applyReplaceXueshici(content, items) {
  // 先找所有 poem 边界
  const poemRe = /\{\s*id:\s*(\d+),\s*title:\s*['"`]([^'"`]+)['"`],\s*author:/g
  const poemStarts = []
  let m
  while ((m = poemRe.exec(content)) !== null) {
    poemStarts.push({ id: m[1], title: m[2], index: m.index })
  }
  for (let i = 0; i < poemStarts.length; i++) {
    poemStarts[i].end = i + 1 < poemStarts.length ? poemStarts[i + 1].index : content.length
  }

  // 收集所有 ops
  const ops = []
  for (const item of items) {
    const dashIdx = item.id.lastIndexOf('-')
    const poemId = item.id.slice(0, dashIdx)
    const secId = item.id.slice(dashIdx + 1)
    const poem = poemStarts.find(p => p.id === poemId)
    if (!poem) continue
    const block = content.slice(poem.index, poem.end)
    const arrM = block.match(/sections:\s*\[/)
    if (!arrM) continue
    const arrStart = arrM.index + arrM[0].length
    const fieldInfo = extractFieldFromBlock(block.slice(arrStart), item.fieldType)
    if (!fieldInfo) continue
    const absStart = poem.index + arrStart + fieldInfo.valueStart
    const absEnd = poem.index + arrStart + fieldInfo.valueEnd
    const newValue = item.newText.replace(/\\/g, '\\\\').replace(new RegExp(fieldInfo.quote, 'g'), '\\' + fieldInfo.quote)
    ops.push({ absStart, absEnd, newValue, key: item.key })
  }

  // 从后往前替换
  ops.sort((a, b) => b.absStart - a.absStart)
  let modified = content
  for (const op of ops) {
    modified = modified.slice(0, op.absStart) + op.newValue + modified.slice(op.absEnd)
  }
  const applied = ops.length
  const failedIds = []
  for (const item of items) {
    if (!ops.find(o => o.key === item.key)) failedIds.push(item.key)
  }

  return { text: modified, applied, failed: failedIds.length, failedIds }
}

// ===== 主流程 =====
let totalApplied = 0
for (const [src, list] of Object.entries(bySource)) {
  if (list.length === 0) continue
  console.log(`\n=== ${src} ===`)
  if (!existsSync(FILES[src])) { console.log(`  ⚠️  文件不存在`); continue }

  const content = readFileSync(FILES[src], 'utf-8')
  const result = src === 'xueguoxue'
    ? applyReplaceXueguoxue(content, list)
    : applyReplaceXueshici(content, list)

  console.log(`  计划替换 ${result.applied} | 失败 ${result.failed}`)
  if (result.failed > 0) console.log(`    失败样本: ${result.failedIds.slice(0, 10).join(', ')}`)
  totalApplied += result.applied

  if (isDryRun || result.applied === 0) continue
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFile = `${FILES[src]}.bak.${ts}`
  copyFileSync(FILES[src], backupFile)
  console.log(`    💾 备份: ${backupFile}`)
  writeFileSync(FILES[src], result.text, 'utf-8')
  console.log(`    ✅ 已写入: ${FILES[src]}`)
}

console.log(`\n📊 总计: ${totalApplied} 条已应用`)