/**
 * 诗词听书 — Edge TTS 批量生成朗诵音频
 *
 * 为 2026+ 首诗生成朗诵 mp3：
 *   - original.mp3       : 原文朗诵（按 6 情绪 × 2 性别 = 12 音色矩阵选音色 + 情感）
 *   - translation.mp3    : 译文朗诵（中性 voice，无 style）
 *   - interpretation.mp3 : 赏析朗诵（中性 voice，无 style）
 *
 * 用法：
 *   node tts.mjs                  # 批量生成所有诗的朗诵
 *   node tts.mjs --poc 1004       # PoC 验证，只处理 ID=1004
 *   node tts.mjs --ids 1,2,3      # 指定 ID
 *   node tts.mjs --concurrency 2  # 并发数（默认 2）
 *   node tts.mjs --type original  # 只生成原文 / translation
 *   node tts.mjs --status         # 查看进度
 *   node tts.mjs --reset          # 重置状态（重跑所有）
 *   node tts.mjs --regen-all      # 把 done 备份到 done.bak-{ts} 后重做所有 original
 *
 * 输出：
 *   apps/xueshici/public/audio/poems/{id}_{type}.mp3
 *
 * 音色策略（Edge TTS 6 情绪 × 2 性别矩阵，详见 moodClassifier.mjs）：
 *
 *   mood      │ male voice              │ male style  │ female voice        │ female style  │ rate
 *   ──────────┼─────────────────────────┼─────────────┼─────────────────────┼───────────────┼─────
 *   heroic    │ zh-CN-YunyangNeural     │ assertive   │ zh-CN-XiaoxiaoNeural│ cheerful      │ -5%
 *   graceful  │ zh-CN-YunxiNeural       │ gentle      │ zh-CN-XiaoxiaoNeural│ gentle        │ -15%
 *   pastoral  │ zh-CN-YunxiNeural       │ calm        │ zh-CN-XiaoxiaoNeural│ gentle        │ -20%
 *   frontier  │ zh-CN-YunjianNeural     │ serious     │ zh-CN-XiaoxiaoNeural│ serious       │ -5%
 *   lyric     │ zh-CN-YunxiNeural       │ calm        │ zh-CN-XiaoxiaoNeural│ affectionate  │ -15%
 *   narrative │ zh-CN-YunxiNeural       │ narration   │ zh-CN-XiaoxiaoNeural│ calm          │ -10%
 *
 * 情绪判断复刻前端 apps/xueshici/src/lib/audio.ts::detectMood()：
 *   frontier → pastoral(楚辞) → heroic → lyric → pastoral(王维) → narrative → graceful
 *
 * 优势：
 *   - 免费，无需 API Key
 *   - 中文神经语音 + SSML emotion/style，质量堪比真人
 *   - 与 BGM 选曲（bgm.mjs）同 6 情绪体系，听感一致
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync, copyFileSync, statSync, renameSync as fsRenameSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawnSync } from 'child_process'
import { getVoiceProfile } from './moodClassifier.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ===== 颜色日志 =====
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

// ===== 配置 =====
const CONFIG = {
  // 输入：诗词数据
  poemsFile: resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json'),
  // 输出：朗诵音频
  outputDirs: [
    resolve(__dirname, '../../apps/xueshici/public/audio/poems'),
    resolve(__dirname, '../../apps/xueshici/dist/audio/poems'),
    resolve(__dirname, '../../apps/xueshici/public/images/poems'),  // 兼容旧路径
  ],
  // Edge TTS 音色/情感/语速统一在 moodClassifier.mjs 维护（6 情绪 × 2 性别矩阵）
  // 状态文件
  statusFile: resolve(__dirname, 'tts-status.json'),
  // 并发（edge-tts 是免费服务，并发太高可能被限流）
  concurrency: 2,
  // 重试
  maxRetries: 3,
  retryDelay: 2000,
  // 每段请求间隔（毫秒）
  requestDelay: 500,
  // 朗读语速（负值=慢，+0% 正常）
  rate: '-10%',
  // 日志
  logLevel: 'summary',  // all | summary | error
}

// ===== 工具：判断作者性别 =====
// 已迁移到 moodClassifier.mjs::getAuthorGender / getVoiceProfile

// ===== XML 转义（SSML 需要） =====
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ===== 构建 SSML（用于带 style 的情感朗诵） =====
// 2026-06-19：原文已改为纯文本 + \n 换行
// 2026-06-20 v5：原文朗诵强制走 style=null 路径（见 moodClassifier.mjs），
//                所以 buildSsml 的 style 分支实际不会触发，
//                这里保留 SSML 构造以防后续恢复 style（注释掉 mstts:express-as
//                嵌套 prosody 的写法，因为实验证明嵌套会触发字面朗读乱码）
function buildSsml(text, voice, style, styleDegree, rate) {
  const body = escapeXml(text)
  const prosody = `<prosody rate="${rate}">${body}</prosody>`
  if (style) {
    // v5：不嵌套 prosody 到 mstts:express-as 里，让 style 直接修饰文本（实验证明嵌套会乱码）
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${voice}"><mstts:express-as style="${style}" styledegree="${styleDegree}">${body}</mstts:express-as></voice></speak>`
  }
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="${voice}">${prosody}</voice></speak>`
}

// ===== 状态管理 =====
class Status {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { done: {}, failed: {}, totalChars: 0 }
  }
  reset() {
    this.data = { done: {}, failed: {}, totalChars: 0 }
    this._save()
    log(C.yellow, '重置', '状态已清空')
  }
  markDone(key, size, chars) {
    this.data.done[key] = { size, chars, at: new Date().toISOString() }
    this.data.totalChars += chars
    this._save()
  }
  markFailed(key, error) {
    this.data.failed[key] = { error: String(error).slice(0, 200), at: new Date().toISOString() }
    this._save()
  }
  isDone(key) { return !!this.data.done[key] }
  isFailed(key) { return !!this.data.failed[key] }
  _save() { writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2)) }
  printStats() {
    log(C.cyan, '状态', `已完成 ${Object.keys(this.data.done).length} 段，失败 ${Object.keys(this.data.failed).length} 段，文本总 ${this.data.totalChars} 字`)
  }
}

// ===== Edge TTS 调用（使用文本文件避免 shell 长度/转义问题） =====
// profile = { voice, style, styleDegree, rate, pitch }
async function callEdgeTTS(text, profile, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')

  const { voice, style, styleDegree, rate, pitch } = profile
  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'

  try {
    // 确保输出目录存在
    mkdirSync(dirname(outputPath), { recursive: true })

    // 写入文件：有 style 时写 SSML，无 style 时写纯文本
    const args = style
      ? ['-m', 'edge_tts', '--voice', voice, '--file', tmpTxt, '--write-media', tmpMp3]
      : ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, `--pitch=${pitch || '+0Hz'}`, '--file', tmpTxt, '--write-media', tmpMp3]
    if (style) {
      writeFileSync(tmpTxt, buildSsml(text, voice, style, styleDegree, rate), 'utf-8')
    } else {
      writeFileSync(tmpTxt, text, 'utf-8')
    }
    const r = spawnSync('python3', args, { timeout: 300000, encoding: 'utf-8' })
    if (r.error) throw r.error
    if (r.status !== 0) {
      const e = new Error(`edge-tts exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 1500)}`)
      e.stderr = r.stderr || ''
      e.stdout = r.stdout || ''
      throw e
    }

    // 检查生成的文件
    if (!existsSync(tmpMp3)) throw new Error('No output file generated')

    const size = statSync(tmpMp3)?.size || 0
    if (size < 100) {
      try { unlinkSync(tmpMp3) } catch {}
      throw new Error('Output too small (' + size + 'B)')
    }

    // 清理临时文本文件
    try { unlinkSync(tmpTxt) } catch {}

    // 移到目标路径
    try { fsRenameSync(tmpMp3, outputPath) } catch (e) {
      copyFileSync(tmpMp3, outputPath)
      unlinkSync(tmpMp3)
    }
    return size
  } catch (err) {
    try { if (existsSync(tmpMp3)) unlinkSync(tmpMp3) } catch {}
    try { if (existsSync(tmpTxt)) unlinkSync(tmpTxt) } catch {}
    throw err
  }
}

// ===== 生成单段音频 =====
async function generateOne(poem, type, status) {
  const sec = poem.sections && poem.sections[0]
  if (!sec) return { ok: false, reason: 'no_section' }

  // 准备文本
  // 关键修复（2026-06-19）：原文朗诵放弃 SSML <break/> 标签，
  // 改用纯文本 + \n 换行 — edge-tts 对纯文本的 \n 会自然停顿，
  // 避免 SSML 解析失败时被字面朗读出 "break time" / "x" 等乱码。
  // 情感 style 仍然保留（在 buildSsml 里包装）。
  let text
  if (type === 'original') {
    const lines = sec.original.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const titleIntro = `《${poem.title}》${poem.author}，${poem.dynasty}。`
    // 用 \n\n 双换行制造停顿（edge-tts 会自然 pause）
    text = titleIntro + '\n\n' + lines.join('\n\n')
  } else if (type === 'translation') {
    // 仅译文（独立于赏析）
    text = (sec.translation || '').trim()
  } else if (type === 'interpretation') {
    // 仅赏析（独立于译文）
    text = (sec.interpretation || '').trim()
  } else {
    return { ok: false, reason: 'invalid_type' }
  }

  const key = `${poem.id}-${type}`
  if (status.isDone(key)) {
    return { ok: true, reason: 'already_exists', skipped: true }
  }

  // 解析 voice profile（mood × gender → voice/style/rate）
  const profile = getVoiceProfile(poem, type)
  const outputPath = join(CONFIG.outputDirs[0], `${poem.id}_${type}.mp3`)

  // 多次重试：style 不被支持时降级为 plain + prosody rate
  // 原文 2026-06-19 改版：纯文本 + \n 换行（不再用 raw SSML），所以不需要 rawSsml 分支
  let lastErr = null
  let downgradeTried = false
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      // 构造本次调用的 profile（可能降级 style）
      const callProfile = (downgradeTried || !profile.style)
        ? { ...profile, style: null }
        : profile
      const size = await callEdgeTTS(text, callProfile, outputPath)
      // 复制到其他输出目录
      for (let i = 1; i < CONFIG.outputDirs.length; i++) {
        try {
          const altDest = join(CONFIG.outputDirs[i], `${poem.id}_${type}.mp3`)
          if (!existsSync(altDest)) {
            const { copyFileSync } = await import('fs')
            copyFileSync(outputPath, altDest)
          }
        } catch (e) { /* 忽略 */ }
      }
      status.markDone(key, size, text.length)
      return { ok: true, size, profile: callProfile, chars: text.length, downgraded: downgradeTried }
    } catch (err) {
      lastErr = err
      const errStr = String(err)
      const stderrStr = err.stderr ? err.stderr.toString() : ''
      const fullErr = errStr + ' ' + stderrStr
      const isRateLimit = fullErr.includes('rate limit') || fullErr.includes('429')
      const isTransient = isRateLimit
        || fullErr.includes('Connection reset')
        || fullErr.includes('ConnectionResetError')
        || fullErr.includes('ConnectError')
        || fullErr.includes('Cannot connect')
        || fullErr.includes('ServerDisconnected')
        || fullErr.includes('TimeoutError')
        || fullErr.includes('RemoteDisconnected')
      const isStyleUnsupported = !downgradeTried && (fullErr.includes('style') || fullErr.includes('not supported') || fullErr.includes('express-as') || fullErr.includes('Unknown style'))
      if (isStyleUnsupported) {
        log(C.yellow, '降级', `ID=${poem.id} ${type}: voice=${profile.voice} style=${profile.style} 不被支持，改用 plain+rate=${profile.rate}`)
        downgradeTried = true
        continue
      }
      // 瞬断：等更久再重试（默认 3s × attempt，429/严重瞬断 ×5）
      const delay = CONFIG.retryDelay * attempt * (isTransient ? (isRateLimit ? 5 : 3) : 1)
      log(C.dim, '重试', `ID=${poem.id} ${type} attempt=${attempt}/${CONFIG.maxRetries} ${isTransient ? '(瞬断)' : ''} 等 ${delay}ms err=${(fullErr.split('\n')[0] || '').slice(0, 80)}`)
      if (attempt < CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  status.markFailed(key, lastErr)
  return { ok: false, reason: 'tts_failed', error: String(lastErr).slice(0, 100) }
}

// ===== 主流程 =====
async function main() {
  const args = process.argv.slice(2)
  const isPoc = args.includes('--poc')
  const pocId = isPoc ? parseInt(args[args.indexOf('--poc') + 1]) : null
  const idsIdx = args.indexOf('--ids')
  const specifiedIds = idsIdx >= 0 ? args[idsIdx + 1].split(',').map(s => parseInt(s.trim())) : null
  const concIdx = args.indexOf('--concurrency')
  if (concIdx >= 0) CONFIG.concurrency = parseInt(args[concIdx + 1])
  const typeIdx = args.indexOf('--type')
  const onlyType = typeIdx >= 0 ? args[typeIdx + 1] : null
  const isStatus = args.includes('--status')
  const isReset = args.includes('--reset')
  const isRegenAll = args.includes('--regen-all')

  // 检查 poems-data.json
  if (!existsSync(CONFIG.poemsFile)) {
    log(C.red, '错误', `未找到 ${CONFIG.poemsFile}`)
    process.exit(1)
  }

  // 准备输出目录
  for (const dir of CONFIG.outputDirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }

  // 加载
  const poems = JSON.parse(readFileSync(CONFIG.poemsFile, 'utf-8'))
  log(C.blue, '加载', `${poems.length} 首诗`)

  const status = new Status()
  if (isReset) {
    status.reset()
    return
  }
  if (isRegenAll) {
    // 把 done 备份到 done.bak-{timestamp}，让下一轮重做所有 original
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    status.data[`done.bak.${ts}`] = status.data.done
    status.data.done = {}
    status.data.totalChars = 0
    status._save()
    log(C.yellow, '备份', `原 done 备份到 done.bak.${ts}，已清空 done，准备重做`)
    return
  }
  if (isStatus) {
    status.printStats()
    return
  }

  // 筛选
  let target = poems
  if (pocId) {
    target = poems.filter(p => p.id === pocId)
    log(C.cyan, 'PoC', `处理 ID=${pocId}`)
  } else if (specifiedIds) {
    target = poems.filter(p => specifiedIds.includes(p.id))
    log(C.cyan, '指定', `处理 ${target.length} 首诗`)
  } else {
    log(C.cyan, '批量', `处理所有 ${target.length} 首诗 × 3 段（原文 + 译文 + 赏析）`)
  }

  // 段类型：原文、译文、赏析 三段独立
  const types = onlyType ? [onlyType] : ['original', 'translation', 'interpretation']

  // 构建任务列表（诗 × 段类型）
  const tasks = []
  for (const p of target) {
    for (const t of types) {
      tasks.push({ poem: p, type: t })
    }
  }
  log(C.cyan, '任务', `共 ${tasks.length} 段待生成`)

  // 过滤已完成的
  const remaining = tasks.filter(t => !status.isDone(`${t.poem.id}-${t.type}`))
  if (remaining.length === 0) {
    log(C.yellow, '提示', '所有任务已完成！')
    return
  }
  if (remaining.length < tasks.length) {
    log(C.dim, '跳过', `${tasks.length - remaining.length} 段已存在`)
  }

  // 并发执行
  const startTime = Date.now()
  let success = 0, failed = 0, skipped = 0
  const failures = []
  let lastProgressLog = 0

  const queue = [...remaining]
  const workers = []
  for (let w = 0; w < CONFIG.concurrency; w++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const task = queue.shift()
        if (!task) break
        const result = await generateOne(task.poem, task.type, status)
        if (result.ok && result.skipped) {
          skipped++
        } else if (result.ok) {
          success++
          if (CONFIG.logLevel === 'all') {
            const p = result.profile || {}
            log(C.green, '完成', `ID=${task.poem.id} ${task.type} ${result.size}B voice=${p.voice} style=${p.style || '(none)'} rate=${p.rate} mood=${p.mood}${result.downgraded ? ' [降级]' : ''}`)
          }
        } else {
          failed++
          failures.push({ id: task.poem.id, type: task.type, error: result.error || result.reason })
          if (CONFIG.logLevel !== 'error') {
            log(C.red, '失败', `ID=${task.poem.id} ${task.type}: ${result.reason} ${result.error || ''}`)
          }
        }
        // 请求间隔
        await new Promise(r => setTimeout(r, CONFIG.requestDelay))

        // 进度日志
        const done = success + failed + skipped
        const total = remaining.length
        if (total > 10 && done - lastProgressLog >= Math.max(10, Math.floor(total / 20))) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
          const speed = (success / Math.max(1, elapsed) * 60).toFixed(1)
          log(C.cyan, '进度', `[${done}/${total}] 成功:${success} 跳过:${skipped} 失败:${failed} 速度:${speed}段/分钟 耗时:${elapsed}s`)
          lastProgressLog = done
        }
      }
    })())
  }
  await Promise.all(workers)

  // 汇总
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const rate = success > 0 ? (success / parseFloat(elapsed) * 60).toFixed(1) : '0'
  console.log('\n' + '='.repeat(60))
  log(C.green, '汇总', `完成 ${success} 段，跳过 ${skipped} 段，失败 ${failed} 段（耗时 ${elapsed}s，速度 ${rate}段/分钟）`)
  if (failures.length > 0) {
    console.log('\n失败列表（前 10）：')
    for (const f of failures.slice(0, 10)) console.log(`  ID=${f.id} ${f.type}: ${f.error}`)
  }
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error(`\n${C.red}❌ 异常:${C.reset}`, err)
  process.exit(1)
})
