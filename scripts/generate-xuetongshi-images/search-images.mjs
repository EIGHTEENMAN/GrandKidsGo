/**
 * 学通识真图 — 多源搜索 v2（写实照片风格）
 *
 * 数据源（按优先级）：
 *   1. 中文维基百科 zh.wikipedia.org
 *   2. 英文维基百科 en.wikipedia.org
 *   3. AI 兜底（MiniMax image-01，写实摄影 prompt）
 *
 * 风格 v2（2026-06-24 修订）：
 *   - 删除原水彩画风 prompt，改写实摄影风格
 *   - 对标 DK / National Geographic Kids 儿童百科
 *   - 严禁插画/水彩/卡通/3D 渲染
 *   - Canon EOS R5 + 85mm f/1.4 + 黄金时段光线
 *
 * 用法：
 *   node search-images.mjs                    # 全量搜 243 topic + 18248 section
 *   node search-images.mjs --only topics      # 只搜 243 topic 封面
 *   node search-images.mjs --ids solar-system,human-body  # 指定 topic
 *   node search-images.mjs --source wiki      # 强制只用维基
 *   node search-images.mjs --source ai        # 强制只用 AI
 *   node search-images.mjs --retry            # 重试空文件
 *   node search-images.mjs --limit 10          # 只跑前 10 个
 *   node search-images.mjs --replace          # 覆盖现有 jpg
 *
 * 输出：apps/xuetongshi/public/images/knowledge/{id}.jpg
 *       apps/xuetongshi/public/images/sections/{parentId}-{sectionId}.jpg
 *
 * 环境变量：
 *   MINIMAX_API_KEY  AI 兜底时需要
 *   DELAY=3000       API 调用间隔（毫秒）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { resolve, dirname, join, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

// secrets.env
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
const DELAY = parseInt(process.env.DELAY || '3000', 10)
const TARGET_SIZE = { width: 800, height: 600 }  // 4:3 适配详情页
const MIN_FILE_SIZE = 30000  // 30KB
const MAX_FILE_SIZE = 500 * 1024  // 500KB
const MIN_DOWNLOAD_SIZE = 10000  // 10KB 视作空

const KNOWLEDGE_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/knowledge')
const SECTIONS_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/sections')
// 用真实 section 数据（all-sections.json 由 extract-sections-v2.mjs 从 knowledge.ts 解析）
const TASKS_FILE = resolve(__dirname, 'all-sections.json')
const STATUS_FILE = resolve(__dirname, 'search-status.json')

if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true })
if (!existsSync(SECTIONS_DIR)) mkdirSync(SECTIONS_DIR, { recursive: true })

// CLI 参数
const args = process.argv.slice(2)
const onlyIdx = args.indexOf('--only')
const idsIdx = args.indexOf('--ids')
const sourceIdx = args.indexOf('--source')
const isRetry = args.includes('--retry')
const isReplace = args.includes('--replace')
const limitIdx = args.indexOf('--limit')

const onlyMode = onlyIdx >= 0 ? args[onlyIdx + 1] : null  // 'topics' | 'sections' | null
const ids = idsIdx >= 0 ? args[idsIdx + 1].split(',') : null
const source = sourceIdx >= 0 ? args[sourceIdx + 1] : 'auto'  // auto/wiki/ai
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity

// ============ 颜色 ============
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
function log(color, tag, msg) { console.log(`${color}[${tag}]${C.reset} ${msg}`) }

// ============ 状态管理 ============
function loadStatus() {
  if (existsSync(STATUS_FILE)) return JSON.parse(readFileSync(STATUS_FILE, 'utf-8'))
  return {}
}
function saveStatus(status) { writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2)) }

// ============ 任务加载 ============
function loadTasks() {
  const all = JSON.parse(readFileSync(TASKS_FILE, 'utf-8'))
  const tasks = []
  for (const t of all.topics) {
    if (!onlyMode || onlyMode === 'topics') {
      tasks.push({
        type: 'topic',
        id: t.id,
        outPath: resolve(KNOWLEDGE_DIR, `${t.id}.jpg`),
        title: t.title,
        category: t.category,
        summary: t.summary,
        parentId: null,
      })
    }
    if (!onlyMode || onlyMode === 'sections') {
      for (const sec of t.sections) {
        tasks.push({
          type: 'section',
          id: sec.id,
          parentId: t.id,
          outPath: resolve(SECTIONS_DIR, `${t.id}-${sec.id}.jpg`),
          title: sec.title,
          category: t.category,
          summary: sec.summary || '',
          description: sec.content, // 完整 content 给 AI prompt（section.summary 为空，用 content）
        })
      }
    }
  }
  return tasks
}

// ============ 维基搜索 ============
const UA = 'HaodaerBot/1.0 (https://grandand.com; contact@grandand.com)'

async function fetchWikiPageImg(query, lang = 'zh') {
  // 用 thumbnail API 直接拿 800px 缩略图，避免下载 20MB 原图
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
    action: 'query', format: 'json', prop: 'pageimages',
    piprop: 'thumbnail|original', pithumbsize: '800',
    redirects: '1', titles: query,
  })
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const data = await res.json()
  const pages = data.query?.pages || {}
  for (const k of Object.keys(pages)) {
    const page = pages[k]
    // 优先 thumbnail（小），回退到 original（大但仍可控）
    const source = page.thumbnail?.source || page.original?.source
    if (source) {
      return {
        url: source,
        width: page.thumbnail?.width || page.original?.width || 0,
        height: page.thumbnail?.height || page.original?.height || 0,
        title: page.title,
        lang,
      }
    }
  }
  return null
}

async function fetchCommonsLicense(fileUrl) {
  // fileUrl 形如 https://upload.wikimedia.org/wikipedia/commons/xx/yy/Filename.ext
  // 提取 File:Filename.ext 部分查询 license
  const m = fileUrl.match(/\/wikipedia\/commons\/[^\/]+\/[^\/]+\/(.+)$/)
  if (!m) return null
  const filename = m[1]
  const url = `https://commons.wikimedia.org/w/api.php?` + new URLSearchParams({
    action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'extmetadata',
    titles: `File:${filename}`,
  })
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const data = await res.json()
  const pages = data.query?.pages || {}
  for (const k of Object.keys(pages)) {
    const meta = pages[k].imageinfo?.[0]?.extmetadata || {}
    return {
      license: meta.LicenseShortName?.value || '',
      artist: meta.Artist?.value || '',
      attribution: meta.AttributionRequired?.value || '',
    }
  }
  return null
}

// 中文 title 剥后缀（常见学术化全称）
function simplifyZhTitle(title) {
  const suffixes = ['的奥秘', '的秘密', '之谜', '概览', '入门', '基础',
                    '的结构', '的演化', '的形成', '的构造', '的分类',
                    '的世界', '探秘', '探奇', '的故事', '简史', '大全']
  for (const s of suffixes) {
    if (title.endsWith(s)) return title.slice(0, -s.length)
  }
  return title
}

// category-aware 关键词扩展：电路/物理/经济等抽象类，AI 兜底容易跑偏
// 在 wiki 搜不到时，给出更可能命中的兜底搜索词
function expandByCategory(title, category) {
  const expansions = {
    '科学': [title + '电路', title + '图', title + '示意图', 'Electric ' + title, 'Physical ' + title],
    '经济': [title + '概念', title + '图示', title + '示例', 'Finance ' + title, 'Money ' + title],
    '逻辑思维': [title + '示意图', title + '例子', title + '示例'],
    '科技工程': [title + '图', title + '结构', title + '工作原理'],
    '健康生活': [title + '示意图', title + '示例', title + '健康'],
    '地理': [title + '地图', title + '地形', title + '景观', title + '河'],
    '语言文字': [title + '典故', title + '故事', title + '示例'],
  }
  return expansions[category] || []
}

async function searchWiki(task) {
  // v3：全类目都搜，topic 和 section 都搜
  // 链路：category-aware 兜底词优先（电路/经济类需要具体名词）→ title → 剥后缀 → en wiki

  const candidates = []

  // 1. category-aware 扩展（电路/经济/物理类必须放最前，AI 兜底完全不可用）
  if (task.type === 'section' && task.category) {
    const expanded = expandByCategory(task.title, task.category)
    candidates.push(...expanded)
  }

  // 2. title 直查
  candidates.push(task.title)

  // 3. 剥后缀
  const simplified = simplifyZhTitle(task.title)
  if (simplified !== task.title) candidates.push(simplified)

  // 1) 中文 wiki：用每个候选 title 查 pageimages
  for (const cand of candidates) {
    const result = await fetchWikiPageImg(cand, 'zh')
    if (result) return result
  }

  // 2) 英文 wiki：通过 langlinks 拿英文标题（只对原始 title 试）
  for (const cand of candidates) {
    const enTitle = await fetchZhEnLink(cand)
    if (enTitle) {
      const result = await fetchWikiPageImg(enTitle, 'en')
      if (result) return result
    }
  }

  return null
}

// 中文 wiki → 英文 wiki 标题（通过 langlinks API）
async function fetchZhEnLink(zhTitle) {
  const url = `https://zh.wikipedia.org/w/api.php?` + new URLSearchParams({
    action: 'query', format: 'json', prop: 'langlinks', lllang: 'en',
    redirects: '1', titles: zhTitle,
  })
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const data = await res.json()
    const pages = data.query?.pages || {}
    for (const k of Object.keys(pages)) {
      const ll = pages[k].langlinks?.[0]?.['*']
      if (ll) return ll
    }
  } catch (e) {}
  return null
}

// ============ AI 兜底 ============
async function generateAI(task) {
  // v4 友好科普插图风（强化文字禁令 + 类别细化）
  // 2026-06-24 修订：解决 v3 的 bc5 串联、bc6 并联等跑偏/带英文问题
  const baseStyle = `A simple, clear, friendly children's science illustration in a flat cartoon style with soft pastel colors. Think Usborne Look Inside or DK Eyewitness style — NOT photorealistic, NOT watercolor, NOT sketchy, NOT abstract.

ABSOLUTE PROHIBITIONS (these MUST NOT appear in the image):
- ZERO text of any kind: no English letters, no Chinese characters, no numbers, no symbols, no math formulas, no scientific notation, no watermarks, no signatures, no labels, no annotations, no captions, no legends, no borders, no signs, no banners
- NO abstract metaphors, no random body parts, no unrelated objects
- NO scary imagery (no blood, no wounds, no weapons, no violence)
- The image MUST depict the actual subject directly, not symbols or metaphors

Composition:
- 16:9 horizontal, simple flat cartoon illustration
- One clear main subject occupying 1/3+ of frame
- Soft pastel palette (pink, peach, sky blue, mint, cream, lavender)
- Clean outlines, simplified shapes suitable for children aged 6-12`

  // 类别特化（避免跑偏）
  const categoryHint = task.category ? {
    '科学': ' For science topics: show real-world objects or simple scientific phenomena (e.g. circuits, planets, animals, plants), NOT abstract symbols.',
    '历史人物': ' For historical figures: show a portrait-style depiction of the person in appropriate historical dress, NO modern settings.',
    '地理': ' For geography: show the actual landscape or famous landmark with natural colors.',
    '自然': ' For nature topics: show real animals or plants in their natural habitat.',
    '经济': ' For economics: show real objects like coins, markets, shops — NOT abstract diagrams.',
    '逻辑思维': ' For logic topics: show simple real-world scenes or objects that illustrate the concept.',
    '艺术': ' For art topics: show artistic objects like paintings, instruments, crafts.',
    '健康生活': ' For health topics: show friendly depictions of body, food, exercise — NO scary medical imagery.',
    '语言文字': ' For language topics: NO Chinese characters or text in image — show illustrations of stories or objects only.',
    '科技工程': ' For technology: show real devices, machines, vehicles, buildings.',
    '中国传统文化': ' For Chinese culture: show traditional Chinese cultural objects or scenes (NOT generic Asian imagery).',
  }[task.category] || '' : ''

  const prompt = task.type === 'topic'
    ? `${baseStyle}${categoryHint}

Subject: ${task.title} (${task.category})
${task.summary ? `Context: ${task.summary}` : ''}

DEPICT THE SUBJECT LITERALLY — show "${task.title}" directly, not a metaphor.`
    : `${baseStyle}${categoryHint}

Subject: ${task.title}
${task.description ? `Context: ${task.description.slice(0, 200)}` : task.summary ? `Context: ${task.summary}` : ''}

DEPICT "${task.title}" LITERALLY — show the actual thing or scene described above, not an abstract collage or unrelated objects. The image must contain elements DIRECTLY related to "${task.title}". Use the context description to understand what to draw.`

  const res = await fetch('https://api.minimaxi.com/v1/image_generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: 'image-01', prompt, aspect_ratio: '16:9' }),
  })
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`)
  const data = await res.json()
  let buffer = null
  if (data.data?.image_base64?.[0]) {
    buffer = Buffer.from(data.data.image_base64[0], 'base64')
  } else if (data.data?.image_urls?.[0]) {
    const r = await fetch(data.data.image_urls[0])
    buffer = Buffer.from(await r.arrayBuffer())
  } else if (data.image_base64) {
    buffer = Buffer.from(data.image_base64, 'base64')
  } else {
    throw new Error('AI 未识别响应')
  }
  return { buffer, source: 'ai' }
}

// ============ 图像处理 ============
// 检测全黑/全白图（API 偶发返回空响应）
async function isBlankImage(buffer) {
  try {
    const { data, info } = await sharp(buffer).resize(50, 50).raw().toBuffer({ resolveWithObject: true })
    // 计算平均亮度（0-255）
    let sum = 0
    for (const v of data) sum += v
    const avg = sum / data.length
    // 平均亮度 < 5 或 > 250 视为空白图
    return avg < 5 || avg > 250
  } catch (e) {
    return false
  }
}

async function processImage(buffer, format) {
  // wiki thumb 已是 800px，AI 输出也是 800+；这里只做 jpg 压缩
  // 仅对超过 1600px 的图才 resize（兜底：某些 wiki 原图可能很大）
  const image = sharp(buffer)
  const meta = await image.metadata()
  if ((meta.width || 0) > 1600 || (meta.height || 0) > 1600) {
    image.resize({
      width: 800, height: 600, fit: 'inside', withoutEnlargement: true,
    })
  }
  return await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer()
}

// ============ 主处理流程 ============
async function processTask(task) {
  // 跳过已存在（除非 --retry 或 --replace）
  if (existsSync(task.outPath) && !isRetry && !isReplace) {
    return { id: task.id, status: 'skip' }
  }

  // 1) 维基搜索
  if (source === 'auto' || source === 'wiki') {
    try {
      const wiki = await searchWiki(task)
      if (wiki) {
        const imgRes = await fetch(wiki.url, { headers: { 'User-Agent': UA } })
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          if (buf.length > MIN_DOWNLOAD_SIZE) {
            const processed = await processImage(buf)
            writeFileSync(task.outPath, processed)
            const license = await fetchCommonsLicense(wiki.url).catch(() => null)
            return {
              id: task.id, status: 'ok', source: 'wiki',
              size: processed.length, lang: wiki.lang,
              license: license?.license || '',
              artist: license?.artist || '',
            }
          }
        }
      }
    } catch (err) {
      log(C.yellow, 'WIKI-ERR', `${task.id} - ${err.message}`)
    }
  }

  // 2) AI 兜底
  if (source === 'auto' || source === 'ai') {
    if (!API_KEY) {
      return { id: task.id, status: 'fail', error: 'no API key for AI fallback' }
    }
    try {
      const { buffer } = await generateAI(task)
      const processed = await processImage(buffer)
      // Sanity check：全黑/全白图视为失败（API 偶发返回空响应）
      if (await isBlankImage(processed)) {
        return { id: task.id, status: 'fail', error: 'blank image (all-black/white)' }
      }
      writeFileSync(task.outPath, processed)
      return { id: task.id, status: 'ok', source: 'ai', size: processed.length }
    } catch (err) {
      return { id: task.id, status: 'fail', error: err.message }
    }
  }

  return { id: task.id, status: 'fail', error: 'no source matched' }
}

async function main() {
  let tasks = loadTasks()
  if (ids) tasks = tasks.filter(t => ids.includes(t.id) || ids.includes(t.parentId))
  if (isRetry) {
    const status = loadStatus()
    tasks = tasks.filter(t => status[t.id]?.status === 'fail')
  }
  if (tasks.length > limit) tasks = tasks.slice(0, limit)

  log(C.cyan, 'INFO', `待处理: ${tasks.length} 个任务`)
  log(C.cyan, 'INFO', `来源: ${source} | 模式: ${onlyMode || 'all'} | 替换: ${isReplace}`)

  const status = loadStatus()
  const results = []
  const startTime = Date.now()

  // 并发池（5 worker，wiki+AI 混合负载 OK）
  const WORKERS = parseInt(process.env.WORKERS || '5', 10)
  let index = 0

  async function worker(id) {
    while (true) {
      const i = index++
      if (i >= tasks.length) return
      const t = tasks[i]
      if (!t.id) {
        log(C.red, 'BAD', `task id undefined: ${JSON.stringify(t).slice(0, 200)}`)
        continue
      }
      const r = await processTask(t)
      status[t.id] = r
      results.push(r)
      const total = results.length
      const ok = results.filter(x => x.status === 'ok').length
      const fail = results.filter(x => x.status === 'fail').length
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
      const eta = ((tasks.length - total) * (elapsed / Math.max(total, 1))).toFixed(1)
      if (r.status === 'ok') {
        const tag = r.source === 'wiki' ? C.green : C.cyan
        log(tag, `W${id}`, `[${total}/${tasks.length}] ${t.id} ${r.source} ${r.size ? Math.round(r.size/1024)+'KB' : ''} | ok=${ok} fail=${fail} | ${elapsed}min ETA ${eta}min`)
      } else if (r.status === 'skip') {
        log(C.dim, 'W'+id, `[${total}/${tasks.length}] ${t.id} skip`)
      } else {
        log(C.red, 'W'+id, `[${total}/${tasks.length}] ${t.id} FAIL - ${r.error}`)
      }
      if (total % 10 === 0) saveStatus(status)
    }
  }

  const workers = Array.from({ length: WORKERS }, (_, i) => worker(i + 1))
  await Promise.all(workers)
  saveStatus(status)

  const ok = results.filter(r => r.status === 'ok').length
  const wikiOk = results.filter(r => r.source === 'wiki').length
  const aiOk = results.filter(r => r.source === 'ai').length
  const fail = results.filter(r => r.status === 'fail').length
  const skip = results.filter(r => r.status === 'skip').length
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  log(C.cyan, 'DONE', `总: ${tasks.length} | ok=${ok} (wiki=${wikiOk}, ai=${aiOk}) | fail=${fail} | skip=${skip} | ${elapsed}min`)
  if (fail > 0) log(C.yellow, 'HINT', '重试: node search-images.mjs --retry')
}

main().catch(err => {
  log(C.red, 'FATAL', err.message)
  process.exit(1)
})
