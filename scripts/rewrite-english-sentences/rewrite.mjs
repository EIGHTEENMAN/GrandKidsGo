/**
 * 学英语 例句重写脚本
 *
 * 把 words.ts 中所有 word 的 sentence / sentenceCn 改写成：
 * - 句长 8-14 词
 * - 单词在句中体现 meaning 字段的真正含义
 * - 中译简洁流畅
 * - 不再出现 "The X lives in the wild." / "A X is a kind of animal." 这类模板
 *
 * 用法：
 *   node rewrite.mjs --poc 10                    # PoC 验证 10 条
 *   node rewrite.mjs                              # 全量 3340 条
 *   node rewrite.mjs --ids 1,2,3                  # 指定 ID
 *   node rewrite.mjs --concurrency 8
 *   node rewrite.mjs --status                     # 进度
 *   node rewrite.mjs --retry                      # 重试失败项
 *   node rewrite.mjs --apply                      # 把结果写回 words.ts
 *
 * 环境变量：
 *   MINIMAX_API_KEY=xxx                           MiniMax API Key
 *   ANTHROPIC_BASE_URL 默认 https://api.minimaxi.com/anthropic
 *
 * 输入：apps/english/src/data/words.ts
 * 输出：
 *   - rewrite-result.json        { id: { sentence, sentenceCn } }
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
  wordsFile: resolve(__dirname, '../../apps/english/src/data/words.ts'),
  resultFile: resolve(__dirname, 'rewrite-result.json'),
  statusFile: resolve(__dirname, 'status.json'),
  apiUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
  apiKey: process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  model: 'MiniMax-Text-01',
  concurrency: 4,
  retries: 3,
  isMock: process.env.MOCK === 'true',
  // 目标句长
  minSentenceWords: 6,
  maxSentenceWords: 14,
  minCnChars: 6,
  maxCnChars: 24,
}

// ===== 状态跟踪 =====
class Tracker {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { words: {}, stats: { success: 0, failed: 0, total: 0 } }
  }
  registerWords(words) {
    for (const w of words) {
      if (!this.data.words[w.id]) {
        this.data.words[w.id] = { status: 'pending' }
      }
    }
    this.data.stats.total = words.length
    this.save()
  }
  setStatus(id, status, extra = {}) {
    this.data.words[id] = { status, ...extra, updatedAt: new Date().toISOString() }
    this.save()
  }
  getPending(words) {
    return words.filter(w => this.data.words[w.id]?.status !== 'done')
  }
  printStats() {
    const total = Object.keys(this.data.words).length
    const done = Object.values(this.data.words).filter(s => s.status === 'done').length
    const failed = Object.values(this.data.words).filter(s => s.status === 'failed').length
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

// ===== 解析 words.ts =====
function parseWords(text) {
  // 匹配每个 { id: N, word: "...", meaning: "...", ... sentence: "...", sentenceCn: "...", ... }
  // 因为文件不是严格 JSON，必须正则
  const entryRe = /\{\s*"id":\s*(\d+)[\s\S]*?"word":\s*"([^"]+)"[\s\S]*?"meaning":\s*"([^"]+)"[\s\S]*?"sentence":\s*"([^"]*)"[\s\S]*?"sentenceCn":\s*"([^"]*)"[\s\S]*?\}/g

  const words = []
  let m
  while ((m = entryRe.exec(text)) !== null) {
    words.push({
      id: parseInt(m[1]),
      word: m[2],
      meaning: m[3],
      sentence: m[4],
      sentenceCn: m[5],
    })
  }
  return words
}

// ===== LLM 调用 =====
async function callLLM(word) {
  const prompt = `你是一位儿童英语启蒙老师，正在为 6-12 岁孩子编写单词例句。

【单词】
${word.word}（中文意思：${word.meaning}）

【现有例句】（太模板化，需要重写）
英文：${word.sentence}
中文：${word.sentenceCn}

【重写要求】

1. **贴合单词的真实含义**：
   - 动词 → 用主谓宾或主谓结构体现动作（例：love → "I love my mom and dad."）
   - 名词 → 用 a/the + 名词体现指代（例：apple → "I eat an apple every day."）
   - 形容词 → 用 be + 形容词体现描述（例：happy → "The little cat is happy."）
   - 副词 → 修饰具体动作（例：quickly → "The rabbit runs quickly."）
   - **绝对不要**用 "The X lives in the wild." / "A X is a kind of animal." 这类无意义模板

2. **句长 6-14 个英文单词**，句子结构简单（多用主谓宾/There be/一般疑问/祈使句）。

3. **场景贴近儿童生活 + 多样化**：家庭、学校、食物、玩具、动物、游戏、天气、颜色、公园、超市、睡觉、穿衣、画画——**不要 70% 都用 "at the zoo"！** 根据单词含义选择最贴合的生活场景（如 eat→厨房/餐厅，sleep→卧室/床上，play→操场/客厅，sing→音乐课/家里，red→花园里的花）。同一个 batch 中尽量错开场景。

4. **单词在例句中要自然出现**，且用法要符合 meaning 字段描述。

5. **中文翻译**：6-24 字，简洁流畅，像日常说话。

6. **不要臆造词义**——只看 word + meaning，不要加入 meaning 没说的用法。

【输出要求】
严格以 JSON 格式返回（不要有任何额外文字、Markdown 标记、代码块）：
{"sentence": "...", "sentenceCn": "..."}`

  if (CONFIG.isMock) {
    return {
      sentence: `[MOCK] ${word.word} is fun to learn.`,
      sentenceCn: `[模拟]学 ${word.word} 很有趣。`,
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
      max_tokens: 256,
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
  if (!parsed.sentence || !parsed.sentenceCn) {
    throw new Error('JSON 字段缺失: ' + text.slice(0, 200))
  }

  // 校验句长
  const wordCount = parsed.sentence.trim().split(/\s+/).length
  if (wordCount < CONFIG.minSentenceWords || wordCount > CONFIG.maxSentenceWords) {
    throw new Error(`句长超限: ${wordCount} 词 (要求 ${CONFIG.minSentenceWords}-${CONFIG.maxSentenceWords}): ${parsed.sentence.slice(0, 60)}`)
  }
  const cnLen = parsed.sentenceCn.length
  if (cnLen < CONFIG.minCnChars || cnLen > CONFIG.maxCnChars) {
    throw new Error(`中译超限: ${cnLen} 字 (要求 ${CONFIG.minCnChars}-${CONFIG.maxCnChars}): ${parsed.sentenceCn.slice(0, 30)}`)
  }

  // 校验单词必须出现在例句中（支持单复数/ing/ed 变形：mussels/cracking/loved）
  const wordBase = word.word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wordRegex = new RegExp(`\\b${wordBase}(s|es|ed|ing|er|est)?\\b`, 'i')
  if (!wordRegex.test(parsed.sentence)) {
    throw new Error(`单词 "${word.word}" 未在例句中出现: ${parsed.sentence}`)
  }

  return parsed
}

// ===== 处理单词 =====
async function processWord(word, tracker) {
  // 已有结果 → 跳过
  const existing = loadResults()[word.id]
  if (existing?.sentence && existing?.sentenceCn) {
    tracker.setStatus(word.id, 'done', { fromCache: true })
    log(C.dim, 'SKIP', `#${word.id} ${word.word}`)
    return
  }

  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const result = await callLLM(word)
      saveResult(word.id, result)
      tracker.setStatus(word.id, 'done', {
        attempt,
        oldSentence: word.sentence,
        newSentence: result.sentence,
      })
      log(C.green, '✓', `#${word.id} ${word.word}: ${result.sentence.slice(0, 50)}`)
      return
    } catch (err) {
      const isRateLimit = err.message.includes('429') || err.message.includes('rate_limit')
      const backoff = isRateLimit ? 30000 + Math.random() * 15000 : 1500 * attempt  // rate limit 退避 30-45s
      log(C.yellow, '!', `#${word.id} ${word.word} attempt ${attempt}/${CONFIG.retries}${isRateLimit ? ' [429 RATE]' : ''}: ${err.message.slice(0, 80)} (sleep ${(backoff/1000).toFixed(1)}s)`)
      if (attempt === CONFIG.retries) {
        tracker.setStatus(word.id, 'failed', { error: err.message })
      } else {
        await new Promise(r => setTimeout(r, backoff))
      }
    }
  }
}

// ===== 并发控制 =====
async function processBatch(items, fn, concurrency) {
  const executing = new Set()
  for (const item of items) {
    const p = (async () => {
      await fn(item)
    })()
    executing.add(p)
    p.finally(() => executing.delete(p))
    if (executing.size >= concurrency) {
      await Promise.race(executing)
    }
  }
  await Promise.all(executing)
}

// ===== 应用结果到 words.ts =====
function applyToWordsTs() {
  const text = readFileSync(CONFIG.wordsFile, 'utf-8')
  const results = loadResults()
  let applied = 0
  let newText = text

  // 按 id 数字排序，定位每个 entry 的边界：{ ... "id": N ... }
  // 用单个 entry-level 正则，一次定位 sentence 和 sentenceCn 字段位置做精确替换
  const idKeys = Object.keys(results).map(Number).sort((a, b) => a - b)
  log(C.blue, 'APPLY', `待应用 ${idKeys.length} 条到 ${CONFIG.wordsFile}`)

  for (const id of idKeys) {
    const result = results[id]
    // 找到 "id": N 的位置
    const idMarker = `"id": ${id}`
    const idIdx = newText.indexOf(idMarker)
    if (idIdx < 0) {
      log(C.yellow, 'MISS', `id=${id} 在 words.ts 中找不到`)
      continue
    }

    // 从 id 位置往后找 "sentence": "..."
    const sentIdx = newText.indexOf('"sentence":', idIdx)
    if (sentIdx < 0) continue
    // 跳过 " 和空白
    let sentStart = newText.indexOf('"', sentIdx + '"sentence":'.length) + 1
    if (sentStart <= 0) continue
    // 找 sentence 字符串结束（下一个非转义 "）
    let sentEnd = sentStart
    while (sentEnd < newText.length) {
      if (newText[sentEnd] === '\\') { sentEnd += 2; continue }
      if (newText[sentEnd] === '"') break
      sentEnd++
    }

    // 从 sentence 结束往后找 "sentenceCn": "..."
    const cnIdx = newText.indexOf('"sentenceCn":', sentEnd)
    if (cnIdx < 0) continue
    let cnStart = newText.indexOf('"', cnIdx + '"sentenceCn":'.length) + 1
    if (cnStart <= 0) continue
    let cnEnd = cnStart
    while (cnEnd < newText.length) {
      if (newText[cnEnd] === '\\') { cnEnd += 2; continue }
      if (newText[cnEnd] === '"') break
      cnEnd++
    }

    // 构造安全的字符串值（转义 \ 和 "）
    const safeSentence = result.sentence.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const safeCn = result.sentenceCn.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

    // 替换：newText[sentStart..sentEnd] → safeSentence
    newText = newText.slice(0, sentStart) + safeSentence + newText.slice(sentEnd)
    // 替换后 cn 位置需要重新计算（因为 sentence 长度变了）
    const cnIdx2 = newText.indexOf('"sentenceCn":', sentStart)
    let cnStart2 = newText.indexOf('"', cnIdx2 + '"sentenceCn":'.length) + 1
    let cnEnd2 = cnStart2
    while (cnEnd2 < newText.length) {
      if (newText[cnEnd2] === '\\') { cnEnd2 += 2; continue }
      if (newText[cnEnd2] === '"') break
      cnEnd2++
    }
    newText = newText.slice(0, cnStart2) + safeCn + newText.slice(cnEnd2)
    applied++
  }

  writeFileSync(CONFIG.wordsFile, newText)
  log(C.green, 'APPLY', `已写入 ${applied}/${idKeys.length} 条到 ${CONFIG.wordsFile}`)
}

// ===== 主流程 =====
async function main() {
  const args = process.argv.slice(2)
  const isStatus = args.includes('--status')
  const isRetry = args.includes('--retry')
  const isApply = args.includes('--apply')
  const isMock = CONFIG.isMock
  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1]) || 8

  let targetIds = null
  const idsIdx = args.indexOf('--ids')
  if (idsIdx >= 0) targetIds = args[idsIdx + 1].split(',').map(Number)
  const pocIdx = args.indexOf('--poc')
  const pocCount = pocIdx >= 0 ? parseInt(args[pocIdx + 1]) || 10 : 0

  // 加载 words.ts
  const text = readFileSync(CONFIG.wordsFile, 'utf8')
  const words = parseWords(text)
  log(C.blue, 'INIT', `加载了 ${words.length} 个单词`)

  if (!CONFIG.apiKey && !isMock) {
    log(C.red, 'ERR', '未设置 MINIMAX_API_KEY 环境变量（或使用 MOCK=true）')
    process.exit(1)
  }

  log(C.blue, 'INIT', `API: ${CONFIG.apiUrl} | Model: ${CONFIG.model} | 并发=${CONFIG.concurrency}${isMock ? ' | MOCK' : ''}`)

  const tracker = new Tracker()
  tracker.registerWords(words)

  if (isApply) {
    applyToWordsTs()
    return
  }

  if (isStatus) {
    tracker.printStats()
    return
  }

  let workList = words
  if (isRetry) {
    workList = words.filter(w => tracker.data.words[w.id]?.status === 'failed')
    log(C.yellow, 'RETRY', `重新处理 ${workList.length} 个失败项`)
  } else if (targetIds) {
    workList = words.filter(w => targetIds.includes(w.id))
    log(C.yellow, 'IDS', `指定处理 ${workList.length} 个单词`)
  } else if (pocCount > 0) {
    workList = words.slice(0, pocCount)
    log(C.yellow, 'POC', `PoC 模式，处理前 ${pocCount} 个单词`)
  } else {
    workList = tracker.getPending(words)
    log(C.blue, 'BATCH', `待处理 ${workList.length}/${words.length} 个单词`)
  }

  if (workList.length === 0) {
    log(C.green, 'DONE', '所有任务已完成')
    return
  }

  const startTime = Date.now()
  await processBatch(workList, (word) => processWord(word, tracker), CONFIG.concurrency)
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  log(C.green, 'DONE', `完成 ${workList.length} 个单词，耗时 ${elapsed} 分钟`)
  tracker.printStats()

  log(C.cyan, 'NEXT', '下一步：node rewrite.mjs --apply 把结果写回 words.ts')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})