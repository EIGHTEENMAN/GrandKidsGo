/**
 * 诗词情绪分类器 + 音色矩阵
 *
 * 与前端 `apps/xueshici/src/lib/audio.ts::detectMood()` 保持 1:1 一致：
 *   - 同样的 6 种 mood（heroic/graceful/pastoral/frontier/lyric/narrative）
 *   - 同样的判断顺序（frontier → pastoral楚辞 → heroic → lyric → pastoral王维 → narrative → graceful）
 *   - 同样的 regex 链
 *
 * 不同之处：
 *   - 本文件是后端 Node ESM（无 TypeScript、无 Next.js 构建依赖）
 *   - 额外提供 6×2 音色矩阵（VOICE_MATRIX）
 *   - 提供 getAuthorGender / getVoiceProfile 工具
 *
 * 决策原则：
 *   - gender = getAuthorGender(poem.author)
 *   - mood = detectMood(poem)
 *   - profile = VOICE_MATRIX[mood][gender]
 *   - type === 'translation' / 'interpretation' 时强制 style = null（译文/赏析保持中性讲解，不上朗诵腔）
 */

// ===== 6 种 mood =====
export const MOODS = ['heroic', 'graceful', 'pastoral', 'frontier', 'lyric', 'narrative']

// ===== 情绪判断（与 audio.ts::detectMood 同步） =====
export function detectMood(poem) {
  if (!poem) return 'graceful'
  const text = `${poem.author || ''} ${poem.tags || ''} ${poem.title || ''}`.toLowerCase()

  // 边塞
  if (/边塞|战争|从军|塞下|凉州|出塞|战|戍/.test(text)) return 'frontier'
  // 楚辞 / 诗经 / 春秋战国 → 田园古朴
  if (/楚辞|诗经|春秋战国/.test(text)) return 'pastoral'
  // 豪放派
  if (/李白|苏轼|辛弃疾|陆游|岳飞|豪放|豪迈|壮观|雄/.test(text)) return 'heroic'
  // 婉约派
  if (/李清照|柳永|秦观|晏殊|婉约|闺怨|相思|愁|离情/.test(text)) return 'lyric'
  // 田园
  if (/王维|陶渊明|孟浩然|田园|山水|隐逸/.test(text)) return 'pastoral'
  // 咏史叙事
  if (/杜甫|白居易|叙事|咏史|怀古|史记/.test(text)) return 'narrative'

  return 'graceful'
}

// ===== 作者性别 =====
const FEMALE_AUTHORS = [
  '李清照', '薛涛', '鱼玄机', '上官婉儿', '班婕妤', '蔡文姬',
  '管道升', '朱淑真', '吴藻', '顾太清', '柳如是',
]

export function getAuthorGender(author) {
  if (!author) return 'male'
  for (const f of FEMALE_AUTHORS) {
    if (author.includes(f)) return 'female'
  }
  return 'male'
}

// ===== 音色 × 情绪 × 性别 矩阵 =====
// 2026-06-20：style 字段已废弃（mstts:express-as 触发字面朗读乱码）
// 改用 pitch 表达情绪：
//   heroic/frontier → +5Hz（高亢豪迈）
//   lyric/pastoral  → -5Hz（低沉婉约）
//   narrative       → +0Hz（中性）
//   graceful        → -3Hz（略低沉温柔）
// rate 控制语速，voice 控制音色，pitch 模拟"情绪张力"
const VOICE_MATRIX = {
  heroic: {
    male:   { voice: 'zh-CN-YunyangNeural',    style: null, styleDegree: 0, rate: '-10%', pitch: '+5Hz' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: null, styleDegree: 0, rate: '-10%', pitch: '+5Hz' },
  },
  graceful: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: null, styleDegree: 0, rate: '-20%', pitch: '-3Hz' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: null, styleDegree: 0, rate: '-20%', pitch: '-3Hz' },
  },
  pastoral: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: null, styleDegree: 0, rate: '-25%', pitch: '-5Hz' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: null, styleDegree: 0, rate: '-25%', pitch: '-5Hz' },
  },
  frontier: {
    male:   { voice: 'zh-CN-YunjianNeural',    style: null, styleDegree: 0, rate: '-10%', pitch: '+5Hz' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: null, styleDegree: 0, rate: '-10%', pitch: '+5Hz' },
  },
  lyric: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: null, styleDegree: 0, rate: '-20%', pitch: '-5Hz' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: null, styleDegree: 0, rate: '-20%', pitch: '-5Hz' },
  },
  narrative: {
    male:   { voice: 'zh-CN-YunxiNeural',      style: null, styleDegree: 0, rate: '-15%', pitch: '+0Hz' },
    female: { voice: 'zh-CN-XiaoxiaoNeural',   style: null, styleDegree: 0, rate: '-15%', pitch: '+0Hz' },
  },
}

// ===== 综合决策：诗 → 完整音色配置 =====
/**
 * @param {object} poem
 * @param {string} [type='original'] - 'original' 应用 mood×style，'translation' 强制 style=null
 * @returns {{ voice: string, style: string|null, styleDegree: number, rate: string, gender: 'male'|'female', mood: string }}
 */
export function getVoiceProfile(poem, type = 'original') {
  const gender = getAuthorGender(poem?.author)
  const mood = detectMood(poem)
  const profile = VOICE_MATRIX[mood][gender]

  // 2026-06-20 v5：原文朗诵也强制无 style（避免 mstts:express-as 字面朗读乱码）
  // 用 voice + rate + pitch 三参数表达"音色/语速/情绪张力"
  // translation / interpretation 同样无 style（讲解中性）
  const isPlain = type === 'translation' || type === 'commentary' || type === 'interpretation' || type === 'original'
  return {
    voice: profile.voice,
    style: isPlain ? null : profile.style,
    styleDegree: profile.styleDegree,
    rate: profile.rate,
    gender,
    mood,
  }
}

// ===== 列出所有矩阵配置（用于调试/报告） =====
export function describeMatrix() {
  const lines = ['mood × gender → voice / style / rate:']
  for (const mood of MOODS) {
    for (const gender of ['male', 'female']) {
      const p = VOICE_MATRIX[mood][gender]
      lines.push(`  ${mood}/${gender.padEnd(6)}: ${p.voice.padEnd(25)} style=${(p.style || '(none)').padEnd(13)} rate=${p.rate}`)
    }
  }
  return lines.join('\n')
}
