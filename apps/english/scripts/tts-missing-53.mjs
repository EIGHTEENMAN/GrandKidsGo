/**
 * 补齐 53 个 missing 例句音频
 *
 * 之前 regex \b 误判失败的 53 个复合词（october/trainstation 等），
 * rewrite-result.json 里已经有 LLM 改写的句子，只是没生成 TTS。
 * 本脚本直接读 rewrite-result.json 给这 53 个生成 mp3。
 *
 * 用法：
 *   node scripts/tts-missing-53.mjs
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, unlinkSync, renameSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')

const CONFIG = {
  rewriteResultFile: resolve(APP_DIR, '../../scripts/rewrite-english-sentences/rewrite-result.json'),
  missingFile: '/tmp/missing_words.json',
  outputDir: resolve(APP_DIR, 'public/audio/sentences'),
  voice: 'en-US-JennyNeural',
  rate: '-15%',
  pitch: '+0Hz',
  retries: 3,
  retryDelay: 3000,
  timeoutMs: 90000,
}

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m',
}

function escapeXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildSsml(text) {
  // v3：纯文本模式（去掉 SSML 包装，避免 27 秒 bug）
  return String(text).trim()
}

function trimLeadingSilence(srcPath, destPath) {
  return new Promise((resolveP, rejectP) => {
    const args = [
      '-y', '-i', srcPath,
      '-ss', '0.15',
      '-af', 'afade=t=in:st=0:d=0.05',
      '-codec:a', 'libmp3lame',
      '-b:a', '48k',
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

async function callEdgeTTS(text, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')
  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'
  mkdirSync(dirname(outputPath), { recursive: true })

  const cleanText = text.replace(/"/g, '').trim()
  writeFileSync(tmpTxt, buildSsml(cleanText), 'utf-8')

  const args = ['-m', 'edge_tts', '--voice', CONFIG.voice,
    '--rate=' + CONFIG.rate, '--pitch=' + CONFIG.pitch,
    '--file', tmpTxt, '--write-media', tmpMp3]

  return new Promise((resolveP, rejectP) => {
    const child = spawn('python3', args, { encoding: 'utf-8' })
    let stderr = ''
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      try { unlinkSync(tmpMp3) } catch {}
      rejectP(new Error(`edge-tts timeout`))
    }, CONFIG.timeoutMs)
    child.stderr?.on('data', d => { stderr += d.toString() })
    child.on('error', err => { clearTimeout(timer); rejectP(err) })
    child.on('close', async code => {
      clearTimeout(timer)
      if (code !== 0) {
        try { unlinkSync(tmpMp3) } catch {}
        rejectP(new Error(`edge-tts exit ${code}: ${stderr.slice(0, 500)}`))
        return
      }
      if (!existsSync(tmpMp3)) { rejectP(new Error('No output file')); return }
      const size = statSync(tmpMp3).size
      if (size < 100) {
        try { unlinkSync(tmpMp3) } catch {}
        rejectP(new Error('File too small'))
        return
      }
      // 2026-07-01：trim 前导静音 150ms + 50ms fade-in
      try {
        await trimLeadingSilence(tmpMp3, outputPath)
      } catch (err) {
        try { renameSync(tmpMp3, outputPath) } catch {}
        console.error(`[ffmpeg trim fail] ${outputPath}: ${err.message}`)
      }
      try { unlinkSync(tmpTxt) } catch {}
      resolveP(statSync(outputPath).size)
    })
  })
}

async function main() {
  if (!existsSync(CONFIG.missingFile)) {
    console.error('missing file not found:', CONFIG.missingFile)
    process.exit(1)
  }
  const missing = JSON.parse(readFileSync(CONFIG.missingFile, 'utf-8'))
  const results = JSON.parse(readFileSync(CONFIG.rewriteResultFile, 'utf-8'))

  console.log(`\x1b[36m[INIT]\x1b[0m 需要补 ${missing.length} 个 mp3（53 个全无改写结果，直接用 words.ts 现有 sentence）`)

  let success = 0, failed = 0
  for (const w of missing) {
    const rewrite = results[w.id]
    // 优先用 LLM 改写结果，没有则用 words.ts 当前 sentence
    const sentence = (rewrite?.sentence && rewrite.sentence.length >= 6) ? rewrite.sentence : w.sentence
    if (!sentence || !sentence.trim()) {
      console.log(`\x1b[33m[SKIP]\x1b[0m #${w.id} ${w.word}: empty sentence`)
      failed++
      continue
    }
    const outputPath = resolve(CONFIG.outputDir, `sent_${w.id}.mp3`)
    for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
      try {
        const size = await callEdgeTTS(sentence, outputPath)
        console.log(`\x1b[32m[✓]\x1b[0m #${w.id} ${w.word}: ${sentence.slice(0, 50)} (${(size/1024).toFixed(1)}KB)`)
        success++
        break
      } catch (err) {
        console.log(`\x1b[33m[!]\x1b[0m #${w.id} ${w.word} attempt ${attempt}/${CONFIG.retries}: ${err.message.slice(0, 80)}`)
        if (attempt === CONFIG.retries) failed++
        else await new Promise(r => setTimeout(r, CONFIG.retryDelay * attempt))
      }
    }
  }

  console.log(`\n\x1b[32m[DONE]\x1b[0m 成功 ${success} / 失败 ${failed} / 总 ${missing.length}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})