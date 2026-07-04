/**
 * 从 knowledge.ts 提取所有 topic + section 的 id/title/content
 * 用 brace-matching 状态机（避免正则贪婪/嵌套问题）
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(__dirname, '../../apps/xuetongshi/src/data/knowledge.ts')
const OUTPUT = resolve(__dirname, 'all-sections.json')

const content = readFileSync(SOURCE, 'utf-8')

/**
 * 提取从 { 开始到匹配的 } 结束的字符串（处理 '...' 字符串和嵌套 {}）
 */
function extractBlock(s, startIdx) {
  if (s[startIdx] !== '{') return null
  let i = startIdx + 1
  let depth = 1
  let inStr = false
  while (i < s.length) {
    const c = s[i]
    if (inStr) {
      if (c === '\\') { i += 2; continue }
      if (c === "'") inStr = false
      i++
    } else {
      if (c === "'") inStr = true
      else if (c === '{') depth++
      else if (c === '}') { depth--; if (depth === 0) return s.slice(startIdx, i + 1) }
      i++
    }
  }
  return null
}

/**
 * 提取 'key': 'value' 字段
 */
function extractField(block, key) {
  // 匹配 key: '...'
  const re = new RegExp(`\\b${key}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 's')
  const m = block.match(re)
  return m ? m[1].replace(/\\'/g, "'").replace(/\\n/g, ' ') : null
}

/**
 * 提取 sections: [ ... ] 数组的内容
 */
function extractSectionsArray(block) {
  // 找 'sections:' 后面的 [ ... ]
  const idx = block.indexOf('sections:')
  if (idx < 0) return null
  // 找 [
  let i = block.indexOf('[', idx)
  if (i < 0) return null
  // 从 [ 开始提取配对 ]（含嵌套）
  let depth = 1
  let j = i + 1
  let inStr = false
  while (j < block.length) {
    const c = block[j]
    if (inStr) {
      if (c === '\\') { j += 2; continue }
      if (c === "'") inStr = false
      j++
    } else {
      if (c === "'") inStr = true
      else if (c === '[') depth++
      else if (c === ']') { depth--; if (depth === 0) return block.slice(i + 1, j) }
      j++
    }
  }
  return null
}

// 找 knowledgeData 数组
const arrMatch = content.match(/knowledgeData\s*:\s*Topic\[\]\s*=\s*\[/)
if (!arrMatch) {
  console.error('未找到 knowledgeData 数组')
  process.exit(1)
}
const arrStart = arrMatch.index + arrMatch[0].length  // [ 之后的位置

// 遍历数组里的所有 { ... } 块
const topics = []
let i = arrStart
while (i < content.length) {
  // 跳过空白
  while (i < content.length && /\s/.test(content[i])) i++
  if (i >= content.length) break
  if (content[i] === ']') break
  if (content[i] !== '{') { i++; continue }
  const block = extractBlock(content, i)
  if (!block) break
  i += block.length

  const id = extractField(block, 'id')
  if (!id) continue

  // sections
  const secBlock = extractSectionsArray(block)
  const sections = []
  if (secBlock) {
    let j = 0
    while (j < secBlock.length) {
      while (j < secBlock.length && /\s/.test(secBlock[j])) j++
      if (j >= secBlock.length) break
      if (secBlock[j] === ',') { j++; continue }
      if (secBlock[j] !== '{') { j++; continue }
      const secObjStr = extractBlock(secBlock, j)
      if (!secObjStr) break
      j += secObjStr.length
      const sId = extractField(secObjStr, 'id')
      const sTitle = extractField(secObjStr, 'title')
      const sContent = extractField(secObjStr, 'content')
      if (sId && sTitle) {
        sections.push({
          id: sId,
          title: sTitle,
          content: sContent ? sContent.slice(0, 120) : '',
        })
      }
    }
  }

  topics.push({
    id,
    title: extractField(block, 'title') || id,
    category: extractField(block, 'category') || '',
    summary: extractField(block, 'summary') || '',
    sections,
  })
}

const totalSections = topics.reduce((sum, t) => sum + t.sections.length, 0)
console.log(`解析出 ${topics.length} 个 topic，${totalSections} 个 section`)
writeFileSync(OUTPUT, JSON.stringify({ topics, totalSections }, null, 2), 'utf-8')
console.log(`已写入 ${OUTPUT}`)

// 验证一下
const hb = topics.find(t => t.id === 'human-body')
if (hb) {
  console.log(`\n验证 human-body: ${hb.sections.length} 个 section`)
  hb.sections.forEach(s => console.log(`  - ${s.id}: ${s.title}`))
}
const growth = topics.find(t => t.id === 'growth-body')
if (growth) {
  console.log(`\n验证 growth-body: ${growth.sections.length} 个 section`)
  growth.sections.forEach(s => console.log(`  - ${s.id}: ${s.title}`))
}
