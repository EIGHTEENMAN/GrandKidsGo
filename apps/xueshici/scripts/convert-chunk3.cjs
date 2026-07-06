#!/usr/bin/env node
// 把 chunk-3.ts 里双引号+有标点的 original 字段改成反引号+真换行
// 用法：node scripts/convert-chunk3.cjs [preview|apply]
//   preview: 只打印改动前/后对比，不写文件
//   apply:   写回 chunk-3.ts

const fs = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '../src/data/poem-chunks/chunk-3.ts')
const mode = process.argv[2] || 'preview'

const src = fs.readFileSync(FILE, 'utf8')

// 匹配 original: "..." 字段（非贪婪，跨行用 . 时 [\s\S]）
// 双引号串内部可能有英文引号 ' ，所以用最外层 "...\n" 的模式不可靠
// 改用：original: " 开头，到下一行的 " 结尾（按 batch2 的实际数据格式，每行一首）
const re = /original: "([^"]*)"/g

let count = 0
let skippedNoPunct = 0
const noPunctIds = []

// 无标点诗手工断句：id → 完整原文
// chunk-3 含 3 首无标点：苏轼定风波/罗隐霰/关汉卿大德歌
const MANUAL_FIX = {
  373: `常羡人间琢玉郎，
天应乞与点酥娘。
尽道清歌传皓齿，
风起。
雪飞炎海变清凉。
万里归来颜愈少。
微笑，
笑时犹带岭梅香。
试问岭南应不好，
却道：
此心安处是吾乡`,
  397: `雪花遣霰作前锋，
势颇张呈。
集霰回看，
桃李都无色，
映得芙蓉不是花`,
  429: `子规啼，
不如归，
道是春归人未归。
几日添憔悴，
虚飘飘柳絮飞。
一春鱼雁无消息`,
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