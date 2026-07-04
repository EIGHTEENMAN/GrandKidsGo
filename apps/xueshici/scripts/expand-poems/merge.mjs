#!/usr/bin/env node
// 合并翻译后的诗词数据到 poems.ts
//
// 流程：
// 1. 读现有 poems.ts
// 2. 加载所有 translated_batch_*.fixed.json
// 3. 去重（by title + author + dynasty）
// 4. 转换为 poems.ts 格式并追加
// 5. 更新 header 注释

import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const POEMS_TS = path.join(import.meta.dirname, '..', '..', 'src', 'data', 'poems.ts')

// ===== 朝代颜色映射 =====
const categoryColors = {
  "春秋战国": "#d97706",
  "汉": "#dc2626",
  "三国": "#f97316",
  "魏晋南北朝": "#8b5cf6",
  "唐": "#f59e0b",
  "宋": "#06b6d4",
  "元": "#ec4899",
  "明": "#ef4444",
  "清": "#1d4ed8",
  "近现代": "#64748b"
}

// ===== 标签生成 =====
function genTags(title, dynasty, paragraphs) {
  const tags = []
  const dynMap = { '唐': '唐诗', '宋': '宋词', '元': '元曲', '明': '明诗', '清': '清诗' }
  if (dynMap[dynasty]) tags.push(dynMap[dynasty])

  const firstLine = paragraphs[0] || ''
  if (firstLine.length <= 12 && paragraphs.length <= 1) tags.push('五绝')
  else if (firstLine.length <= 14 && paragraphs.length <= 1) tags.push('七绝')
  else if (firstLine.length <= 20 && paragraphs.length > 4) tags.push('乐府')

  if (title.includes('·')) tags.push('词')
  if (title.includes('歌') || title.includes('行') || title.includes('引')) tags.push('乐府')
  if (paragraphs.some(p => p.includes('春花') || p.includes('春水') || p.includes('春风') || p.includes('秋月') || p.includes('山水'))) tags.push('写景')
  if (paragraphs.some(p => p.includes('愁') || p.includes('悲') || p.includes('泪'))) tags.push('抒情')
  if (title.includes('咏') || title.includes('赋')) tags.push('咏物')

  return [...new Set(tags)].join(',') || '古诗'
}

// ===== 摘要生成 =====
function genSummary(paragraphs) {
  // 取前 2-3 行，每行不超过 12 字符
  const lines = paragraphs.slice(0, 3).filter(Boolean)
  // 如果第一行就包含完整意思且长度合适，可能只需 1-2 行
  if (lines.length >= 2) {
    const twoLines = lines.slice(0, 2).join('\n')
    if (twoLines.length <= 40) return twoLines
  }
  return lines.join('\n').substring(0, 60)
}

// ===== 主流程 =====
async function main() {
  console.log('=== 合并翻译诗词到 poems.ts ===\n')

  // 1. 读现有 poems.ts
  const existingContent = fs.readFileSync(POEMS_TS, 'utf-8')

  // 提取现有数据信息
  const titleRe = /^\s{4}title: "([^"]+)",$/gm
  const existingTitles = new Set()
  let m
  while ((m = titleRe.exec(existingContent))) existingTitles.add(m[1])

  const authorRe = /^\s{4}author: "([^"]+)",$/gm
  const existingAuthors = new Set()
  while ((m = authorRe.exec(existingContent))) existingAuthors.add(m[1])

  const idMatch = [...existingContent.matchAll(/^\s{4}id: (\d+),/gm)]
  const existingIds = idMatch.map(x => parseInt(x[1]))
  const maxExistingId = Math.max(...existingIds)
  const existingCount = existingIds.length

  console.log(`现有: ${existingCount} 首 (ID ${Math.min(...existingIds)}-${maxExistingId})`)

  // 生成 unique key（用于内部去重）
  function key(p) {
    return `${p.author}|${p.title}|${p.dynasty}`.replace(/\s/g, '')
  }
  const existingKeys = new Set()
  // 从现有数据提取 key
  const keyLines = existingContent.split('\n')
  let currentPoem = {}
  for (const line of keyLines) {
    const t = line.match(/^\s{4}title: "([^"]+)",$/)
    if (t) currentPoem.title = t[1]
    const a = line.match(/^\s{4}author: "([^"]+)",$/)
    if (a) currentPoem.author = a[1]
    const d = line.match(/^\s{4}dynasty: "([^"]+)",$/)
    if (d) {
      currentPoem.dynasty = d[1]
      existingKeys.add(key(currentPoem))
      currentPoem = {}
    }
  }

  // 2. 加载翻译批次
  const translated = []
  for (let i = 1; i <= 9; i++) {
    const file = path.join(DATA_DIR, `translated_batch_${i}.fixed.json`)
    if (!fs.existsSync(file)) continue
    const batch = JSON.parse(fs.readFileSync(file, 'utf-8'))
    for (const p of batch) {
      translated.push({
        ...p,
        uniqueKey: key({ author: p.author, title: p.title, dynasty: p.dynasty })
      })
    }
  }
  console.log(`翻译批次: ${translated.length} 首`)

  // 3. 去重
  const seen = new Set()
  const deduped = []
  const dupStats = { byId: 0, byKey: 0, byTitle: 0 }
  for (const p of translated) {
    // id 重复（不应有）
    if (existingIds.includes(p.id)) { dupStats.byId++; continue }
    // author|title|dynasty 重复
    if (existingKeys.has(p.uniqueKey)) { dupStats.byKey++; continue }
    // 标题重复（近似）
    if (existingTitles.has(p.title)) { dupStats.byTitle++; continue }
    // 内部重复
    if (seen.has(p.uniqueKey)) { dupStats.byKey++; continue }
    seen.add(p.uniqueKey)
    deduped.push(p)
  }
  console.log(`去重结果: ${deduped.length} 首（跳过 ${dupStats.byId+dupStats.byKey+dupStats.byTitle}）`)
  console.log(`  (byId=${dupStats.byId} byKey=${dupStats.byKey} byTitle=${dupStats.byTitle})`)

  if (deduped.length === 0) {
    console.log('\n⚠ 没有新增诗词可合并')
    return
  }

  // 4. 转换为 poems.ts 格式
  const newEntries = deduped.map((p, idx) => {
    const poemId = maxExistingId + 1 + idx
    const paragraphs = p.paragraphs || []
    const original = paragraphs.join('\n')
    const summary = genSummary(paragraphs)
    const tags = genTags(p.title, p.dynasty, paragraphs)
    const color = categoryColors[p.dynasty] || '#64748b'

    const sectionTitle = p.rhythmic || p.title

    return `  {
    id: ${poemId},
    title: "${p.title}",
    author: "${p.author}",
    dynasty: "${p.dynasty}",
    category: "${p.dynasty}",
    summary: \`${summary}\`,
    tags: "${tags}",
    color: "${color}",
    sections: [
      { id: 1, title: "${sectionTitle}", original: \`${original}\`, translation: \`${p.translation || ''}\`, interpretation: \`${p.interpretation || ''}\` }
    ]
  }`
  })

  // 5. 生成新的 header 注释
  const newTotal = existingCount + deduped.length
  const dynasties = [...new Set(existingContent.match(/category: "([^"]+)"/g)?.map(x => x.match(/"([^"]+)"/)[1]) || [])]
  const newIntro = `// haodaer-shici poem data - auto-generated
// Contains ${newTotal} poems from ${dynasties.length} dynasties`

  // 6. 找到插入点：poemData 数组最后一个元素后
  const insertPoint = existingContent.lastIndexOf('  },\n]') >= 0
    ? existingContent.lastIndexOf('  },\n]')
    : existingContent.lastIndexOf(']')

  if (insertPoint === -1) {
    console.log('\n⚠ 找不到数组结束位置')
    return
  }

  // 保留 ] 之前的部分（最后一个元素末尾的逗号+换行）
  const beforeArray = existingContent.substring(0, insertPoint)

  // 移除最后一个元素末尾的逗号（如果有）
  const cleanedBefore = beforeArray.replace(/,\s*$/, '')

  // 新数组内容开头的逗号
  const newContent = existingContent.substring(0, insertPoint).replace(/,\s*$/, '') + ',\n' + newEntries.join(',\n') + '\n]'

  // 更新 header
  const headerEnd = existingContent.indexOf('const poemData')
  const afterHeader = existingContent.substring(headerEnd)
  // 在 header 前追加新 intro
  const finalContent = newIntro + '\n\n' + afterHeader.substring(0, afterHeader.indexOf('\n') + 1).replace(/\/\/.*/, '') + afterHeader.substring(afterHeader.indexOf('\n') + 1)

  // 替换整个数组部分
  // 更简单的方法：先找到 "const poemData: Poem[] = [" 位置，替换其后所有到 "]\n\n" 的内容
  const arrayStart = existingContent.indexOf('const poemData: Poem[] = [')
  const arrayStartContent = existingContent.substring(0, arrayStart)
  const arrayEndStr = ']\n\n\n'
  const arrayEndPos = existingContent.lastIndexOf(']\n\n')

  if (arrayStart === -1 || arrayEndPos === -1) {
    console.log('\n⚠ 找不到数组边界')
    return
  }

  const prefix = existingContent.substring(0, arrayStart)
  // 保留 "const poemData: Poem[] = [" 及开头内容
  const arrayPrefix = existingContent.substring(arrayStart, arrayStart + 'const poemData: Poem[] = ['.length)
  const suffix = existingContent.substring(arrayEndPos + 2)  // skip ]\n

  // 构建新数组体：原有条目 + 新条目
  const existingArrayBody = existingContent.substring(
    arrayStart + 'const poemData: Poem[] = ['.length,
    arrayEndPos
  ).replace(/,\s*$/, '')  // 去掉末尾逗号

  const newArrayBody = existingArrayBody + ',\n' + newEntries.join(',\n')

  // 写新 header
  const beforeHeader = existingContent.substring(0, existingContent.indexOf('// haodaer'))
  const afterHeaderContent = existingContent.substring(existingContent.indexOf('\n', existingContent.indexOf('// haodaer')) + 1)

  const final = `${beforeHeader}${newIntro}${afterHeaderContent.substring(0, afterHeaderContent.indexOf('const poemData'))}const poemData: Poem[] = [${newArrayBody}\n]\n\n\n${suffix.trim()}\n`

  // 写回文件
  fs.writeFileSync(POEMS_TS, final, 'utf-8')

  // 统计
  const newIdsRange = `${maxExistingId + 1}-${maxExistingId + deduped.length}`
  console.log(`\n✓ 已合并 ${deduped.length} 首新诗到 poems.ts`)
  console.log(`  新 ID 范围: ${newIdsRange}`)
  console.log(`  总诗词数: ${newTotal} 首`)

  // 朝代分布
  const dist = {}
  for (const p of deduped) dist[p.dynasty] = (dist[p.dynasty] || 0) + 1
  console.log(`\n新增朝代分布:`)
  for (const [d, c] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`  ${d}: ${c}`)
}

main()
