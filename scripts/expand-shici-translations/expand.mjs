/**
 * 学诗词 短翻译扩写脚本
 *
 * 把 poems.ts 中 translation ≤ 50 字的 section 扩写到 60-120+ 字。
 * 学诗词 5e8ffef4 已做过全量重写，但有 93 节仍偏短。
 *
 * 用法：
 *   node expand.mjs --poc 5
 *   node expand.mjs                    # 全量 93 节
 *   node expand.mjs --concurrency 4
 *   node expand.mjs --status
 *   node expand.mjs --retry
 *
 * 环境变量：ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

const CONFIG = {
  poemsFile: resolve(__dirname, '../../apps/xueshici/src/data/poems.ts'),
  resultFile: resolve(__dirname, 'expand-result.json'),
  statusFile: resolve(__dirname, 'status.json'),
  apiUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
  apiKey: process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  model: 'MiniMax-Text-01',
  concurrency: 4,
  retries: 3,
  isMock: process.env.MOCK === 'true',
  maxTranslationLen: 50,
  minTargetLen: 60,
}

class Tracker {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { sections: {}, stats: { success: 0, failed: 0, total: 0 } }
  }
  registerSections(sections) {
    for (const s of sections) {
      if (!this.data.sections[s.uid]) {
        this.data.sections[s.uid] = { status: 'pending' }
      }
    }
    this.data.stats.total = sections.length
    this.save()
  }
  setStatus(uid, status, extra = {}) {
    this.data.sections[uid] = { status, ...extra, updatedAt: new Date().toISOString() }
    this.save()
  }
  getPending(sections) {
    return sections.filter(s => this.data.sections[s.uid]?.status !== 'done')
  }
  printStats() {
    const total = Object.keys(this.data.sections).length
    const done = Object.values(this.data.sections).filter(s => s.status === 'done').length
    const failed = Object.values(this.data.sections).filter(s => s.status === 'failed').length
    console.log(`\n📊 进度：${done}/${total} 完成，${failed} 失败，${total - done - failed} 待处理`)
  }
  save() {
    writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2))
  }
}

function loadResults() {
  return existsSync(CONFIG.resultFile)
    ? JSON.parse(readFileSync(CONFIG.resultFile, 'utf-8'))
    : {}
}
function saveResult(uid, result) {
  const all = loadResults()
  all[uid] = result
  writeFileSync(CONFIG.resultFile, JSON.stringify(all, null, 2))
}

// ===== 解析 poems.ts =====
// 学诗词结构：poem { id: 数字, title, author, ..., sections: [ { id: 数字, title, original, translation, interpretation } ] }
// 两种格式：
// - 旧 (id 1-1004): original 用双引号，sections: [    { inline
// - 新 (id 1009+): original 用反引号，sections: [\n      { 多行
// translation 全部用反引号
function parsePoems(text) {
  const poems = []
  // 通用 section 正则：original 可双/反引号
  const secRe = /sections:\s*\[\s*\{\s*id:\s*(\d+),\s*title:\s*"([^"]*)",\s*original:\s*(["`])((?:[^"\\]|\\.)*?)\3,\s*translation:\s*`([^`]+)`/g
  let m
  while ((m = secRe.exec(text)) !== null) {
    const secStart = m.index
    const [, secId, secTitle, , secOriginal, secTranslation] = m
    // 向前找最近 poem id
    const before = text.slice(0, secStart)
    const idMatch = before.match(/(?:^|\n)\s*id:\s*(\d+),/g)
    if (!idMatch) continue
    const idNum = parseInt(idMatch[idMatch.length - 1].match(/(\d+)/)[1])
    // 找 poem title
    let title = `Poem ${idNum}`
    const titleMatch = before.match(/(?:^|\n)\s*id:\s*\d+,\s*title:\s*"([^"]+)"/g)
    if (titleMatch) {
      const tm = titleMatch[titleMatch.length - 1].match(/title:\s*"([^"]+)"/)
      if (tm) title = tm[1]
    }
    // author
    let author = ''
    const authorMatch = before.match(/(?:^|\n)\s*id:\s*\d+,[\s\S]{0,200}?author:\s*"([^"]*)"/g)
    if (authorMatch) {
      const am = authorMatch[authorMatch.length - 1].match(/author:\s*"([^"]*)"/)
      if (am) author = am[1]
    }
    // dynasty
    let dynasty = ''
    const dynastyMatch = before.match(/(?:^|\n)\s*id:\s*\d+,[\s\S]{0,500}?dynasty:\s*"([^"]*)"/g)
    if (dynastyMatch) {
      const dm = dynastyMatch[dynastyMatch.length - 1].match(/dynasty:\s*"([^"]*)"/)
      if (dm) dynasty = dm[1]
    }
    poems.push({
      poemId: idNum,
      title,
      author,
      dynasty,
      uid: `${idNum}-${secId}`,
      sectionTitle: secTitle,
      original: secOriginal,
      translation: secTranslation,
      interpretation: '',
    })
  }
  return poems
}

async function callLLM(p) {
  const prompt = `你是一位精通中国古典诗词的教授，正在为儿童（8-12 岁）编写诗词教材。

请为以下诗词撰写**扩充版现代汉语译文**。

【基本信息】
诗题：${p.title}
作者：${p.author || '佚名'}
朝代：${p.dynasty}
节选：${p.sectionTitle}

【原文】
${p.original}

【现有译文（太短，需要扩充）】
${p.translation}

【扩充要求】
1. **保留现有译文的核心信息**，把"一两句话"扩到 60-120+ 字（诗词按需调整）。
2. **儿童友好**：用小学生能听懂的口语，但保留诗词的韵味。
3. **逐句翻译**：原文每句都要有对应的现代汉语解释，不要跳过。
4. **加入画面感**：把抽象的诗词变成具体的场景。
5. **保留原诗情感**（忧国忧民/思乡/送别/咏物/爱情 等）。
6. **不要臆造**——只看原文+现有译文，不要加入原文中没有的内容。
7. **不要修改 interpretation（赏析）**——本次只改 translation。

【输出要求】
严格以 JSON 格式返回（不要有任何额外文字、Markdown 标记、代码块）：
{"translation": "..."}

JSON 字符串值如果需要引号，请用中文「""」或"「"「"」"。`

  if (CONFIG.isMock) {
    return { translation: `[MOCK扩充] ${p.translation}（扩写 ${p.title}）` }
  }

  const res = await fetch(`${CONFIG.apiUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) throw new Error('LLM 未返回 JSON: ' + text.slice(0, 200))
  let parsed
  try { parsed = JSON.parse(jsonMatch[0]) } catch (e) { throw new Error('JSON 解析失败: ' + text.slice(0, 200)) }
  if (!parsed.translation) throw new Error('JSON 缺 translation')

  if (parsed.translation.length < CONFIG.minTargetLen) {
    throw new Error(`扩写太短: ${parsed.translation.length}字 (需≥${CONFIG.minTargetLen}): ${parsed.translation.slice(0, 50)}`)
  }
  return parsed
}

async function processSection(p, tracker) {
  const existing = loadResults()[p.uid]
  if (existing?.translation && existing.translation.length >= CONFIG.minTargetLen) {
    tracker.setStatus(p.uid, 'done', { fromCache: true })
    log(C.dim, 'SKIP', `${p.uid}`)
    return
  }
  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const result = await callLLM(p)
      saveResult(p.uid, result)
      tracker.setStatus(p.uid, 'done', { attempt, oldLen: p.translation.length, newLen: result.translation.length })
      log(C.green, '✓', `${p.uid} ${p.title} ${p.translation.length}→${result.translation.length}字`)
      return
    } catch (err) {
      log(C.yellow, '!', `${p.uid} attempt ${attempt}/${CONFIG.retries}: ${err.message.slice(0, 100)}`)
      if (attempt === CONFIG.retries) tracker.setStatus(p.uid, 'failed', { error: err.message })
      else await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
}

async function processBatch(items, fn, concurrency) {
  const executing = new Set()
  for (const item of items) {
    const p = (async () => fn(item))()
    executing.add(p)
    p.finally(() => executing.delete(p))
    if (executing.size >= concurrency) await Promise.race(executing)
  }
  await Promise.all(executing)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--status')) {
    new Tracker().printStats()
    return
  }
  const isRetry = args.includes('--retry')
  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1]) || 4
  let targetIds = null
  const idsIdx = args.indexOf('--ids')
  if (idsIdx >= 0) targetIds = args[idsIdx + 1].split(',')
  const pocCount = args.includes('--poc') ? parseInt(args[args.indexOf('--poc') + 1]) || 5 : 0

  const text = readFileSync(CONFIG.poemsFile, 'utf8')
  const all = parsePoems(text)
  let short = all.filter(p => p.translation.length <= CONFIG.maxTranslationLen)
  log(C.blue, 'INIT', `加载 ${all.length} 首诗，translation ≤${CONFIG.maxTranslationLen} 字的有 ${short.length} 节`)

  if (!CONFIG.apiKey && !CONFIG.isMock) {
    log(C.red, 'ERR', '未设置 ANTHROPIC_AUTH_TOKEN')
    process.exit(1)
  }
  log(C.blue, 'INIT', `API: ${CONFIG.apiUrl} | 并发=${CONFIG.concurrency}${CONFIG.isMock ? ' | MOCK' : ''}`)

  const tracker = new Tracker()
  tracker.registerSections(short)

  let workList = short
  if (isRetry) workList = short.filter(p => tracker.data.sections[p.uid]?.status === 'failed')
  else if (targetIds) workList = short.filter(p => targetIds.includes(p.uid))
  else if (pocCount > 0) workList = short.slice(0, pocCount)
  else workList = tracker.getPending(short)

  if (workList.length === 0) {
    log(C.green, 'DONE', '无待处理任务')
    return
  }
  log(C.yellow, isRetry ? 'RETRY' : (pocCount ? 'POC' : 'BATCH'), `待处理 ${workList.length} 节`)

  const start = Date.now()
  await processBatch(workList, (p) => processSection(p, tracker), CONFIG.concurrency)
  log(C.green, 'DONE', `完成 ${workList.length} 节，耗时 ${((Date.now() - start) / 1000 / 60).toFixed(1)} 分钟`)
  tracker.printStats()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
