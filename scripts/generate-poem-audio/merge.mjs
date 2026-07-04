/**
 * 合并讲解词到译文
 *
 * 把 commentary-status.json 里所有已生成的讲解词合并到 poems-data.json 的 translation 字段。
 * 格式：{原译文}\n\n{讲解词}
 *
 * 用法：
 *   node merge.mjs           # 合并所有已完成的讲解词
 *   node merge.mjs --dry-run # 只看哪些会被合并，不写文件
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

const isDryRun = process.argv.includes('--dry-run')
const POEMS_FILE = resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json')
const STATUS_FILE = resolve(__dirname, 'commentary-status.json')
const BACKUP_FILE = resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.original.json')

if (!existsSync(STATUS_FILE)) {
  log(C.red, '错误', `未找到 ${STATUS_FILE}`)
  process.exit(1)
}
if (!existsSync(POEMS_FILE)) {
  log(C.red, '错误', `未找到 ${POEMS_FILE}`)
  process.exit(1)
}

const status = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'))
const doneMap = status.done || {}
const doneKeys = Object.keys(doneMap)

log(C.blue, '加载', `讲解词已生成 ${doneKeys.length} 段`)

const poems = JSON.parse(readFileSync(POEMS_FILE, 'utf-8'))
log(C.blue, '加载', `诗词数据 ${poems.length} 首`)

// 备份当前文件
if (!isDryRun && !existsSync(BACKUP_FILE)) {
  copyFileSync(POEMS_FILE, BACKUP_FILE)
  log(C.dim, '备份', BACKUP_FILE)
}

let merged = 0, skipped = 0
for (const poem of poems) {
  for (const sec of poem.sections || []) {
    const key = `${poem.id}-${sec.id}`
    const entry = doneMap[key]
    if (!entry || !entry.commentary) {
      skipped++
      continue
    }
    if (isDryRun) {
      if (merged < 3) {
        log(C.dim, '预览', `${key}: ${sec.translation.slice(0, 30)}... + [讲解词]`)
      }
    } else {
      // 合并：原译文 + 双换行 + 讲解词
      // 只在未合并过的情况下合并（避免重复执行叠加）
      if (!sec.translation.includes('\n\n') || !sec.translation.endsWith(entry.commentary)) {
        sec.translation = `${sec.translation}\n\n${entry.commentary}`
      }
    }
    merged++
  }
}

if (!isDryRun) {
  writeFileSync(POEMS_FILE, JSON.stringify(poems, null, 0))
  log(C.green, '完成', `已合并 ${merged} 段讲解词到 ${POEMS_FILE}`)
} else {
  log(C.cyan, 'DRY-RUN', `会合并 ${merged} 段讲解词（跳过 ${skipped} 段）`)
}
