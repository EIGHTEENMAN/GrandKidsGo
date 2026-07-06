#!/usr/bin/env node
// 把 chunk-7/8/9.ts 里双引号+有标点的 original 字段改成反引号+真换行
// 用法：node scripts/convert-chunk7-9.cjs [preview|apply]

const fs = require('fs')
const path = require('path')

const CHUNKS = ['chunk-7', 'chunk-8', 'chunk-9']
const mode = process.argv[2] || 'preview'

// 无标点诗手工断句（chunk-7 + chunk-8 共 11 首，chunk-9 无）
const MANUAL_FIX = {
  // chunk-7
  782: `惜花人何处？
落红春又残。
倚遍危楼十二阑。
弹泪痕罗袖斑。
江南岸，
夕阳山外山`,
  783: `兴为催租败，
欢因送酒来。
酒酣时诗兴依然在。
黄花又开，
朱颜未衰，
正好忘怀。
管甚谁家兴废谁成败`,
  799: `任脚下响着沉重的铁镣，
任你把皮鞭举得高高，
我不需要什么自由，
哪怕胸口对着带血的刺刀`,
  842: `昨夜雨疏风骤，
浓睡不消残酒。
试问卷帘人，
却道海棠依旧。
知否，
知否？
应是绿肥红瘦`,
  866: `前不见古人，
后不见来者。
念天地之悠悠，
独怆然而涕下`,
  // chunk-8
  875: `八月秋高风怒号，
卷我屋上三重茅。
安得广厦千万间，
大庇天下寒士俱欢颜，
风雨不动安如山！
呜呼！
何时眼前突兀见此屋，
吾庐独破受冻死亦足`,
  899: `老书生，
白屋中，
说古谈今真快倒。
若遇着那富贵人，
从无一次来寻问`,
  911: `小娉娉，二八岁，
不解藏踪迹，
浮萍一道开。
小娃撑小艇，
偷采白莲回`,
  953: `啼著曙，
泪落枕将浮。
身沉被流去，
相送奈何许？
江湖尽可越`,
  954: `打杀长鸣蝉，
弹去乌臼鸟。
愿得连冥不复曙，
一年都一晓`,
  955: `雨花台边埋断戟，
莫愁湖里余明月。
去时还是黄昏夜，
归来两鬓侵`,
}

const re = /original: "([^"]*)"/g

let totalConvert = 0
let totalSkipped = 0

for (const chunkName of CHUNKS) {
  const FILE = path.resolve(__dirname, `../src/data/poem-chunks/${chunkName}.ts`)
  const src = fs.readFileSync(FILE, 'utf8')

  const newSrc = src.replace(re, (match, body, offset, string) => {
    const hasPunct = /[，。？！]/.test(body)
    if (!hasPunct) {
      const ctx = string.slice(Math.max(0, offset - 500), offset)
      const poemIds = ctx.match(/^\s*\{\s*id:\s*(\d+),\s*title:/gm)
      const id = poemIds ? poemIds[poemIds.length - 1].match(/\d+/)[0] : null
      if (id && MANUAL_FIX[id]) {
        totalConvert++
        return `original: \`\n${MANUAL_FIX[id]}\n\``
      }
      totalSkipped++
      return match
    }
    totalConvert++
    const lines = body
      .replace(/([，。？！]+)/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const bodyNew = lines.join('\n')
    return `original: \`\n${bodyNew}\n\``
  })

  console.log(`=== ${chunkName} ===`)
  console.log(`  转换/手工总数累加: ${totalConvert}`)
  console.log(`  跳过（无解）累加: ${totalSkipped}`)

  if (mode === 'apply') {
    fs.writeFileSync(FILE, newSrc, 'utf8')
    console.log(`  ✅ 已写入 ${FILE}`)
  } else {
    let shown = 0
    const re2 = /original: "([^"]*)"/g
    let m
    while ((m = re2.exec(src)) && shown < 1) {
      const body = m[1]
      if (!/[，。？！]/.test(body)) continue
      const newBody = body
        .replace(/([，。？！]+)/g, '$1\n')
        .split('\n').map(s => s.trim()).filter(Boolean).join('\n')
      console.log(`  --- 示例 ---`)
      console.log(`  原文: ${JSON.stringify(body)}`)
      console.log('  新文:')
      console.log('  `')
      for (const line of newBody.split('\n')) console.log(`  ${line}`)
      console.log('  `')
      shown++
    }
  }
  console.log()
}

if (mode === 'preview') {
  console.log('预览模式：未写文件。用 `apply` 写入。')
}
