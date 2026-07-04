#!/usr/bin/env node
// 修复 translated_batch_*.json 的格式问题：
// 1. 尾部逗号 (trailing commas)
// 2. 字符串内未转义的 ASCII 双引号（替换为中文引号「」）
// 3. 输出到同目录 .fixed.json

import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(import.meta.dirname, 'data')

function fixContent(content) {
  // 1. 先处理字符串内的裸引号：
  //    在 JSON 字符串值内，如果遇到未转义的 "，替换为「」
  //    策略：逐字符扫描，跟踪在哪个字符串内
  let result = ''
  let inString = false
  let escape = false
  let i = 0

  while (i < content.length) {
    const ch = content[i]
    const next = content[i + 1] || ''

    if (escape) {
      result += ch
      escape = false
      i++
      continue
    }

    if (ch === '\\') {
      result += ch
      escape = true
      i++
      continue
    }

    if (ch === '"') {
      // 是裸引号开关
      if (!inString) {
        inString = true
        result += ch
      } else {
        // 在字符串内：检查是否真的是结束引号
        // 规则：后面跟着 ,  ]  }  :  \n  或空格后跟这些
        const after = content.substring(i + 1, i + 10)
        const stripped = after.trimStart()
        if (
          stripped.startsWith(',') ||
          stripped.startsWith(']') ||
          stripped.startsWith('}') ||
          stripped.startsWith(':') ||
          stripped.startsWith('\n') ||
          stripped.startsWith('\r')
        ) {
          // 这是合法的字符串结束
          inString = false
          result += '"'
        } else {
          // 字符串内的裸引号 → 替换为中文引号
          result += '「'
        }
      }
      i++
      continue
    }

    if (ch === '\n' && inString) {
      // 字符串内有换行 → 说明前面有未闭合的引号问题
      // 这种情况先闭合字符串（末尾加 "），再继续
      result += '"\n'
      inString = false
      i++
      continue
    }

    result += ch
    i++
  }

  // 2. 移除尾部逗号（,[空格/换行] → ] 或 } 前）
  result = result.replace(/,\s*([}\]])/g, '$1')

  return result
}

function main() {
  console.log('=== 修复 translated_batch JSON ===\n')

  for (let i = 1; i <= 9; i++) {
    const inFile = path.join(DATA_DIR, `translated_batch_${i}.json`)
    const outFile = path.join(DATA_DIR, `translated_batch_${i}.fixed.json`)

    if (!fs.existsSync(inFile)) {
      console.log(`  ✗ batch_${i}: 文件不存在`)
      continue
    }

    const content = fs.readFileSync(inFile, 'utf-8')
    const fixed = fixContent(content)

    // 验证是否合法 JSON
    try {
      const parsed = JSON.parse(fixed)
      fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2), 'utf-8')
      console.log(`  ✓ batch_${i}: ${parsed.length} 首 → ${outFile}`)
    } catch (e) {
      // 输出上下文帮助调试
      const match = e.message.match(/position (\d+)/)
      const pos = match ? parseInt(match[1]) : -1
      const start = Math.max(0, pos - 80)
      const end = Math.min(fixed.length, pos + 80)
      console.log(`  ✗ batch_${i}: JSON 仍无效: ${e.message}`)
      console.log(`    上下文: ...${fixed.substring(start, end)}...`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
