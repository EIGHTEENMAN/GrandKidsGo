/**
 * 国学 — Edge TTS 批量生成朗诵音频
 *
 * ⚠️ 适用：经部/子部/史部/医部（非蒙学）
 * 蒙学音频需要独立方案（更适合儿童的声音）
 *
 * 音色策略（2026-06-21 最终确认）：
 *   - 所有段落：YunyangNeural（磁性中年男声，沉稳厚重）
 *   - 语速：-35%（慢速，适合儿童跟读）
 *   - 原文：加 narration 情感（沉稳叙事）
 *   - 译文/解读：中性讲解
 *
 * 文件名：{书名}_{节名}_{类型}.mp3
 *   类型：原文 / 译文 / 解读
 *
 * 用法：
 *   node scripts/tts-guoxue.mjs                    # 全部书籍全部音频
 *   node scripts/tts-guoxue.mjs --book jing-1       # 指定某本书
 *   --force                                        # 强制覆盖所有 type (修复字段后用)
 *   --replace-original                             # 只强制覆盖 original
 *   --only-original/--only-translation/--only-interpretation
 *   node scripts/tts-guoxue.mjs --poc               # 每个书只生成1节测试
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, unlinkSync, renameSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync, spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')

const CONFIG = {
  outputDir: resolve(APP_DIR, 'public/audio/books'),
  // 要处理的书籍（空数组 = 扫描所有）
  bookIds: [],
  poc: process.argv.includes('--poc'),
  // ===== v2 配置（2026-06-24 修订：去掉 SSML/style，纯文本 + rate/pitch）=====
  // 原因：edge-tts 的 mstts:express-as style="narration" 对带中文双引号 /
  // 多段落的古典文（论语、道德经等）经常解析失败，回退成技术字符乱码。
  // 改成纯文本传 edge-tts（和蒙学一致），语音配置不变。
  originalVoice: {
    voice: 'zh-CN-YunyangNeural',   // 磁性中年男声
    style: null,                     // 去掉 style（避免乱码）
    styleDegree: null,
    rate: '-30%',                    // 慢速，适合儿童跟读
    pitch: '+0Hz',
  },
  translationVoice: {
    voice: 'zh-CN-YunyangNeural',
    style: null,
    styleDegree: null,
    rate: '-25%',
    pitch: '+0Hz',
  },
  maxRetries: 5,
  retryDelay: 5000,
  requestDelay: 1500,
}

// 解析命令行 --book jing-1,jing-2
if (process.argv.includes('--book')) {
  const idx = process.argv.indexOf('--book')
  CONFIG.bookIds = process.argv[idx + 1].split(',')
}

const C = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m' }
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

function escapeXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildSsml(text, voice, style, styleDegree, rate) {
  const body = escapeXml(text)
  if (style) {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${voice}"><mstts:express-as style="${style}" styledegree="${styleDegree}">${body}</mstts:express-as></voice></speak>`
  }
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="${voice}"><prosody rate="${rate}">${body}</prosody></voice></speak>`
}

// ===== 解析 classics.ts 全部书籍 =====
// 兼容单/双引号 id 和 title（新增的书用双引号）
function parseAllBooks(fileContent) {
  const books = []
  const bookRegex = /\{ id: ['"](jing|zi|shi|yi|meng)-\d+['"],\s*title: ['"]([^'"]+)['"],[\s\S]*?sections: \[/g
  let m
  while ((m = bookRegex.exec(fileContent)) !== null) {
    const fullId = m[0].match(/['"]((?:jing|zi|shi|yi|meng)-\d+)['"]/)[1]
    const title = m[2]
    const startIdx = m.index + m[0].length
    books.push({ id: fullId, title, startIdx })
  }
  return books
}

function parseSections(fileContent, classicId) {
  const re = new RegExp(`\\{ id: ['"]${classicId}['"]`)
  const startMatch = fileContent.match(re)
  if (!startMatch) return []

  const afterId = fileContent.slice(startMatch.index)
  const secArrStart = afterId.match(/sections:\s*\[/)
  if (!secArrStart) return []

  let pos = startMatch.index + secArrStart.index + secArrStart[0].length
  const text = fileContent
  let depth = 1, inStr = false, strChar = null, i

  for (i = pos; i < text.length && depth > 0; i++) {
    const ch = text[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === strChar) inStr = false
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue }
    if (ch === '[') depth++
    else if (ch === ']') depth--
  }

  const sectionsText = text.slice(pos, i - 1)
  const sections = []
  let scanPos = 0

  while (scanPos < sectionsText.length) {
    const ob = sectionsText.indexOf('{', scanPos)
    if (ob < 0) break
    let d = 0, inS = false, sC = null, j
    for (j = ob; j < sectionsText.length; j++) {
      const c = sectionsText[j]
      if (inS) {
        if (c === '\\') { j++; continue }
        if (c === sC) inS = false
        continue
      }
      if (c === '"' || c === "'" || c === '`') { inS = true; sC = c; continue }
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) break }
    }
    const block = sectionsText.slice(ob, j + 1)
    scanPos = j + 1

    const idM = block.match(/id:\s*['"]((?:jing|zi|shi|yi|meng)-\d+-s\d+)['"]/)
    if (!idM) continue

    const title = block.match(/title:\s*['"]([^'"]+)['"]/)?.[1] || ''
    const orig = extractField(block, 'original')
    const trans = extractField(block, 'translation')
    const interp = extractField(block, 'interpretation')

    sections.push({ id: idM[1], title, original: orig, translation: trans, interpretation: interp })
  }

  return sections
}

function extractField(text, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*`)
  const m = text.match(re)
  if (!m) return ''
  const start = m.index + m[0].length
  const rest = text.slice(start)
  const firstChar = rest[0]
  if (firstChar === '`') {
    let result = '', i = 1
    for (; i < rest.length; i++) {
      if (rest[i] === '\\') { result += rest[++i]; continue }
      if (rest[i] === '`') break
      result += rest[i]
    }
    return result
  }
  if (firstChar === "'" || firstChar === '"') {
    let result = '', i = 1
    for (; i < rest.length; i++) {
      if (rest[i] === '\\') { result += rest[++i]; continue }
      if (rest[i] === firstChar) break
      result += rest[i]
    }
    return result
  }
  return ''
}

function sanitizeName(s) {
  return s.replace(/[（）()]/g, '').replace(/\s+/g, '')
}

function buildFilename(bookTitle, sectionTitle, typeLabel) {
  return `${sanitizeName(bookTitle)}_${sanitizeName(sectionTitle)}_${typeLabel}.mp3`
}

async function callEdgeTTS(text, profile, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')
  // 预处理：去掉英文双引号（edge-tts 会读成 "quote" 怪声），
  // 把段落分隔符 \n 替换为 `。`（古典文每段都是独立句）
  text = text
    .replace(/"/g, '')         // 去掉所有英文双引号
    .replace(/\n+/g, '。')     // 多换行合并为一个句号（古典文无段落标记）
    .replace(/。+/g, '。')     // 避免多个连续句号
    .trim()
  const { voice, style, styleDegree, rate, pitch } = profile
  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'

  mkdirSync(dirname(outputPath), { recursive: true })

  const args = style
    ? ['-m', 'edge_tts', '--voice', voice, '--file', tmpTxt, '--write-media', tmpMp3]
    : ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, `--pitch=${pitch || '+0Hz'}`, '--file', tmpTxt, '--write-media', tmpMp3]

  if (style) {
    writeFileSync(tmpTxt, buildSsml(text, voice, style, styleDegree, rate), 'utf-8')
  } else {
    writeFileSync(tmpTxt, text, 'utf-8')
  }

  // 用异步 spawn 避免 macOS edge-tts 偶发挂死卡住整个进程
  // 单条 90s 超时，超时后 SIGKILL 子进程
  const PER_TIMEOUT = 90000
  return new Promise((resolveP, rejectP) => {
    const child = spawn('python3', args, { encoding: 'utf-8' })
    let stderr = ''
    let timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      try { unlinkSync(tmpMp3) } catch {}
      rejectP(new Error(`edge-tts timeout ${PER_TIMEOUT/1000}s killed`))
    }, PER_TIMEOUT)
    child.stderr?.on('data', d => { stderr += d.toString() })
    child.on('error', err => { clearTimeout(timer); rejectP(err) })
    child.on('close', code => {
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
      renameSync(tmpMp3, outputPath)
      try { unlinkSync(tmpTxt) } catch {}
      resolveP(size)
    })
  })
}

// ===== 主流程 =====
async function main() {
  log(C.cyan, '国学TTS', `音色: YunyangNeural | 语速: -30%（纯文本，无 SSML）`)
  const fileContent = readFileSync(resolve(APP_DIR, 'src/data/classics.ts'), 'utf-8')

  // 确定要处理的书籍
  const allBooks = parseAllBooks(fileContent).filter(b => !b.id.startsWith('meng-'))  // 排除蒙学
  const booksToProcess = CONFIG.bookIds.length > 0
    ? allBooks.filter(b => CONFIG.bookIds.includes(b.id))
    : allBooks

  log(C.blue, '扫描', `共 ${allBooks.length} 本，本次处理 ${booksToProcess.length} 本`)

  let totalDone = 0, totalSkipped = 0, totalFailed = 0

  for (const book of booksToProcess) {
    const sections = parseSections(fileContent, book.id)
    log(C.blue, '解析', `${book.title}(${book.id}) → ${sections.length} 节`)

    if (sections.length === 0) continue
    const limit = CONFIG.poc ? 1 : sections.length

    const onlyType = process.argv.includes('--only-original') ? 'original'
      : process.argv.includes('--only-translation') ? 'translation'
      : process.argv.includes('--only-interpretation') ? 'interpretation'
      : null

    for (let si = 0; si < limit; si++) {
      const sec = sections[si]
      for (const [type, label] of [['original', '原文'], ['translation', '译文'], ['interpretation', '解读']]) {
        if (onlyType && type !== onlyType) continue
        const text = type === 'original' ? sec.original : type === 'translation' ? sec.translation : sec.interpretation
        if (!text.trim()) continue

        const filename = buildFilename(book.title, sec.title, label)
        const path = resolve(CONFIG.outputDir, filename)
        // --replace-original: 只对 original 强制覆盖
        // --force: 对所有 type (original/translation/interpretation) 强制覆盖
        const forceReplace = (process.argv.includes('--replace-original') && type === 'original') || process.argv.includes('--force')
        if (existsSync(path) && !forceReplace) { totalSkipped++; continue }

        const profile = type === 'original' ? CONFIG.originalVoice : CONFIG.translationVoice
        log(C.cyan, '生成', `[${book.title}] ${sec.title} · ${label}`)

        let ok = false
        for (let retry = 0; retry < CONFIG.maxRetries; retry++) {
          try {
            const size = await callEdgeTTS(text, profile, path)
            log(C.green, '完成', `${filename} (${(size / 1024).toFixed(1)}KB)`)
            totalDone++
            ok = true
            break
          } catch (err) {
            if (retry < CONFIG.maxRetries - 1) {
              log(C.yellow, '重试', `${label}: ${String(err).slice(0, 200)}`)
              await new Promise(r => setTimeout(r, CONFIG.retryDelay))
            } else {
              log(C.red, '失败', `${label}: ${String(err).slice(0, 200)}`)
              totalFailed++
            }
          }
        }
        await new Promise(r => setTimeout(r, CONFIG.requestDelay))
      }
    }
  }

  log(C.green, '完毕', `生成 ${totalDone} 段 | 跳过 ${totalSkipped} 段 | 失败 ${totalFailed} 段`)
  if (CONFIG.poc) {
    log(C.yellow, '提示', 'PoC 完成，去掉 --poc 重新运行可生成全部')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
