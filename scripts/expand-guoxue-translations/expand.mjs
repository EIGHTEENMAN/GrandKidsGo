/**
 * 学国学 短翻译扩写脚本
 *
 * 把 classics.ts 中 translation ≤ 50 字的 section 扩写到 60-120 字，
 * interpretation 已有（59b1c146 加长过），本次不重写 interpretation。
 *
 * 用法：
 *   node expand.mjs --poc 5           # PoC 验证 5 节
 *   node expand.mjs                   # 全量 608 节
 *   node expand.mjs --ids meng-1-s1,meng-1-s2   # 指定 ID
 *   node expand.mjs --concurrency 6
 *   node expand.mjs --status          # 查看进度
 *   node expand.mjs --retry           # 重试失败项
 *
 * 环境变量：
 *   ANTHROPIC_AUTH_TOKEN=xxx      MiniMax / Anthropic 兼容 API Key
 *   ANTHROPIC_BASE_URL=xxx        API endpoint（默认 https://api.minimaxi.com/anthropic）
 *
 * 输入：apps/xueguoxue/src/data/classics.ts
 * 输出：
 *   - expand-result.json         { sectionId: { translation } }
 *   - status.json                进度跟踪
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ===== 颜色日志 =====
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

// ===== 配置 =====
const CONFIG = {
  classicsFile: resolve(__dirname, '../../apps/xueguoxue/src/data/classics.ts'),
  resultFile: resolve(__dirname, 'expand-result.json'),
  statusFile: resolve(__dirname, 'status.json'),
  apiUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
  apiKey: process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  model: 'MiniMax-Text-01',
  concurrency: 6,
  retries: 3,
  isMock: process.env.MOCK === 'true',
  // 只处理 ≤ 此长度的 translation
  maxTranslationLen: 50,
  // 目标长度下限（确保是真正扩写，不是 trivial 替换）
  minTargetLen: 60,
}

// ===== 状态跟踪 =====
class Tracker {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { sections: {}, stats: { success: 0, failed: 0, total: 0 } }
  }
  registerSections(sections) {
    for (const s of sections) {
      if (!this.data.sections[s.id]) {
        this.data.sections[s.id] = { status: 'pending' }
      }
    }
    this.data.stats.total = sections.length
    this.save()
  }
  setStatus(id, status, extra = {}) {
    this.data.sections[id] = { status, ...extra, updatedAt: new Date().toISOString() }
    this.save()
  }
  getPending(sections) {
    return sections.filter(s => this.data.sections[s.id]?.status !== 'done')
  }
  printStats() {
    const total = Object.keys(this.data.sections).length
    const done = Object.values(this.data.sections).filter(s => s.status === 'done').length
    const failed = Object.values(this.data.sections).filter(s => s.status === 'failed').length
    const pending = total - done - failed
    console.log(`\n📊 进度统计：`)
    console.log(`  总数：${total}`)
    console.log(`  已完成：${done}（${(done / total * 100).toFixed(1)}%）`)
    console.log(`  失败：${failed}`)
    console.log(`  待处理：${pending}`)
  }
  save() {
    writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2))
  }
}

// ===== 加载已有结果 =====
function loadResults() {
  return existsSync(CONFIG.resultFile)
    ? JSON.parse(readFileSync(CONFIG.resultFile, 'utf-8'))
    : {}
}
function saveResult(id, result) {
  const all = loadResults()
  all[id] = result
  writeFileSync(CONFIG.resultFile, JSON.stringify(all, null, 2))
}

// ===== 解析 classics.ts =====
function parseClassics(text) {
  // 提取每个 Classic 的核心字段
  const books = []
  // 匹配 { id: 'xxx', title: '...', author: '...', ..., sections: [ ... ] }
  const bookRe = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*author:\s*'([^']+)',\s*dynasty:\s*'([^']+)',\s*category:\s*'([^']+)'[\s\S]*?sections:\s*\[([\s\S]*?)\]\s*\}/g

  let bookMatch
  while ((bookMatch = bookRe.exec(text)) !== null) {
    const [, id, title, author, dynasty, category, sectionsText] = bookMatch
    const sections = []
    // 匹配每个 section
    const sectionRe = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']*)',\s*original:\s*'((?:[^'\\]|\\.)*)',\s*translation:\s*'((?:[^'\\]|\\.)*)',\s*interpretation:\s*'((?:[^'\\]|\\.)*)'/g

    let secMatch
    while ((secMatch = sectionRe.exec(sectionsText)) !== null) {
      const [, sid, stitle, soriginal, stranslation, sinterpretation] = secMatch
      sections.push({
        id: sid,
        title: stitle,
        original: soriginal.replace(/\\n/g, '\n').replace(/\\'/g, "'"),
        translation: stranslation,
        interpretation: sinterpretation,
        bookId: id,
        bookTitle: title,
        author,
        dynasty,
        category,
      })
    }
    books.push({ id, title, author, dynasty, category, sections })
  }
  return books
}

// ===== LLM 调用 =====
async function callLLM(section) {
  // 蒙学/古文/古诗 不同类型用统一 prompt，根据 category 自适应
  const isMengxue = section.category === '蒙学' || section.id.startsWith('meng-')

  const prompt = `你是一位精通中国古典文学的教授，正在为儿童（8-12 岁）编写国学教材。

请为以下国学篇章撰写**扩充版现代汉语译文**。

【基本信息】
典籍：${section.bookTitle}（${section.dynasty} ${section.author}）
类别：${section.category}
篇目：${section.title}

【原文】
${section.original}

【现有译文（太短，需要扩充）】
${section.translation}

【扩充要求】
1. **保留现有译文的核心信息**，把"一句话/两句"扩展到 60-120 字（古文/散文/古诗按需调整）。
2. **儿童友好**：用小学生能听懂的口语，但保留文言经典的味道。
3. **逐句翻译**：原文每句话都要有对应的现代汉语解释，不要跳过。
4. **加入画面感**：把抽象的文言文变成具体的场景（古文/散文尤其重要）。
5. **典故要解释**（如"孟母三迁"是"孟子的妈妈为了让他有好环境，搬了三次家"）。
6. **不要臆造**——只看原文+现有译文，不要加入原文中没有的内容。
7. **不要修改 interpretation（赏析）**——本次只改 translation。

${isMengxue ? '【特别提示】这是蒙学（如三字经/弟子规/千字文/千家诗等），句子短但每句都有智慧，扩写时把"意思"和"现实意义"都讲清楚。' : ''}

【输出要求】
严格以 JSON 格式返回（不要有任何额外文字、Markdown 标记、代码块）：
{"translation": "..."}

JSON 中的字符串值如果需要引号，请用中文"「」"或"「"「"」"。`

  if (CONFIG.isMock) {
    return {
      translation: `[MOCK扩充] ${section.translation}。这是 ${section.bookTitle}《${section.title}》的扩充译注，${section.original.slice(0, 15)}...部分用小学生能听懂的话展开说，加入画面感和典故解释。`,
    }
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

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  // 解析 JSON
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) throw new Error('LLM 未返回 JSON: ' + text.slice(0, 200))
  let parsed
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    throw new Error('JSON 解析失败: ' + text.slice(0, 200))
  }
  if (!parsed.translation) {
    throw new Error('JSON 字段缺失 translation: ' + text.slice(0, 200))
  }

  // 校验：扩写后必须比原文长
  if (parsed.translation.length < CONFIG.minTargetLen) {
    throw new Error(`扩写后太短: ${parsed.translation.length}字 (最小 ${CONFIG.minTargetLen}字): ${parsed.translation.slice(0, 50)}`)
  }

  return parsed
}

// ===== 处理单节 =====
async function processSection(section, tracker) {
  // 已有结果 → 跳过
  const existing = loadResults()[section.id]
  if (existing?.translation && existing.translation.length >= CONFIG.minTargetLen) {
    tracker.setStatus(section.id, 'done', { fromCache: true })
    log(C.dim, 'SKIP', `${section.id}`)
    return
  }

  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const result = await callLLM(section)
      saveResult(section.id, result)
      tracker.setStatus(section.id, 'done', {
        attempt,
        oldLen: section.translation.length,
        newLen: result.translation.length,
      })
      log(C.green, '✓', `${section.id} ${section.translation.length}→${result.translation.length}字`)
      return
    } catch (err) {
      log(C.yellow, '!', `${section.id} attempt ${attempt}/${CONFIG.retries}: ${err.message.slice(0, 100)}`)
      if (attempt === CONFIG.retries) {
        tracker.setStatus(section.id, 'failed', { error: err.message })
      } else {
        await new Promise(r => setTimeout(r, 2000 * attempt))
      }
    }
  }
}

// ===== 并发控制 =====
async function processBatch(items, fn, concurrency) {
  const results = []
  const executing = new Set()
  for (const item of items) {
    const p = (async () => {
      await fn(item)
      results.push(item.id)
    })()
    executing.add(p)
    p.finally(() => executing.delete(p))
    if (executing.size >= concurrency) {
      await Promise.race(executing)
    }
  }
  await Promise.all(executing)
  return results
}

// ===== 主流程 =====
async function main() {
  const args = process.argv.slice(2)
  const isStatus = args.includes('--status')
  const isRetry = args.includes('--retry')
  const isMock = CONFIG.isMock
  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1]) || 4

  let targetIds = null
  const idsIdx = args.indexOf('--ids')
  if (idsIdx >= 0) targetIds = args[idsIdx + 1].split(',')
  const pocIdx = args.indexOf('--poc')
  const pocCount = pocIdx >= 0 ? parseInt(args[pocIdx + 1]) || 10 : 0

  // 加载 classics.ts
  const text = readFileSync(CONFIG.classicsFile, 'utf8')
  const books = parseClassics(text)
  const allSections = books.flatMap(b => b.sections)
  log(C.blue, 'INIT', `加载了 ${books.length} 部经典 / ${allSections.length} 节`)

  // 筛选短翻译
  let shortSections = allSections.filter(s => s.translation.length <= CONFIG.maxTranslationLen)
  log(C.blue, 'INIT', `其中 translation ≤ ${CONFIG.maxTranslationLen} 字的有 ${shortSections.length} 节`)

  if (!CONFIG.apiKey && !isMock) {
    log(C.red, 'ERR', '未设置 ANTHROPIC_AUTH_TOKEN 环境变量（或使用 MOCK=true）')
    process.exit(1)
  }

  log(C.blue, 'INIT', `API: ${CONFIG.apiUrl} | Model: ${CONFIG.model} | 并发=${CONFIG.concurrency}${isMock ? ' | MOCK' : ''}`)

  const tracker = new Tracker()
  tracker.registerSections(shortSections)

  if (isStatus) {
    tracker.printStats()
    return
  }

  let workList = shortSections
  if (isRetry) {
    workList = shortSections.filter(s => tracker.data.sections[s.id]?.status === 'failed')
    log(C.yellow, 'RETRY', `重新处理 ${workList.length} 个失败项`)
  } else if (targetIds) {
    workList = shortSections.filter(s => targetIds.includes(s.id))
    log(C.yellow, 'IDS', `指定处理 ${workList.length} 节`)
  } else if (pocCount > 0) {
    workList = shortSections.slice(0, pocCount)
    log(C.yellow, 'POC', `PoC 模式，处理前 ${pocCount} 节`)
  } else {
    workList = tracker.getPending(shortSections)
    log(C.blue, 'BATCH', `待处理 ${workList.length}/${shortSections.length} 节`)
  }

  if (workList.length === 0) {
    log(C.green, 'DONE', '所有任务已完成')
    return
  }

  const startTime = Date.now()
  await processBatch(workList, (section) => processSection(section, tracker), CONFIG.concurrency)
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  log(C.green, 'DONE', `完成 ${workList.length} 节，耗时 ${elapsed} 分钟`)
  tracker.printStats()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
