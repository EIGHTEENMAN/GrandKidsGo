/**
 * Fix classics.ts: revert wrong titles back to committed versions,
 * keep valid expansions, and expand remaining books to 10 sections.
 *
 * Run: npx tsx scripts/fix-classics.ts
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const FILE = path.resolve(__dirname, '../src/data/classics.ts')

interface Section {
  id: string
  title: string
  original: string
  translation: string
  interpretation: string
}

interface Classic {
  id: string
  title: string
  author: string
  dynasty: string
  category: string
  summary: string
  tags: string[]
  color: string
  sections: Section[]
}

// Read committed version
const committedContent = execSync('git show HEAD:apps/xueguoxue/src/data/classics.ts', { cwd: path.resolve(__dirname, '../../..') }).toString()
// Read current version
const currentContent = fs.readFileSync(FILE, 'utf-8')

function parseBooks(content: string): Classic[] {
  // Extract the classicData array
  const start = content.indexOf('export const classicData: Classic[] = [')
  const end = content.lastIndexOf(']')
  const arrayContent = content.slice(start, end + 1)

  // Parse using Function constructor
  const processed = arrayContent
    .replace('export const classicData: Classic[] = ', 'return ')
    .replace(/(\w+):/g, '"$1":') // This won't work for all cases
  // Actually let's use a different approach - eval the TS
  return []
}

// Simpler approach: just do text-level replacements
function getBookObjects(content: string): Map<string, string> {
  const books = new Map<string, string>()
  const lines = content.split('\n')
  let currentId = ''
  let depth = 0
  let startLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const idMatch = line.match(/^\s+\{ id: '([^']+)'/)
    if (idMatch) {
      currentId = idMatch[1]
      startLine = i
      depth = 1
      // Find the closing of this book object
      for (let j = i + 1; j < lines.length; j++) {
        // Count braces
        for (const ch of lines[j]) {
          if (ch === '{') depth++
          if (ch === '}') depth--
        }
        if (depth === 0) {
          const bookText = lines.slice(startLine, j + 1).join('\n')
          books.set(currentId, bookText)
          i = j
          break
        }
      }
    }
  }
  return books
}

// Parse committed books
const committedBooks = getBookObjects(committedContent)
const currentBooks = getBookObjects(currentContent)

// Extract book metadata from committed version
function getBookMeta(bookText: string) {
  const title = bookText.match(/title: '([^']+)'/)?.[1] || ''
  const author = bookText.match(/author: '([^']+)'/)?.[1] || ''
  const dynasty = bookText.match(/dynasty: '([^']+)'/)?.[1] || ''
  const category = bookText.match(/category: '([^']+)'/)?.[1] || ''
  const summary = bookText.match(/summary: '([^']+)'/)?.[1] || ''
  const tags = bookText.match(/tags: \[([^\]]+)\]/)?.[1] || ''
  const color = bookText.match(/color: '([^']+)'/)?.[1] || ''
  return { title, author, dynasty, category, summary, tags, color }
}

// Count sections in a book text
function countSections(bookText: string): number {
  return (bookText.match(/\{id: '[^']+-s\d+'/g) || []).length
}

// Get all section texts from a book
function getSections(bookText: string): string[] {
  const sections: string[] = []
  const lines = bookText.split('\n')
  let inSections = false
  let currentSection = ''
  let depth = 0

  for (const line of lines) {
    if (line.includes('sections: [')) {
      inSections = true
      continue
    }
    if (!inSections) continue

    // Check for section start
    const secStart = line.match(/^\s+\{ id: '([^']+)'/)
    if (secStart) {
      if (currentSection) sections.push(currentSection)
      currentSection = line
      depth = 1
      continue
    }

    if (currentSection) {
      currentSection += '\n' + line
      for (const ch of line) {
        if (ch === '{') depth++
        if (ch === '}') depth--
      }
      if (depth <= 0 && line.trim().endsWith('},')) {
        sections.push(currentSection)
        currentSection = ''
      }
    }
  }
  if (currentSection) sections.push(currentSection)

  return sections.filter(s => s.trim().length > 0)
}

// Generate a new section for a book
function generateSection(bookId: string, index: number, committedBook: string): Section {
  const meta = getBookMeta(committedBook)
  const title = meta.title
  const authors = meta.author.split('/')

  // Template classical Chinese passages based on book type
  const passages: Record<string, { title: string; original: string; translation: string; interpretation: string }[]> = {
    'jing-1': [ // 论语
      { title: '学而时习', original: '子曰："学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"', translation: '孔子说："学习并且经常温习，不是很愉快吗？有朋友从远方来，不是很高兴吗？别人不了解我，我也不怨恨，不正是君子吗？"', interpretation: '开篇概括了学习的三种境界：个人修习、朋友切磋、不为人知而不怨。' },
      { title: '吾日三省', original: '曾子曰："吾日三省吾身：为人谋而不忠乎？与朋友交而不信乎？传不习乎？"', translation: '曾子说："我每天多次反省自己：替人办事是否尽心？与朋友交往是否诚信？老师传授的知识是否温习了？"', interpretation: '曾子提出每日自省的修身方法，涵盖做事、交友、求学三个方面。' },
    ],
  }

  const bookPassages = passages[bookId]
  if (bookPassages && index < bookPassages.length) {
    const p = bookPassages[index]
    return { id: `${bookId}-s${index + 1}`, ...p }
  }

  // Generic fallback
  return {
    id: `${bookId}-s${index + 1}`,
    title: `节选${index + 1}`,
    original: '（原文待补充）',
    translation: '（译文待补充）',
    interpretation: '（解读待补充）',
  }
}

// First fix: identify books with wrong titles
const titleFixes: Record<string, string> = {
  'zi-12': '吕氏春秋', 'zi-13': '淮南子', 'zi-14': '颜氏家训',
  'zi-15': '菜根谭', 'zi-16': '小窗幽记', 'zi-17': '人物志',
  'zi-18': '申鉴', 'zi-19': '法言',
}

// Check each book's title
for (const [id, committedTitle] of Object.entries(titleFixes)) {
  const current = currentBooks.get(id)
  if (!current) {
    console.log(`${id}: NOT FOUND in current file`)
    continue
  }
  const currentTitle = current.match(/title: '([^']+)'/)?.[1]
  console.log(`${id}: current="${currentTitle}" committed="${committedTitle}" sections=${countSections(current)}`)
}

// Check for duplicates
console.log('\n=== Checking for duplicate titles in zi range ===')
const ziTitles = new Map<string, string[]>()
for (const [id, text] of currentBooks) {
  if (id.startsWith('zi-')) {
    const title = text.match(/title: '([^']+)'/)?.[1] || ''
    if (!ziTitles.has(title)) ziTitles.set(title, [])
    ziTitles.get(title)!.push(id)
  }
}
for (const [title, ids] of ziTitles) {
  if (ids.length > 1) {
    console.log(`Duplicate title "${title}" in: ${ids.join(', ')}`)
  }
}

// Check zi-28 sections
const z28 = currentBooks.get('zi-28')
if (z28) {
  const count = countSections(z28)
  console.log(`\nzi-28 sections: ${count}`)
}
