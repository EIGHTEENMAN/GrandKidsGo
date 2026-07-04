/**
 * 诗词讲解词生成器
 *
 * 为 905+ 首诗生成「讲解词」（100-150 字）并合并到现有 translation 字段。
 *
 * 用法：
 *   node commentary.mjs              # 批量生成所有诗的讲解词
 *   node commentary.mjs --poc 1004   # PoC 验证，只处理 ID=1004
 *   node commentary.mjs --ids 1,2,3   # 指定 ID
 *   node commentary.mjs --status     # 查看进度
 *
 * 输出：
 *   修改原 poems-data.json，translation 字段从「纯译文」变成「译文 + 讲解词」
 *
 * 成本估算：
 *   - 906 段 × ~150 字讲解 = ~140K 字符输出
 *   - Claude Sonnet 输入 ~200K（原文+现有译文+历史讲解词 prompt）
 *   - 一次性约 ¥3-5
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ===== 配置 =====
const CONFIG = {
  // 输入/输出文件
  inputFile: resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json'),
  outputFile: resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data-with-commentary.json'),
  // 备份原始文件
  backupFile: resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.original.json'),
  // MiniMax Claude API (复用 ANTHROPIC_BASE_URL)
  apiUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || '',
  model: process.env.ANTHROPIC_MODEL || 'MiniMax-M3',
  // 生成参数
  batchSize: 8,        // 每批请求的诗数
  concurrency: 3,       // 批间并发
  maxRetries: 3,
  // 讲解词长度
  targetLength: 120,    // 目标 100-150 字
  // 状态文件
  statusFile: resolve(__dirname, 'commentary-status.json'),
}

// ===== 颜色 =====
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

// ===== 状态管理 =====
class Status {
  constructor() {
    this.file = CONFIG.statusFile
    this.data = existsSync(this.file)
      ? JSON.parse(readFileSync(this.file, 'utf-8'))
      : { done: {}, failed: {}, totalCost: 0 }
  }
  markDone(key, commentary) {
    this.data.done[key] = { commentary, at: new Date().toISOString() }
    this._save()
  }
  markFailed(key, error) {
    this.data.failed[key] = { error: String(error).slice(0, 200), at: new Date().toISOString() }
    this._save()
  }
  isDone(key) { return !!this.data.done[key] }
  _save() { writeFileSync(this.file, JSON.stringify(this.data, null, 2)) }
  printStats() {
    const done = Object.keys(this.data.done).length
    const failed = Object.keys(this.data.failed).length
    log(C.cyan, '状态', `已完成 ${done} 段，失败 ${failed} 段`)
  }
}

// ===== LLM 调用 =====
async function callClaude(prompt, systemPrompt) {
  if (!CONFIG.apiKey) throw new Error('ANTHROPIC_AUTH_TOKEN not set')

  const resp = await fetch(`${CONFIG.apiUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.apiKey,
      'anthropic-version': '2023-06-01',
      'authorization': `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`)
  }
  const data = await resp.json()
  return data.content?.[0]?.text || ''
}

// ===== 批量生成讲解词 =====
const SYSTEM_PROMPT = `你是一位擅长讲解古诗词的国学老师，风格温和亲切，擅长用孩子能听懂的语言讲透诗词。

任务：为每首诗写一段「讲解词」，要求：
1. 长度 100-150 字（不要超过 150 字）
2. 内容包含：创作背景 / 作者处境（1 句话）+ 核心意象解读（1 句话）+ 名句或主题点题（1 句话）
3. 风格：适合亲子共读，可以引用原句但用括号注明
4. 不要重复已有译文/赏析的内容
5. **直接讲内容，不要以"这首诗"或诗题/作者名开头** —— 从"年代背景"或"诗人处境"切入
6. 输出 JSON 数组，**严格 JSON 格式**，不要任何 markdown 包裹或解释文字
7. **commentary 内部不要用单引号，所有引号用「」或不用**

禁止的写法：
- "《关雎》出自《诗经》" ❌（不要提诗题）
- "这首诗讲的是..." ❌（不要"这首诗"开头）
- "李白这首诗..." ❌（不要"作者这首诗"开头）

正确写法：直接从背景/作者处境开始：
- "出自《诗经》，是古人集体创作的诗歌，距今已有两千多年" ✅
- "杨万里晚年闲居乡间，登山途中借景说理" ✅
- "这是李白二十六岁离开家乡扬州时所作" ✅

示例输入：
诗题：静夜思  作者：李白  朝代：唐
原文：床前明月光，疑是地上霜。举头望明月，低头思故乡。
现有译文：明亮的月光洒在窗户纸上...

示例输出（必须是合法 JSON 数组）：
[{"idx":0,"commentary":"这是李白二十六岁离开家乡扬州时所作。诗人用「霜」来形容月光，写出深秋夜里的清冷与孤寂。一个「疑」字用得极妙——明明是光，却疑为霜，足见诗人对故乡月色记忆之深。整首诗没有「思」字，却句句都在思念家乡。"}]`

async function generateCommentaryBatch(poems, status) {
  // 构建 prompt
  const items = poems.map((p, idx) => {
    const sec = p.sections[0]
    return {
      idx,
      key: `${p.id}-${sec.id}`,
      title: p.title,
      author: p.author,
      dynasty: p.dynasty,
      original: sec.original,
      translation: sec.translation,
    }
  })

  const userPrompt = `请为以下 ${items.length} 首诗生成讲解词。严格按 JSON 数组格式输出，不要任何其他文字：

${JSON.stringify(items, null, 2)}

输出格式（必须是合法 JSON）：
[
  {"idx": 0, "commentary": "..."},
  {"idx": 1, "commentary": "..."},
  ...
]`

  let text = await callClaude(userPrompt, SYSTEM_PROMPT)

  // 提取 JSON（处理可能的 markdown 包裹）
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('LLM 输出无 JSON 数组: ' + text.slice(0, 200))
  let results
  try {
    results = JSON.parse(jsonMatch[0])
  } catch (e) {
    // 修复常见 JSON 错误：单引号、尾部逗号、未转义引号
    let cleaned = jsonMatch[0]
      .replace(/，/g, ',')   // 全角逗号
      .replace(/：/g, ':')   // 全角冒号
    try {
      results = JSON.parse(cleaned)
    } catch (e2) {
      // 终极修复：尝试将内嵌中文双引号"替换为「」
      cleaned = cleaned.replace(/"(?=[^"]*"\s*[:,}\]])/g, '「')
        .replace(/(?<=[{,:\s])"/g, '「')
        .replace(/"(?=\s*[,}\]])/g, '」')
      try {
        results = JSON.parse(cleaned)
      } catch (e3) {
        throw new Error(`JSON 解析失败: ${e.message} | 原始: ${jsonMatch[0].slice(0, 200)}`)
      }
    }
  }

  return results
}

// ===== 主流程 =====
async function main() {
  const args = process.argv.slice(2)
  const isPoc = args.includes('--poc')
  const pocId = isPoc ? parseInt(args[args.indexOf('--poc') + 1]) : null
  const idsIdx = args.indexOf('--ids')
  const specifiedIds = idsIdx >= 0 ? args[idsIdx + 1].split(',').map(s => parseInt(s.trim())) : null
  const isStatus = args.includes('--status')

  // 检查 API Key
  if (!CONFIG.apiKey) {
    log(C.red, '错误', '未设置 ANTHROPIC_AUTH_TOKEN')
    process.exit(1)
  }

  // 加载诗词
  if (!existsSync(CONFIG.inputFile)) {
    log(C.red, '错误', `未找到 ${CONFIG.inputFile}`)
    process.exit(1)
  }
  const poems = JSON.parse(readFileSync(CONFIG.inputFile, 'utf-8'))
  log(C.blue, '加载', `${poems.length} 首诗`)

  // 备份原始文件（仅首次）
  if (!existsSync(CONFIG.backupFile)) {
    writeFileSync(CONFIG.backupFile, readFileSync(CONFIG.inputFile))
    log(C.dim, '备份', CONFIG.backupFile)
  }

  const status = new Status()
  if (isStatus) {
    status.printStats()
    return
  }

  // 筛选待处理
  let target = poems
  if (pocId) {
    target = poems.filter(p => p.id === pocId)
    log(C.cyan, 'PoC', `处理 ID=${pocId}`)
  } else if (specifiedIds) {
    target = poems.filter(p => specifiedIds.includes(p.id))
    log(C.cyan, '指定', `处理 ${target.length} 首诗`)
  } else {
    target = poems.filter(p => p.sections?.[0]?.translation && !status.isDone(`${p.id}-${p.sections[0].id}`))
    log(C.cyan, '批量', `待处理 ${target.length} 首诗`)
  }

  if (target.length === 0) {
    log(C.yellow, '提示', '没有待处理项')
    return
  }

  // PoC 模式：单条处理
  if (pocId) {
    try {
      const results = await generateCommentaryBatch(target, status)
      log(C.green, '成功', 'PoC 输出：')
      console.log(JSON.stringify(results, null, 2))
      for (const r of results) {
        const key = `${target[r.idx].id}-${target[r.idx].sections[0].id}`
        status.markDone(key, r.commentary)
      }
    } catch (err) {
      log(C.red, '失败', err.message)
    }
    return
  }

  // 批量模式：每批 8 首诗
  const startTime = Date.now()
  let processed = 0, success = 0, failed = 0
  const failures = []

  for (let i = 0; i < target.length; i += CONFIG.batchSize) {
    const batch = target.slice(i, i + CONFIG.batchSize)
    try {
      const results = await generateCommentaryBatch(batch, status)
      for (const r of results) {
        const p = batch[r.idx]
        if (!p) continue
        const sec = p.sections[0]
        const key = `${p.id}-${sec.id}`
        status.markDone(key, r.commentary)
        success++
      }
    } catch (err) {
      for (const p of batch) {
        const key = `${p.id}-${p.sections[0].id}`
        status.markFailed(key, err.message)
        failed++
        failures.push({ key, error: err.message.slice(0, 100) })
      }
    }
    processed += batch.length
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const pct = ((processed / target.length) * 100).toFixed(1)
    if (target.length > 50) {
      log(C.cyan, '进度', `[${processed}/${target.length}] ${pct}% 成功:${success} 失败:${failed} 耗时:${elapsed}s`)
    }

    // 速率限制：每批间隔 200ms
    if (i + CONFIG.batchSize < target.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // 汇总
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n' + '='.repeat(60))
  log(C.green, '汇总', `处理 ${processed} 首，成功 ${success}，失败 ${failed}（耗时 ${elapsed}s）`)
  if (failures.length > 0) {
    console.log('\n失败列表（前 10）：')
    for (const f of failures.slice(0, 10)) console.log(`  ${f.key}: ${f.error}`)
  }
  console.log('='.repeat(60))
  console.log('\n下一步：')
  console.log('  node commentary.mjs --status       # 查看进度')
  console.log('  # 待全部完成后，运行 merge.mjs 合并到 poems-data.json')
}

main().catch(err => {
  console.error(`\n${C.red}❌ 异常:${C.reset}`, err)
  process.exit(1)
})
