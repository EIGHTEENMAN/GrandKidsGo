/**
 * 学通识真图 — 并发批量生成
 *
 * 用法：
 *   node parallel-generate.mjs                      # 全量 430 张（4 并发）
 *   node parallel-generate.mjs --workers 8          # 8 并发
 *   node parallel-generate.mjs --limit 50           # 只跑 50 张（测试）
 *   node parallel-generate.mjs --skip-existing      # 跳过已存在
 *   node parallel-generate.mjs --retry              # 重试失败
 *
 * 环境变量：
 *   MINIMAX_API_KEY  MiniMax 文生图 key
 *   PARALLEL=4       并发数（默认 4）
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

// CLI 参数
const args = process.argv.slice(2)
const workersArg = args.indexOf('--workers')
const limitArg = args.indexOf('--limit')
const isSkipExisting = args.includes('--skip-existing')
const isRetry = args.includes('--retry')

const WORKERS = workersArg >= 0 ? parseInt(args[workersArg + 1], 10) : parseInt(process.env.PARALLEL || '4', 10)
const LIMIT = limitArg >= 0 ? parseInt(args[limitArg + 1], 10) : Infinity

const KNOWLEDGE_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/knowledge')
const SECTIONS_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/sections')
if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true })
if (!existsSync(SECTIONS_DIR)) mkdirSync(SECTIONS_DIR, { recursive: true })

const STATUS_FILE = resolve(__dirname, 'parallel-status.json')
const TASKS_FILE = resolve(__dirname, 'all-topics.json')

// 加载状态
function loadStatus() {
  if (existsSync(STATUS_FILE)) return JSON.parse(readFileSync(STATUS_FILE, 'utf-8'))
  return {}
}
function saveStatus(status) {
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
}

// 加载所有任务
function loadTasks() {
  const all = JSON.parse(readFileSync(TASKS_FILE, 'utf-8'))
  const tasks = []

  for (const topic of all.topics) {
    // 父 topic 图 → /images/knowledge/{id}.jpg
    tasks.push({
      type: 'topic',
      id: topic.id,
      outPath: resolve(KNOWLEDGE_DIR, `${topic.id}.jpg`),
      prompt: buildPrompt(topic, true),
    })

    // section 图 → /images/sections/{parentId}-{sectionId}.jpg
    for (const secId of topic.sections) {
      tasks.push({
        type: 'section',
        id: secId,
        parentId: topic.id,
        outPath: resolve(SECTIONS_DIR, `${topic.id}-${secId}.jpg`),
        prompt: buildPrompt({ ...topic, id: secId }, false),
      })
    }
  }
  return tasks
}

// 生成 prompt（中文写实水彩风）
function buildPrompt(item, isTopic) {
  const baseStyle = `写实水彩画风格，色彩饱和但柔和，适合 6-12 岁儿童科普插图。\n严禁要求：\n- 禁止任何文字、字母、数字、汉字、符号\n- 不要任何标签、注释、说明、图例\n- 不要水印、签名、边框\n- 16:9 横构图`
  if (isTopic) {
    return `${baseStyle}\n\n主题：${item.title}（${item.category}）\n${item.summary ? `内容：${item.summary}` : ''}\n\n画面要求：\n- 主体鲜明、占据画面 1/3 以上\n- 色彩饱和但不过分刺眼\n- 细节丰富、激发好奇心`
  } else {
    return `${baseStyle}\n\n知识点：${item.title} - ${item.id}\n${item.summary ? `背景：${item.summary}` : ''}\n\n画面要求：\n- 具体场景或概念可视化\n- 主体清晰可辨\n- 适合儿童理解`
  }
}

// 颜色
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}

async function generateOne(task) {
  if (existsSync(task.outPath) && !isRetry) {
    return { id: task.id, status: 'skip', path: task.outPath }
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
        prompt: task.prompt,
        aspect_ratio: '16:9',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`HTTP ${response.status}: ${err.slice(0, 100)}`)
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
      throw new Error('未识别响应')
    }

    writeFileSync(task.outPath, buffer)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    return { id: task.id, status: 'ok', size: buffer.length, time: elapsed }
  } catch (err) {
    return { id: task.id, status: 'fail', error: err.message }
  }
}

async function main() {
  if (!API_KEY) {
    console.error('❌ 未设置 MINIMAX_API_KEY')
    process.exit(1)
  }

  let tasks = loadTasks()
  if (isSkipExisting || !isRetry) {
    tasks = tasks.filter(t => !existsSync(t.outPath))
  }
  if (isRetry) {
    // 只重试失败的（从状态读）
    const status = loadStatus()
    tasks = tasks.filter(t => status[t.id]?.status === 'fail')
  }
  if (tasks.length > LIMIT) {
    tasks = tasks.slice(0, LIMIT)
  }

  console.log(`\n📊 任务统计`)
  console.log(`   并发: ${WORKERS}`)
  console.log(`   待生成: ${tasks.length}`)
  console.log(`   模式: ${isRetry ? '重试' : isSkipExisting ? '跳过' : '全量'}`)
  console.log(`   预估: ${(tasks.length * 50 / WORKERS / 60).toFixed(1)} 分钟\n`)

  const status = loadStatus()
  const results = []
  let index = 0
  const startTime = Date.now()

  // Worker 池
  async function worker(id) {
    while (true) {
      const i = index++
      if (i >= tasks.length) return
      const t = tasks[i]
      const r = await generateOne(t)
      status[t.id] = r
      results.push(r)
      const total = results.length
      const ok = results.filter(x => x.status === 'ok').length
      const fail = results.filter(x => x.status === 'fail').length
      const skip = results.filter(x => x.status === 'skip').length
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
      const eta = ((tasks.length - total) * 50 / WORKERS / 60).toFixed(1)
      const tag = r.status === 'ok' ? C.green : r.status === 'fail' ? C.red : C.dim
      console.log(`${tag}[${id}]${C.reset} [${total}/${tasks.length}] ${t.id} → ${r.status} ${r.size ? r.size+'B' : ''} ${r.time ? r.time+'s' : ''} | ok=${ok} fail=${fail} skip=${skip} | ${elapsed}min 剩 ${eta}min`)
      saveStatus(status)
    }
  }

  const workers = Array.from({ length: WORKERS }, (_, i) => worker(`W${i + 1}`))
  await Promise.all(workers)

  const ok = results.filter(r => r.status === 'ok').length
  const fail = results.filter(r => r.status === 'fail').length
  const skip = results.filter(r => r.status === 'skip').length
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\n✅ 完成 ok=${ok} fail=${fail} skip=${skip} 总耗时 ${totalTime}min`)
  if (fail > 0) console.log(`💡 重跑失败: node parallel-generate.mjs --retry`)
}

main().catch(err => {
  console.error('FATAL', err.message)
  process.exit(1)
})
