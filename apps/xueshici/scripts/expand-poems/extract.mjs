#!/usr/bin/env node
// 阶段 1：从 chinese-poetry 抽取候选诗词
// 策略：优先补名气大诗人的剩余作品，再补未收录作者
// 输出: data/poems-raw.json

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as OpenCC from 'opencc-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const SOURCE_DIR = '/tmp/chinese-poetry'
const POEMS_TS = path.join(__dirname, '..', '..', 'src', 'data', 'poems.ts')

// 繁简转换
const converter = OpenCC.Converter({ from: 'tw', to: 'cn' })
const t2s = (s) => converter(s)

// ===== 加载现有数据 =====
function loadExisting() {
  const src = fs.readFileSync(POEMS_TS, 'utf-8')
  const titleRe = /title:\s*"([^"]+)"/g
  const authorRe = /author:\s*"([^"]+)"/g
  const idRe = /^ {4}id:\s*(\d+),/gm
  const titles = new Set()
  const authors = new Set()
  let m, maxId = 0
  while ((m = titleRe.exec(src))) titles.add(m[1])
  while ((m = authorRe.exec(src))) authors.add(m[1])
  while ((m = idRe.exec(src))) {
    const id = parseInt(m[1], 10)
    if (id > maxId) maxId = id
  }
  return { titles, authors, maxId }
}

// ===== normalize 工具 =====
function normalize(item, defaultDynasty, defaultAuthor) {
  const title = item.title || ''
  const author = item.author || defaultAuthor || '佚名'
  let paragraphs = item.paragraphs || item.para || item.content
  if (!Array.isArray(paragraphs)) paragraphs = []
  return {
    title: t2s(title.trim()),
    author: t2s(author.trim()),
    dynasty: defaultDynasty,
    paragraphs: paragraphs.map(p => t2s(p.trim())).filter(Boolean),
    rhythmic: item.rhythmic ? t2s(item.rhythmic) : null,
  }
}

// ===== 过滤 =====
function isValid(p) {
  if (!p.title || !p.author) return false
  if (p.paragraphs.length === 0) return false
  const totalChars = p.paragraphs.join('').length
  if (totalChars < 12 || totalChars > 350) return false
  // 黑名单
  const blacklist = ['艳情', '情欲', '淫', '乱伦', '妓', '妾身', '巫山云雨', '春宵', '鸳鸯被', '云雨']
  if (blacklist.some(b => p.title.includes(b) || p.paragraphs.join('').includes(b))) return false
  return true
}

function hashKey(p) {
  return `${p.author}::${p.title}`.replace(/\s/g, '')
}

// ===== 加载 chinese-poetry 数据集 =====
function loadTang() {
  const items = []
  const dir = path.join(SOURCE_DIR, '全唐诗')
  for (const f of fs.readdirSync(dir).filter(x => x.startsWith('poet.tang.') && x.endsWith('.json'))) {
    const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    items.push(...arr.map(x => normalize(x, '唐', x.author)))
  }
  // 蒙学唐诗三百首
  try {
    const tang300 = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '蒙学', 'tangshisanbaishou.json'), 'utf-8'))
    if (Array.isArray(tang300)) items.push(...tang300.map(x => normalize(x, '唐', x.author)))
  } catch {}
  return items
}

function loadSong() {
  const items = []
  // 全宋诗（在 全唐诗 目录中）
  const dir = path.join(SOURCE_DIR, '全唐诗')
  for (const f of fs.readdirSync(dir).filter(x => x.startsWith('poet.song.') && x.endsWith('.json'))) {
    const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    items.push(...arr.map(x => normalize(x, '宋', x.author)))
  }
  // 宋词
  const ciDir = path.join(SOURCE_DIR, '宋词')
  for (const f of fs.readdirSync(ciDir).filter(x => x.startsWith('ci.song.') && x.endsWith('.json'))) {
    const arr = JSON.parse(fs.readFileSync(path.join(ciDir, f), 'utf-8'))
    for (const x of arr) {
      const norm = normalize(x, '宋', x.author)
      // 宋词无 title，用 "词牌名·作者"
      norm.title = norm.rhythmic ? `${norm.rhythmic}·${norm.author}` : `词·${norm.author}`
      items.push(norm)
    }
  }
  return items
}

function loadYuan() {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '元曲', 'yuanqu.json'), 'utf-8'))
    return arr.map(x => {
      const norm = normalize(x, '元', x.author)
      if (norm.title.includes('·')) {
        norm.rhythmic = norm.title.split('·').pop().split('/').pop()
      }
      return norm
    })
  } catch { return [] }
}

function loadShijing() {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '诗经', 'shijing.json'), 'utf-8'))
    return arr.map(x => normalize(x, '春秋战国', '佚名(诗经)'))
  } catch { return [] }
}

function loadWeijin() {
  const items = []
  try {
    const caocao = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '曹操诗集', 'caocao.json'), 'utf-8'))
    if (Array.isArray(caocao)) items.push(...caocao.map(x => normalize(x, '魏晋南北朝', '曹操')))
  } catch {}
  try {
    const chuci = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '楚辞', 'chuci.json'), 'utf-8'))
    if (Array.isArray(chuci)) items.push(...chuci.map(x => normalize(x, '魏晋南北朝', x.author || '屈原')))
  } catch {}
  return items
}

function loadQing() {
  const items = []
  // huajianji
  const hjj = path.join(SOURCE_DIR, '五代诗词', 'huajianji')
  if (fs.existsSync(hjj)) {
    for (const f of fs.readdirSync(hjj).filter(x => x.endsWith('.json'))) {
      try {
        const arr = JSON.parse(fs.readFileSync(path.join(hjj, f), 'utf-8'))
        if (Array.isArray(arr)) items.push(...arr.map(x => normalize(x, '清', x.author)))
      } catch {}
    }
  }
  // 纳兰性德
  try {
    const nalan = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '纳兰性德', '纳兰性德诗集.json'), 'utf-8'))
    if (Array.isArray(nalan)) items.push(...nalan.map(x => normalize(x, '清', '纳兰性德')))
  } catch {}
  // nantang
  try {
    const nt = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, '五代诗词', 'nantang', 'nantang.json'), 'utf-8'))
    if (Array.isArray(nt)) items.push(...nt.map(x => normalize(x, '清', x.author)))
  } catch {}
  return items
}

// ===== 主流程 =====
async function main() {
  console.log('=== 阶段 1: 数据抽取（名气大诗人优先 + 补未收录作者）===\n')

  const existing = loadExisting()
  console.log(`现有: ${existing.titles.size} 唯一标题 / ${existing.authors.size} 作者 / 最大 ID = ${existing.maxId}\n`)

  // 加载源数据
  const data = {
    '唐': loadTang(),
    '宋': loadSong(),
    '元': loadYuan(),
    '春秋战国': loadShijing(),
    '魏晋南北朝': loadWeijin(),
    '清': loadQing(),
  }
  for (const [d, arr] of Object.entries(data)) {
    console.log(`  ${d}: 加载 ${arr.length} 首`)
  }

  // 过滤 + 去重（用 chinese-poetry 内部 + 现有）
  const poolByDynasty = {}
  for (const [d, arr] of Object.entries(data)) {
    const valid = arr.filter(isValid)
    const unique = []
    const seenInPool = new Set()
    for (const p of valid) {
      const h = hashKey(p)
      if (seenInPool.has(h)) continue
      if (existing.titles.has(p.title)) continue  // 与现有重复
      seenInPool.add(h)
      unique.push(p)
    }
    poolByDynasty[d] = unique
    console.log(`  ${d}: 池 ${unique.length} 首（去重后）`)
  }

  // ===== 选诗策略 =====
  const TARGET = {
    '唐': 280,       // 名家优先：李白杜甫王维白居易等
    '宋': 280,       // 名家优先：苏轼辛弃疾李清照等
    '元': 80,        // 元曲
    '清': 80,        // 纳兰/花间集
    '魏晋南北朝': 60,  // 曹操/陶潜
    '春秋战国': 30,   // 诗经
  }
  // LLM 生成（chinese-poetry 无源）
  const llmNeeded = [
    { dynasty: '近现代', quota: 100 },
    { dynasty: '明', quota: 80 },
    { dynasty: '汉', quota: 50 },
    { dynasty: '三国', quota: 30 },
  ]
  const llmTotal = llmNeeded.reduce((a, b) => a + b.quota, 0)
  // 总计：660 (chinese-poetry) + 260 (LLM) = 920，逼近 1000

  console.log(`\n  LLM 生成: ${llmTotal} 首（明/汉/三国/近现代）`)
  console.log(`  总目标: ${Object.values(TARGET).reduce((a,b)=>a+b,0) + llmTotal} 首\n`)

  // 选诗：按"该作者现有收录数倒序"加权 + 池里作品数限制
  // 简单实现：每朝代随机抽样（但优先收集"已在现有作者中"的作品，再补新作者）
  const selected = []
  for (const [dynasty, quota] of Object.entries(TARGET)) {
    const pool = poolByDynasty[dynasty]
    if (!pool || pool.length === 0) {
      console.log(`  ${dynasty}: 池为空，跳过`)
      continue
    }
    // 优先现有作者的作品（补缺），再补新作者
    const fromExistingAuthor = pool.filter(p => existing.authors.has(p.author))
    const fromNewAuthor = pool.filter(p => !existing.authors.has(p.author))
    // 打乱两个池子
    const shuffle = (arr) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    const need = Math.min(quota, pool.length)
    const fromExisting = shuffle(fromExistingAuthor).slice(0, need)
    const remaining = need - fromExisting.length
    const fromNew = shuffle(fromNewAuthor).slice(0, remaining)
    const picked = [...fromExisting, ...fromNew]
    selected.push(...picked.map(x => ({ ...x, source: dynasty })))
    console.log(`  ${dynasty}: 选 ${picked.length}/${quota} (现有作者补 ${fromExisting.length} + 新作者 ${fromNew.length})`)
  }

  // ===== 输出 raw =====
  let nextId = existing.maxId + 1
  const final = selected.map(x => ({
    id: nextId++,
    ...x,
    needs_enrich: true,
  }))

  const outFile = path.join(DATA_DIR, 'poems-raw.json')
  fs.writeFileSync(outFile, JSON.stringify(final, null, 2), 'utf-8')
  console.log(`\n✓ 输出: ${outFile} (${final.length} 首)`)
  console.log(`  ID 范围: ${final[0]?.id} - ${final[final.length - 1]?.id}`)

  // 朝代分布
  const dist = {}
  for (const x of final) dist[x.dynasty] = (dist[x.dynasty] || 0) + 1
  console.log(`  朝代分布:`)
  for (const [d, c] of Object.entries(dist)) console.log(`    ${d}: ${c}`)

  // 作者统计
  const newAuthors = new Set(final.map(x => x.author))
  console.log(`  新增作者数: ${newAuthors.size}`)
  console.log(`  与现有重合作者数: ${final.filter(x => existing.authors.has(x.author)).length} 首`)

  // LLM 计划
  const llmPlan = {
    dynasties: llmNeeded,
    estimated_calls: llmTotal,
  }
  fs.writeFileSync(path.join(DATA_DIR, 'llm-plan.json'), JSON.stringify(llmPlan, null, 2), 'utf-8')
  console.log(`\n  LLM 计划: ${llmTotal} 首待生成（明/汉/三国/近现代）`)
}

main().catch(e => { console.error(e); process.exit(1) })
