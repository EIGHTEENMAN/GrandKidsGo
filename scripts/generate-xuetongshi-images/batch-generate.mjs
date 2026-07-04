/**
 * 学通识真图 — 批量生成
 *
 * 用法：
 *   node batch-generate.mjs                      # 生成所有 topic
 *   node batch-generate.mjs --only batch1        # 只生成 batch1
 *   node batch-generate.mjs --ids solar-system,earth-moon  # 指定 topic
 *   node batch-generate.mjs --retry              # 重试失败项
 *
 * 环境变量：
 *   MINIMAX_API_KEY  MiniMax 文生图 key（必需）
 *   AI_PROVIDER=minimax（默认）
 *   DELAY=25000 每次 API 调用间隔（毫秒），默认 25s
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 加载 secrets.env
const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  const envText = readFileSync(userEnvPath, 'utf-8')
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const API_KEY = process.env.MINIMAX_API_KEY
const ENDPOINT = 'https://api.minimaxi.com/v1/image_generation'
const MODEL = 'image-01'
const DELAY = parseInt(process.env.DELAY || '25000', 10)

const OUT_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/knowledge')
const STATUS_FILE = resolve(__dirname, 'batch-status.json')

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

// 加载状态
function loadStatus() {
  if (existsSync(STATUS_FILE)) {
    return JSON.parse(readFileSync(STATUS_FILE, 'utf-8'))
  }
  return {}
}
function saveStatus(status) {
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
}

// 加载 topic 列表
function loadTopics(file) {
  return JSON.parse(readFileSync(resolve(__dirname, file), 'utf-8'))
}

// 颜色
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
function log(color, tag, msg) { console.log(`${color}[${tag}]${C.reset} ${msg}`) }

async function generateOne(topic) {
  const outPath = resolve(OUT_DIR, `${topic.id}.jpg`)
  if (existsSync(outPath) && process.argv.includes('--retry') === false) {
    log(C.dim, 'SKIP', `${topic.id} (${topic.title}) 已存在`)
    return { id: topic.id, status: 'exists' }
  }

  const start = Date.now()
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: topic.prompt,
        aspect_ratio: '16:9',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`HTTP ${response.status}: ${err.slice(0, 150)}`)
    }

    const data = await response.json()
    let buffer = null
    if (data.data?.image_base64?.[0]) {
      buffer = Buffer.from(data.data.image_base64[0], 'base64')
    } else if (data.data?.image_urls?.[0]) {
      const r = await fetch(data.data.image_urls[0])
      buffer = Buffer.from(await r.arrayBuffer())
    } else if (data.image_base64) {
      buffer = Buffer.from(data.image_base64, 'base64')
    } else {
      throw new Error('未识别响应结构')
    }

    writeFileSync(outPath, buffer)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    log(C.green, 'OK', `${topic.id} (${topic.title}) ${(buffer.length / 1024).toFixed(0)}KB ${elapsed}s`)
    return { id: topic.id, status: 'ok', size: buffer.length, time: elapsed }
  } catch (err) {
    log(C.red, 'FAIL', `${topic.id} (${topic.title}) - ${err.message}`)
    return { id: topic.id, status: 'fail', error: err.message }
  }
}

async function main() {
  if (!API_KEY) {
    log(C.red, 'ERROR', '未设置 MINIMAX_API_KEY')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const onlyIdx = args.indexOf('--only')
  const idsIdx = args.indexOf('--ids')
  const isRetry = args.includes('--retry')

  let topics = []
  if (onlyIdx >= 0) {
    const file = args[onlyIdx + 1] + '.json'
    topics = loadTopics(file)
  } else if (idsIdx >= 0) {
    const ids = args[idsIdx + 1].split(',')
    // 从所有 batch 文件加载
    const allFiles = ['topics-batch1.json', 'topics-batch2.json', 'topics-batch3.json']
    const all = []
    for (const f of allFiles) {
      const p = resolve(__dirname, f)
      if (existsSync(p)) all.push(...loadTopics(f))
    }
    topics = all.filter(t => ids.includes(t.id))
  } else {
    // 默认全部 batch
    const allFiles = ['topics-batch1.json', 'topics-batch2.json', 'topics-batch3.json']
    const all = []
    for (const f of allFiles) {
      const p = resolve(__dirname, f)
      if (existsSync(p)) all.push(...loadTopics(f))
    }
    topics = all
  }

  log(C.cyan, 'INFO', `待生成: ${topics.length} 个 topic`)
  if (isRetry) log(C.yellow, 'INFO', '重试模式：跳过已存在')

  const status = loadStatus()
  const results = []

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i]
    log(C.blue, `[${i + 1}/${topics.length}]`, `生成 ${t.id}`)
    const r = await generateOne(t)
    status[t.id] = r
    results.push(r)
    saveStatus(status)

    // 间隔
    if (i < topics.length - 1) {
      log(C.dim, 'WAIT', `${DELAY / 1000}s 后继续...`)
      await new Promise(r => setTimeout(r, DELAY))
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  const fail = results.filter(r => r.status === 'fail').length
  const skip = results.filter(r => r.status === 'exists').length
  log(C.cyan, 'DONE', `完成: ok=${ok} fail=${fail} skip=${skip}`)

  if (fail > 0) {
    log(C.yellow, 'HINT', '失败项可重跑: node batch-generate.mjs --retry')
  }
}

main().catch(err => {
  log(C.red, 'FATAL', err.message)
  process.exit(1)
})
