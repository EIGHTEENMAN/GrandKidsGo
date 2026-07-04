/**
 * 诗配画引擎 — 提示词构建器
 *
 * 从诗词数据生成 AI 图片提示词。
 * 策略：提取最具画面感的诗句 + 诗人风格 + 朝代风格 + 统一水墨风格
 */

import { CONFIG } from './config.mjs'

/**
 * 从诗词数据构建配图提示词
 * @param {object} poem - 诗词全文数据 { id, title, author, dynasty, tags, sections }
 * @returns {string} 完整的英文 prompt
 */
export function buildPrompt(poem) {
  const { title, author, dynasty, tags, sections } = poem

  // 1. 提取最有画面感的诗句（前 2-3 句）
  const visualLines = extractVisualLines(sections)

  // 2. 提取关键词（标签 + 季节/场景线索）
  const keywords = extractKeywords(title, tags, sections)

  // 3. 获取朝代风格
  const dynastyStyle = CONFIG.prompt.dynastyStyles[dynasty] || 'classical Chinese landscape'

  // 4. 构建最终 prompt
  const parts = [
    CONFIG.prompt.defaultStyle,
    dynastyStyle,
    `Scene inspired by the Chinese poem "${title}" by ${author} (${dynasty} dynasty)`,
    `Key visual elements: ${keywords}`,
    `Depict: ${visualLines}`,
    'peaceful, atmospheric, suitable for children, beautiful art',
  ]

  // 去重并过滤空值
  return parts.filter(Boolean).join('. ')
}

/**
 * 提取最具画面感的诗句行
 */
function extractVisualLines(sections) {
  if (!sections || sections.length === 0) return 'a peaceful classical Chinese scene'

  // 取所有节的前几条原文行
  const lines = []
  for (const section of sections) {
    const origLines = section.original
      .split(/[，。、\n]/)
      .map(l => l.trim())
      .filter(l => l.length > 2)
    for (const line of origLines) {
      if (lines.length >= 4) break
      lines.push(line)
    }
    if (lines.length >= 4) break
  }

  if (lines.length === 0) return 'a classical Chinese poetic scene with mountains and rivers'

  // 翻译成英文画面描述
  return lines.map(chineseToScene).join(', ')
}

/**
 * 中文诗句 → 英文画面元素
 * 简单规则匹配，覆盖常见意象
 */
function chineseToScene(line) {
  const imageMap = [
    { match: /月|月光|明月|残月|皓月/, desc: 'moonlight illuminating the landscape' },
    { match: /日|落日|夕阳|斜阳|残阳/, desc: 'sunset glow over the horizon' },
    { match: /山|峰|峦|岳|岭/, desc: 'misty mountains in the distance' },
    { match: /水|江|河|湖|海|溪|泉|波|涛|浪/, desc: 'flowing water and gentle waves' },
    { match: /花|桃|梅|菊|荷|莲|兰/, desc: 'delicate flowers blooming' },
    { match: /柳|杨|松|竹|柏|梧/, desc: 'graceful trees swaying in breeze' },
    { match: /鸟|鹤|雁|莺|鸥|鹭/, desc: 'birds soaring across the sky' },
    { match: /云|霞|雾|虹/, desc: 'clouds and mist drifting' },
    { match: /雨|雪|霜|露/, desc: 'gentle rain or snowfall' },
    { match: /桥|亭|楼|阁|台|窗/, desc: 'classical Chinese pavilion or bridge' },
    { match: /舟|船|帆|渔/, desc: 'a small boat on calm water' },
    { match: /酒|杯|醉/, desc: 'a wine cup in a quiet setting' },
    { match: /灯|烛|火/, desc: 'warm lantern light' },
    { match: /笛|琴|瑟|箫|歌/, desc: 'a musician playing a traditional instrument' },
    { match: /春/, desc: 'spring blossoms and fresh green' },
    { match: /夏/, desc: 'vibrant summer scenery' },
    { match: /秋/, desc: 'autumn colors and falling leaves' },
    { match: /冬/, desc: 'winter snow and bare branches' },
    { match: /夜/, desc: 'quiet night scene' },
    { match: /书|卷|墨|纸/, desc: 'scholar\'s study with brush and scroll' },
    { match: /剑|戈|马|弓|战/, desc: 'ancient warrior spirit' },
  ]

  for (const { match, desc } of imageMap) {
    if (match.test(line)) return desc
  }

  // 没有匹配到时，返回泛化描述
  return 'classical Chinese poetic scenery'
}

/**
 * 提取关键词（用于 AI 理解场景构成）
 */
function extractKeywords(title, tags, sections) {
  const keywords = []

  // 从标签提取
  if (tags) {
    keywords.push(...tags.split(',').map(t => t.trim()))
  }

  // 从标题提取关键名词
  const titleWords = title.split(/[，。、\s]/).filter(w => w.length >= 2)
  keywords.push(...titleWords.slice(0, 3))

  // 季节线索
  const seasonHints = ['春', '夏', '秋', '冬']
  let content = ''
  if (sections && sections.length > 0) {
    content = sections[0].original
  }
  for (const s of seasonHints) {
    if (content.includes(s) || title.includes(s)) {
      keywords.push(`season:${s}`)
    }
  }

  return [...new Set(keywords)].slice(0, 8).join(', ')
}
