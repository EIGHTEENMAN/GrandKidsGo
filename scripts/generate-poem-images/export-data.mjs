/**
 * 诗词数据提取器 — 使用 tsx/register 动态导入 TS
 *
 * 用法：npx tsx export-data.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 直接动态导入（tsx 会处理 .ts）
const poemsPath = resolve(__dirname, '../../apps/xueshici/src/data/poems.ts')

let poems
try {
  const mod = await import(/* @vite-ignore */ poemsPath)
  poems = mod.poemsData || mod.default
  if (!poems) throw new Error('导出对象中没有 poemsData')
} catch (err) {
  // 备用方案：用 createRequire 动态加载
  console.error('直接 import 失败:', err.message)
  console.error('尝试备用方案...')
  process.exit(1)
}

console.log(`✅ 成功加载 ${poems.length} 首诗词`)

// 每首诗只保留必要字段
const simplified = poems.map(p => ({
  id: p.id,
  title: p.title,
  author: p.author,
  dynasty: p.dynasty,
  tags: p.tags,
  sections: p.sections.map(s => ({
    id: s.id,
    title: s.title,
    original: s.original,
    translation: s.translation,
    interpretation: s.interpretation,
  }))
}))

// 写入 JSON
const outputDir = resolve(__dirname, '../../apps/xueshici/public/images/poems')
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })
const jsonPath = resolve(outputDir, 'poems-data.json')
writeFileSync(jsonPath, JSON.stringify(simplified, null, 2))
console.log(`📝 已写入: ${jsonPath}`)
console.log(`📊 共 ${simplified.length} 首诗词`)
