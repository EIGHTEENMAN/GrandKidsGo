/**
 * 提取所有 topic+section → JSON 配置
 *
 * 输入：apps/xuetongshi/src/data/knowledge.ts
 * 输出：scripts/generate-xuetongshi-images/all-topics.json
 *
 * 运行：node extract-topics.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TS_FILE = resolve(__dirname, '../../apps/xuetongshi/src/data/knowledge.ts')

const content = readFileSync(TS_FILE, 'utf-8')

// 简单解析：按 { ... } 切分每个 topic 块
const topics = []
const topicRegex = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*category:\s*'([^']+)',([\s\S]*?)\n\s*\}/g

let match
while ((match = topicRegex.exec(content)) !== null) {
  const [, id, title, category, rest] = match

  // 找 sections
  const sectionRegex = /id:\s*'([a-z]+[0-9]+)'/g
  const sections = []
  let s
  while ((s = sectionRegex.exec(rest)) !== null) {
    sections.push(s[1])
  }

  // 找 summary
  const summaryMatch = rest.match(/summary:\s*'([^']+)'/)
  const summary = summaryMatch ? summaryMatch[1] : ''

  topics.push({ id, title, category, summary, sections })
}

const out = {
  generatedAt: new Date().toISOString(),
  totalTopics: topics.length,
  totalSections: topics.reduce((s, t) => s + t.sections.length, 0),
  topics,
}

const outPath = resolve(__dirname, 'all-topics.json')
writeFileSync(outPath, JSON.stringify(out, null, 2))

console.log(`✅ 提取完成`)
console.log(`   父 topic: ${out.totalTopics}`)
console.log(`   子 section: ${out.totalSections}`)
console.log(`   合计图片: ${out.totalTopics + out.totalSections}`)
console.log(`   输出: ${outPath}`)
