/**
 * 把 plan markdown 转换成 docx
 * 用法：node md-to-docx.mjs <input.md> <output.docx>
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
} from '/Users/shibaxia/工作/童慧行/apps/admin/node_modules/docx/build/index.mjs'

const FONT_SIZE_HALF_PT = 32 // 3号 = 16pt = 32 half-points
const FONT_SIZE_TITLE_HALF_PT = 44 // 标题略大
const FONT_NAME = '宋体'
const FONT_NAME_LATIN = 'Times New Roman'

const COLOR_PRIMARY = '1F4E79' // 深蓝（标题）
const COLOR_ACCENT = '2E75B6'  // 中蓝
const COLOR_TABLE_HEADER_BG = 'D9E2F3'
const COLOR_CODE_BG = 'F2F2F2'

const args = process.argv.slice(2)
if (args.length !== 2) {
  console.error('用法：node md-to-docx.mjs <input.md> <output.docx>')
  process.exit(1)
}

const inputPath = path.resolve(args[0])
const outputPath = path.resolve(args[1])
const md = fs.readFileSync(inputPath, 'utf-8')

// =============================================================
// 简易 markdown 解析器
// =============================================================

/**
 * 把一行内联 markdown 解析成 TextRun 数组
 * 支持：粗体 **xxx**、行内代码 `xxx`、普通文本
 */
function parseInline(line) {
  const runs = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: line.slice(lastIndex, match.index),
        size: FONT_SIZE_HALF_PT,
        font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
      }))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      runs.push(new TextRun({
        text: token.slice(2, -2),
        bold: true,
        size: FONT_SIZE_HALF_PT,
        font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
      }))
    } else if (token.startsWith('`')) {
      runs.push(new TextRun({
        text: token.slice(1, -1),
        size: FONT_SIZE_HALF_PT,
        font: { ascii: 'Consolas', eastAsia: FONT_NAME },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR_CODE_BG },
      }))
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < line.length) {
    runs.push(new TextRun({
      text: line.slice(lastIndex),
      size: FONT_SIZE_HALF_PT,
      font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
    }))
  }
  if (runs.length === 0) {
    runs.push(new TextRun({
      text: '',
      size: FONT_SIZE_HALF_PT,
      font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
    }))
  }
  return runs
}

/**
 * 解析 markdown 表格行 → TableRow 数组
 */
function parseTable(lines) {
  if (lines.length < 2) return null
  const headerLine = lines[0]
  // 跳过分隔行（lines[1] 是 |---|---|）
  const dataLines = lines.slice(2)
  const splitRow = (line) =>
    line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

  const headerCells = splitRow(headerLine).map((cellText) => {
    return new TableCell({
      children: [
        new Paragraph({
          children: parseInline(cellText),
          alignment: AlignmentType.CENTER,
        }),
      ],
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR_TABLE_HEADER_BG },
      width: { size: 25, type: WidthType.PERCENTAGE },
    })
  })

  const dataRows = dataLines.map((line) => {
    return new TableRow({
      children: splitRow(line).map((cellText, idx) => {
        return new TableCell({
          children: [new Paragraph({ children: parseInline(cellText) })],
          width: { size: 25, type: WidthType.PERCENTAGE },
        })
      }),
    })
  })

  return new Table({
    rows: [new TableRow({ children: headerCells }), ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    },
  })
}

/**
 * 主解析：把整篇 md 转成 docx 段落/表格/分隔符数组
 */
function parseMarkdown(content) {
  const lines = content.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (line.trim() === '') {
      i++
      continue
    }

    // 代码块（``` ... ```）
    if (line.trim().startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // 跳过结束 ```
      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
      })
      continue
    }

    // 表格（连续 |...| 行）
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [line]
      i++
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const tbl = parseTable(tableLines)
      if (tbl) blocks.push({ type: 'table', content: tbl })
      continue
    }

    // 一级标题 # 标题
    if (line.startsWith('# ')) {
      blocks.push({
        type: 'h1',
        content: line.slice(2).trim(),
      })
      i++
      continue
    }

    // 二级标题 ## 标题
    if (line.startsWith('## ')) {
      blocks.push({
        type: 'h2',
        content: line.slice(3).trim(),
      })
      i++
      continue
    }

    // 三级标题 ### 标题
    if (line.startsWith('### ')) {
      blocks.push({
        type: 'h3',
        content: line.slice(4).trim(),
      })
      i++
      continue
    }

    // 四级标题 #### 标题
    if (line.startsWith('#### ')) {
      blocks.push({
        type: 'h4',
        content: line.slice(5).trim(),
      })
      i++
      continue
    }

    // 引用 > xxx
    if (line.startsWith('> ')) {
      const quoteLines = [line.slice(2)]
      i++
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      blocks.push({
        type: 'quote',
        content: quoteLines.join('\n'),
      })
      continue
    }

    // 分隔线 ---
    if (line.trim() === '---') {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 无序列表 - xxx 或 * xxx
    if (/^[\-\*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', content: items })
      continue
    }

    // 有序列表 1. xxx
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', content: items })
      continue
    }

    // 普通段落
    blocks.push({ type: 'p', content: line })
    i++
  }

  return blocks
}

/**
 * 把 blocks 转成 docx 元素数组
 */
function blocksToDocxChildren(blocks) {
  const children = []

  for (const block of blocks) {
    switch (block.type) {
      case 'h1':
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: block.content,
              bold: true,
              size: FONT_SIZE_TITLE_HALF_PT,
              color: COLOR_PRIMARY,
              font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 240 },
        }))
        break

      case 'h2':
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: block.content,
              bold: true,
              size: FONT_SIZE_HALF_PT,
              color: COLOR_PRIMARY,
              font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 180 },
        }))
        break

      case 'h3':
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: block.content,
              bold: true,
              size: FONT_SIZE_HALF_PT,
              color: COLOR_ACCENT,
              font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 120 },
        }))
        break

      case 'h4':
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: block.content,
              bold: true,
              size: FONT_SIZE_HALF_PT,
              color: COLOR_ACCENT,
              font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
            }),
          ],
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 160, after: 100 },
        }))
        break

      case 'p':
        children.push(new Paragraph({
          children: parseInline(block.content),
          spacing: { line: 360, after: 100 },
        }))
        break

      case 'quote': {
        const quoteLines = block.content.split('\n')
        for (const ql of quoteLines) {
          children.push(new Paragraph({
            children: parseInline(ql),
            indent: { left: 480 },
            spacing: { after: 80 },
          }))
        }
        break
      }

      case 'ul':
        for (const item of block.content) {
          children.push(new Paragraph({
            children: parseInline(item),
            bullet: { level: 0 },
            spacing: { line: 320, after: 60 },
          }))
        }
        break

      case 'ol':
        block.content.forEach((item, idx) => {
          children.push(new Paragraph({
            children: parseInline(item),
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { line: 320, after: 60 },
          }))
        })
        break

      case 'code': {
        const codeLines = block.content.split('\n')
        for (const cl of codeLines) {
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: cl || ' ',
                size: 22, // 代码略小 11pt
                font: { ascii: 'Consolas', eastAsia: FONT_NAME },
              }),
            ],
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR_CODE_BG },
            spacing: { line: 280, after: 0 },
            indent: { left: 240 },
          }))
        }
        children.push(new Paragraph({ spacing: { after: 100 } }))
        break
      }

      case 'hr':
        children.push(new Paragraph({
          text: '',
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' },
          },
          spacing: { before: 120, after: 120 },
        }))
        break

      case 'table':
        children.push(block.content)
        children.push(new Paragraph({ spacing: { after: 100 } }))
        break
    }
  }

  return children
}

// =============================================================
// 主流程
// =============================================================

const blocks = parseMarkdown(md)
const docChildren = blocksToDocxChildren(blocks)

const doc = new Document({
  creator: '童慧行技术团队',
  title: '童慧行整站 ICP 备案落地实施方案 v1.0',
  description: '从零备案、13 子站 + 走天下一次性合规落地方案',
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
          size: FONT_SIZE_HALF_PT,
        },
        paragraph: {
          spacing: { line: 360, after: 100 },
        },
      },
      heading1: {
        run: {
          size: FONT_SIZE_TITLE_HALF_PT,
          bold: true,
          color: COLOR_PRIMARY,
          font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
        },
      },
      heading2: {
        run: {
          size: FONT_SIZE_HALF_PT,
          bold: true,
          color: COLOR_PRIMARY,
          font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
        },
      },
      heading3: {
        run: {
          size: FONT_SIZE_HALF_PT,
          bold: true,
          color: COLOR_ACCENT,
          font: { ascii: FONT_NAME_LATIN, eastAsia: FONT_NAME },
        },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'default-numbering',
        levels: [
          {
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.START,
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: docChildren,
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(outputPath, buffer)
console.log(`✅ 生成：${outputPath}`)
console.log(`   ${buffer.length} bytes`)
