/**
 * 把 expand-result.json 中的扩写 translation 应用到 classics.ts
 *
 * 用法：node apply.mjs [--dry-run]
 *
 * 安全：只替换 translation 字段，id/original/interpretation/标题/作者都保持不变
 * 备份：自动生成 classics.ts.bak.<timestamp> 备份
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')

const CONFIG = {
  classicsFile: resolve(__dirname, '../../apps/xueguoxue/src/data/classics.ts'),
  resultFile: resolve(__dirname, 'expand-result.json'),
  statusFile: resolve(__dirname, 'status.json'),
}

const text = readFileSync(CONFIG.classicsFile, 'utf8')
const results = JSON.parse(readFileSync(CONFIG.resultFile, 'utf8'))
const status = JSON.parse(readFileSync(CONFIG.statusFile, 'utf8'))

console.log(`📦 已加载 ${Object.keys(results).length} 个扩写结果`)
console.log(`📊 状态统计：${status.stats?.success || 0} 成功 / ${status.stats?.failed || 0} 失败`)

let modified = text
let applied = 0
let skipped = 0
const failedIds = []

for (const [sectionId, result] of Object.entries(results)) {
  // 在原文中找到这个 section 的 translation 字段
  // 格式: id: 'xxx', title: '...', original: '...', translation: 'OLD', interpretation: '...'
  // 用 regex 匹配 (id + translation: 'OLD')，然后替换 translation 部分

  const idRe = new RegExp(
    `(id:\\s*'${sectionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*` +
    `title:\\s*'[^']*',\\s*` +
    `original:\\s*'(?:[^'\\\\]|\\\\.)*',\\s*` +
    `translation:\\s*)'((?:[^'\\\\]|\\\\.)*)'`
  )

  const match = modified.match(idRe)
  if (!match) {
    failedIds.push(sectionId)
    skipped++
    continue
  }

  const newTranslation = result.translation.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
  modified = modified.replace(idRe, `$1'${newTranslation}'`)
  applied++
}

console.log(`✅ 计划应用 ${applied} 节扩写`)
console.log(`⚠️  未匹配（id 不存在或格式问题）：${skipped}`)
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

// 备份
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backupFile = `${CONFIG.classicsFile}.bak.${ts}`
copyFileSync(CONFIG.classicsFile, backupFile)
console.log(`\n💾 备份：${backupFile}`)

// 写入
writeFileSync(CONFIG.classicsFile, modified, 'utf8')
console.log(`✅ 已写入：${CONFIG.classicsFile}`)
console.log(`\n📝 下一步：`)
console.log(`   1. 抽查 classics.ts 中 5-10 节，确认扩写质量`)
console.log(`   2. cd apps/xueguoxue && npm run build`)
console.log(`   3. git add + commit + push`)
console.log(`   4. rsync 到服务器`)
