/**
 * 蒙学 — Edge TTS 批量生成童声朗诵音频
 *
 * 音色策略：
 *   女童（XiaoyiNeural, -30%, +10Hz）: 三字经/弟子规/神童诗/千家诗/小学诗
 *   男童（YunxiaNeural, -30%, +0Hz）: 笠翁对韵/童蒙须知/名贤集/童蒙训/性理字训
 *
 * 文件名：{书名}_{节名}_{类型}.mp3
 *   类型：原文 / 译文 / 解读
 *
 * 用法：
 *   node scripts/tts-mengxue.mjs --poc    # 每本书只生成1节测试
 *   node scripts/tts-mengxue.mjs          # 全部10本全部节
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, unlinkSync, renameSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')

const CONFIG = {
  outputDir: resolve(APP_DIR, 'public/audio/books'),
  poc: process.argv.includes('--poc'),
  maxRetries: 3,
  retryDelay: 2000,
  requestDelay: 500,
}

// ===== 蒙学10部性别分配（方案A） =====
const GENDER_MAP = {
  '三字经': { voice: 'zh-CN-XiaoyiNeural', pitch: '+10Hz', gender: 'girl' },
  '弟子规': { voice: 'zh-CN-XiaoyiNeural', pitch: '+10Hz', gender: 'girl' },
  '神童诗': { voice: 'zh-CN-XiaoyiNeural', pitch: '+10Hz', gender: 'girl' },
  '千家诗': { voice: 'zh-CN-XiaoyiNeural', pitch: '+10Hz', gender: 'girl' },
  '小学诗': { voice: 'zh-CN-XiaoyiNeural', pitch: '+10Hz', gender: 'girl' },
  '笠翁对韵': { voice: 'zh-CN-YunxiaNeural', pitch: '+0Hz', gender: 'boy' },
  '童蒙须知': { voice: 'zh-CN-YunxiaNeural', pitch: '+0Hz', gender: 'boy' },
  '名贤集': { voice: 'zh-CN-YunxiaNeural', pitch: '+0Hz', gender: 'boy' },
  '童蒙训': { voice: 'zh-CN-YunxiaNeural', pitch: '+0Hz', gender: 'boy' },
  '性理字训': { voice: 'zh-CN-YunxiaNeural', pitch: '+0Hz', gender: 'boy' },
}

const RATE = '-30%'

const C = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m' }
const log = (color, tag, msg) => console.log(`${color}[${tag}]${C.reset} ${msg}`)

function sanitizeName(s) {
  return s.replace(/[（）()]/g, '').replace(/\s+/g, '')
}

function buildFilename(bookTitle, sectionTitle, typeLabel) {
  return `${sanitizeName(bookTitle)}_${sanitizeName(sectionTitle)}_${typeLabel}.mp3`
}

// ===== 文本提取（同 tts-guoxue.mjs） =====
function extractField(text, fieldName) {
  const re = new RegExp(`${fieldName}:\\s*`)
  const m = text.match(re)
  if (!m) return ''
  const start = m.index + m[0].length
  const rest = text.slice(start)
  const fc = rest[0]
  if (fc === '`') {
    let r = '', i = 1
    for (; i < rest.length; i++) {
      if (rest[i] === '\\') { r += rest[++i]; continue }
      if (rest[i] === '`') break
      r += rest[i]
    }
    return r
  }
  if (fc === "'" || fc === '"') {
    let r = '', i = 1
    for (; i < rest.length; i++) {
      if (rest[i] === '\\') { r += rest[++i]; continue }
      if (rest[i] === fc) break
      r += rest[i]
    }
    return r
  }
  return ''
}

function parseSections(fileContent, classicId) {
  const re = new RegExp(`\\{ id: ['"]${classicId}['"]`)
  const sm = fileContent.match(re)
  if (!sm) return []

  const after = fileContent.slice(sm.index)
  const arrStart = after.match(/sections:\s*\[/)
  if (!arrStart) return []

  let pos = sm.index + arrStart.index + arrStart[0].length
  const text = fileContent
  let depth = 1, inStr = false, sc = null, i
  for (i = pos; i < text.length && depth > 0; i++) {
    const ch = text[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === sc) inStr = false
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; sc = ch; continue }
    if (ch === '[') depth++
    else if (ch === ']') depth--
  }
  const raw = text.slice(pos, i - 1)
  const sections = []
  let scan = 0
  while (scan < raw.length) {
    const ob = raw.indexOf('{', scan)
    if (ob < 0) break
    let d = 0, ins = false, sc2 = null, j
    for (j = ob; j < raw.length; j++) {
      const c = raw[j]
      if (ins) {
        if (c === '\\') { j++; continue }
        if (c === sc2) ins = false
        continue
      }
      if (c === '"' || c === "'" || c === '`') { ins = true; sc2 = c; continue }
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) break }
    }
    const block = raw.slice(ob, j + 1)
    scan = j + 1
    const idM = block.match(/id:\s*['"]((?:jing|zi|shi|yi|meng)-\d+-s\d+)['"]/)
    if (!idM) continue
    sections.push({
      id: idM[1],
      title: block.match(/title:\s*['"]([^'"]+)['"]/)?.[1] || '',
      original: extractField(block, 'original'),
      translation: extractField(block, 'translation'),
      interpretation: extractField(block, 'interpretation'),
    })
  }
  return sections
}

// ===== Edge TTS =====
async function callEdgeTTS(text, voice, pitch, outputPath) {
  if (!text || !text.trim()) throw new Error('Empty text')
  const tmpMp3 = outputPath + '.tmp.mp3'
  const tmpTxt = outputPath + '.tmp.txt'
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(tmpTxt, text, 'utf-8')
  const r = spawnSync('python3', ['-m', 'edge_tts', '--voice', voice, `--rate=${RATE}`, `--pitch=${pitch}`,
    '--file', tmpTxt, '--write-media', tmpMp3], { timeout: 300000, encoding: 'utf-8' })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`edge-tts exit ${r.status}: ${(r.stderr || '').slice(0, 1500)}`)
  if (!existsSync(tmpMp3)) throw new Error('No output')
  const size = statSync(tmpMp3).size
  if (size < 100) { try { unlinkSync(tmpMp3) } catch {}; throw new Error('Too small') }
  renameSync(tmpMp3, outputPath)
  try { unlinkSync(tmpTxt) } catch {}
  return size
}

// ===== 主流程 =====
async function main() {
  log(C.cyan, '蒙学TTS', '开始...')
  const content = readFileSync(resolve(APP_DIR, 'src/data/classics.ts'), 'utf-8')

  // 找所有 meng- 的书籍和标题
  const books = []
  const bookRe = /\{ id: '(meng-\d+)', title: '([^']+)'/g
  let m
  while ((m = bookRe.exec(content)) !== null) {
    books.push({ id: m[1], title: m[2] })
  }

  let totalDone = 0, totalSkipped = 0, totalFailed = 0

  for (const book of books) {
    const gender = GENDER_MAP[book.title]
    if (!gender) {
      log(C.yellow, '跳过', `${book.title}: 无音色配置`)
      continue
    }
    const sections = parseSections(content, book.id)
    log(C.blue, book.title, `${sections.length} 节 → ${gender.gender === 'girl' ? '女童' : '男童'}(${gender.voice})`)

    const limit = CONFIG.poc ? 1 : sections.length
    for (let si = 0; si < limit; si++) {
      const sec = sections[si]
      for (const [type, label] of [['original', '原文'], ['translation', '译文'], ['interpretation', '解读']]) {
        const text = type === 'original' ? sec.original : type === 'translation' ? sec.translation : sec.interpretation
        if (!text.trim()) continue

        const filename = buildFilename(book.title, sec.title, label)
        const path = resolve(CONFIG.outputDir, filename)
        if (existsSync(path)) { totalSkipped++; continue }

        log(C.cyan, '生成', `[${book.title}] ${sec.title} · ${label}`)
        let ok = false
        for (let retry = 0; retry < CONFIG.maxRetries; retry++) {
          try {
            const size = await callEdgeTTS(text, gender.voice, gender.pitch, path)
            log(C.green, '完成', `${filename} (${(size / 1024).toFixed(1)}KB)`)
            totalDone++; ok = true; break
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
}

main().catch(e => { console.error(e); process.exit(1) })
