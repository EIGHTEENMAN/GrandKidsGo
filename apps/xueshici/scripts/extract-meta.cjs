#!/usr/bin/env node
// Extract PoemMeta and small data from poems.ts for lazy loading
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'poems.ts'), 'utf-8')
const lines = src.split('\n')

// Find small export declarations
let categoryColorsLine = '', categoriesLine = '', dailyQuotesLine = ''
let poetBiosStart = -1

for (let li = 0; li < lines.length; li++) {
  const l = lines[li]
  if (l.startsWith('export const categoryColors:')) categoryColorsLine = l
  else if (l.startsWith('export const categories:')) categoriesLine = l
  else if (l.startsWith('export const dailyQuotes:')) dailyQuotesLine = l
  else if (l.startsWith('export const poetBios:')) poetBiosStart = li
}

const poetBiosLine = poetBiosStart >= 0 ? lines[poetBiosStart] : ''

// ---- Build poemsIndex array ----
const pdMarker = 'const poemData: Poem[] = ['
const pdIdx = src.indexOf(pdMarker)
if (pdIdx < 0) { console.error('ERROR: cannot find poemData'); process.exit(1) }

const arrayStart = src.indexOf('[', pdIdx + pdMarker.length - 1)
let depth = 0
let braceDepth = 0
let inTemplate = false
let inSingleString = false
let inDoubleString = false
let inBlockComment = false
let inLineComment = false
const metaItems = []
let i = arrayStart

function isWS(c) { return c === ' ' || c === '\n' || c === '\t' || c === '\r' }

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

  // EXTRACTION: at array depth 1, entering a poem object
  if (depth === 1 && c === '{') {
    let bd = 1
    let j = i + 1
    while (j < src.length && bd > 0) {
      const ch = src[j]
      if (ch === "'" || ch === '"') {
        const quote = ch
        j++
        while (j < src.length) {
          if (src[j] === '\\') { j += 2; continue }
          if (src[j] === quote) break
          j++
        }
      }
      if (src[j] === '{') bd++
      else if (src[j] === '}') bd--
      j++
    }
    const objStr = src.substring(i, j)

    function extractField(name) {
      const re = new RegExp('\\b' + name + ':\\s*')
      const match = objStr.match(re)
      if (!match) return ''
      let valStart = match.index + match[0].length
      const ch = objStr[valStart]
      if (ch === '"' || ch === "'") {
        const quote = ch
        valStart++
        let result = ''
        for (let end = valStart; end < objStr.length; end++) {
          if (objStr[end] === '\\') {
            const next = objStr[end + 1]
            if (next === 'n') { result += '\n'; end++ }
            else if (next === 't') { result += '\t'; end++ }
            else if (next === '\\') { result += '\\'; end++ }
            else if (next === quote) { result += quote; end++ }
            else if (next === 'r') { /* skip \r */ end++ }
            else { result += objStr[end] }
            continue
          }
          if (objStr[end] === quote) break
          result += objStr[end]
        }
        return result
      }
      // Array value (tags)
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
      while (end < objStr.length && !/[,}\]]/.test(objStr[end]) && !isWS(objStr[end])) end++
      return objStr.substring(valStart, end)
    }

    const id = extractField('id')
    const title = extractField('title')
    const author = extractField('author')
    const dynasty = extractField('dynasty')
    const category = extractField('category')
    const summary = extractField('summary')
    const tags = extractField('tags')
    const color = extractField('color')

    // Count sections
    const secMatch = objStr.match(/sections:\s*\[/)
    let sectionCount = 0
    if (secMatch) {
      const secArrStart = secMatch.index + secMatch[0].length - 1
      let secBd = 1
      let sk = secArrStart + 1
      while (sk < objStr.length && secBd > 0) {
        if (objStr[sk] === '{') secBd++
        else if (objStr[sk] === '}') secBd--
        sk++
      }
      const secContent = objStr.substring(secArrStart + 1, sk - 1)
      if (secContent.trim()) {
        let curlyCount = 0
        let secs = 0
        for (let ci = 0; ci < secContent.length; ci++) {
          if (secContent[ci] === '{') { curlyCount++; if (curlyCount === 1) secs++ }
          else if (secContent[ci] === '}') curlyCount--
        }
        sectionCount = secs
      }
    }

    metaItems.push({ id, title, author, dynasty, category, summary, tags, color, sectionCount })
    i = j
    continue
  }

  if (c === '{') { braceDepth++; i++; continue }
  if (c === '}') { braceDepth--; i++; continue }
  if (c === '[') { depth++; i++; continue }
  if (c === ']') {
    depth--
    if (depth === 0) break
    i++; continue
  }

  i++
}

// Generate output
let out = `// Auto-generated metadata file for lazy loading
// Generated from poems.ts - contains only index data (${metaItems.length} poems)

export interface PoemMeta {
  id: string
  title: string
  author: string
  dynasty: string
  category: string
  summary: string
  tags: string
  color: string
  sectionCount: number
}

${categoryColorsLine}

${categoriesLine}

${dailyQuotesLine}

${poetBiosLine}

export const poemsIndex: PoemMeta[] = [
`

for (const item of metaItems) {
  // summary now has actual newlines (from \n conversion); other fields are plain strings
  const safeSummary = item.summary.replace(/`/g, '\\`').replace(/\${/g, '\\${')
  out += `  { id: "${item.id}", title: "${item.title}", author: "${item.author}", dynasty: "${item.dynasty}", category: "${item.category}", summary: \`${safeSummary}\`, tags: "${item.tags}", color: "${item.color}", sectionCount: ${item.sectionCount} },\n`
}

out += `]\n`

fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'poems-meta.ts'), out)
console.log(`Generated poems-meta.ts with ${metaItems.length} poems (${Math.round(out.length / 1024)} KB)`)
