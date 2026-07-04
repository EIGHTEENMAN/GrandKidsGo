/**
 * 从 knowledge.ts 提取所有 section
 * 方案：用 tsc 转译为临时 .js 然后 require
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(__dirname, '../../apps/xuetongshi/src/data/knowledge.ts')
const OUTPUT = resolve(__dirname, 'all-sections.json')
const TMP_JS = '/tmp/knowledge-extract.mjs'

// 把 knowledge.ts 简单替换为可 require 的 mjs
const content = readFileSync(SOURCE, 'utf-8')

// 提取 knowledgeData 数组
const arrMatch = content.match(/knowledgeData:\s*Topic\[\]\s*=\s*\[([\s\S]*?)\n\]\s*$/m)
if (!arrMatch) {
  console.error('未找到 knowledgeData')
  process.exit(1)
}

// 写一个临时文件：用 new Function 解析
const arrStr = arrMatch[1]
const wrappedCode = `export const knowledgeData = ${arrStr}`

// 写到 .mjs（不写 .ts 因为需要转译）
const tmpTsFile = '/tmp/knowledge-extract.ts'
writeFileSync(tmpTsFile, wrappedCode, 'utf-8')

// 用 npx tsc 编译为 .mjs
try {
  execSync(`cd /tmp && npx -y -p typescript@5 tsc --target es2020 --module es2020 --moduleResolution node --outFile /tmp/knowledge-extract.mjs /tmp/knowledge-extract.ts`, { stdio: 'inherit' })
} catch (e) {
  console.error('tsc 编译失败:', e.message)
  process.exit(1)
}

// 现在 /tmp/knowledge-extract.mjs 已经可用
const { knowledgeData } = await import('/tmp/knowledge-extract.mjs')

const topics = knowledgeData.map(t => ({
  id: t.id,
  title: t.title,
  category: t.category,
  summary: t.summary,
  sections: t.sections.map(s => ({
    id: s.id,
    title: s.title,
    summary: s.content.slice(0, 80).replace(/\n/g, ' '),
  })),
}))

const totalSections = topics.reduce((sum, t) => sum + t.sections.length, 0)
console.log(`解析出 ${topics.length} 个 topic，${totalSections} 个 section`)
writeFileSync(OUTPUT, JSON.stringify({ topics, totalSections }, null, 2), 'utf-8')
console.log(`已写入 ${OUTPUT}`)

// 清理
try { unlinkSync('/tmp/knowledge-extract.ts') } catch {}
try { unlinkSync('/tmp/knowledge-extract.mjs') } catch {}
try { unlinkSync('/tmp/knowledge-extract.mjs.map') } catch {}
