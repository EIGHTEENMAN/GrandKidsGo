/**
 * 把 expand-result.json 中的扩写 translation 应用到 poems.ts
 *
 * 两种 section 格式：
 * - 旧 (id 1-1004): original 用双引号
 * - 新 (id 1009+): original 用反引号
 * translation 全部用反引号
 *
 * 用法：node apply.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')

const CONFIG = {
  poemsFile: resolve(__dirname, '../../apps/xueshici/src/data/poems.ts'),
  resultFile: resolve(__dirname, 'expand-result.json'),
}

const text = readFileSync(CONFIG.poemsFile, 'utf8')
const results = JSON.parse(readFileSync(CONFIG.resultFile, 'utf8'))

console.log(`📦 已加载 ${Object.keys(results).length} 个扩写结果`)

let modified = text
let applied = 0
let skipped = 0
const failedIds = []

for (const [uid, result] of Object.entries(results)) {
  // uid 格式: poemId-sectionId
  const [poemId, sectionId] = uid.split('-')

  // 1. 找到该 poem 起始位置（id: N,）
  const poemStartRe = new RegExp(`(?:^|\\n)\\s*id:\\s*${poemId},`)
  const poemStartMatch = modified.match(poemStartRe)
  if (!poemStartMatch) {
    failedIds.push(uid)
    skipped++
    continue
  }
  const poemStartIdx = modified.indexOf(poemStartMatch[0], modified.lastIndexOf('id: ' + (parseInt(poemId) - 1) + ','))

  // 2. 找下一个 poem 起始位置作为边界
  const nextPoemRe = new RegExp(`(?:^|\\n)\\s*id:\\s*${parseInt(poemId) + 1},`)
  const nextMatch = modified.slice(poemStartIdx + 1).match(nextPoemRe)
  const poemEndIdx = nextMatch ? poemStartIdx + 1 + modified.slice(poemStartIdx + 1).indexOf(nextMatch[0]) : modified.length

  // 3. 在该 poem 范围内找对应 section
  // 匹配 sections: [ { id: sectionId, ... original: ..., translation: `...`
  const poemRange = modified.slice(poemStartIdx, poemEndIdx)

  // 双/反引号 original 都支持
  const secRe = new RegExp(
    `(\\{\\s*id:\\s*${sectionId},\\s*title:\\s*"[^"]*",\\s*original:\\s*["\\\`])((?:[^"\\\\\\\`]|\\\\.)*)(["\\\`]),\\s*translation:\\s*\\\`((?:[^\\\\\\\`]|\\\\.)*)\\\``
  )
  const secMatch = poemRange.match(secRe)
  if (!secMatch) {
    failedIds.push(uid)
    skipped++
    continue
  }

  const newTranslation = result.translation
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\n/g, '\\n')

  // 在 poemRange 内替换
  const newPoemRange = poemRange.replace(
    secRe,
    (match, prefix, orig, origQuote, _oldTrans) => `${prefix}${orig}${origQuote}, translation: \`${newTranslation}\``
  )

  modified = modified.slice(0, poemStartIdx) + newPoemRange + modified.slice(poemEndIdx)
  applied++
}

console.log(`✅ 计划应用 ${applied} 节扩写`)
console.log(`⚠️  未匹配：${skipped}`)
if (failedIds.length > 0) {
  console.log(`\n未匹配的 section IDs（前 10）：`)
  failedIds.slice(0, 10).forEach(id => console.log(`  - ${id}`))
}

if (applied === 0) {
  console.log('\n❌ 无可应用修改，退出')
  process.exit(1)
}

if (isDryRun) {
  console.log(`\n🔍 DRY RUN：不写入文件`)
  process.exit(0)
}

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backupFile = `${CONFIG.poemsFile}.bak.${ts}`
copyFileSync(CONFIG.poemsFile, backupFile)
console.log(`\n💾 备份：${backupFile}`)

writeFileSync(CONFIG.poemsFile, modified, 'utf8')
console.log(`✅ 已写入：${CONFIG.poemsFile}`)
console.log(`\n📝 下一步：`)
console.log(`   1. 抽查 poems.ts 中 5-10 节，确认扩写质量`)
console.log(`   2. cd apps/xueshici && npm run build`)
console.log(`   3. git add + commit + push`)
console.log(`   4. rsync 到服务器 /haodaer/nginx/html/xueshici/`)
