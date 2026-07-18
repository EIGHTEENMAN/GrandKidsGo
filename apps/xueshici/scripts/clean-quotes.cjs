#!/usr/bin/env node
// 把所有 chunk 里 translation/interpretation 字段里的单/双引号去掉
// 避免 esbuild 把反引号字符串回退成双引号
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.resolve(__dirname, '../src/data/poem-chunks')

// 匹配 translation/interpretation 字段里包含 " 或 ' 的
// translation: `...内容含 " 或 ' ...`
// 把内容里的 " 和 ' 替换为中点 · 或空格

let count = 0

for (let i = 0; i <= 20; i++) {
  const f = path.join(OUT_DIR, `chunk-${i}.ts`)
  if (!fs.existsSync(f)) continue
  let src = fs.readFileSync(f, 'utf8')
  const orig = src

  // 匹配 translation: `...` 或 interpretation: `...`（多行）
  // 把内部所有 " 和 ' 替换
  const re = /(translation|interpretation):\s*`([\s\S]*?)`/g
  src = src.replace(re, (m, key, body) => {
    // 把所有 " 和 ' 替换为 ·
    const cleaned = body.replace(/["']/g, '·')
    if (cleaned !== body) count++
    return `${key}: \`${cleaned}\``
  })

  // 同样处理 summary 字段
  const reSum = /(summary):\s*`([\s\S]*?)`/g
  src = src.replace(reSum, (m, key, body) => {
    const cleaned = body.replace(/["']/g, '·')
    if (cleaned !== body) count++
    return `${key}: \`${cleaned}\``
  })

  if (src !== orig) {
    fs.writeFileSync(f, src, 'utf8')
    console.log(`✓ ${path.basename(f)}`)
  }
}

console.log(`\n总计清理 ${count} 处引号`)
