#!/usr/bin/env node
// 把 chunk-4.ts 里双引号+有标点的 original 字段改成反引号+真换行
// 用法：node scripts/convert-chunk4.cjs [preview|apply]
//   preview: 只打印改动前/后对比，不写文件
//   apply:   写回 chunk-4.ts

const fs = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '../src/data/poem-chunks/chunk-4.ts')
const mode = process.argv[2] || 'preview'

const src = fs.readFileSync(FILE, 'utf8')

const re = /original: "([^"]*)"/g

let count = 0
let skippedNoPunct = 0
const noPunctIds = []

// 无标点诗手工断句：id → 完整原文
// chunk-4 含 6 首无标点：3 现代诗 + 3 古诗
const MANUAL_FIX = {
  475: `有一句话说出就是祸，
有一句话能点得着火。
别看五千年没有说破，
你猜得透火山的沉默？
说不定突然着了魔，
突然青天里一个霹雳
爆一声："咱们的中国！"`,
  476: `太阳啊，刺得我心痛的太阳！
又逼走了游子底一夜，
还又加他底孤寂`,
  487: `北方有佳人，
绝世而独立。
一顾倾人城，
再顾倾人国。
宁不知倾城与倾国，
佳人难再得`,
  488: `战城南，死郭北。
野死不葬乌可食。
为我谓乌：且为客豪！
野死谅不葬，
腐肉安能去子逃？
水深激激，
蒲苇冥冥，
枭骑战斗死，
驽马徘徊鸣`,
  528: `玉炉香，
红蜡泪，
偏照画堂秋思。
眉翠薄，
鬓云残，
夜长衾枕寒。
梧桐树，
三更雨，
不道离情正苦。
一叶叶，
一声声，
空阶滴到明`,
  544: `树绕村庄，
水满陂塘。
倚东风、豪兴徜徉。
小园几许，
收尽春光。
有桃花红，李花白，菜花黄。
远远围墙，
隐隐茅堂。
飏青旗、流水桥旁。
偶然乘兴，
步过东冈。
正莺儿啼，燕儿舞，蝶儿忙`,
}

// replace 全局遍历时拿不到原始 src 的偏移。用一个独立扫描拿无标点诗的 id
{
  const lineRe = /id:\s*(\d+)[^]*?original:\s*"([^"]*)"/g
  let mm
  while ((mm = lineRe.exec(src)) !== null) {
    if (!/[，。？！]/.test(mm[2])) noPunctIds.push(mm[1])
  }
}

const newSrc = src.replace(re, (match, body, offset, string) => {
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
  const lines = body
    .replace(/([，。？！]+)/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  const bodyNew = lines.join('\n')
  return `original: \`\n${bodyNew}\n\``
})

console.log(`=== 模式: ${mode} ===`)
console.log(`转换: ${count} 首`)
console.log(`跳过（无标点，需手工）: ${skippedNoPunct} 首 ${noPunctIds.length ? 'ids: ' + noPunctIds.join(',') : ''}`)
console.log(`文件: ${FILE}`)
console.log()

if (mode === 'preview') {
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
