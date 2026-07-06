#!/usr/bin/env node
// Build poem chunks from poems.ts for lazy loading
// Each chunk contains 100 poems with full sections data (NOT just meta).
// Output:
//   src/data/poem-chunks/chunk-N.ts          (N = 0..CHUNK_COUNT-1)
//   src/data/poem-chunks/index.ts            (CHUNK_SIZE / CHUNK_COUNT / getChunkIndexForPoemId)

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src', 'data', 'poems.ts')
const OUT_DIR = path.join(ROOT, 'src', 'data', 'poem-chunks')

const CHUNK_SIZE = 100
const DRY_RUN = process.argv.includes('--dry-run')

function isWS(c) { return c === ' ' || c === '\n' || c === '\t' || c === '\r' }

function parsePoems(src) {
  const marker = 'const poemData: Poem[] = ['
  const markerIdx = src.indexOf(marker)
  if (markerIdx < 0) throw new Error('cannot find poemData array marker')

  const arrayStart = src.indexOf('[', markerIdx + marker.length - 1)
  let depth = 0
  let inTemplate = false
  let inSingleString = false
  let inDoubleString = false
  let inBlockComment = false
  let inLineComment = false
  const items = []
  let i = arrayStart

  while (i < src.length) {
    const c = src[i]

    if (!inTemplate && !inSingleString && !inDoubleString) {
      if (!inBlockComment && !inLineComment && c === '/' && i + 1 < src.length) {
        if (src[i+1] === '/') { inLineComment = true; i++; continue }
        if (src[i+1] === '*') { inBlockComment = true; i++; continue }
      }
      if (inLineComment && c === '\n') { inLineComment = false; i++; continue }
      if (inBlockComment && c === '*' && i + 1 < src.length && src[i+1] === '/') { inBlockComment = false; i += 2; continue }
      if (inLineComment || inBlockComment) { i++; continue }
    }

    if (!inTemplate && !inSingleString && !inDoubleString && !inBlockComment && !inLineComment) {
      if (c === "'" && (i === 0 || src[i-1] !== '\\')) { inSingleString = true; i++; continue }
      if (c === '"' && (i === 0 || src[i-1] !== '\\')) { inDoubleString = true; i++; continue }
      if (c === '`' && (i === 0 || src[i-1] !== '\\')) { inTemplate = true; i++; continue }
    } else if (inSingleString) {
      if (c === '\\') { i += 2; continue }
      if (c === "'") { inSingleString = false; i++; continue }
      i++; continue
    } else if (inDoubleString) {
      if (c === '\\') { i += 2; continue }
      if (c === '"') { inDoubleString = false; i++; continue }
      i++; continue
    } else if (inTemplate) {
      if (c === '\\') { i += 2; continue }
      if (c === '`') { inTemplate = false; i++; continue }
      i++; continue
    }

    // depth==1: 进入一个 poem 对象，提取完整 objStr
    if (depth === 1 && c === '{') {
      let bd = 1
      let j = i + 1
      while (j < src.length && bd > 0) {
        const ch = src[j]
        if (ch === '`' || ch === "'" || ch === '"') {
          const q = ch
          j++
          while (j < src.length) {
            if (src[j] === '\\') { j += 2; continue }
            if (src[j] === q) break
            j++
          }
        }
        if (src[j] === '{') bd++
        else if (src[j] === '}') bd--
        j++
      }
      const objStr = src.substring(i, j)
      items.push(objStr.trim())
      i = j
      // 注意：depth 仍是 1（数组深度），不需要改
      continue
    }

    if (c === '[') { depth++; i++; continue }
    if (c === ']') {
      depth--
      if (depth === 0) break
      i++; continue
    }
    i++
  }

  return items
}

// 把一首诗的 sections 数组的原始字符串提取出来（保留反引号）
function extractSectionsArr(objStr) {
  const m = objStr.match(/sections:\s*\[/)
  if (!m) return '[]'
  let i = m.index + m[0].length
  let bd = 1
  let inTemplate = false
  let inSingle = false
  let inDouble = false
  while (i < objStr.length && bd > 0) {
    const c = objStr[i]
    if (inTemplate) {
      if (c === '\\') { i += 2; continue }
      if (c === '`') inTemplate = false
      i++; continue
    }
    if (inSingle) {
      if (c === '\\') { i += 2; continue }
      if (c === "'") inSingle = false
      i++; continue
    }
    if (inDouble) {
      if (c === '\\') { i += 2; continue }
      if (c === '"') inDouble = false
      i++; continue
    }
    if (c === '`') { inTemplate = true; i++; continue }
    if (c === "'") { inSingle = true; i++; continue }
    if (c === '"') { inDouble = true; i++; continue }
    if (c === '[') bd++
    else if (c === ']') { bd--; if (bd === 0) break }
    i++
  }
  // 含外层 [ 和 ]
  return objStr.substring(m.index + m[0].length - 1, i + 1)
}

// 提取诗的 id（用于排序和命名）
function extractId(objStr) {
  const m = objStr.match(/\bid:\s*(\d+)/)
  return m ? Number(m[1]) : null
}

function main() {
  const src = fs.readFileSync(SRC, 'utf-8')
  const items = parsePoems(src)
  console.log(`Parsed ${items.length} poems from poems.ts`)

  // 按 id 排序
  items.sort((a, b) => extractId(a) - extractId(b))

  // sanity check：id 集合完整
  const idSet = new Set()
  for (const it of items) {
    const id = extractId(it)
    if (id == null) throw new Error('poem missing id')
    if (idSet.has(id)) throw new Error(`duplicate id: ${id}`)
    idSet.add(id)
  }

  const chunkCount = Math.ceil(items.length / CHUNK_SIZE)
  console.log(`Will generate ${chunkCount} chunks (chunk size ${CHUNK_SIZE})`)

  if (DRY_RUN) {
    console.log('DRY-RUN: not writing files')
    return
  }

  // 创建输出目录
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // 清空旧的 chunk-*.ts（防止 chunk 数减少时残留）
  const oldChunks = fs.readdirSync(OUT_DIR).filter(f => /^chunk-\d+\.ts$/.test(f))
  for (const f of oldChunks) fs.unlinkSync(path.join(OUT_DIR, f))

  // 写入每个 chunk
  for (let ci = 0; ci < chunkCount; ci++) {
    const slice = items.slice(ci * CHUNK_SIZE, (ci + 1) * CHUNK_SIZE)
    const lines = []
    lines.push('// AUTO-GENERATED by scripts/build-poem-chunks.cjs')
    lines.push(`// Source: poems.ts, slice ids ${extractId(slice[0])}-${extractId(slice[slice.length-1])}`)
    lines.push(`// Poems count: ${slice.length}`)
    lines.push('')
    lines.push("import type { Poem } from '../poems'")
    lines.push('')
    lines.push(`export const chunk${ci}: Poem[] = [`)
    for (const objStr of slice) {
      const id = extractId(objStr)
      // 1. 提取 sections 数组（含反引号的原始字符串）
      const sectionsArr = extractSectionsArr(objStr)
      // 2. 提取 sections 之前的所有字段（id..color）
      //    去掉首尾的 {} 和 sections: [...]
      let inner = objStr
      // 去外层花括号
      if (inner.startsWith('{')) inner = inner.substring(1)
      if (inner.endsWith('}')) inner = inner.substring(0, inner.length - 1)
      // 去掉 sections: [...] 字段
      const secIdx = inner.search(/\bsections\s*:/)
      if (secIdx >= 0) inner = inner.substring(0, secIdx)
      // 移除 id 字段（重写时放在最前）
      inner = inner.replace(/\bid\s*:\s*\d+\s*,?/, '')
      inner = inner.trim().replace(/^,|,$/g, '').trim()
      // 3. 组装：{ id: N, <inner>, sections: <sectionsArr> }
      const innerClean = inner.endsWith(',') ? inner : (inner + ',')
      // sectionsArr 本身以 `[` 开头，多带一个空格会变成 `[ {`
      lines.push(`  { id: ${id}, ${innerClean}`)
      lines.push(`    sections:${sectionsArr} },`)
    }
    lines.push(']')
    lines.push('')

    const outPath = path.join(OUT_DIR, `chunk-${ci}.ts`)
    fs.writeFileSync(outPath, lines.join('\n'), 'utf-8')
    console.log(`✓ chunk-${ci}.ts (${slice.length} poems, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
  }

  // 写入 index.ts
  const indexOut = `// AUTO-GENERATED by scripts/build-poem-chunks.cjs

export const CHUNK_SIZE = ${CHUNK_SIZE}
export const CHUNK_COUNT = ${chunkCount}

/** 根据诗 id 算出所属 chunk 索引 */
export function getChunkIndexForPoemId(id: number): number {
  if (id < 1) return 0
  return Math.min(CHUNK_COUNT - 1, Math.floor((id - 1) / CHUNK_SIZE))
}
`
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexOut, 'utf-8')
  console.log(`✓ index.ts`)

  console.log(`\n✅ Generated ${chunkCount} chunks, total ${items.length} poems`)
}

main()