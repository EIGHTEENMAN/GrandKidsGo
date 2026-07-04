#!/usr/bin/env node
// Extract ClassicMeta from classics.ts for lazy loading
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'classics.ts'), 'utf-8')

// ---- Build classicIndex array ----
const cdMarker = 'export const classicData: Classic[] = ['
const cdIdx = src.indexOf(cdMarker)
if (cdIdx < 0) { console.error('ERROR: cannot find classicData'); process.exit(1) }

const arrayStart = src.indexOf('[', cdIdx + cdMarker.length - 1)
let depth = 0
let inTemplate = false
let inSingleString = false
let inDoubleString = false
let inBlockComment = false
let inLineComment = false
const metaItems = []
let i = arrayStart

while (i < src.length) {
  const c = src[i]

  // Handle comments
  if (!inTemplate && !inSingleString && !inDoubleString) {
    if (!inBlockComment && !inLineComment && c === '/' && i + 1 < src.length) {
      if (src[i+1] === '/') { inLineComment = true; i++; continue }
      if (src[i+1] === '*') { inBlockComment = true; i++; continue }
    }
    if (inLineComment && c === '\n') { inLineComment = false; i++; continue }
    if (inBlockComment && c === '*' && i + 1 < src.length && src[i+1] === '/') { inBlockComment = false; i += 2; continue }
    if (inLineComment || inBlockComment) { i++; continue }
  }

  // Handle strings
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

  // EXTRACTION: at array depth 1, entering a classic object
  if (depth === 1 && c === '{') {
    let bd = 1
    let j = i + 1
    while (j < src.length && bd > 0) {
      const ch = src[j]
      if (ch === "'") {
        j++
        while (j < src.length) {
          if (src[j] === '\\') { j += 2; continue }
          if (src[j] === "'") break
          j++
        }
      } else if (ch === '"') {
        j++
        while (j < src.length) {
          if (src[j] === '\\') { j += 2; continue }
          if (src[j] === '"') break
          j++
        }
      }
      if (src[j] === '{') bd++
      else if (src[j] === '}') bd--
      j++
    }
    const objStr = src.substring(i, j)

    // Extract fields
    function extractField(name) {
      const re = new RegExp("\\b" + name + ":\\s*")
      const match = objStr.match(re)
      if (!match) return ''
      let valStart = match.index + match[0].length
      const ch = objStr[valStart]
      if (ch === "'" || ch === '"') {
        const quote = ch
        valStart++
        let end = valStart
        while (end < objStr.length) {
          if (objStr[end] === '\\') { end += 2; continue }
          if (objStr[end] === quote) break
          end++
        }
        return objStr.substring(valStart, end)
      }
      // Array value (tags) or other
      if (ch === '[') {
        let arrDepth = 1
        let end = valStart + 1
        while (end < objStr.length && arrDepth > 0) {
          if (objStr[end] === '[') arrDepth++
          else if (objStr[end] === ']') arrDepth--
          end++
        }
        return objStr.substring(valStart, end)
      }
      // Number
      let end = valStart
      while (end < objStr.length && !/[,}\]]/.test(objStr[end]) && !/[\s]/.test(objStr[end])) end++
      return objStr.substring(valStart, end)
    }

    const id = extractField('id')
    const title = extractField('title')
    const author = extractField('author')
    const dynasty = extractField('dynasty')
    const category = extractField('category')
    const summary = extractField('summary')
    const tagsRaw = extractField('tags')
    const color = extractField('color')

    // Parse tags array
    let tags = '[]'
    if (tagsRaw) {
      // Extract strings from array
      const tagMatches = [...tagsRaw.matchAll(/["']([^"']+)["']/g)]
      tags = '["' + tagMatches.map(m => m[1]).join('", "') + '"]'
    }

    // Count sections by finding patterns like {id: 'X-sN'}
    const sectionCount = (objStr.match(/\{\s*id:\s*'[^']+-s\d+'/g) || []).length

    metaItems.push({ id, title, author, dynasty, category, summary, tags, color, sectionCount })
    i = j
    continue
  }

  if (c === '{') { /* braceDepth tracking for non-extraction levels */ i++; continue }
  if (c === '}') { i++; continue }
  if (c === '[') { depth++; i++; continue }
  if (c === ']') {
    depth--
    if (depth === 0) break // end of classicData array
    i++; continue
  }

  i++
}

// Generate output
let out = `// Auto-generated metadata file for lazy loading
// Generated from classics.ts - contains only index data (${metaItems.length} classics)

export interface ClassicMeta {
  id: string
  title: string
  author: string
  dynasty: string
  category: string
  summary: string
  tags: string[]
  color: string
  sectionCount: number
}

export const classicIndex: ClassicMeta[] = [
`

for (const item of metaItems) {
  const escapedSummary = item.summary.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  out += `  { id: '${item.id}', title: '${item.title}', author: '${item.author}', dynasty: '${item.dynasty}', category: '${item.category}', summary: '${escapedSummary}', tags: ${item.tags}, color: '${item.color}', sectionCount: ${item.sectionCount} },\n`
}

out += `]`

// Extract and inline small data declarations
const lines = src.split('\n')
let catLine = '', catColorLine = ''
let catColorObj = ''
let inCatColor = false

for (const line of lines) {
  if (line.startsWith('export const categories = ')) catLine = line
  if (line.startsWith('export const categoryColors: Record<string, string> = {')) {
    catColorLine = line
    inCatColor = true
    continue
  }
  if (inCatColor) {
    catColorLine += '\n' + line
    if (line.trim() === '}') { inCatColor = false }
  }
}

out += `

${catLine}

${catColorLine}`

fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'classics-meta.ts'), out)
console.log(`Generated classics-meta.ts with ${metaItems.length} classics (${Math.round(out.length / 1024)} KB)`)
