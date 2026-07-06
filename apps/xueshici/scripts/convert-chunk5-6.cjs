#!/usr/bin/env node
// 把 chunk-5.ts 和 chunk-6.ts 里双引号+有标点的 original 字段改成反引号+真换行
// 用法：node scripts/convert-chunk5-6.cjs [preview|apply]
//   preview: 只打印改动前/后对比，不写文件
//   apply:   写回两个 chunk 文件

const fs = require('fs')
const path = require('path')

const CHUNKS = ['chunk-5', 'chunk-6']
const mode = process.argv[2] || 'preview'

// 无标点诗手工断句（chunk-5 + chunk-6 共 13 首）
const MANUAL_FIX = {
  // chunk-5
  561: `一江烟水照晴岚，
两岸人家接画檐。
芰荷丛一段秋光淡。
看沙鸥舞再三，
卷香风十里珠帘。
画船儿天边至，
酒旗儿风外飐。
爱杀江南`,
  633: `湛湛长空黑。
更那堪、斜风细雨，
乱愁如织！
老眼平生空四海，
赖有高楼百尺。
看浩荡、千崖秋色。
白发书生神州泪，
尽凄凉、不向牛山滴。`,
  650: `西风信来家万里，
问我归期未？
雁啼红叶天，
人醉黄花夜，
芭蕉雨声秋梦里`,
  651: `夺泥燕口，
削铁针头，
刮金佛面细，
搜求无中觅有。
鹌鹑嗉里寻豌豆，
鹭鸶腿上劈精肉，
蚊子腹内刳脂油。
亏老先生下手`,
  663: `秋风萧萧愁杀，
出亦愁，
入亦愁。
座中何人，
谁不怀忧？
令我白头。
胡地多飚风，
树木何修修。
离家日趋远，
衣带日趋缓。
心思不能言，
肠中车轮转`,
  // chunk-6
  675: `饮马长城窟，
水寒伤马骨。
往谓长城吏：
慎莫稽留太原卒！
官作自有程，
举筑谐汝声。
男儿宁当格斗死，
何能怫郁筑长城？
长城何连连，
连连三千里。
边城多健少，
内舍多寡妇`,
  676: `置酒高殿上，
亲友从我游。
中厨办丰膳，
烹羊宰肥牛。
秦筝何慷慨，
齐瑟和且柔。
惊风飘白日，
光景驰西流。
盛时不再，
百年忽我遒。
生存华屋处，
零落归山丘`,
  679: `有大人先生，
以天地为一朝，
万期为须臾，
日月为扃牖，
八荒为庭衢。
行无辙迹，
居无室庐，
幕天席地，
纵意所如。
止则操卮执觚，
动则挈榼提壶，
唯酒是务，
焉知其余`,
  694: `敕勒川，
阴山下，
天似穹庐，
笼盖四野。
天苍苍，
野茫茫，
风吹草低见牛羊`,
  701: `笔头风月时时过，
眼底儿曹渐渐多。
有人问我事如何？
人海阔，
无日不风波`,
  737: `孤儿生，
孤子遇生，
命独当苦。
父母在时，
乘坚车，
驾驷马。
父母已去，
兄嫂令我行贾：
南到九江，
东到齐与鲁。
腊月来归，
不敢自言苦：
头多虮虱，
面目多尘土`,
  739: `夏时饶温和，
避暑就清凉。
比坐高阁下，
延宾作名倡。
弦歌随风发，
曲响入房`,
  753: `华山畿，
君既为侬死，
独生为谁施？
欢若见怜时，
棺木为侬开`,
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
  console.log(`  转换/手工总数累加: ${totalConvert}（含跨 chunk 累计）`)
  console.log(`  跳过（无解）累加: ${totalSkipped}`)

  if (mode === 'apply') {
    fs.writeFileSync(FILE, newSrc, 'utf8')
    console.log(`  ✅ 已写入 ${FILE}`)
  } else {
    // 找该 chunk 前 2 首示例打印
    let shown = 0
    const re2 = /original: "([^"]*)"/g
    let m
    while ((m = re2.exec(src)) && shown < 2) {
      const body = m[1]
      if (!/[，。？！]/.test(body)) continue
      const newBody = body
        .replace(/([，。？！]+)/g, '$1\n')
        .split('\n').map(s => s.trim()).filter(Boolean).join('\n')
      console.log(`  --- 示例 ${shown + 1} ---`)
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
