/**
 * 修复 3 条因 LLM JSON 内嵌未转义双引号导致解析失败的字段
 *
 * 从 status.json 的 failed.error 字段提取 LLM 输出，剥掉 JSON 包装，写入 expand-result.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const statusFile = resolve(__dirname, 'status.json')
const resultFile = resolve(__dirname, 'expand-result.json')

const s = JSON.parse(readFileSync(statusFile, 'utf-8'))
const r = JSON.parse(readFileSync(resultFile, 'utf-8'))

const failed = Object.entries(s.tasks).filter(([k, v]) => v.status === 'failed')
console.log(`Found ${failed.length} failed`)

let fixed = 0
for (const [key, info] of failed) {
  const errText = info.error || ''
  // 找 {"translation": "..."} 或 {"interpretation": "..."}
  // 由于 JSON 解析失败，整个 LLM 输出都嵌在 errText 里
  // 用正则提取 "key": "..." 主体
  const fieldType = key.endsWith(':translation') ? 'translation' : 'interpretation'
  // 尝试提取 "fieldType": "....." 的值（容忍内部未转义双引号）
  const re = new RegExp('"' + fieldType + '":\\s*"([\\s\\S]+?)"\\s*}$')
  const m = errText.match(re)
  if (m) {
    // 提取到内容（不含外层 JSON 包装），但内部可能还有不平衡的双引号
    // 进一步：用 LLM 返回的 "key": "value" 形式找内容到末尾
    let content = m[1]
    // 内容可能因为内部双引号截断，看末尾的 "} 是否完整
    // 兜底：如果 m[1] 末尾明显不完整（缺少标点），尝试更宽松的提取
    const fieldEnd = errText.indexOf('"' + fieldType + '":')
    if (fieldEnd < 0) continue
    // 从 "key": 之后开始找第一个 "，作为起始
    const valueStart = errText.indexOf('"', fieldEnd + fieldType.length + 4) + 1
    // 找末尾的 "}
    let valueEnd = errText.lastIndexOf('"}')
    if (valueEnd < valueStart) valueEnd = errText.length - 1
    const fullContent = errText.slice(valueStart, valueEnd)
    // 校验长度
    if (fullContent.length < 110) {
      console.log(`⚠️  ${key} 提取后太短 (${fullContent.length}字): ${fullContent.slice(0, 50)}`)
      continue
    }
    if (!/[。，！？；：]/.test(fullContent)) {
      console.log(`⚠️  ${key} 无标点: ${fullContent.slice(0, 50)}`)
      continue
    }
    r[key] = { [fieldType]: fullContent }
    s.tasks[key] = { status: 'done', manuallyFixed: true, newLen: fullContent.length }
    fixed++
    console.log(`✓ ${key} → ${fullContent.length}字`)
  } else {
    console.log(`⚠️  ${key} 无法提取`)
  }
}

writeFileSync(resultFile, JSON.stringify(r, null, 2))
writeFileSync(statusFile, JSON.stringify(s, null, 2))
console.log(`\n修复 ${fixed}/${failed.length} 条`)
console.log(`最终 done: ${Object.values(s.tasks).filter(t => t.status === 'done').length}`)
console.log(`最终 failed: ${Object.values(s.tasks).filter(t => t.status === 'failed').length}`)