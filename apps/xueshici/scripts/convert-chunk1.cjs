#!/usr/bin/env node
// 把 chunk-1.ts 里双引号+有标点的 original 字段改成反引号+真换行
// 用法：node scripts/convert-chunk1.cjs [preview|apply]
//   preview: 只打印改动前/后对比，不写文件
//   apply:   写回 chunk-1.ts

const fs = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '../src/data/poem-chunks/chunk-1.ts')
const mode = process.argv[2] || 'preview'

const src = fs.readFileSync(FILE, 'utf8')

// 匹配 original: "..." 字段（非贪婪，跨行用 . 时 [\s\S]）
// 双引号串内部可能有英文引号 ' ，所以用最外层 "...\n" 的模式不可靠
// 改用：original: " 开头，到下一行的 " 结尾（按 batch2 的实际数据格式，每行一首）
const re = /original: "([^"]*)"/g

let count = 0
let skippedNoPunct = 0
const noPunctIds = []

// 无标点诗手工断句：id → 完整原文（按 5/7 字 + 句意切）
const MANUAL_FIX = {
  126: `十年磨一剑，
霜刃未曾试，
今日把示君，
谁有不平事`,
  135: `莫听穿林打叶声，
何妨吟啸且徐行，
竹杖芒鞋轻胜马，
谁怕，
一蓑烟雨任平生，
料峭春风吹酒醒，
微冷，
山头斜照却相迎，
回首向来萧瑟处，
归去，
也无风雨也无晴`,
  136: `元丰六年十月十二日夜，
解衣欲睡，
月色入户，
欣然起行，
庭下如积水空明，
水中藻荇交横，
盖竹柏影也，
何夜无月，
何处无竹柏，
但少闲人如吾两人耳`,
}

// replace 全局遍历时拿不到原始 src 的偏移。用一个独立扫描拿无标点诗的 id
{
  // 按行扫，每行匹配 { id: NNN, title: "...", ... original: "xxx"
  // original: "..." 含标点则跳过，否则记录 id
  const lineRe = /id:\s*(\d+)[^]*?original:\s*"([^"]*)"/g
  let mm
  while ((mm = lineRe.exec(src)) !== null) {
    if (!/[，。？！]/.test(mm[2])) noPunctIds.push(mm[1])
  }
}

const newSrc = src.replace(re, (match, body, offset, string) => {
  // body 是原文内容（含标点）
  const hasPunct = /[，。？！]/.test(body)
  if (!hasPunct) {
    // 找上一首 poem 的 id（行首 "{ id: NNN, title:" 才算 poem，section 的在行内）
    const ctx = string.slice(Math.max(0, offset - 500), offset)
    const poemIds = ctx.match(/^\s*\{\s*id:\s*(\d+),\s*title:/gm)
    const id = poemIds ? poemIds[poemIds.length - 1].match(/\d+/)[0] : null
    if (id && MANUAL_FIX[id]) {
      count++
      return `original: \`\n${MANUAL_FIX[id]}\n\``
    }
    skippedNoPunct++
    return match // 真的无解，跳过
  }
  count++
  // 按标点切段。处理顺序：？ → ！ → 。 → ，
  // 注意：句末标点（？！。）后面要换行，逗号后面也要换行
  // 但要避免重复换行
  const lines = body
    .replace(/([，。？！]+)/g, '$1\n') // 每个标点后加换行
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  // 合并：如果某段末尾没有标点（最后一段），不加换行
  const bodyNew = lines.join('\n')
  return `original: \`\n${bodyNew}\n\``
})

console.log(`=== 模式: ${mode} ===`)
console.log(`转换: ${count} 首`)
console.log(`跳过（无标点，需手工）: ${skippedNoPunct} 首 ${noPunctIds.length ? 'ids: ' + noPunctIds.join(',') : ''}`)
console.log(`文件: ${FILE}`)
console.log()

if (mode === 'preview') {
  // 找前 3 首改动打印 diff
  let shown = 0
  const re2 = /original: "([^"]*)"/g
  let m
  while ((m = re2.exec(src)) && shown < 3) {
    const body = m[1]
    if (!/[，。？！]/.test(body)) continue
    const newBody = body
      .replace(/([，。？！]+)/g, '$1\n')
      .split('\n').map(s => s.trim()).filter(Boolean).join('\n')
    console.log(`--- 示例 ${shown + 1} ---`)
    console.log('原文:', JSON.stringify(body))
    console.log('新文:')
    console.log('`')
    console.log(newBody)
    console.log('`')
    console.log()
    shown++
  }
  console.log('预览模式：未写文件。用 `apply` 写入。')
} else if (mode === 'apply') {
  fs.writeFileSync(FILE, newSrc, 'utf8')
  console.log(`✅ 已写入 ${FILE}`)
} else {
  console.error(`未知模式: ${mode}（preview|apply）`)
  process.exit(1)
}