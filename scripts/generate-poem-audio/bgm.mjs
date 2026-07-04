/**
 * 诗词听书 — MiniMax Music 批量生成 BGM
 *
 * 生成 6-8 首古风纯音乐（无歌词），按情绪分类：
 *   - 豪放（古琴/鼓，李白/苏轼）
 *   - 婉约（箫/筝，李清照/柳永）
 *   - 田园（笛/琵琶，王维/陶渊明）
 *   - 边塞（琵琶/战鼓，王昌龄/岑参）
 *   - 咏物（清音/弹拨）
 *   - 叙事（沉稳/讲史）
 *
 * 用法：
 *   node bgm.mjs           # 批量生成 6 首
 *   node bgm.mjs --poc 1   # PoC 单首
 *   node bgm.mjs --id 3    # 重新生成第 3 首
 *
 * 输出：
 *   ../../apps/xueshici/public/audio/bgm/{name}.mp3
 *
 * 成本：6 首 × 30 秒 ≈ 一次性 ¥5-10
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

const CONFIG = {
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || '',
  endpoint: 'https://api.minimaxi.com/v1/music_generation',
  model: 'music-1.5',
  outputDirs: [
    resolve(__dirname, '../../apps/xueshici/public/audio/bgm'),
    resolve(__dirname, '../../apps/xueshici/dist/audio/bgm'),
  ],
  // 6 套古风 BGM 配置
  bgmList: [
    {
      name: 'heroic',         // 豪放
      prompt: '古风纯音乐，无人声，豪迈壮阔，古琴琵琶配以战鼓，BPM 90，适合边塞军旅诗词',
      lyrics: '[Instrumental]',
    },
    {
      name: 'graceful',       // 婉约
      prompt: '古风纯音乐，无人声，婉约细腻，箫与古筝，BPM 65，适合儿女情长离愁别绪',
      lyrics: '[Instrumental]',
    },
    {
      name: 'pastoral',       // 田园
      prompt: '古风纯音乐，无人声，田园清新，竹笛与古琴，BPM 70，适合山水田园诗词',
      lyrics: '[Instrumental]',
    },
    {
      name: 'frontier',       // 边塞
      prompt: '古风纯音乐，无人声，边塞苍凉，胡笳与琵琶，BPM 100，适合边塞战争诗词',
      lyrics: '[Instrumental]',
    },
    {
      name: 'lyric',          // 咏物
      prompt: '古风纯音乐，无人声，清雅飘逸，古琴独奏，BPM 60，适合咏物言志诗词',
      lyrics: '[Instrumental]',
    },
    {
      name: 'narrative',      // 叙事
      prompt: '古风纯音乐，无人声，叙事沉稳，琵琶中速，BPM 80，适合长篇叙事诗',
      lyrics: '[Instrumental]',
    },
  ],
  // 状态
  statusFile: resolve(__dirname, 'bgm-status.json'),
}

async function callMusicAPI(prompt, lyrics) {
  const resp = await fetch(CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CONFIG.model,
      prompt,
      lyrics,
      audio_setting: { format: 'mp3', sample_rate: 32000 },
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`)
  }
  const data = await resp.json()
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`API error: ${data.base_resp?.status_msg}`)
  }
  const hex = data.data?.audio
  if (!hex) throw new Error('No audio data')
  return Buffer.from(hex, 'hex')
}

async function generateOne(bgm, status) {
  const key = bgm.name
  if (status.isDone(key)) {
    return { ok: true, skipped: true }
  }
  const outputPath = join(CONFIG.outputDirs[0], `${bgm.name}.mp3`)

  try {
    const buffer = await callMusicAPI(bgm.prompt, bgm.lyrics)
    writeFileSync(outputPath, buffer)
    // 复制到 dist
    const { copyFileSync } = await import('fs')
    for (let i = 1; i < CONFIG.outputDirs.length; i++) {
      const alt = join(CONFIG.outputDirs[i], `${bgm.name}.mp3`)
      if (!existsSync(alt)) {
        try { copyFileSync(outputPath, alt) } catch {}
      }
    }
    status.markDone(key, buffer.length)
    // Get duration
    let duration = '?'
    try {
      const info = execSync(`afinfo "${outputPath}" 2>/dev/null | grep "estimated duration"`).toString()
      const m = info.match(/duration:\s*([\d.]+)\s*sec/)
      if (m) duration = m[1] + 's'
    } catch {}
    return { ok: true, size: buffer.length, duration }
  } catch (err) {
    status.markFailed(key, err)
    return { ok: false, error: String(err).slice(0, 200) }
  }
}

class Status {
  constructor() {
    this.data = existsSync(CONFIG.statusFile)
      ? JSON.parse(readFileSync(CONFIG.statusFile, 'utf-8'))
      : { done: {}, failed: {} }
  }
  markDone(k, size) { this.data.done[k] = { size, at: new Date().toISOString() }; this._save() }
  markFailed(k, err) { this.data.failed[k] = { error: String(err).slice(0, 200), at: new Date().toISOString() }; this._save() }
  isDone(k) { return !!this.data.done[k] }
  _save() { writeFileSync(CONFIG.statusFile, JSON.stringify(this.data, null, 2)) }
  printStats() {
    log(C.cyan, '状态', `已完成 ${Object.keys(this.data.done).length} 首，失败 ${Object.keys(this.data.failed).length} 首`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isPoc = args.includes('--poc')
  const pocIdx = isPoc ? parseInt(args[args.indexOf('--poc') + 1]) - 1 : null
  const isStatus = args.includes('--status')

  if (!CONFIG.apiKey) {
    log(C.red, '错误', 'ANTHROPIC_AUTH_TOKEN 未设置')
    process.exit(1)
  }

  for (const dir of CONFIG.outputDirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }

  const status = new Status()
  if (isStatus) { status.printStats(); return }

  let targets = CONFIG.bgmList
  if (pocIdx !== null) {
    targets = [CONFIG.bgmList[pocIdx]]
    log(C.cyan, 'PoC', `生成第 ${pocIdx + 1} 首: ${targets[0].name}`)
  }

  log(C.blue, '配置', `${targets.length} 首 BGM 待生成`)

  const start = Date.now()
  let success = 0, skipped = 0, failed = 0

  for (let i = 0; i < targets.length; i++) {
    const bgm = targets[i]
    log(C.cyan, '进度', `[${i + 1}/${targets.length}] 生成 "${bgm.name}"`)
    const result = await generateOne(bgm, status)
    if (result.ok && result.skipped) {
      skipped++
      log(C.dim, '跳过', `${bgm.name} 已存在`)
    } else if (result.ok) {
      success++
      log(C.green, '完成', `${bgm.name} ${(result.size/1024).toFixed(0)}KB  ${result.duration}`)
    } else {
      failed++
      log(C.red, '失败', `${bgm.name}: ${result.error}`)
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('\n' + '='.repeat(60))
  log(C.green, '汇总', `完成 ${success} 首，跳过 ${skipped} 首，失败 ${failed} 首（耗时 ${elapsed}s）`)
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error(`\n${C.red}❌ 异常:${C.reset}`, err)
  process.exit(1)
})
