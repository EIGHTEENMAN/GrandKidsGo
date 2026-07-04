/**
 * 诗配动画引擎 — 图片转视频壳
 *
 * 把 1024x1024 的水墨画 JPG 转成 6 秒 H.264 MP4 静态壳。
 * **不做任何 Ken Burns / 标题叠加** —— 那些效果放前端 CSS（GPU 加速、免重编码）。
 *
 * 架构说明：
 *   - 静态视频壳（ffmpeg）：~3-5 秒/张，~50-100KB/张
 *   - 动画效果（CSS @keyframes）：浏览器渲染，零额外开销
 *
 * 用法：
 *   node image-to-video.mjs                 # 批量转换所有 .jpg → .mp4
 *   node image-to-video.mjs --poc 1004      # PoC 验证，只转 ID=1004
 *   node image-to-video.mjs --ids 1004,2005 # 指定若干 ID
 *   node image-to-video.mjs --concurrency 4 # 并发数（默认 4）
 *
 * 前置条件：
 *   - 系统已装 ffmpeg (>= 4.0)
 *
 * 输出：
 *   ../../apps/xueshici/public/images/poems/{id}.mp4
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ===== 颜色日志 =====
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

// ===== 配置 =====
const CONFIG = {
  // 输入目录（MiniMax 生成的真实图，公共资源）
  inputDir: resolve(__dirname, '../../apps/xueshici/public/images/poems'),
  // 输出目录（必须和 nginx 服务路径一致，否则视频无法访问）
  // 实际写两个位置：dist/（nginx 服务）+ public/（下次 vite build 保留）
  outputDirs: [
    resolve(__dirname, '../../apps/xueshici/dist/images/poems'),
    resolve(__dirname, '../../apps/xueshici/public/images/poems'),
  ],
  // 视频参数
  duration: 6,
  fps: 24,
  width: 720,
  height: 720,
  // H.264 编码（追求速度，crf 略高）
  crf: 32,         // 静态图压缩可以激进些
  preset: 'ultrafast', // 静态图不需要高质量编码
  // 并发数
  concurrency: 4,
  // 日志级别
  logLevel: 'summary', // 'all' | 'summary' | 'error'
}

// ===== 工具函数 =====
async function ffmpegExists() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// ===== 单个图片转视频壳 =====
function imageToVideo(poemId) {
  const inputJpg = join(CONFIG.inputDir, `${poemId}.jpg`)
  // 写到第一个输出目录（dist），其它用 fs.copyFileSync 同步
  const outputMp4 = join(CONFIG.outputDirs[0], `${poemId}.mp4`)

  if (!existsSync(inputJpg)) {
    return Promise.resolve({ ok: false, reason: 'jpg_not_found' })
  }
  // 任一目标已存在即跳过（避免重复）
  const anyExists = CONFIG.outputDirs.some(d => existsSync(join(d, `${poemId}.mp4`)))
  if (anyExists) {
    return Promise.resolve({ ok: true, reason: 'already_exists', skipped: true })
  }

  // 极简命令：loop 输入 + 缩放 + H.264
  // 不加任何动画/水印/标题 —— 全部放前端 CSS
  const args = [
    '-y',
    '-loop', '1',
    '-framerate', String(CONFIG.fps),
    '-t', String(CONFIG.duration),
    '-i', inputJpg,
    '-vf', `scale=${CONFIG.width}:${CONFIG.height}:force_original_aspect_ratio=decrease,pad=${CONFIG.width}:${CONFIG.height}:(ow-iw)/2:(oh-ih)/2:black`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', String(CONFIG.crf),
    '-preset', CONFIG.preset,
    '-tune', 'stillimage', // 针对静态图优化
    '-movflags', '+faststart',
    '-an',
    outputMp4,
  ]

  return new Promise((resolveP) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0 && existsSync(outputMp4)) {
        // 复制到其他输出目录（public/）以保留给下次 vite build
        for (let i = 1; i < CONFIG.outputDirs.length; i++) {
          try {
            const dest = join(CONFIG.outputDirs[i], `${poemId}.mp4`)
            if (!existsSync(dest)) copyFileSync(outputMp4, dest)
          } catch (e) {
            // 忽略复制错误
          }
        }
        const sizeKb = (statSync(outputMp4).size / 1024).toFixed(0)
        resolveP({ ok: true, size: sizeKb })
      } else {
        const errLine = stderr.split('\n').filter(l => l.toLowerCase().includes('error')).slice(-1)[0]
          || stderr.split('\n').slice(-2, -1)[0]
          || 'unknown error'
        resolveP({ ok: false, reason: 'ffmpeg_failed', error: errLine.trim().slice(0, 200) })
      }
    })
    proc.on('error', (err) => {
      resolveP({ ok: false, reason: 'spawn_failed', error: err.message })
    })
  })
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
  const lvlIdx = args.indexOf('--log')
  if (lvlIdx >= 0) CONFIG.logLevel = args[lvlIdx + 1]

  // 0. 检查 ffmpeg
  if (!await ffmpegExists()) {
    log(C.red, '错误', '未找到 ffmpeg，请先安装：apt install ffmpeg')
    process.exit(1)
  }

  // 1. 确定待处理列表
  let targetIds = []
  if (pocId) {
    targetIds = [pocId]
    log(C.cyan, 'PoC', `模式：仅处理 ID=${pocId}`)
  } else if (specifiedIds) {
    targetIds = specifiedIds
    log(C.cyan, '指定', `处理 ${targetIds.length} 个 ID`)
  } else {
    const files = readdirSync(CONFIG.inputDir).filter(f => /^\d+\.jpg$/.test(f))
    targetIds = files.map(f => parseInt(f.replace('.jpg', '')))
    log(C.cyan, '批量', `扫描到 ${targetIds.length} 张 .jpg`)
  }

  if (targetIds.length === 0) {
    log(C.yellow, '提示', '没有可处理的图片')
    return
  }

  // 2. 并发处理
  const startTime = Date.now()
  let success = 0, failed = 0, skipped = 0
  const failures = []
  let lastProgressLog = 0

  // 用信号量控制并发
  let runningCount = 0
  const queue = [...targetIds]
  const workers = []

  const runOne = async (id) => {
    runningCount++
    const result = await imageToVideo(id)
    runningCount--
    if (result.ok && result.skipped) {
      skipped++
    } else if (result.ok) {
      success++
      if (CONFIG.logLevel === 'all') log(C.green, '完成', `ID=${id} ${result.size}KB`)
    } else {
      failed++
      failures.push({ id, reason: result.reason, error: result.error })
      if (CONFIG.logLevel !== 'error') log(C.red, '失败', `ID=${id} ${result.reason}: ${result.error || ''}`)
    }
  }

  // 启动 worker 池
  for (let w = 0; w < CONFIG.concurrency; w++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const id = queue.shift()
        if (id === undefined) break
        await runOne(id)
        // 进度日志（每 5% 或每 50 张）
        const done = success + failed + skipped
        if (targetIds.length > 10 && done - lastProgressLog >= Math.max(10, Math.floor(targetIds.length / 20))) {
          const pct = ((done / targetIds.length) * 100).toFixed(1)
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
          log(C.cyan, '进度', `[${done}/${targetIds.length}] ${pct}% 成功:${success} 跳过:${skipped} 失败:${failed} 耗时:${elapsed}s`)
          lastProgressLog = done
        }
      }
    })())
  }

  await Promise.all(workers)

  // 3. 汇总
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const speed = success > 0 ? (success / parseFloat(elapsed) * 60).toFixed(1) : '0'
  console.log('\n' + '='.repeat(60))
  log(C.green, '汇总', `完成 ${success} 个，跳过 ${skipped} 个，失败 ${failed} 个（耗时 ${elapsed}s，速度 ${speed} 张/分钟）`)
  if (failures.length > 0) {
    console.log('\n失败列表（前 10）：')
    for (const f of failures.slice(0, 10)) {
      console.log(`  ID=${f.id}  原因=${f.reason}  ${f.error || ''}`)
    }
    if (failures.length > 10) console.log(`  ... 还有 ${failures.length - 10} 个`)
  }
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error(`\n${C.red}❌ 异常:${C.reset}`, err)
  process.exit(1)
})
