import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

// ===================== Data Imports =====================
import { poemsData } from '../../xueshici/src/data/poems.ts'
import { classicData } from '../../xueguoxue/src/data/classics.ts'
import { words } from '../../english/src/data/words.ts'
import { knowledgeData, type Section, type Topic } from '../../xuetongshi/src/data/knowledge.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db')

// ===================== Helpers =====================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

function pickNExcept<T>(arr: T[], n: number, exclude: T[]): T[] {
  const pool = arr.filter(x => !exclude.includes(x))
  return shuffle(pool).slice(0, n)
}

/**
 * Pick distractors from multiple pools in priority order.
 * Tries the first pool first (most similar domain), then falls back to each subsequent pool.
 * Ensures correctValue and any already-selected items are excluded.
 */
function pickDistractors(
  correctValue: string,
  required: number,
  ...pools: string[][]
): string[] {
  const result: string[] = []
  const seen = new Set<string>([correctValue])

  for (const pool of pools) {
    if (result.length >= required) break
    for (const item of shuffle(pool)) {
      if (result.length >= required) break
      if (!seen.has(item)) {
        result.push(item)
        seen.add(item)
      }
    }
  }

  return result
}

/** Parse poem original text into individual lines (non-empty) */
function parsePoemLines(original: string): string[] {
  return original
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

/**
 * Try to split a line at a punctuation boundary for "next line" questions.
 * If a line has internal punctuation (，。？！), take the part after
 * the last punctuation as a shorter "line segment".
 */
function splitLineSegments(line: string): string[] {
  const parts = line.split(/[，。？！；：、]/).filter(s => s.trim().length > 0)
  return parts.length > 1 ? parts : [line]
}

type QuestionRow = {
  category: string
  question: string
  options: string // JSON.stringify of string[]
  answer: number
  difficulty: number
  section_ref: string
}

// ===================== 诗词 Generator (4,000 题, category: chinese) =====================

function generateShiciQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  interface LineInfo {
    text: string
    poemTitle: string
    author: string
    dynasty: string
    poemId: number
    sectionId: number
  }

  const allLines: LineInfo[] = []
  const allAuthors: string[] = []
  const allTitles: string[] = []

  for (const poem of poemsData) {
    allAuthors.push(poem.author)
    allTitles.push(poem.title)
    for (const section of poem.sections) {
      const lines = parsePoemLines(section.original)
      for (const line of lines) {
        const segments = splitLineSegments(line)
        for (const seg of segments) {
          if (seg.length >= 3) {
            allLines.push({
              text: seg,
              poemTitle: poem.title,
              author: poem.author,
              dynasty: poem.dynasty,
              poemId: poem.id,
              sectionId: section.id,
            })
          }
        }
      }
    }
  }

  const seenLines = new Set<string>()
  const uniqueLines = allLines.filter(l => {
    const key = l.text
    if (seenLines.has(key)) return false
    seenLines.add(key)
    return true
  })

  // Build domain pools for smarter distractor selection
  const linesByAuthor = new Map<string, LineInfo[]>()
  const linesByDynasty = new Map<string, LineInfo[]>()
  const titlesByAuthor = new Map<string, string[]>()

  for (const line of uniqueLines) {
    if (!linesByAuthor.has(line.author)) linesByAuthor.set(line.author, [])
    linesByAuthor.get(line.author)!.push(line)
    if (!linesByDynasty.has(line.dynasty)) linesByDynasty.set(line.dynasty, [])
    linesByDynasty.get(line.dynasty)!.push(line)
  }
  for (const poem of poemsData) {
    if (!titlesByAuthor.has(poem.author)) titlesByAuthor.set(poem.author, [])
    titlesByAuthor.get(poem.author)!.push(poem.title)
  }

  console.log(`  诗词: ${allLines.length} raw lines → ${uniqueLines.length} unique lines from ${allTitles.length} poems`)

  // Collect full original lines (not split by punctuation) for longer excerpts
  // Used by "出自哪首诗" questions to show complete couplets
  const longLines: LineInfo[] = []
  {
    const seenLong = new Set<string>()
    for (const poem of poemsData) {
      for (const section of poem.sections) {
        const lines = parsePoemLines(section.original)
        for (const line of lines) {
          const cleaned = line.trim()
          if (cleaned.length >= 5 && !seenLong.has(cleaned)) {
            seenLong.add(cleaned)
            longLines.push({
              text: cleaned,
              poemTitle: poem.title,
              author: poem.author,
              dynasty: poem.dynasty,
              poemId: poem.id,
              sectionId: section.id,
            })
          }
        }
      }
    }
  }

  // Collect couplet pairs (consecutive lines joined by "，") for longer excerpts
  // Used by "作者是谁" questions to show complete couplets
  const coupletLines: LineInfo[] = []
  {
    const seenCouplet = new Set<string>()
    for (const poem of poemsData) {
      for (const section of poem.sections) {
        const lines = parsePoemLines(section.original)
        for (let i = 0; i < lines.length - 1; i++) {
          const left = lines[i].trim().replace(/[，。？！；：、\n]/g, '')
          const right = lines[i + 1].trim().replace(/[，。？！；：、\n]/g, '')
          if (left.length < 2 || right.length < 2) continue
          const couplet = left + '，' + right
          if (!seenCouplet.has(couplet)) {
            seenCouplet.add(couplet)
            coupletLines.push({
              text: couplet,
              poemTitle: poem.title,
              author: poem.author,
              dynasty: poem.dynasty,
              poemId: poem.id,
              sectionId: section.id,
            })
          }
        }
      }
    }
  }

  // ----- Type A: "下一句" (target: 2,200) -----
  const usedLinePairs = new Set<string>()
  let targetA = 2200

  for (const poem of shuffle(poemsData)) {
    if (results.length - 0 >= targetA) break
    for (const section of poem.sections) {
      if (results.length - 0 >= targetA) break
      const lines = parsePoemLines(section.original)
      const phrases: string[] = []
      for (const line of lines) {
        const parts = splitLineSegments(line)
        phrases.push(...parts)
      }

      for (let i = 0; i < phrases.length - 1; i++) {
        if (results.length >= targetA) break
        const current = phrases[i]
        const next = phrases[i + 1]
        if (current.length < 2 || next.length < 2) continue
        const key = current + '|' + next
        if (usedLinePairs.has(key)) continue
        usedLinePairs.add(key)

        // Smart distractor selection: same poem > same author > same dynasty > any
        const samePoemLines = uniqueLines
          .filter(l => l.poemTitle === poem.title && l.text !== next && l.text !== current)
          .map(l => l.text)
        const sameAuthorLines = (linesByAuthor.get(poem.author) || [])
          .filter(l => l.poemTitle !== poem.title && l.text !== next && l.text !== current)
          .map(l => l.text)
        const sameDynastyLines = (linesByDynasty.get(poem.dynasty) || [])
          .filter(l => l.author !== poem.author && l.text !== next && l.text !== current)
          .map(l => l.text)
        const otherLines = uniqueLines
          .filter(l => l.text !== next && l.text !== current && l.author !== poem.author && l.dynasty !== poem.dynasty)
          .map(l => l.text)

        const distractors = pickDistractors(next, 3, samePoemLines, sameAuthorLines, sameDynastyLines, otherLines)
        if (distractors.length < 3) continue

        const options = shuffle([next, ...distractors])
        const answer = options.indexOf(next)

        const isFamous = poem.author === '李白' || poem.author === '杜甫' || poem.author === '苏轼' ||
          poem.author === '白居易' || poem.author === '王维'
        const diff = isFamous ? 1 : (poem.dynasty === '唐' || poem.dynasty === '宋' ? 1 : 2)

        results.push({
          category: 'shici',
          question: `「${current}」的下一句是？`,
          options: JSON.stringify(options),
          answer,
          difficulty: diff,
          section_ref: `shici:${poem.id}:${section.id}`,
        })
      }
    }
  }
  console.log(`  已生成 下一句: ${results.filter(r => r.question.includes('下一句')).length} 题`)

  // ----- Type B: "作者是谁" (target: 1,100) -----
  const countB_start = results.length
  const targetB = 1100
  const usedAuthors = new Set<string>()

  // Build dynasty-author groupings for plausible distractor selection
  const authorsByDynasty = new Map<string, string[]>()
  for (const line of uniqueLines) {
    if (!authorsByDynasty.has(line.dynasty)) authorsByDynasty.set(line.dynasty, [])
    if (!authorsByDynasty.get(line.dynasty)!.includes(line.author)) {
      authorsByDynasty.get(line.dynasty)!.push(line.author)
    }
  }

  for (const line of shuffle(coupletLines.length > 0 ? coupletLines : uniqueLines)) {
    if (results.length - countB_start >= targetB) break
    const key = line.text + '|' + line.author
    if (usedAuthors.has(key)) continue
    usedAuthors.add(key)

    // Smart: same dynasty authors first, then fallback to other authors
    const sameDynastyAuthors = (authorsByDynasty.get(line.dynasty) || []).filter(a => a !== line.author)
    const otherAuthors = allAuthors.filter(a => a !== line.author && !sameDynastyAuthors.includes(a))
    const distractors = pickDistractors(line.author, 3, sameDynastyAuthors, otherAuthors)
    if (distractors.length < 3) continue

    const options = shuffle([line.author, ...distractors])
    const answer = options.indexOf(line.author)

    const isVeryFamous = ['李白', '杜甫', '苏轼', '白居易', '王维', '孟浩然', '王昌龄', '杜牧', '李商隐', '李清照', '辛弃疾'].includes(line.author)
    const diff = isVeryFamous ? 1 : 2

    results.push({
      category: 'shici',
      question: `「${line.text}」是哪位诗人写的？`,
      options: JSON.stringify(options),
      answer,
      difficulty: diff,
      section_ref: `shici:${line.poemId}:${line.sectionId}`,
    })
  }
  console.log(`  已生成 作者是谁: ${results.filter(r => r.question.includes('哪位诗人')).length} 题`)

  // ----- Type C: "出自哪首诗" (target: 1,100) -----
  const countC_start = results.length
  const targetC = 1100
  const usedPoemQ = new Set<string>()

  for (const line of shuffle(coupletLines.length > 0 ? coupletLines : longLines)) {
    if (results.length - countC_start >= targetC) break
    const key = line.text + '|' + line.poemTitle
    if (usedPoemQ.has(key)) continue
    usedPoemQ.add(key)

    if (line.text.includes(line.poemTitle)) continue

    // Smart: same author's other poems first, then same dynasty, then any
    const sameAuthorTitles = (titlesByAuthor.get(line.author) || []).filter(t => t !== line.poemTitle)
    const distractors = pickDistractors(line.poemTitle, 3, sameAuthorTitles, allTitles)
    if (distractors.length < 3) continue

    const options = shuffle([line.poemTitle, ...distractors])
    const answer = options.indexOf(line.poemTitle)

    const diff = [1, 2, 2][Math.floor(Math.random() * 3)]

    results.push({
      category: 'shici',
      question: `「${line.text}」出自哪首诗？`,
      options: JSON.stringify(options),
      answer,
      difficulty: diff,
      section_ref: `shici:${line.poemId}:${line.sectionId}`,
    })
  }
  console.log(`  已生成 出自哪首: ${results.filter(r => r.question.includes('出自哪首')).length} 题`)

  return results
}

// ===================== 国学 Generator (2,000 题, category: chinese) =====================

function generateGuoxueQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  const allClassicTitles: string[] = classicData.map(c => c.title)
  const allAuthors: string[] = [...new Set(classicData.filter(c => c.author && c.author.length > 0).map(c => c.author))]

  // Build domain pools
  const titlesByCategory = new Map<string, string[]>()
  const authorsByDynasty = new Map<string, string[]>()
  const allDynasties: string[] = []

  for (const classic of classicData) {
    if (classic.category) {
      if (!titlesByCategory.has(classic.category)) titlesByCategory.set(classic.category, [])
      titlesByCategory.get(classic.category)!.push(classic.title)
    }
    if (classic.author && classic.dynasty) {
      if (!authorsByDynasty.has(classic.dynasty)) authorsByDynasty.set(classic.dynasty, [])
      if (!authorsByDynasty.get(classic.dynasty)!.includes(classic.author)) {
        authorsByDynasty.get(classic.dynasty)!.push(classic.author)
      }
    }
    if (classic.dynasty && !allDynasties.includes(classic.dynasty)) {
      allDynasties.push(classic.dynasty)
    }
  }

  interface ClassicLine {
    text: string
    classicTitle: string
    author: string
    classicId: string
    sectionId: string
  }
  const allLines: ClassicLine[] = []

  for (const classic of classicData) {
    for (const section of classic.sections) {
      if (!section) continue
      const parts = (section.original || '').split(/[，。？！\n；：、]/).filter(s => s.trim().length > 0)
      for (const part of parts) {
        if (part.length >= 3) {
          allLines.push({ text: part, classicTitle: classic.title, author: classic.author, classicId: classic.id, sectionId: section.id })
        }
      }
    }
  }

  // Collect full original lines (split by newline only) for longer excerpts
  const longClassicLines: ClassicLine[] = []
  {
    const seenLong = new Set<string>()
    for (const classic of classicData) {
      for (const section of classic.sections) {
        if (!section) continue
        const lines = (section.original || '').split('\n').filter(s => s.trim().length > 0)
        for (const line of lines) {
          const cleaned = line.trim()
          // Only use lines that have internal punctuation (indicating a complete phrase)
          if (cleaned.length >= 8 && /[，。？！；：]/.test(cleaned) && !seenLong.has(cleaned)) {
            seenLong.add(cleaned)
            longClassicLines.push({
              text: cleaned,
              classicTitle: classic.title,
              author: classic.author,
              classicId: classic.id,
              sectionId: section.id,
            })
          }
        }
      }
    }
  }

  console.log(`  国学: ${allLines.length} lines from ${classicData.length} classics`)

  // ----- Type A: "出自哪部经典" (target: 1,000) -----
  const countA_start = results.length
  const targetA = 1000

  for (const line of shuffle(longClassicLines.length > 0 ? longClassicLines : allLines)) {
    if (results.length - countA_start >= targetA) break

    // Find the classic to get its category
    const classic = classicData.find(c => c.title === line.classicTitle)
    const category = classic?.category

    // Smart: same category classics first, then any
    const sameCatTitles = category ? (titlesByCategory.get(category) || []).filter(t => t !== line.classicTitle) : []
    const distractors = pickDistractors(line.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([line.classicTitle, ...distractors])
    const answer = options.indexOf(line.classicTitle)

    results.push({
      category: 'guoxue',
      question: `「${line.text}」出自哪部经典？`,
      options: JSON.stringify(options),
      answer,
      difficulty: 2,
      section_ref: `guoxue:${line.classicId}:${line.sectionId}`,
    })
  }
  console.log(`  已生成 出自哪部: ${results.length - countA_start} 题`)

  // ----- Type B: "经典作者" (target: 500) -----
  const countB_start = results.length
  const targetB = 500
  const usedAuthorQ = new Set<string>()

  for (const classic of shuffle(classicData)) {
    if (results.length - countB_start >= targetB) break
    if (!classic.author || classic.author.length === 0) continue
    const key = classic.title + '|' + classic.author
    if (usedAuthorQ.has(key)) continue
    usedAuthorQ.add(key)

    // Smart: same dynasty authors first, then any
    const sameDynastyAuthors = classic.dynasty ? (authorsByDynasty.get(classic.dynasty) || []).filter(a => a !== classic.author) : []
    const distractors = pickDistractors(classic.author, 3, sameDynastyAuthors, allAuthors)
    if (distractors.length < 3) continue

    const options = shuffle([classic.author, ...distractors])
    const answer = options.indexOf(classic.author)

    results.push({
      category: 'guoxue',
      question: `经典《${classic.title}》的作者是谁？`,
      options: JSON.stringify(options),
      answer,
      difficulty: 2,
      section_ref: `guoxue:${classic.id}:${classic.sections[0]?.id || ''}`,
    })
  }
  console.log(`  已生成 经典作者: ${results.length - countB_start} 题`)

  // ----- Type C: "经典常识" (target: ~900) -----
  const countC_start = results.length
  const targetC = 900

  const summaryQuestions: Array<{ text: string; answer: string; classicTitle: string; category?: string; classicId: string }> = []

  for (const classic of classicData) {
    if (classic.summary && classic.summary.length > 0) {
      summaryQuestions.push({
        text: classic.summary,
        answer: classic.title,
        classicTitle: classic.title,
        category: classic.category,
        classicId: classic.id,
      })
    }
  }

  for (const sq of shuffle(summaryQuestions)) {
    if (results.length - countC_start >= targetC) break

    const sameCatTitles = sq.category ? (titlesByCategory.get(sq.category) || []).filter(t => t !== sq.classicTitle) : []
    const distractors = pickDistractors(sq.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([sq.answer, ...distractors])
    const answerIdx = options.indexOf(sq.answer)

    const sqClassic = classicData.find(c => c.id === sq.classicId)
    results.push({
      category: 'guoxue',
      question: `以下哪部经典的介绍是："${sq.text}"？`,
      options: JSON.stringify(options),
      answer: answerIdx,
      difficulty: 2,
      section_ref: `guoxue:${sq.classicId}:${sqClassic?.sections[0]?.id || ''}`,
    })
  }

  const sectionItems: Array<{ text: string; classicTitle: string; category?: string; classicId: string; sectionId: string }> = []
  for (const classic of classicData) {
    for (const section of classic.sections) {
      if (!section) continue
      if (section.translation && section.translation.length > 0 && section.translation.length < 60) {
        sectionItems.push({ text: section.translation, classicTitle: classic.title, category: classic.category, classicId: classic.id, sectionId: section.id })
      }
    }
  }

  for (const item of shuffle(sectionItems)) {
    if (results.length - countC_start >= targetC) break

    const sameCatTitles = item.category ? (titlesByCategory.get(item.category) || []).filter(t => t !== item.classicTitle) : []
    const distractors = pickDistractors(item.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([item.classicTitle, ...distractors])
    const answerIdx = options.indexOf(item.classicTitle)

    results.push({
      category: 'guoxue',
      question: `"${item.text}"——这段描述对应哪部经典？`,
      options: JSON.stringify(options),
      answer: answerIdx,
      difficulty: 2,
      section_ref: `guoxue:${item.classicId}:${item.sectionId}`,
    })
  }

  console.log(`  已生成 经典常识: ${results.length - countC_start} 题`)


  // ----- Type E: Commentary questions (target: ~200) -----
  const countE_start = results.length
  const targetE = 200

  const interpItems: Array<{ text: string; classicTitle: string; category?: string; classicId: string; sectionId: string }> = []
  for (const classic of classicData) {
    for (const section of classic.sections) {
      if (!section) continue
      if (section.interpretation && section.interpretation.length > 0 && section.interpretation.length < 50) {
        interpItems.push({ text: section.interpretation, classicTitle: classic.title, category: classic.category, classicId: classic.id, sectionId: section.id })
      }
    }
  }

  for (const item of shuffle(interpItems)) {
    if (results.length - countE_start >= targetE) break

    const sameCatTitles = item.category ? (titlesByCategory.get(item.category) || []).filter(t => t !== item.classicTitle) : []
    const distractors = pickDistractors(item.classicTitle, 3, sameCatTitles, allClassicTitles)
    if (distractors.length < 3) continue

    const options = shuffle([item.classicTitle, ...distractors])
    const ansIdx = options.indexOf(item.classicTitle)

    results.push({
      category: 'guoxue',
      question: `"${item.text}"——这是对哪部经典的评价？`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: 2,
      section_ref: `guoxue:${item.classicId}:${item.sectionId}`,
    })
  }

  console.log(`  已生成 朝代+评述: ${results.length - countE_start} 题`)

  return results
}

// ===================== 英语 Generator (2,000 题, category: english) =====================

function generateEnglishQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  const allWords = words
  const allMeanings = words.map(w => w.meaning)
  const allEngWords = words.map(w => w.word)

  // Build difficulty-based pools for plausible distractors
  const wordsByDifficulty = new Map<number, typeof words>()
  for (const w of words) {
    const d = w.difficulty
    if (!wordsByDifficulty.has(d)) wordsByDifficulty.set(d, [])
    wordsByDifficulty.get(d)!.push(w)
  }

  /**
   * Pick English word distractors from similar difficulty level first,
   * then adjacent levels, then any.
   */
  function pickEnglishDistractors(correctWord: string, difficulty: number, required: number): string[] {
    const result: string[] = []
    const seen = new Set<string>([correctWord])

    // Same difficulty
    const sameDiff = (wordsByDifficulty.get(difficulty) || []).map(w => w.word).filter(w => !seen.has(w))
    for (const w of shuffle(sameDiff)) {
      if (result.length >= required) break
      result.push(w)
      seen.add(w)
    }

    // Adjacent difficulties (±1)
    if (result.length < required) {
      for (const adj of [difficulty - 1, difficulty + 1]) {
        if (result.length >= required) break
        const adjWords = (wordsByDifficulty.get(adj) || []).map(w => w.word).filter(w => !seen.has(w))
        for (const w of shuffle(adjWords)) {
          if (result.length >= required) break
          result.push(w)
          seen.add(w)
        }
      }
    }

    // Any remaining
    if (result.length < required) {
      for (const w of shuffle(allEngWords)) {
        if (result.length >= required) break
        if (!seen.has(w)) {
          result.push(w)
          seen.add(w)
        }
      }
    }

    return result.slice(0, required)
  }

  console.log(`  英语: ${allWords.length} words available, ${wordsByDifficulty.size} difficulty levels`)

  // ----- Type A: 中文→英文 (target: 800) -----
  const countA_start = results.length
  const targetA = 800

  for (const word of shuffle(allWords)) {
    if (results.length - countA_start >= targetA) break
    const distractors = pickEnglishDistractors(word.word, word.difficulty, 3)
    if (distractors.length < 3) continue

    const options = shuffle([word.word, ...distractors])
    const ansIdx = options.indexOf(word.word)
    const diff = word.difficulty <= 3 ? 1 : word.difficulty <= 6 ? 2 : 3

    results.push({
      category: 'english',
      section_ref: '',
      question: `"${word.meaning}" 的英文是？`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: diff,
    })
  }
  console.log(`  已生成 中→英: ${results.length - countA_start} 题`)

  // ----- Type B: 英文→中文 (target: 800) -----
  const countB_start = results.length
  const targetB = 800

  for (const word of shuffle(allWords)) {
    if (results.length - countB_start >= targetB) break

    // Pick meaning distractors from similar difficulty words
    const sameDiffWords = (wordsByDifficulty.get(word.difficulty) || []).filter(w => w.word !== word.word)
    const sameDiffMeanings = [...new Set(sameDiffWords.map(w => w.meaning))]
    const otherMeanings = allMeanings.filter(m => m !== word.meaning)

    const distractors = pickDistractors(word.meaning, 3, sameDiffMeanings, otherMeanings)
    if (distractors.length < 3) continue

    const options = shuffle([word.meaning, ...distractors])
    const ansIdx = options.indexOf(word.meaning)
    const diff = word.difficulty <= 3 ? 1 : word.difficulty <= 6 ? 2 : 3

    results.push({
      category: 'english',
      section_ref: '',
      question: `"${word.word}" 的中文意思是？`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: diff,
    })
  }
  console.log(`  已生成 英→中: ${results.length - countB_start} 题`)

  // ----- Type C: 选词填空 (target: 400) -----
  const countC_start = results.length
  const targetC = 400

  for (const word of shuffle(allWords)) {
    if (results.length - countC_start >= targetC) break
    if (!word.sentence || word.sentence.length < 5) continue

    const sentenceLower = word.sentence.toLowerCase()
    const wordLower = word.word.toLowerCase()
    const idx = sentenceLower.indexOf(wordLower)
    if (idx < 0) continue

    const blank = '____'
    const filledSentence =
      word.sentence.slice(0, idx) + blank + word.sentence.slice(idx + word.word.length)

    // Smart: same difficulty words as distractors (they could fit similar contexts)
    const sameDiffWords = (wordsByDifficulty.get(word.difficulty) || []).map(w => w.word).filter(w => w !== word.word)
    const otherWords = allEngWords.filter(w => w !== word.word)
    const distractors = pickDistractors(word.word, 3, sameDiffWords, otherWords)
    if (distractors.length < 3) continue

    const options = shuffle([word.word, ...distractors])
    const ansIdx = options.indexOf(word.word)
    const diff = word.difficulty <= 3 ? 1 : word.difficulty <= 6 ? 2 : 3

    results.push({
      category: 'english',
      section_ref: '',
      question: `选择正确的词填空：${filledSentence}`,
      options: JSON.stringify(options),
      answer: ansIdx,
      difficulty: diff,
    })
  }
  console.log(`  已生成 填空: ${results.length - countC_start} 题`)

  return results
}

// ===================== 通识 Generator (2,000 题, category: general/science) =====================

function generateTongshiQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  const scienceCats = new Set(['科学'])
  const validTopics = knowledgeData.filter(t => t.sections && t.sections.length > 0)

  const usedPairs = new Set<string>()

  // Collect clean term pools: section titles are the only reliable clean terms
  const allSectionTitles = new Set<string>()
  const sectionTitlesByTopic = new Map<string, string[]>()
  const sectionTitlesByCat = new Map<string, string[]>()
  const topicTitlesByCat = new Map<string, string[]>()

  for (const topic of validTopics) {
    const cat = scienceCats.has(topic.category) ? 'science' : 'general'
    if (!topicTitlesByCat.has(cat)) topicTitlesByCat.set(cat, [])
    topicTitlesByCat.get(cat)!.push(topic.title)
    if (!sectionTitlesByTopic.has(topic.id)) sectionTitlesByTopic.set(topic.id, [])
    if (!sectionTitlesByCat.has(cat)) sectionTitlesByCat.set(cat, [])

    for (const section of topic.sections) {
      if (section.title && section.title.length >= 2 && section.title.length <= 8) {
        allSectionTitles.add(section.title)
        sectionTitlesByTopic.get(topic.id)!.push(section.title)
        sectionTitlesByCat.get(cat)!.push(section.title)
      }
    }
  }

  // Build a "term pool" per topic: section titles + any short clean terms from content
  // These serve as distractor pools
  const termPoolByTopic = new Map<string, string[]>()
  const termPoolByCat = new Map<string, string[]>()
  for (const topic of validTopics) {
    const cat = scienceCats.has(topic.category) ? 'science' : 'general'
    const pool: string[] = [...(sectionTitlesByTopic.get(topic.id) || [])]
    termPoolByTopic.set(topic.id, pool)
    if (!termPoolByCat.has(cat)) termPoolByCat.set(cat, [])
    termPoolByCat.get(cat)!.push(...pool)
  }

  interface Fact {
    q: string
    answer: string
    dbCat: string
    difficulty: number
    topicId: string
    sectionId: string
  }

  const allFacts: Fact[] = []

  // ============= Strategy A: Definition questions (section title as answer) =============
  // For each section, find a "X是Y" sentence where X is the section title
  // → q: "Y是什么？" a: sectionTitle  distractors: other section titles from same topic
  for (const topic of validTopics) {
    const dbCat = scienceCats.has(topic.category) ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.title || !section.content || section.content.length < 15) continue
      const title = section.title
      // Skip long or punctuated titles
      if (title.length < 2 || title.length > 8) continue
      if (/[，。！？、；：]/.test(title) || /^(什么|如何|怎样)/.test(title)) continue

      const content = section.content

      // Try to find "title是Y" — answer is the section title
      const defRe = new RegExp(
        title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '是([^，。！？\n]{8,55})([。！？]|，)'
      )
      const defMatch = content.match(defRe)
      if (defMatch) {
        let clue = defMatch[1].trim()
        // Skip if clue starts with "一种" "一个" etc. or contains "最"
        if (/^(一种|一个|一类|一位|一群|一系列|一项|一个|一种)/.test(clue)) {
          // Try to use the part after "一种/一个" instead
          const after = clue.replace(/^(一种|一个|一类|一位|一群)的?/, '').trim()
          if (after.length >= 6) clue = after
          else continue
        }
        if (clue.includes('最') || clue.length < 6) continue

        // Clean up clue: remove leading "指" (redundant with "是指什么" template)
        let cleanedClue = clue.replace(/[，。；、：]+$/, '').trim()
        cleanedClue = cleanedClue.replace(/^指/, '').trim()
        if (cleanedClue.length < 6) continue

        // Build clean question
        const q = `${cleanedClue}是指什么？`
        allFacts.push({ q, answer: title, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })

        // Also add reverse phrasing for variety
        const q2 = `什么是${cleanedClue}？`
        allFacts.push({ q: q2, answer: title, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })
      }
    }
  }

  // ============= Strategy B: Superlative facts =============
  // Extract "最..." patterns, answer is section title (if mentioned in the same sentence)
  for (const topic of validTopics) {
    const dbCat = scienceCats.has(topic.category) ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.content || !section.title) continue
      const title = section.title
      if (title.length < 2 || title.length > 8) continue

      const content = section.content
      const topicTitles = sectionTitlesByTopic.get(topic.id) || []

      // Pattern: "title是最Y的Z。"
      const re1 = new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '是最([^，。！？\n]{8,45})([。！？])')
      const m1 = content.match(re1)
      if (m1) {
        const phrase = m1[1].trim()
        // Find real superlative — the phrase should contain at least one topic-relevant term
        const q = `最${phrase}是什么？`

        // Distractors: other section titles from same topic
        const distractors = pickDistractors(title, 3, topicTitles.filter(t => t !== title), [])
        if (distractors.length >= 3) {
          allFacts.push({ q, answer: title, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })
        }
        continue
      }

      // Pattern: "最Y的Z是title。"
      const re2 = new RegExp('最([^，。！？\n]{2,18})的([^，。！？\n]{2,14})是' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([。！？])')
      const m2 = content.match(re2)
      if (m2) {
        const adj = m2[1].trim()
        const noun = m2[2].trim()
        const q = `最${adj}的${noun}是什么？`

        const distractors = pickDistractors(title, 3, topicTitles.filter(t => t !== title), [])
        if (distractors.length >= 3) {
          allFacts.push({ q, answer: title, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })
        }
      }
    }
  }

  // ============= Strategy C: Numeric/quantity facts (science only) =============
  // Extract "X约为N单位" → ask "X约为多少？" answer: N单位
  for (const topic of validTopics) {
    if (!scienceCats.has(topic.category)) continue
    const dbCat = 'science'
    const diff = 2

    for (const section of topic.sections) {
      if (!section.content) continue
      const title = section.title
      const content = section.content

      // Match patterns: "X的Y约为N单位" where X is a section title or topic-relevant
      // e.g. "太阳的表面温度约为5500摄氏度"
      // e.g. "地球的直径约为12756公里"
      // e.g. "人体有206块骨头"
      const numRe = new RegExp(
        '(' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^，。！？\n]{0,12})' +
        '(约为|高达|可达|约有|约|有|达到|长达|重达|只[有需])' +
        '(\\d+(?:\\.\\d+)?[万亿千百十万]?\\s*[-－]?\\s*\\d*(?:\\.\\d+)?[万亿千百十万]?\\s*)' +
        '(摄氏度|华氏度|[公里度克倍种天年个分钟秒人次%升吨米层°]+)'
      )
      const numMatch = content.match(numRe)
      if (numMatch) {
        let subject = numMatch[1].trim()
        const rel = numMatch[2].trim()
        // Reconstruct value: digits + decimal + unit
        const digits = numMatch[3].trim()
        const unit = numMatch[4] || ''
        const value = digits + unit

        subject = subject.replace(/[：:，,、\s]+$/, '').trim()
        // Strip parenthetical content from subject (e.g. "重力了（国际空间站离地面" → "重力")
        const parenIdx = subject.indexOf('（')
        if (parenIdx > 2) subject = subject.slice(0, parenIdx).trim()
        if (subject.length < 4 || subject.length > 25) continue
        // Reject subjects with leftover parentheses (incomplete stripping)
        if (/[（(][^）)]*$/.test(subject)) continue
        if (!/[\d]/.test(value)) continue
        if (/^\d{4}年$/.test(value)) continue
        if (value.length > 20) continue

        const relWord = rel === '有' || rel === '只有' || rel === '只需' ? '有多少' :
                        rel === '约' || rel === '约为' || rel === '约有' ? '约为多少' :
                        rel === '高达' ? '高达多少' : rel === '长达' ? '长达多少' :
                        rel === '只需要' ? '只需要多少' : '有多少'

        // Skip if subject already contains digits (redundant, answer is already in subject)
        if (/\d/.test(subject)) continue

        const q = `${subject}${relWord}？`

        // Distractors: other numeric values from the same topic (look for other numbers)
        const otherNums: string[] = []
        const allNumRe = /(\d+(?:\.\d+)?[万亿千百十万]?\s*[-－]?\s*\d*(?:\.\d+)?[万亿千百十万]?\s*(?:摄氏度|华氏度|[公里度克倍种天年个分钟秒人次%升吨米层°]+))/g
        let nm: RegExpExecArray | null
        while ((nm = allNumRe.exec(content)) !== null) {
          const v = nm[1].trim()
          if (v !== value && v.length >= 2 && !otherNums.includes(v)) otherNums.push(v)
        }
        // Also look at other sections in the same topic
        for (const otherSection of topic.sections) {
          if (otherSection.id === section.id || !otherSection.content) continue
          allNumRe.lastIndex = 0
          while ((nm = allNumRe.exec(otherSection.content)) !== null) {
            const v = nm[1].trim()
            if (v !== value && v.length >= 2 && !otherNums.includes(v)) otherNums.push(v)
          }
        }

        const distractors = pickDistractors(value, 3, otherNums, [])
        if (distractors.length >= 3) {
          allFacts.push({ q, answer: value, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })
        }
      }
    }
  }

  // ============= Strategy D: "为什么" questions =============
  // Extract cause-effect: "因为{title}，{effect}" → "为什么{effect}？" answer: title
  for (const topic of validTopics) {
    const dbCat = scienceCats.has(topic.category) ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.content || !section.title) continue
      const title = section.title
      if (title.length < 2 || title.length > 6) continue
      const content = section.content
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Pattern 1: 因为/由于{up to 15 chars}{title} → effect is text before 因为
      for (const prefix of ['因为', '由于']) {
        const re1 = new RegExp(prefix + '(.{0,15})' + escaped, 'g')
        for (const m of content.matchAll(re1)) {
          const between = m[1].trim()
          if (between.length > 15) continue
          // Find preceding sentence boundary
          let start = Math.max(content.lastIndexOf('。', m.index!), content.lastIndexOf('！', m.index!), content.lastIndexOf('？', m.index!))
          start = start < 0 ? 0 : start + 1
          let effect = content.slice(start, m.index!).trim()
          effect = effect.replace(/^(就是|正是|也是|就在于)/, '').trim()
          effect = effect.replace(/(就是|正是|就在于)$/, '').trim().replace(/[，,]+$/, '')
          if (effect.length < 6 || effect.length > 45) continue
          if (effect.startsWith(title) || effect.includes('是指')) continue
          allFacts.push({ q: `为什么${effect}？`, answer: title, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })
          break // one per section
        }
      }

      // Pattern 2: 这是因为{up to 60 chars}{title}
      const re2 = new RegExp('这是因为(.{0,60})' + escaped)
      const m2 = content.match(re2)
      if (m2) {
        let start = Math.max(content.lastIndexOf('。', m2.index!), content.lastIndexOf('！', m2.index!), content.lastIndexOf('？', m2.index!))
        start = start < 0 ? 0 : start + 1
        let effect = content.slice(start, m2.index!).trim().replace(/[，,]+$/, '')
        if (effect.length >= 6 && effect.length <= 45 && !effect.startsWith(title) && !effect.includes('是指')) {
          allFacts.push({ q: `为什么${effect}？`, answer: title, dbCat, difficulty: diff, topicId: topic.id, sectionId: section.id })
        }
      }
    }
  }

  console.log(`  通识: ${validTopics.length} topics, ${allFacts.length} clean facts extracted`)

  // ============= Phase 2: Generate final questions with dedup =============
  let questions: QuestionRow[] = []
  const usedQ = new Set<string>()

  for (const fact of shuffle(allFacts)) {
    if (questions.length >= 2000) break

    const key = fact.answer + '|' + fact.q.slice(0, 25)
    if (usedPairs.has(key)) continue
    usedPairs.add(key)

    // Deduplicate by question content
    const qShort = fact.q.replace(/[，。！？、；：\s]/g, '').slice(0, 22)
    if (usedQ.has(qShort)) continue
    usedQ.add(qShort)

    // Pick distractors from same topic section titles
    const topicTitles = sectionTitlesByTopic.get(fact.topicId) || []
    const catTitles = sectionTitlesByCat.get(fact.dbCat) || []

    const distractors = pickDistractors(fact.answer, 3,
      topicTitles.filter(t => t !== fact.answer),
      catTitles.filter(t => t !== fact.answer && !topicTitles.includes(t))
    )

    if (distractors.length < 3) continue

    const options = shuffle([fact.answer, ...distractors])

    questions.push({
      category: fact.dbCat,
      question: fact.q,
      options: JSON.stringify(options),
      answer: options.indexOf(fact.answer),
      difficulty: fact.difficulty,
      section_ref: `general:${fact.topicId}:${fact.sectionId}`,
    })
  }

  console.log(`  Fact-based questions: ${questions.length}`)

  // Trim to exactly 2000
  const shuffled = shuffle(questions)
  for (let i = 0; i < Math.min(2000, shuffled.length); i++) {
    results.push(shuffled[i])
  }

  console.log(`  已生成 通识: ${results.length} 题 (science=${results.filter(r => r.category === 'science').length}, general=${results.filter(r => r.category === 'general').length})`)

  return results
}

// ===================== 意境题 Generator =====================

/**
 * Mood/意境 descriptor mapping by poem tag category.
 * Each tag maps to 2-3 distinct mood descriptors for variety.
 */
const YIJING_DESCRIPTORS: Record<string, string[]> = {
  '田园': ['恬淡清新的田园意境', '闲适自然的归隐之乐', '质朴生动的农家生活'],
  '边塞': ['雄浑壮阔的边塞风光', '苍凉悲壮的征战情怀', '慷慨豪迈的报国之志'],
  '爱情': ['婉约缠绵的相思之情', '真挚动人的爱情吟咏', '含蓄隽永的深情眷恋'],
  '感怀': ['深沉悠远的感怀之情', '悲凉慷慨的人生感慨', '孤寂落寞的内心独白'],
  '写景': ['优美动人的山水画卷', '壮丽雄奇的自然风光', '清新明丽的景色描绘'],
  '送别': ['依依惜别的深厚情谊', '豪迈旷达的送别情怀', '伤感惆怅的离别之情'],
  '思乡': ['魂牵梦萦的思乡之情', '孤寂凄凉的羁旅之思', '深切浓郁的故园之恋'],
  '怀古': ['悠远苍茫的历史感怀', '物是人非的沧桑之叹', '借古讽今的深沉感慨'],
  '咏物': ['托物言志的巧妙寄寓', '细致入微的物态描摹', '借物抒怀的深沉寄托'],
  '哲理': ['深邃睿智的人生哲思', '通透豁达的处世之道', '直指人心的哲理启示'],
  '情感': ['真挚深沉的情感抒发', '细腻动人的内心写照', '直抒胸臆的情感表达'],
  '民生': ['忧国忧民的深沉情怀', '心系苍生的悲悯之心', '关切民瘼的现实写照'],
  '叙事': ['质朴生动的叙事风格', '平实流畅的娓娓道来', '以小见大的生活实录'],
  '战争': ['悲壮惨烈的战争画卷', '慷慨激昂的报国热情', '硝烟弥漫的沙场风云'],
  '讽刺': ['辛辣犀利的讽刺笔法', '针砭时弊的深刻揭露', '寓庄于谐的巧妙批判'],
  '抒情': ['直抒胸臆的情感抒发', '酣畅淋漓的心灵独白', '真挚感人的肺腑之言'],
  '咏史': ['以古鉴今的历史沉思', '兴亡更替的沧桑感慨', '借史抒怀的深沉咏叹'],
  '励志': ['积极昂扬的奋发精神', '百折不挠的坚定信念', '追求理想的执着情怀'],
  '神话': ['奇幻瑰丽的浪漫想象', '神秘悠远的远古传说', '瑰丽多彩的神话世界'],
  '友谊': ['真挚深厚的友人情谊', '肝胆相照的知己之情', '志同道合的深厚交谊'],
  '宴饮': ['欢快酣畅的宴饮之乐', '豪爽洒脱的饮酒情怀', '宾主尽欢的热烈场面'],
  '农事': ['朴实自然的田园劳作', '辛勤耕耘的农家生活', '春华秋实的丰收喜悦'],
  '民歌': ['质朴清新的民歌风味', '生动活泼的民间生活', '朗朗上口的民间歌谣'],
  '亲情': ['血浓于水的骨肉亲情', '温馨感人的家庭温暖', '殷切深沉的慈爱之心'],
  '思念': ['刻骨铭心的深切思念', '望眼欲穿的殷切期盼', '魂牵梦萦的相思之苦'],
  '悼亡': ['阴阳两隔的悲恸哀思', '睹物思人的无尽怀念', '生死茫茫的凄楚哀伤'],
  '颂歌': ['热情洋溢的赞美歌颂', '崇高庄严的礼赞之情', '振奋人心的颂扬之歌'],
  '寓言': ['寓意深远的哲理寓言', '借物喻理的巧妙构思', '言近旨远的深刻启示'],
  '婚嫁': ['喜庆祥和的婚嫁场景', '美好真挚的爱情祝福', '幸福美满的婚姻礼赞'],
}

/// Known poet signature styles for 经典-tagged poems without specific mood tag
const POET_STYLE: Record<string, string[]> = {
  '李白': ['豪放飘逸的浪漫情怀', '天马行空的瑰丽想象', '狂放不羁的醉歌人生'],
  '杜甫': ['沉郁顿挫的家国之忧', '苍凉深沉的乱世悲歌', '忧国忧民的赤子之心'],
  '王维': ['清新空灵的山水意境', '诗中有画的禅意境界', '恬淡悠远的自然之趣'],
  '白居易': ['平易浅切的现实关怀', '通俗晓畅的叙事风格', '关切民生的真挚情怀'],
  '李商隐': ['婉约含蓄的深情绵邈', '朦胧凄美的无题诗境', '缠绵悱恻的相思情愫'],
  '杜牧': ['俊爽清丽的怀古幽思', '明丽隽永的秋景描绘', '风流蕴藉的历史感怀'],
  '王昌龄': ['雄浑豪放的边塞气概', '深沉婉约的宫怨闺情', '慷慨悲壮的军旅情怀'],
  '高适': ['悲壮苍凉的边塞诗风', '慷慨豪迈的报国之志', '雄浑质直的塞外壮歌'],
  '岑参': ['雄奇壮丽的边塞奇景', '瑰丽奇幻的异域风光', '豪迈乐观的戍边情怀'],
  '孟浩然': ['恬淡自然的山水之趣', '清新质朴的田园风光', '闲适淡泊的隐逸情怀'],
  '韩愈': ['雄奇险怪的独特诗风', '以文为诗的革新气魄', '气势磅礴的宏伟格局'],
  '柳宗元': ['清冷孤峭的山水意境', '孤寂高洁的贬谪情怀', '峻洁深沉的幽独境界'],
  '李贺': ['奇崛瑰丽的浪漫想象', '幽冷凄艳的鬼魅诗境', '惊心动魄的奇特意象'],
  '刘禹锡': ['豪迈昂扬的乐观精神', '隽永含蓄的怀古咏史', '清新明快的民歌风味'],
  '温庭筠': ['婉约绮丽的闺怨诗情', '浓艳精美的辞藻雕琢', '含蓄深沉的离愁别绪'],
  '苏轼': ['豪放旷达的人生境界', '挥洒自如的洒脱气度', '超然物外的豁达胸怀'],
  '辛弃疾': ['悲壮激昂的爱国豪情', '雄浑豪放的金戈铁马', '壮志未酬的慷慨悲歌'],
  '李清照': ['婉约含蓄的细腻情感', '凄婉动人的离愁别绪', '清新自然的女性视角'],
  '陆游': ['雄浑悲壮的爱国情怀', '慷慨激昂的收复之志', '壮志难酬的悲愤感慨'],
  '柳永': ['婉约缠绵的离情别绪', '清丽婉转的都市风情', '浅斟低唱的市井生活'],
  '陶渊明': ['恬淡自然的归隐之乐', '超然物外的田园境界', '淡泊明志的高洁情怀'],
  '曹操': ['雄浑悲壮的慷慨之歌', '气韵沉雄的壮阔胸怀', '求贤若渴的宏大气度'],
  '王安石': ['精练深沉的怀古咏史', '雄健峭拔的独特风格', '意境开阔的山水之作'],
  '杨万里': ['清新活泼的自然之趣', '幽默风趣的日常生活', '明快自然的山水小景'],
  '范成大': ['平实自然的田园风光', '细腻入微的农事描写', '质朴清新的乡土气息'],
  '纳兰性德': ['哀感顽艳的深情词章', '清丽婉转的相思离愁', '真挚动人的情感世界'],
  '李煜': ['凄婉哀绝的亡国之痛', '纯真深情的赤子之词', '血泪交加的故国之思'],
  '岳飞': ['气壮山河的爱国豪情', '壮志未酬的悲愤情怀', '慷慨激昂的英雄气概'],
  '文天祥': ['慷慨悲壮的民族气节', '视死如归的凛然正气', '坚贞不屈的爱国精神'],
  '班固': ['典雅庄重的史笔诗风', '铺陈排比的赋体风格', '宏阔壮丽的历史画卷'],
  '屈原': ['激越悲壮的爱国忧思', '瑰丽奇特的浪漫想象', '香草美人的比兴寄托'],
}

/**
 * Generate mood/意境 questions for 诗词.
 * Maps poem tags to artistic conception descriptors.
 * Each poem → "《{title}》营造了怎样的意境？"
 */
function generateShiciMoodQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []
  const usedPoems = new Set<string>()

  // Collect all mood descriptors for distractor pool
  const allDescriptors = new Set<string>()
  for (const descs of Object.values(YIJING_DESCRIPTORS)) {
    for (const d of descs) allDescriptors.add(d)
  }
  for (const descs of Object.values(POET_STYLE)) {
    for (const d of descs) allDescriptors.add(d)
  }
  const descriptorPool = [...allDescriptors]

  for (const poem of poemsData) {
    const poemKey = `${poem.id}`
    if (usedPoems.has(poemKey)) continue
    usedPoems.add(poemKey)

    // Extract the mood tag (second part of tags, e.g. "唐,田园" → "田园")
    const tagParts = poem.tags.split(',')
    const moodTag = tagParts.length >= 2 ? tagParts[1].trim() : ''

    // Determine the correct descriptor for this poem
    let correctDescriptor = ''

    if (YIJING_DESCRIPTORS[moodTag]) {
      // Use tag-based descriptor
      const descs = YIJING_DESCRIPTORS[moodTag]
      const idx = poem.id % descs.length
      correctDescriptor = descs[idx]
    } else if (POET_STYLE[poem.author]) {
      // Fall back to author style for 经典-tagged poems by famous poets
      const descs = POET_STYLE[poem.author]
      const idx = poem.id % descs.length
      correctDescriptor = descs[idx]
    }

    if (!correctDescriptor) continue

    // Pick distractors from other descriptors (not the same tag group)
    const sameTagDescs = YIJING_DESCRIPTORS[moodTag] || POET_STYLE[poem.author] || []
    const diffPool = descriptorPool.filter(d => !sameTagDescs.includes(d))
    const distractors = pickDistractors(correctDescriptor, 3, diffPool)

    if (distractors.length < 3) continue

    const options = shuffle([correctDescriptor, ...distractors])
    const answer = options.indexOf(correctDescriptor)

    // Use first section for section_ref
    const section = poem.sections[0]
    if (!section) continue

    results.push({
      category: 'shici',
      question: `《${poem.title}》营造了怎样的意境？`,
      options: JSON.stringify(options),
      answer,
      difficulty: 2,
      section_ref: `shici:${poem.id}:${section.id}`,
    })
  }

  return results
}

// ===================== 理解题 Generators =====================

/**
 * Generate comprehension questions for 诗词 using interpretation field.
 * Each section → "下列哪项是对《{title}》的正确理解？"
 */
function generateShiciComprehensionQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []
  const allInterps: Array<{ text: string; poemTitle: string; poemId: number; sectionId: number }> = []

  for (const poem of poemsData) {
    for (const section of poem.sections) {
      if (section.interpretation && section.interpretation.length >= 4) {
        allInterps.push({
          text: section.interpretation.trim(),
          poemTitle: poem.title,
          poemId: poem.id,
          sectionId: section.id,
        })
      }
    }
  }

  for (const interp of allInterps) {
    // Distractors: other sections' interpretations from same poem, then others
    const samePoemTexts = allInterps
      .filter(i => i.poemTitle === interp.poemTitle && i.sectionId !== interp.sectionId)
      .map(i => i.text.length > 35 ? i.text.slice(0, 35) + '…' : i.text)

    const otherTexts = allInterps
      .filter(i => i.poemTitle !== interp.poemTitle)
      .map(i => i.text.length > 35 ? i.text.slice(0, 35) + '…' : i.text)

    const answerText = interp.text.length > 35 ? interp.text.slice(0, 35) + '…' : interp.text
    const distractors = pickDistractors(answerText, 3, samePoemTexts, otherTexts)
    if (distractors.length < 3) continue

    const options = shuffle([answerText, ...distractors])
    results.push({
      category: 'shici',
      question: `下列哪项是对《${interp.poemTitle}》的正确理解？`,
      options: JSON.stringify(options),
      answer: options.indexOf(answerText),
      difficulty: 2,
      section_ref: `shici:${interp.poemId}:${interp.sectionId}`,
    })
  }

  return results
}

/**
 * Generate comprehension questions for 国学 using interpretation field.
 */
function generateGuoxueComprehensionQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []
  const allInterps: Array<{ text: string; classicTitle: string; classicId: string; sectionId: string }> = []

  for (const classic of classicData) {
    for (const section of classic.sections) {
      if (!section) continue
      if (section.interpretation && section.interpretation.length >= 4) {
        allInterps.push({
          text: section.interpretation.trim(),
          classicTitle: classic.title,
          classicId: classic.id,
          sectionId: section.id,
        })
      }
    }
  }

  for (const interp of allInterps) {
    const sameClassicTexts = allInterps
      .filter(i => i.classicTitle === interp.classicTitle && i.sectionId !== interp.sectionId)
      .map(i => i.text.length > 40 ? i.text.slice(0, 40) + '…' : i.text)

    const otherTexts = allInterps
      .filter(i => i.classicTitle !== interp.classicTitle)
      .map(i => i.text.length > 40 ? i.text.slice(0, 40) + '…' : i.text)

    const answerText = interp.text.length > 40 ? interp.text.slice(0, 40) + '…' : interp.text
    const distractors = pickDistractors(answerText, 3, sameClassicTexts, otherTexts)
    if (distractors.length < 3) continue

    const options = shuffle([answerText, ...distractors])
    results.push({
      category: 'guoxue',
      question: `《${interp.classicTitle}》——下列哪项是对这段文字的正确理解？`,
      options: JSON.stringify(options),
      answer: options.indexOf(answerText),
      difficulty: 2,
      section_ref: `guoxue:${interp.classicId}:${interp.sectionId}`,
    })
  }

  return results
}

/**
 * Generate comprehension questions for 通识 using content field.
 * "根据上文，以下说法正确的是？" with one correct statement and three altered versions.
 */
function generateTongshiComprehensionQuestions(): QuestionRow[] {
  const results: QuestionRow[] = []

  for (const topic of knowledgeData) {
    if (!topic || !topic.sections || topic.sections.length === 0) continue
    const dbCat = topic.category === '科学' ? 'science' : 'general'
    const diff = topic.category === '科学' ? 2 : 1

    for (const section of topic.sections) {
      if (!section.content || section.content.length < 20) continue
      const content = section.content
      const title = section.title

      // Strategy: extract a factual sentence, create distractor by swapping numbers or terms
      // Pattern: "XX是YZ" or "XX有N个" or "XX位于YY"
      // Correct: the exact statement from content
      // Wrong: same structure but with altered values

      // Try to find a clean factual sentence in the content
      const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length >= 8).map(s => s.trim())
      if (sentences.length === 0) continue

      // Pick the first good sentence that has a clear subject
      let factSentence = ''
      for (const s of sentences) {
        if (s.length >= 10 && s.length <= 50 && /[是有着位于在包含由]/.test(s)) {
          factSentence = s
          break
        }
      }
      if (!factSentence) {
        // Fallback: use the longest sentence
        sentences.sort((a, b) => b.length - a.length)
        factSentence = sentences[0]
        if (factSentence.length > 50) factSentence = factSentence.slice(0, 50) + '…'
        if (factSentence.length < 8) continue
      }

      const cleanFact = factSentence.length > 40 ? factSentence.slice(0, 40) + '…' : factSentence

      // Build distractors: try numeric substitution first, else use other sections' content
      const otherFacts = topic.sections
        .filter(s => s.id !== section.id && s.content)
        .map(s => {
          const otherSentences = s.content!.split(/[。！？\n]/).filter(x => x.trim().length >= 8)
          const otherFact = otherSentences[0] || (s.title ? s.title : '')
          return otherFact.length > 40 ? otherFact.slice(0, 40) + '…' : otherFact
        })
        .filter(x => x.length >= 6)

      // Try to create a numeric distractor if the fact contains numbers
      const numDistractors: string[] = []
      const numMatch = cleanFact.match(/(\d+)/)
      if (numMatch) {
        const num = parseInt(numMatch[1])
        // Create altered versions: +1, -1, ×2
        const variants = [num + 1, Math.max(1, num - 1), num * 2].filter(v => v !== num)
        for (const v of variants.slice(0, 3)) {
          numDistractors.push(cleanFact.replace(numMatch[1], String(v)))
        }
      }

      const distractors = pickDistractors(cleanFact, 3, numDistractors, otherFacts)
      if (distractors.length < 3) continue

      const options = shuffle([cleanFact, ...distractors])
      results.push({
        category: dbCat,
        question: `根据上文，以下说法正确的是？`,
        options: JSON.stringify(options),
        answer: options.indexOf(cleanFact),
        difficulty: diff,
        section_ref: `general:${topic.id}:${section.id}`,
      })
    }
  }

  return results
}

// ===================== Main =====================

function main() {
  console.log('========================================')
  console.log('  童慧行问答挑战 - 自动出题脚本')
  console.log('========================================\n')

  let allQuestions: QuestionRow[] = []

  console.log('📜 [1/7] 生成诗词题目 (target: 4,000)...')
  const shici = generateShiciQuestions()
  console.log(`   → 诗词题目: ${shici.length}\n`)
  allQuestions.push(...shici)

  console.log('📜 [2/7] 生成诗词意境题...')
  const shiciMood = generateShiciMoodQuestions()
  console.log(`   → 诗词意境题: ${shiciMood.length}\n`)
  allQuestions.push(...shiciMood)

  console.log('📜 [3/7] 生成诗词理解题...')
  const shiciComp = generateShiciComprehensionQuestions()
  console.log(`   → 诗词理解题: ${shiciComp.length}\n`)
  allQuestions.push(...shiciComp)

  console.log('📚 [5/8] 生成国学题目 (target: 2,000)...')
  const guoxue = generateGuoxueQuestions()
  console.log(`   → 国学题目: ${guoxue.length}\n`)
  allQuestions.push(...guoxue)

  console.log('📚 [6/8] 生成国学理解题...')
  const guoxueComp = generateGuoxueComprehensionQuestions()
  console.log(`   → 国学理解题: ${guoxueComp.length}\n`)
  allQuestions.push(...guoxueComp)

  console.log('🔤 [7/8] 生成英语题目 (target: 2,000)...')
  const eng = generateEnglishQuestions()
  console.log(`   → 英语题目: ${eng.length}\n`)
  allQuestions.push(...eng)

  console.log('🌍 [8/8] 生成通识题目 (target: 2,000)...')
  const tongshi = generateTongshiQuestions()
  console.log(`   → 通识题目: ${tongshi.length}\n`)
  allQuestions.push(...tongshi)

  console.log('🌍 生成通识理解题...')
  const tongshiComp = generateTongshiComprehensionQuestions()
  console.log(`   → 通识理解题: ${tongshiComp.length}\n`)
  allQuestions.push(...tongshiComp)

  // Final stats
  console.log('========================================')
  console.log(`  总计生成: ${allQuestions.length} 题`)
  const cats = new Map<string, number>()
  const diffs = new Map<number, number>()
  for (const q of allQuestions) {
    cats.set(q.category, (cats.get(q.category) || 0) + 1)
    diffs.set(q.difficulty, (diffs.get(q.difficulty) || 0) + 1)
  }
  console.log('  按分类:')
  for (const [k, v] of cats) console.log(`    ${k}: ${v}`)
  console.log('  按难度:')
  for (const [k, v] of diffs) console.log(`    level ${k}: ${v}`)

  // ---- Insert into database ----
  console.log('\n💾 写入数据库...')

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = DELETE')

  db.exec('DROP TABLE IF EXISTS quiz_questions')
  db.exec(`
    CREATE TABLE quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT 'general',
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      answer INTEGER NOT NULL,
      difficulty INTEGER DEFAULT 1,
      section_ref TEXT DEFAULT ''
    );
  `)

  db.exec('DELETE FROM quiz_questions')
  db.exec("DELETE FROM sqlite_sequence WHERE name='quiz_questions'")

  const insert = db.prepare(
    'INSERT INTO quiz_questions (category, question, options, answer, difficulty, section_ref) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < allQuestions.length; i += batchSize) {
    const batch = allQuestions.slice(i, i + batchSize)
    const tx = db.transaction((qs: QuestionRow[]) => {
      for (const q of qs) {
        insert.run(q.category, q.question, q.options, q.answer, q.difficulty, q.section_ref || '')
        inserted++
      }
    })
    tx(batch)
    console.log(`  已写入 ${inserted}/${allQuestions.length}`)
  }

  const count = db.prepare('SELECT COUNT(*) as cnt FROM quiz_questions').get() as { cnt: number }
  console.log(`\n✅ 完成！题库现有 ${count.cnt} 道题`)

  const breakdown = db.prepare('SELECT category, difficulty, COUNT(*) as cnt FROM quiz_questions GROUP BY category, difficulty ORDER BY category, difficulty').all()
  console.log('\n📊 题库详情:')
  for (const row of breakdown as Array<{ category: string; difficulty: number; cnt: number }>) {
    console.log(`  ${row.category} (难度${row.difficulty}): ${row.cnt}`)
  }

  db.close()
}

main()
