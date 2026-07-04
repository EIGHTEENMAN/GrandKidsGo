/**
 * 合并译文/赏析到 poems.ts
 *
 * 用法：
 *   node merge.mjs
 *
 * 输入：
 *   - rewrite-result.json  (LLM 生成的新译文/赏析)
 *   - apps/xueshici/src/data/poems.ts
 * 输出：
 *   - apps/xueshici/src/data/poems.ts (更新 translation/interpretation)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const POEMS_FILE = resolve(__dirname, '../../apps/xueshici/src/data/poems.ts')
const RESULT_FILE = resolve(__dirname, 'rewrite-result.json')

if (!existsSync(RESULT_FILE)) {
  console.error('❌ 未找到 rewrite-result.json')
  process.exit(1)
}

const results = JSON.parse(readFileSync(RESULT_FILE, 'utf-8'))
console.log(`📚 加载了 ${Object.keys(results).length} 条译文/赏析`)

let content = readFileSync(POEMS_FILE, 'utf-8')

let replaced = 0
let missing = 0

for (const [idStr, data] of Object.entries(results)) {
  if (!data.translation || !data.interpretation) continue
  const id = parseInt(idStr)

  // 把内容里的 ASCII " 替换为中文「"」避免破坏模板字符串边界
  data.translation = data.translation.replace(/"/g, '"')
  data.interpretation = data.interpretation.replace(/"/g, '"')

  // 找到这首诗的 sections 块，替换第一个 section 的 translation/interpretation
  // 诗的格式：{ id: 1, ... sections: [ { id: 1, title: ..., original: ..., translation: ..., interpretation: ... } ] }
  // 用正则匹配此 ID 的诗，并替换其 translation/interpretation

  // 转义内容中的反引号和 ${ } 以避免模板字符串冲突
  const transEsc = data.translation.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')
  const interpEsc = data.interpretation.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')

  // 模式：定位 id: <id>, ... sections: [ { id: 1, ... translation: "..." 或 `...`, interpretation: "..." 或 `...`
  // 因为原文用的模板字符串带反引号包裹（多行），用这个正则：
  const idPattern = new RegExp(
    `(id:\\s*${id},[\\s\\S]*?sections:\\s*\\[\\s*\\{[\\s\\S]*?original:\\s*\`[\\s\\S]*?\`,\\s*)translation:\\s*\`[\\s\\S]*?\`(\\s*,\\s*)interpretation:\\s*\`[\\s\\S]*?\``,
    'g'
  )

  // 上面的正则可能因字段跨度大而匹配出错，用更简单的策略：
  // 1. 找到这首诗的 sections 块起点（"sections: ["）
  // 2. 在该块内找第一个 translation/interpretation 替换

  const poemStart = content.indexOf(`id: ${id},`)
  if (poemStart < 0) {
    missing++
    continue
  }
  const sectionsStart = content.indexOf('sections: [', poemStart)
  if (sectionsStart < 0) {
    missing++
    continue
  }
  // 找到第一个 section 结束（], 之前最近的 ））
  // sections 块内第一个 section 跨越 original/translation/interpretation
  const sectionEnd = content.indexOf(']', sectionsStart + 11)  // 跳过 "sections: ["
  if (sectionEnd < 0) {
    missing++
    continue
  }

  // 在 [sectionsStart, sectionEnd] 区间内替换
  const block = content.slice(sectionsStart, sectionEnd + 1)

  // 替换 translation 和 interpretation（统一改成模板字符串，转义内容中的反引号和 ${}）
  // 关键：内容里的 ASCII " 必须替换为中文引号「""」避免破坏模板字符串边界
  const transSafe = transEsc.replace(/"/g, '"')
  const interpSafe = interpEsc.replace(/"/g, '"')
  const newBlock = block
    .replace(/(translation:\s*)`[\s\S]*?`/, `$1\`${transSafe}\``)
    .replace(/(interpretation:\s*)`[\s\S]*?`/, `$1\`${interpSafe}\``)
    .replace(/(translation:\s*)"[\s\S]*?"/, `$1\`${transSafe}\``)
    .replace(/(interpretation:\s*)"[\s\S]*?"/, `$1\`${interpSafe}\``)

  if (newBlock !== block) {
    content = content.slice(0, sectionsStart) + newBlock + content.slice(sectionEnd + 1)
    replaced++
  } else {
    missing++
  }
}

writeFileSync(POEMS_FILE, content)
console.log(`✅ 替换了 ${replaced} 首诗的译文/赏析`)
if (missing > 0) console.log(`⚠️  ${missing} 首未能匹配（已跳过）`)
