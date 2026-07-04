/**
 * 学英语 例句音频批量生成（Edge TTS）
 *
 * 输入：scripts/rewrite-english-sentences/rewrite-result.json
 * 输出：apps/english/public/audio/sentences/sent_{id}.mp3
 *
 * 音色策略（2026-06-30 确认）：
 *   - voice: en-US-JennyNeural（柔和女声，适合儿童）
 *   - style: friendly（友好亲切）
 *   - rate: -15%（略慢，便于跟读）
 *   - pitch: +0Hz
 *
 * 用法：
 *   node scripts/tts-sentences.mjs                  # 全部待生成
 *   node scripts/tts-sentences.mjs --poc 5          # 前 5 条测试
 *   node scripts/tts-sentences.mjs --ids 1,2,3      # 指定 ID
 *   node scripts/tts-sentences.mjs --concurrency 4  # 并发数（默认 4）
 *   node scripts/tts-sentences.mjs --status         # 进度
 *   node scripts/tts-sentences.mjs --retry          # 重试失败
 *   node scripts/tts-sentences.mjs --force          # 强制覆盖
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, unlinkSync, renameSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')

const CONFIG = {
  rewriteResultFile: resolve(APP_DIR, '../../scripts/rewrite-english-sentences/rewrite-result.json'),
  outputDir: resolve(APP_DIR, 'public/audio/sentences'),
  statusFile: resolve(APP_DIR, '../../scripts/rewrite-english-sentences/tts-status.json'),
  voice: 'en-US-JennyNeural',
  // 2026-07-01 v3：
  // 1) 不用 SSML 模式（edge-tts 会把 'version=1.0' 'xmlns=...' 当文本念出来，输出 27 秒）
  // 2) rate=-25%（用户确认的合适语速）
  // 3) style='friendly' 在 --file 模式下也读错，纯文本默认语调自然
  rate: '-25%',
  pitch: '+0Hz',
  concurrency: 4,
  retries: 3,
  retryDelay: 5000,
  timeoutMs: 90000,
}

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

function escapeXml(text) {
  // v2 简化：只转 XML 必要的 & < >，不要转 ' "（edge-tts 会念出 entity 名字）
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildSsml(text) {
  // v3: 不再使用 SSML —— edge-tts 会把 'version=1.0' 'xmlns=...' 等元数据当成文本念出来
  // 改用纯文本模式 + edge_tts CLI 的 --rate/--pitch 参数
  return String(text).trim()
}

async function callEdgeTTS(text, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')
  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'
  mkdirSync(dirname(outputPath), { recursive: true })

  // 文本里去掉可能让 TTS 卡壳的特殊字符
  const cleanText = text.replace(/"/g, '').trim()

  // v3：直接传纯文本，不用 SSML 包装（避免 27 秒 bug）
  writeFileSync(tmpTxt, cleanText, 'utf-8')

  const args = ['-m', 'edge_tts', '--voice', CONFIG.voice,
    '--rate=' + CONFIG.rate, '--pitch=' + CONFIG.pitch,
    '--file', tmpTxt, '--write-media', tmpMp3]

  return new Promise((resolveP, rejectP) => {
    const child = spawn('python3', args, { encoding: 'utf-8' })
    let stderr = ''
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      try { unlinkSync(tmpMp3) } catch {}
      rejectP(new Error(`edge-tts timeout ${CONFIG.timeoutMs/1000}s killed`))
    }, CONFIG.timeoutMs)
    child.stderr?.on('data', d => { stderr += d.toString() })
    child.on('error', err => { clearTimeout(timer); rejectP(err) })
    child.on('close', async code => {
      clearTimeout(timer)
      if (code !== 0) {
        try { unlinkSync(tmpMp3) } catch {}
        rejectP(new Error(`edge-tts exit ${code}: ${stderr.slice(0, 1500)}`))
        return
      }
      if (!existsSync(tmpMp3)) { rejectP(new Error('No output file')); return }
      const size = statSync(tmpMp3).size
      if (size < 100) {
        try { unlinkSync(tmpMp3) } catch {}
        rejectP(new Error('File too small (' + size + 'B)'))
        return
      }
      // 2026-07-01：edge-tts 输出有 ~200ms 前导静音（编码器初始化），
      // 听起来像"技术字符/噪声"。用 ffmpeg trim 150ms + 50ms fade-in 消除。
      try {
        await trimLeadingSilence(tmpMp3, outputPath)
      } catch (err) {
        // ffmpeg 失败时退回到原始文件
        try { renameSync(tmpMp3, outputPath) } catch {}
        console.error(`[ffmpeg trim fail] ${basename(outputPath)}: ${err.message}`)
      }
      try { unlinkSync(tmpTxt) } catch {}
      resolveP(statSync(outputPath).size)
    })
  })
}

// 用 ffmpeg 去掉前导静音（约 150ms）+ 50ms 渐入
function trimLeadingSilence(srcPath, destPath) {
  return new Promise((resolveP, rejectP) => {
    const args = [
      '-y', '-i', srcPath,
      '-ss', '0.15',           // trim 前 150ms
      '-af', 'afade=t=in:st=0:d=0.05',  // 50ms 渐入避免咔哒声
      '-codec:a', 'libmp3lame',
      '-b:a', '48k',            // 保持 48kbps 跟源一致
      '-write_xing', '0',
      destPath
    ]
    const proc = spawn('ffmpeg', args, { encoding: 'utf-8' })
    let stderr = ''
    proc.stderr?.on('data', d => { stderr += d.toString() })
    proc.on('error', err => rejectP(err))
    proc.on('close', code => {
      try { unlinkSync(srcPath) } catch {}
      if (code !== 0) {
        rejectP(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 500)}`))
        return
      }
      resolveP()
    })
  })
}

// ===== 状态跟踪 =====
class Tracker {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { items: {}, stats: { success: 0, failed: 0, total: 0 } }
  }
  register(items) {
    for (const it of items) {
      if (!this.data.items[it.id]) this.data.items[it.id] = { status: 'pending' }
    }
    this.data.stats.total = items.length
    this.save()
  }
  setStatus(id, status, extra = {}) {
    this.data.items[id] = { status, ...extra, updatedAt: new Date().toISOString() }
    this.save()
  }
  getPending(items) {
    return items.filter(it => this.data.items[it.id]?.status !== 'done')
  }
  printStats() {
    const total = Object.keys(this.data.items).length
    const done = Object.values(this.data.items).filter(s => s.status === 'done').length
    const failed = Object.values(this.data.items).filter(s => s.status === 'failed').length
    const pending = total - done - failed
    console.log(`\n📊 TTS 进度统计：`)
    console.log(`  总数：${total}`)
    console.log(`  已完成：${done}（${(done/total*100).toFixed(1)}%）`)
    console.log(`  失败：${failed}`)
    console.log(`  待处理：${pending}`)
  }
  save() {
    writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2))
  }
}

async function processItem(item, tracker, isForce) {
  const outputPath = resolve(CONFIG.outputDir, `sent_${item.id}.mp3`)

  if (!isForce && existsSync(outputPath) && statSync(outputPath).size > 100) {
    tracker.setStatus(item.id, 'done', { fromCache: true })
    log(C.dim, 'SKIP', `#${item.id}`)
    return
  }

  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const size = await callEdgeTTS(item.sentence, outputPath)
      tracker.setStatus(item.id, 'done', { attempt, size })
      log(C.green, '✓', `#${item.id}: ${item.sentence.slice(0, 50)} (${(size/1024).toFixed(1)}KB)`)
      return
    } catch (err) {
      log(C.yellow, '!', `#${item.id} attempt ${attempt}/${CONFIG.retries}: ${err.message.slice(0, 100)}`)
      if (attempt === CONFIG.retries) {
        tracker.setStatus(item.id, 'failed', { error: err.message })
      } else {
        await new Promise(r => setTimeout(r, CONFIG.retryDelay * attempt))
      }
    }
  }
}

async function processBatch(items, fn, concurrency) {
  const executing = new Set()
  for (const item of items) {
    const p = (async () => { await fn(item) })()
    executing.add(p)
    p.finally(() => executing.delete(p))
    if (executing.size >= concurrency) {
      await Promise.race(executing)
    }
  }
  await Promise.all(executing)
}

async function main() {
  const args = process.argv.slice(2)
  const isStatus = args.includes('--status')
  const isRetry = args.includes('--retry')
  const isForce = args.includes('--force')

  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1]) || 4

  let targetIds = null
  const idsIdx = args.indexOf('--ids')
  if (idsIdx >= 0) targetIds = args[idsIdx + 1].split(',').map(Number)
  const pocIdx = args.indexOf('--poc')
  const pocCount = pocIdx >= 0 ? parseInt(args[pocIdx + 1]) || 10 : 0

  if (!existsSync(CONFIG.rewriteResultFile)) {
    log(C.red, 'ERR', `找不到 ${CONFIG.rewriteResultFile}，先跑 rewrite.mjs`)
    process.exit(1)
  }

  const results = JSON.parse(readFileSync(CONFIG.rewriteResultFile, 'utf-8'))
  const items = Object.entries(results).map(([id, v]) => ({
    id: parseInt(id),
    sentence: v.sentence,
    sentenceCn: v.sentenceCn,
  })).sort((a, b) => a.id - b.id)
  log(C.blue, 'INIT', `加载了 ${items.length} 条改写结果`)

  const tracker = new Tracker()
  tracker.register(items)

  if (isStatus) {
    tracker.printStats()
    const existing = items.filter(it => existsSync(resolve(CONFIG.outputDir, `sent_${it.id}.mp3`)))
    log(C.cyan, 'FILES', `实际已生成 mp3: ${existing.length}`)
    return
  }

  let workList = items
  if (isRetry) {
    workList = items.filter(it => tracker.data.items[it.id]?.status === 'failed')
    log(C.yellow, 'RETRY', `重新处理 ${workList.length} 个失败项`)
  } else if (targetIds) {
    workList = items.filter(it => targetIds.includes(it.id))
    log(C.yellow, 'IDS', `指定处理 ${workList.length} 条`)
  } else if (pocCount > 0) {
    workList = items.slice(0, pocCount)
    log(C.yellow, 'POC', `PoC 模式，处理前 ${pocCount} 条`)
  } else if (!isForce) {
    workList = tracker.getPending(items)
    log(C.blue, 'BATCH', `待处理 ${workList.length}/${items.length} 条`)
  }

  if (workList.length === 0) {
    log(C.green, 'DONE', '所有任务已完成')
    return
  }

  log(C.blue, 'INIT', `voice=${CONFIG.voice} style=${CONFIG.style} rate=${CONFIG.rate} 并发=${CONFIG.concurrency}`)

  const startTime = Date.now()
  await processBatch(workList, (it) => processItem(it, tracker, isForce), CONFIG.concurrency)
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  log(C.green, 'DONE', `完成 ${workList.length} 条，耗时 ${elapsed} 分钟`)
  tracker.printStats()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})