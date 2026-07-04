/**
 * 诗词译文+赏析重写脚本
 *
 * 用 Claude API 批量重写 2026 首诗的 translation（现代汉语译文）和 interpretation（赏析）。
 * - translation：现代汉语逐句翻译，长度匹配原文字数（一般 60-150 字）
 * - interpretation：100-200 字赏析，包含背景、意象、艺术特色、对后世影响
 *
 * 用法：
 *   MOCK=true node rewrite.mjs --poc 10          # PoC 验证 10 首
 *   node rewrite.mjs                             # 全量 2026 首
 *   node rewrite.mjs --ids 1,2,3                 # 指定 ID
 *   node rewrite.mjs --concurrency 4            # 并发数（默认 4）
 *   node rewrite.mjs --status                    # 查看进度
 *   node rewrite.mjs --retry                     # 重试失败项
 *
 * 环境变量：
 *   ANTHROPIC_AUTH_TOKEN=xxx      Claude API Key（MiniMax 兼容）
 *   ANTHROPIC_BASE_URL=xxx        API endpoint（默认 https://api.minimaxi.com/anthropic）
 *
 * 输入：apps/xueshici/public/images/poems/poems-data.json
 * 输出：
 *   - rewrite-result.json         { id: { translation, interpretation } }
 *   - status.json                 进度跟踪
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
  poemsFile: resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json'),
  resultFile: resolve(__dirname, 'rewrite-result.json'),
  statusFile: resolve(__dirname, 'status.json'),
  // 优先用 MiniMax API key（云端更稳定）
  apiUrl: process.env.MINIMAX_API_KEY ? 'https://api.minimaxi.com/anthropic' : (process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic'),
  apiKey: process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  model: 'MiniMax-Text-01',
  concurrency: 6,
  retries: 3,
  isMock: process.env.MOCK === 'true',
}

// ===== 状态跟踪 =====
class Tracker {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { poems: {}, stats: { success: 0, failed: 0, total: 0 } }
  }
  registerPoems(poems) {
    for (const p of poems) {
      if (!this.data.poems[p.id]) {
        this.data.poems[p.id] = { status: 'pending' }
      }
    }
    this.data.stats.total = poems.length
    this.save()
  }
  setStatus(id, status, extra = {}) {
    this.data.poems[id] = { status, ...extra, updatedAt: new Date().toISOString() }
    this.save()
  }
  getPending(poems) {
    return poems.filter(p => this.data.poems[p.id]?.status !== 'done')
  }
  printStats() {
    const total = Object.keys(this.data.poems).length
    const done = Object.values(this.data.poems).filter(p => p.status === 'done').length
    const failed = Object.values(this.data.poems).filter(p => p.status === 'failed').length
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

// ===== LLM 调用 =====
async function callClaude(poem, section) {
  const prompt = `你是一位精通中国古典文学的教授，正在为儿童（8-12 岁）编写诗词教材。

请为以下诗词撰写：
1. **translation**：现代汉语译文。要求逐句翻译、口语化、保留原意，让小学生能听懂。如果是古文/散文，按句子断句；如果是诗词，保留对仗节奏。长度：60-150 字（与原文长度匹配）。
2. **interpretation**：赏析 100-200 字。要求：① 时代背景；② 核心意象；③ 艺术特色（一两句即可）；④ 对后世的影响或名句流传。要求亲切自然、有趣味，避免学术腔。

【诗词信息】
朝代：${poem.dynasty}
作者：${poem.author}
篇目：${section.title || poem.title}
${poem.tags ? `标签：${poem.tags}` : ''}

【原文】
${section.original}

请严格以 JSON 格式返回（不要有任何额外文字、Markdown 标记）：
{"translation": "...", "interpretation": "..."}`

  if (CONFIG.isMock) {
    return {
      translation: `[MOCK] 译文：${section.original.slice(0, 20)}...（${section.original.length}字）`,
      interpretation: `[MOCK] 赏析：${poem.title}为${poem.dynasty}${poem.author}所作，表达深远意境，是中国古典文学瑰宝。`,
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
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  // 解析 JSON（兼容 Markdown 包裹 + LLM 输出中的小瑕疵）
  let jsonText = text
  // 提取第一个 {...} 块
  const jsonMatch = jsonText.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) throw new Error('LLM 未返回 JSON: ' + text.slice(0, 200))
  jsonText = jsonMatch[0]

  // 尝试直接解析；失败则尝试修复常见问题
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    // 修复 1：字段值内的未转义引号（"..."..." → 替换为中文引号「""」）
    jsonText = fixJsonQuotes(jsonText)
    try {
      parsed = JSON.parse(jsonText)
    } catch (e2) {
      throw new Error('JSON 解析失败（已尝试修复）: ' + text.slice(0, 200))
    }
  }
  if (!parsed.translation || !parsed.interpretation) {
    throw new Error('JSON 字段缺失: ' + text.slice(0, 200))
  }
  return parsed
}

/**
 * 修复 LLM 输出 JSON 时的常见问题：字段值内出现未转义的引号
 * 策略：找到 "key": " 后的内容，遇到下一个 ":" 或 "}" 之前的引号统一替换为中文引号
 */
function fixJsonQuotes(s) {
  // 用更宽容的方式：把每对 key/value 单独处理
  // 简单做法：把字符串值内的 ASCII " 替换为中文「"」成对引号
  // 因为 JSON 字符串不能含未转义 "，所以一旦遇到 ": " 后跟内容到 ", 或 "} 的，
  // 把内容里的 " 替换成 「」
  let out = ''
  let i = 0
  while (i < s.length) {
    const c = s[i]
    // 找到 "key": " 模式
    if (c === '"' && s.slice(i, i + 100).match(/^"\w+":\s*"/)) {
      // 复制 key 部分（含开引号）
      out += c
      i++
      while (i < s.length && s[i] !== '"') { out += s[i]; i++ }
      // 现在在值起始 "
      out += '"'; i++
      // 扫描值内容直到遇到真正的结束（下一个 ",  或 "}  或 "\n）
      let valBuf = ''
      while (i < s.length) {
        const ch = s[i]
        if (ch === '\\' && i + 1 < s.length) {
          valBuf += ch + s[i + 1]
          i += 2
          continue
        }
        // 结束符：", 或 "} 或 "\n 或 ":  后面跟新字段
        if (ch === '"') {
          // 看后面是什么
          const next = s.slice(i + 1, i + 3).trimStart()
          if (next.startsWith(',') || next.startsWith('}') || next.startsWith('\n')) {
            // 结束符
            out += valBuf
            out += '"'
            i++
            break
          } else {
            // 内部引号 → 替换
            valBuf += '“'  // "
            i++
          }
        } else {
          valBuf += ch
          i++
        }
      }
    } else {
      out += c
      i++
    }
  }
  return out
}

// ===== 处理单首 =====
async function processPoem(poem, tracker) {
  // 只处理第一个 section（多数诗只有一个 section）
  const section = poem.sections[0]
  if (!section) {
    tracker.setStatus(poem.id, 'skipped', { reason: 'no section' })
    return
  }

  // 已有结果且非失败 → 跳过
  const existing = loadResults()[poem.id]
  if (existing?.translation && existing?.interpretation) {
    tracker.setStatus(poem.id, 'done', { fromCache: true })
    log(C.dim, 'SKIP', `${poem.id} ${poem.title}`)
    return
  }

  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const result = await callClaude(poem, section)
      saveResult(poem.id, result)
      tracker.setStatus(poem.id, 'done', { attempt })
      log(C.green, '✓', `${poem.id} ${poem.title}`)
      return
    } catch (err) {
      log(C.yellow, '!', `${poem.id} ${poem.title} attempt ${attempt}/${CONFIG.retries}: ${err.message}`)
      if (attempt === CONFIG.retries) {
        tracker.setStatus(poem.id, 'failed', { error: err.message })
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

  // 解析 IDs
  let targetIds = null
  const idsIdx = args.indexOf('--ids')
  if (idsIdx >= 0) targetIds = args[idsIdx + 1].split(',').map(Number)
  const pocIdx = args.indexOf('--poc')
  const pocCount = pocIdx >= 0 ? parseInt(args[pocIdx + 1]) || 10 : 0

  // 加载诗词
  const poems = JSON.parse(readFileSync(CONFIG.poemsFile, 'utf-8'))
  log(C.blue, 'INIT', `加载了 ${poems.length} 首诗词`)
  log(C.blue, 'INIT', `API: ${CONFIG.apiUrl} | Model: ${CONFIG.model} | 并发=${CONFIG.concurrency}${isMock ? ' | MOCK' : ''}`)

  if (!CONFIG.apiKey && !isMock) {
    log(C.red, 'ERR', '未设置 ANTHROPIC_AUTH_TOKEN 环境变量（或使用 MOCK=true）')
    process.exit(1)
  }

  const tracker = new Tracker()
  tracker.registerPoems(poems)

  // 只看状态
  if (isStatus) {
    tracker.printStats()
    return
  }

  // 重试失败项
  let workList = poems
  if (isRetry) {
    workList = poems.filter(p => tracker.data.poems[p.id]?.status === 'failed')
    log(C.yellow, 'RETRY', `重新处理 ${workList.length} 个失败项`)
  } else if (targetIds) {
    workList = poems.filter(p => targetIds.includes(p.id))
    log(C.yellow, 'IDS', `指定处理 ${workList.length} 首`)
  } else if (pocCount > 0) {
    workList = poems.slice(0, pocCount)
    log(C.yellow, 'POC', `PoC 模式，处理前 ${pocCount} 首`)
  } else {
    // 全量：跳过已完成的
    workList = tracker.getPending(poems)
    log(C.blue, 'BATCH', `待处理 ${workList.length}/${poems.length} 首`)
  }

  if (workList.length === 0) {
    log(C.green, 'DONE', '所有任务已完成')
    return
  }

  const startTime = Date.now()
  await processBatch(workList, (poem) => processPoem(poem, tracker), CONFIG.concurrency)
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  log(C.green, 'DONE', `完成 ${workList.length} 首，耗时 ${elapsed} 分钟`)
  tracker.printStats()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
