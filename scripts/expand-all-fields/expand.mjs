/**
 * 全量扩写脚本 (学国学 + 学诗词)
 *
 * 处理所有 < 100 字的 translation/interpretation 字段，扩写到 >= 110 字
 *
 * 用法：
 *   node expand.mjs --poc 30                          # PoC 验证 30 条
 *   node expand.mjs                                   # 全量扩写 (约 1653 条)
 *   node expand.mjs --type interpretation             # 只跑 interpretation
 *   node expand.mjs --source xueshici                 # 只跑学诗词
 *   node expand.mjs --source xueguoxue                # 只跑学国学
 *   node expand.mjs --ids meng-1-s1,jing-1-s1        # 指定 ID
 *   node expand.mjs --concurrency 5
 *   node expand.mjs --status                          # 查看进度
 *   node expand.mjs --retry                           # 重试失败项
 *
 * 环境变量：
 *   ANTHROPIC_AUTH_TOKEN=xxx      MiniMax API Key
 *   ANTHROPIC_BASE_URL=xxx        API endpoint（默认 https://api.minimaxi.com/anthropic）
 *
 * 输入：apps/{xueguoxue,xueshici}/src/data/{classics,poems}.ts
 * 输出：
 *   - expand-result.json         { composite_key: { translation|interpretation } }
 *   - status.json                进度跟踪
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
  resultFile: resolve(__dirname, 'expand-result.json'),
  statusFile: resolve(__dirname, 'status.json'),
  apiUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
  apiKey: process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  model: 'MiniMax-Text-01',
  concurrency: 5,
  retries: 3,
  isMock: process.env.MOCK === 'true',
  // 阈值：源 ≤ 100 字处理，目标 ≥ 110 字
  maxSourceLen: 100,
  minTargetLen: 110,
}

// ===== 状态跟踪 =====
class Tracker {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { tasks: {}, stats: { success: 0, failed: 0, total: 0 } }
  }
  register(taskList) {
    for (const t of taskList) {
      if (!this.data.tasks[t.key]) this.data.tasks[t.key] = { status: 'pending' }
    }
    this.data.stats.total = taskList.length
    this.save()
  }
  setStatus(key, status, extra = {}) {
    this.data.tasks[key] = { status, ...extra, updatedAt: new Date().toISOString() }
    this.save()
  }
  getPending(taskList) {
    return taskList.filter(t => this.data.tasks[t.key]?.status !== 'done')
  }
  printStats() {
    const total = Object.keys(this.data.tasks).length
    const done = Object.values(this.data.tasks).filter(s => s.status === 'done').length
    const failed = Object.values(this.data.tasks).filter(s => s.status === 'failed').length
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

// ===== 解析 =====
function extractFieldGuo(block, key) {
  const re = new RegExp('(?:^|,)\\s*' + key + ':\\s*([\'"\`])')
  const m = block.match(re)
  if (!m) return ''
  const quote = m[1]
  const start = m.index + m[0].length
  let r = '', i = start, escape = false
  for (; i < block.length; i++) {
    const ch = block[i]
    if (escape) { r += ch; escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === quote) break
    r += ch
  }
  return r
}

function parseAllBooks(content) {
  const books = []
  const re = /\{\s*id:\s*'(jing|zi|shi|yi|meng)-(\d+)'/g
  let m
  while ((m = re.exec(content)) !== null) {
    const after = content.slice(m.index)
    const idM = after.match(/id:\s*'((?:jing|zi|shi|yi|meng)-\d+)'/)
    const titleM = after.match(/title:\s*'([^']+)'/)
    if (idM && titleM) books.push({ id: idM[1], title: titleM[1], index: m.index })
  }
  return books
}

function parseSectionsGuo(content, bookStart, nextStart) {
  const block = content.slice(bookStart, nextStart)
  const arrStart = block.match(/sections:\s*\[/)
  if (!arrStart) return []
  const start = arrStart.index + arrStart[0].length
  let depth = 1, inStr = false, sc = null, i
  for (i = start; i < block.length && depth > 0; i++) {
    const ch = block[i]
    if (inStr) { if (ch === '\\') { i++; continue } if (ch === sc) inStr = false; continue }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; sc = ch; continue }
    if (ch === '[') depth++
    else if (ch === ']') depth--
  }
  const secText = block.slice(start, i - 1)
  const sections = []
  let scan = 0
  while (scan < secText.length) {
    const ob = secText.indexOf('{', scan)
    if (ob < 0) break
    let d = 0, ins = false, sc2 = null, j
    for (j = ob; j < secText.length; j++) {
      const c = secText[j]
      if (ins) { if (c === '\\') { j++; continue } if (c === sc2) ins = false; continue }
      if (c === '"' || c === "'" || c === '`') { ins = true; sc2 = c; continue }
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) break }
    }
    const sb = secText.slice(ob, j + 1)
    scan = j + 1
    const idM = sb.match(/id:\s*['"]((?:jing|zi|shi|yi|meng)-\d+-s\d+)['"]/)
    if (!idM) continue
    const title = sb.match(/title:\s*['"]([^'"]+)['"]/)?.[1] || ''
    const orig = extractFieldGuo(sb, 'original')
    const trans = extractFieldGuo(sb, 'translation')
    const interp = extractFieldGuo(sb, 'interpretation')
    sections.push({ id: idM[1], title, original: orig, translation: trans, interpretation: interp })
  }
  return sections
}

function parsePoemsSections(content) {
  const poems = []
  // poem 起点：{ id: N, title: ..., author: ... （注意 author 字段确保是顶层 poem 而非嵌套 section）
  const poemRe = /\{\s*id:\s*(\d+),\s*title:\s*['"`]([^'"`]+)['"`],\s*author:/g
  let m
  while ((m = poemRe.exec(content)) !== null) {
    const start = m.index
    const next = poemRe.exec(content)
    const end = next ? next.index : content.length
    poemRe.lastIndex = m.index + 1
    poems.push({ id: m[1], title: m[2], block: content.slice(start, end) })
    if (!next) break
  }
  return poems
}

function parseShiSections(poemBlock) {
  const secRe = /\{\s*id:\s*(\d+),\s*title:\s*['"`]([^'"`]+)['"`]/g
  const sections = []
  let m
  while ((m = secRe.exec(poemBlock)) !== null) {
    const start = m.index
    const next = secRe.exec(poemBlock)
    const end = next ? next.index : poemBlock.length
    secRe.lastIndex = start + 1
    const block = poemBlock.slice(start, end)
    sections.push({
      id: m[1],
      title: m[2],
      original: extractFieldGuo(block, 'original'),
      translation: extractFieldGuo(block, 'translation'),
      interpretation: extractFieldGuo(block, 'interpretation'),
    })
    if (!next) break
  }
  return sections
}

// ===== 收集所有任务 =====
function collectTasks() {
  const tasks = []

  // 学国学
  const gxContent = readFileSync('apps/xueguoxue/src/data/classics.ts', 'utf-8')
  const books = parseAllBooks(gxContent)
  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const isMeng = book.id.startsWith('meng-')
    const sections = parseSectionsGuo(gxContent, book.index, books[i + 1]?.index || gxContent.length)
    for (const sec of sections) {
      for (const f of ['translation', 'interpretation']) {
        const text = sec[f]
        if (!text) continue
        const clean = text.replace(/\\n/g, '').trim()
        if (clean.length >= CONFIG.maxSourceLen) continue
        tasks.push({
          source: 'xueguoxue',
          type: f,
          key: `xueguoxue:${sec.id}:${f}`,
          book_id: book.id,
          book_title: book.title,
          is_mengxue: isMeng,
          section_id: sec.id,
          section_title: sec.title,
          original: sec.original.replace(/\\n/g, ' / '),
          current_text: text,
          current_length: clean.length,
        })
      }
    }
  }

  // 学诗词
  const scContent = readFileSync('apps/xueshici/src/data/poems.ts', 'utf-8')
  const poems = parsePoemsSections(scContent)
  for (const poem of poems) {
    const sections = parseShiSections(poem.block)
    for (const sec of sections) {
      for (const f of ['translation', 'interpretation']) {
        const text = sec[f]
        if (!text) continue
        const clean = text.replace(/\\n/g, '').trim()
        if (clean.length >= CONFIG.maxSourceLen) continue
        tasks.push({
          source: 'xueshici',
          type: f,
          key: `xueshici:${poem.id}-${sec.id}:${f}`,
          book_id: poem.id,
          book_title: poem.title,
          is_mengxue: false,
          section_id: sec.id,
          section_title: sec.title,
          original: sec.original.replace(/\\n/g, ' / '),
          current_text: text,
          current_length: clean.length,
        })
      }
    }
  }

  return tasks
}

// ===== Prompt 构造 =====
function buildPrompt(t) {
  const isMengxue = t.is_mengxue
  const isShici = t.source === 'xueshici'
  const isInterp = t.type === 'interpretation'

  // 口吻选择
  const tone = isMengxue
    ? '【友好儿童口吻】像一位温柔的大姐姐/大哥哥蹲下来跟小朋友说话：开头用"小朋友"或"你"亲切称呼，用具体的比喻和生活中常见的物品打比方（比如"小种子"、"小灯笼"、"小船"），多用感叹句（"呀！""呢！"）和问句引导孩子思考，结尾鼓励孩子"你也试试看"。'
    : isShici
    ? '【教师口吻】像一位温和的语文老师在课堂上讲解：开头用"同学们"或"我们来读一读"、先用一两句话点出作品背景或主题，然后逐句解释，关键字词用括号注释，对精彩句子用"这句写得好"等点评，收尾处点出中心思想或名句。'
    : '【教师口吻】像一位温和的语文老师讲解经典：开头用"同学们"或"我们一起看"，先用一两句话点出时代背景或主题思想，然后逐句解释，关键字词用括号注释，精彩处适当点评，收尾点出中心思想。'

  const fieldDesc = isInterp ? '赏析（解读）' : '译文'

  // 注意 prompts 中英文字符
  return `你是一位精通中国古典文学的教授，正在为 8-12 岁儿童编写国学教材。

${tone}

请扩写以下${fieldDesc}。

【基本信息】
典籍：${t.book_title}
篇目：${t.section_title}

【原文】
${t.original}

【现有${fieldDesc}（太短，需要扩写）】
${t.current_text}

【扩写要求】
1. **保留核心信息**：不能改原文意思，但要把简短的一句话展开成完整的讲解。
2. **目标长度**：扩写到 **110-200 字**（必须达到 110 字以上才算合格）。
3. **必须有标点**：用句号、逗号、问号、感叹号等正常中文标点分隔，不要整段一逗到底。
4. **${isInterp ? '赏析要' : '译文要'}**：${isInterp
  ? '讲清楚"为什么这样写"、"作者想表达什么"、"这句好在哪儿"，可以联系历史背景或现实意义。'
  : '把文言文逐句翻译成现代汉语，遇到典故要简单解释，让小学生能听懂。'}
5. **不要臆造**：只能基于原文+现有内容，不能加入原文中没有的人物/事件。
6. **禁止**：不能含 \\n 字面字符、不能含 \\。字面字符、不能用 emoji。

【输出】
严格以 JSON 格式返回（不要任何额外文字、Markdown 标记）：
{"${t.type}": "..."}`
}

// ===== LLM 调用 =====
async function callLLM(t) {
  if (CONFIG.isMock) {
    const prefix = t.is_mengxue ? '小朋友，' : '同学们，'
    return {
      [t.type]: `${prefix}这是 ${t.book_title}《${t.section_title}》的${t.type === 'interpretation' ? '赏析' : '译文'}扩写示例。原文是 "${t.current_text}"，我们展开说，加入画面感和典故解释，让小学生能完全听懂。${t.original.slice(0, 30)}... 这段古文讲的是古人的智慧，通过具体场景让孩子理解传统文化的博大精深。`
    }
  }

  const prompt = buildPrompt(t)

  const res = await fetch(`${CONFIG.apiUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  // 提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) throw new Error('LLM 未返回 JSON: ' + text.slice(0, 200))
  let parsed
  try { parsed = JSON.parse(jsonMatch[0]) }
  catch (e) { throw new Error('JSON 解析失败: ' + text.slice(0, 200)) }

  const newText = parsed[t.type]
  if (!newText) throw new Error(`JSON 字段缺失 ${t.type}: ${text.slice(0, 200)}`)

  // 后处理：清掉字面 \n \。 和 emoji
  let cleaned = newText.replace(/\\n/g, '').replace(/\\。/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()

  // 长度校验
  if (cleaned.length < CONFIG.minTargetLen) {
    throw new Error(`扩写后太短: ${cleaned.length}字 < ${CONFIG.minTargetLen}字: ${cleaned.slice(0, 50)}`)
  }

  // 标点校验
  if (!/[。，！？；：]/.test(cleaned)) {
    throw new Error('无标点: ' + cleaned.slice(0, 50))
  }

  return { [t.type]: cleaned }
}

// ===== 持久化 =====
function loadResults() {
  return existsSync(CONFIG.resultFile)
    ? JSON.parse(readFileSync(CONFIG.resultFile, 'utf-8'))
    : {}
}
function saveResult(key, result) {
  const all = loadResults()
  all[key] = result
  writeFileSync(CONFIG.resultFile, JSON.stringify(all, null, 2))
}

// ===== 处理单条 =====
async function processTask(t, tracker) {
  const existing = loadResults()[t.key]
  if (existing?.[t.type] && existing[t.type].length >= CONFIG.minTargetLen) {
    tracker.setStatus(t.key, 'done', { fromCache: true })
    return
  }

  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const result = await callLLM(t)
      saveResult(t.key, result)
      tracker.setStatus(t.key, 'done', {
        attempt,
        oldLen: t.current_length,
        newLen: result[t.type].length,
      })
      log(C.green, '✓', `${t.key} ${t.current_length}→${result[t.type].length}字`)
      return
    } catch (err) {
      log(C.yellow, '!', `${t.key} attempt ${attempt}/${CONFIG.retries}: ${err.message.slice(0, 120)}`)
      if (attempt === CONFIG.retries) {
        tracker.setStatus(t.key, 'failed', { error: err.message.slice(0, 300) })
      } else {
        await new Promise(r => setTimeout(r, 2000 * attempt))
      }
    }
  }
}

// ===== 并发控制 =====
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

// ===== 主流程 =====
async function main() {
  // DEBUG: 打印 collectTasks 返回
  // (调试模式已关闭)

  const args = process.argv.slice(2)
  const isStatus = args.includes('--status')
  const isRetry = args.includes('--retry')

  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1]) || 5

  let filterSource = null
  const srcIdx = args.indexOf('--source')
  if (srcIdx >= 0) filterSource = args[srcIdx + 1]

  let filterType = null
  const typeIdx = args.indexOf('--type')
  if (typeIdx >= 0) filterType = args[typeIdx + 1]

  let targetKeys = null
  const idsIdx = args.indexOf('--ids')
  if (idsIdx >= 0) {
    targetKeys = args[idsIdx + 1].split(',').map(id => {
      // 假定用户提供的是 section_id，自动加 source prefix
      return id.startsWith('meng-') || id.startsWith('jing-') || id.startsWith('zi-') || id.startsWith('shi-') || id.startsWith('yi-')
        ? `xueguoxue:${id}`
        : `xueshici:${id}`
    })
  }

  const pocIdx = args.indexOf('--poc')
  const pocCount = pocIdx >= 0 ? parseInt(args[pocIdx + 1]) || 30 : 0

  let allTasks = collectTasks()
  log(C.blue, 'INIT', `收集到 ${allTasks.length} 条 < ${CONFIG.maxSourceLen} 字 字段`)

  // 筛选
  if (filterSource) {
    allTasks = allTasks.filter(t => t.source === filterSource)
    log(C.blue, 'FILTER', `按 source=${filterSource} 筛选: ${allTasks.length} 条`)
  }
  if (filterType) {
    allTasks = allTasks.filter(t => t.type === filterType)
    log(C.blue, 'FILTER', `按 type=${filterType} 筛选: ${allTasks.length} 条`)
  }
  if (targetKeys) {
    allTasks = allTasks.filter(t => targetKeys.some(k => t.key.includes(k)))
    log(C.blue, 'IDS', `按 IDs 筛选: ${allTasks.length} 条`)
  }

  if (!CONFIG.apiKey && !CONFIG.isMock) {
    log(C.red, 'ERR', '未设置 ANTHROPIC_AUTH_TOKEN 环境变量（或使用 MOCK=true）')
    process.exit(1)
  }

  log(C.blue, 'INIT', `API: ${CONFIG.apiUrl} | Model: ${CONFIG.model} | 并发=${CONFIG.concurrency}${CONFIG.isMock ? ' | MOCK' : ''}`)

  const tracker = new Tracker()
  tracker.register(allTasks)

  if (isStatus) {
    tracker.printStats()
    return
  }

  let workList = allTasks
  if (isRetry) {
    workList = allTasks.filter(t => tracker.data.tasks[t.key]?.status === 'failed')
    log(C.yellow, 'RETRY', `重新处理 ${workList.length} 个失败项`)
  } else if (pocCount > 0) {
    // PoC: 从各类中各抽几个
    const mengTrans = allTasks.filter(t => t.is_mengxue && t.type === 'translation').slice(0, Math.ceil(pocCount * 0.25))
    const mengInterp = allTasks.filter(t => t.is_mengxue && t.type === 'interpretation').slice(0, Math.ceil(pocCount * 0.15))
    const gxTrans = allTasks.filter(t => !t.is_mengxue && t.source === 'xueguoxue' && t.type === 'translation').slice(0, Math.ceil(pocCount * 0.25))
    const gxInterp = allTasks.filter(t => !t.is_mengxue && t.source === 'xueguoxue' && t.type === 'interpretation').slice(0, Math.ceil(pocCount * 0.1))
    const scTrans = allTasks.filter(t => t.source === 'xueshici' && t.type === 'translation').slice(0, Math.ceil(pocCount * 0.2))
    const scInterp = allTasks.filter(t => t.source === 'xueshici' && t.type === 'interpretation').slice(0, Math.ceil(pocCount * 0.05))
    workList = [...mengTrans, ...mengInterp, ...gxTrans, ...gxInterp, ...scTrans, ...scInterp].slice(0, pocCount)
    log(C.yellow, 'POC', `PoC 模式：${workList.length} 条 (覆盖各类)`)
  } else {
    workList = tracker.getPending(allTasks)
    log(C.blue, 'BATCH', `待处理 ${workList.length}/${allTasks.length} 条`)
  }

  if (workList.length === 0) {
    log(C.green, 'DONE', '所有任务已完成')
    return
  }

  const startTime = Date.now()
  await processBatch(workList, (t) => processTask(t, tracker), CONFIG.concurrency)
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  log(C.green, 'DONE', `完成 ${workList.length} 条，耗时 ${elapsed} 分钟`)
  tracker.printStats()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})