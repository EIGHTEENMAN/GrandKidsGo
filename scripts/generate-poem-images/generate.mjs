/**
 * 诗配画引擎 — 主生成脚本
 *
 * 用法：
 *   node generate.mjs              # 批量生成所有待处理的诗词配图
 *   MOCK=true node generate.mjs    # 模拟模式（不调用真实 API）
 *   node generate.mjs --status     # 查看生成状态
 *   node generate.mjs --retry      # 重试失败项
 *   node generate.mjs --clean      # 清空已完成状态重新生成
 *
 * 环境变量：
 *   AI_PROVIDER=mock|dall-e|tongyi|minimax|agnes  API 后端选择
 *   OPENAI_API_KEY=sk-xxx          OpenAI API Key
 *   ALIBABA_ACCESS_KEY_ID=xxx      阿里云 AccessKey
 *   ALIBABA_ACCESS_KEY_SECRET=xxx  阿里云 AccessKey Secret
 *   MINIMAX_API_KEY=xxx            MiniMax API Key
 *   AGNES_API_KEY=sk-xxx           Agnes AI API Key
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs'
import { resolve, dirname, join } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { get } from 'https'
import { CONFIG, IMAGE_EXT, getImageExt } from './config.mjs'
import { buildPrompt } from './promptBuilder.mjs'
import { Tracker } from './tracker.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ===== 加载 .env（如存在）=====
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  try {
    const envText = readFileSync(envPath, 'utf-8')
    for (const line of envText.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {}
}

// ===== 加载 ~/.config/haodaer/secrets.env（项目外，git 不跟踪）=====
const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  try {
    const envText = readFileSync(userEnvPath, 'utf-8')
    for (const line of envText.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {}
}

// ===== 日志颜色 =====
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(color, tag, msg) {
  console.log(`${color}[${tag}]${C.reset} ${msg}`)
}

// ===== 主流程 =====
async function main() {
  const args = process.argv.slice(2)
  const isStatus = args.includes('--status')
  const isRetry = args.includes('--retry')
  const isClean = args.includes('--clean')
  const idsIdx = args.indexOf('--ids')
  const specifiedIds = idsIdx >= 0 ? args[idsIdx + 1].split(',').map(s => parseInt(s.trim())).filter(Boolean) : null
  const isMock = process.env.MOCK === 'true' || CONFIG.provider === 'mock'

  // === 加载诗词数据（从预导出的 JSON） ===
  const jsonPath = resolve(__dirname, '../../apps/xueshici/public/images/poems/poems-data.json')
  if (!existsSync(jsonPath)) {
    console.error(`❌ 未找到导出的诗词数据 JSON: ${jsonPath}`)
    console.error('请先运行: cd scripts/generate-poem-images && npx tsx export-data.mjs')
    process.exit(1)
  }
  const poems = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  console.log(`📚 加载了 ${poems.length} 首诗词数据`)

  // === 初始化 ===
  const tracker = new Tracker()
  tracker.registerPoems(poems)

  // === 只看状态 ===
  if (isStatus) {
    tracker.printStats()
    return
  }

  // === 清理 ===
  if (isClean) {
    console.log('🧹 清空所有完成状态...')
    for (const [id, info] of Object.entries(tracker.data.poems)) {
      if (info.status === 'done' || info.status === 'skipped') {
        info.status = 'pending'
      }
    }
    tracker._save()
    console.log('✅ 已重置，准备重新生成')
    return
  }

  // === 准备输出目录 ===
  const outputDir = resolve(__dirname, CONFIG.generation.outputDir)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
    log(C.blue, 'DIR', `创建输出目录: ${outputDir}`)
  }

  // === 获取待生成列表 ===
  let pendingIds = tracker.getPending(isRetry)
  if (specifiedIds) {
    // --ids 模式：只生成指定 ID（强制重置这些 ID 的 status）
    for (const id of specifiedIds) {
      const key = String(id)
      if (tracker.data.poems[key]) {
        tracker.data.poems[key].status = 'pending'
      }
    }
    tracker._save()
    pendingIds = specifiedIds
    console.log(`\n🎯 --ids 模式：指定生成 ${pendingIds.length} 张`)
  }
  if (pendingIds.length === 0) {
    console.log('\n🎉 所有诗词配图已生成完毕！')
    tracker.printStats()
    return
  }

  console.log(`\n🖼️  准备生成 ${pendingIds.length} 张诗词配图`)
  if (isMock) {
    console.log(`${C.yellow}⚠️  模拟模式 — 不会调用真实 API${C.reset}`)
  }

  // === 批量生成（带并发控制） ===
  const concurrency = CONFIG.generation.concurrency
  const total = pendingIds.length
  let completed = 0
  let successCount = 0
  let failCount = 0

  console.log(`\n🚀 开始生成 (并发: ${concurrency})...\n`)

  // 分批处理
  for (let i = 0; i < pendingIds.length; i += concurrency) {
    const batch = pendingIds.slice(i, i + concurrency)
    const batchPromises = batch.map(poemId =>
      generateOneImage(String(poemId), poems, tracker, outputDir, isMock)
    )

    const results = await Promise.allSettled(batchPromises)
    for (const r of results) {
      completed++
      if (r.status === 'fulfilled' && r.value) {
        successCount++
      } else {
        failCount++
      }
    }

    // 显示进度
    const pct = ((completed / total) * 100).toFixed(1)
    log(C.cyan, '进度', `[${completed}/${total}] ${pct}% 成功:${successCount} 失败:${failCount}`)

    // 请求间隔
    if (i + concurrency < pendingIds.length) {
      await sleep(CONFIG.generation.delayMs)
    }
  }

  // === 最终报告 ===
  console.log('\n' + '='.repeat(50))
  if (failCount === 0) {
    console.log(`${C.green}🎉 全部生成完成！${C.reset}`)
  } else {
    console.log(`${C.yellow}⚠️  完成 (成功:${successCount}, 失败:${failCount})${C.reset}`)
    console.log(`   运行 node generate.mjs --retry 重试失败项`)
  }
  tracker.printStats()
}

// ===== 单首诗词配图生成 =====
async function generateOneImage(poemId, poems, tracker, outputDir, isMock) {
  const poem = poems.find(p => String(p.id) === poemId)
  if (!poem) {
    log(C.red, 'SKIP', `未找到ID=${poemId} 的诗词`)
    return false
  }

  // 根据提供商使用对应的图片扩展名
  const provider = isMock ? 'mock' : CONFIG.provider
  const ext = getImageExt(provider)
  const imgPath = resolve(outputDir, `${poemId}${ext}`)

  // 检查当前格式的图片是否已存在
  if (existsSync(imgPath)) {
    tracker.markSkipped(poemId)
    log(C.dim, '跳过', `《${poem.title}》图片已存在 (${ext})`)
    return true
  }

  // 如果是真实 API 生成（非 Mock），忽略旧 Mock 的 .webp 占位图，重新生成
  // 这样可以平滑从 Mock 过渡到真实图片
  const mockWebp = resolve(outputDir, `${poemId}.webp`)
  if (provider !== 'mock' && existsSync(mockWebp)) {
    log(C.dim, '覆盖', `《${poem.title}》将覆盖旧 Mock 占位图`)
  }

  tracker.markGenerating(poemId)

  try {
    if (isMock) {
      // 模拟模式：生成一个简单的 SVG 占位图
      await generateMockImage(poem, imgPath)
    } else if (CONFIG.provider === 'dall-e') {
      await generateDalleImage(poem, imgPath)
    } else if (CONFIG.provider === 'tongyi') {
      await generateTongyiImage(poem, imgPath)
    } else if (CONFIG.provider === 'minimax') {
      await generateMiniMaxImage(poem, imgPath)
    } else if (CONFIG.provider === 'agnes') {
      await generateAgnesImage(poem, imgPath)
    } else {
      throw new Error(`未知的 API 提供商: ${CONFIG.provider}。设置 AI_PROVIDER=mock|dall-e|tongyi|minimax|agnes`)
    }

    tracker.markDone(poemId)
    log(C.green, '完成', `《${poem.title}》(${poem.author})`)
    return true
  } catch (err) {
    tracker.markFailed(poemId, err)
    log(C.red, '失败', `《${poem.title}》: ${err.message}`)
    return false
  }
}

// ===== Mock 模式：生成彩色 SVG 占位图 =====
async function generateMockImage(poem, imgPath) {
  const colors = [
    ['#fef3c7', '#d97706'], // 暖黄
    ['#ecfdf5', '#059669'], // 翠绿
    ['#eff6ff', '#2563eb'], // 湛蓝
    ['#fdf2f8', '#db2777'], // 粉紫
    ['#f5f3ff', '#7c3aed'], // 淡紫
  ]
  const [bg, accent] = colors[poem.id % colors.length]

  // 提取标题首字作为装饰
  const titleChar = poem.title.charAt(0)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mount" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent};stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:${accent};stop-opacity:0.05" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)" />
  <!-- 远山 -->
  <path d="M0 700 Q150 500 300 600 Q400 550 500 500 Q600 450 750 550 Q850 500 1024 600 L1024 1024 L0 1024 Z" fill="url(#mount)" opacity="0.3"/>
  <path d="M0 750 Q200 600 400 680 Q550 600 700 650 Q800 600 1024 680 L1024 1024 L0 1024 Z" fill="url(#mount)" opacity="0.5"/>
  <!-- 装饰圆 -->
  <circle cx="512" cy="350" r="120" fill="${accent}" opacity="0.08"/>
  <circle cx="512" cy="350" r="80" fill="${accent}" opacity="0.06"/>
  <!-- 诗词标题 -->
  <text x="512" y="340" text-anchor="middle" font-family="serif" font-size="48" fill="${accent}" opacity="0.4">${titleChar}</text>
  <text x="512" y="900" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${accent}" opacity="0.5">《${poem.title}》${poem.author}</text>
  <!-- 水墨飞鸟 -->
  <path d="M350 480 Q380 460 400 480" stroke="${accent}" stroke-width="2" fill="none" opacity="0.2"/>
  <path d="M600 450 Q630 430 650 450" stroke="${accent}" stroke-width="2" fill="none" opacity="0.2"/>
  <text x="512" y="560" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${accent}" opacity="0.2">MOCK · 配图待生成</text>
</svg>`

  writeFileSync(imgPath.replace(IMAGE_EXT, '.svg'), svg)
  // 把 .svg 保存为图片路径（前端直接引用）
  // 实际使用时我们会引用 .svg
  writeFileSync(imgPath, svg)

  // Mock 模式下也保存一个占位标记
  writeFileSync(imgPath + '.mock', new Date().toISOString())
}

// ===== DALL-E 3 生成 =====
async function generateDalleImage(poem, imgPath) {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })

  if (!CONFIG.openai.apiKey) {
    throw new Error('未设置 OPENAI_API_KEY 环境变量')
  }

  const prompt = buildPrompt(poem)

  const response = await openai.images.generate({
    model: CONFIG.openai.model,
    prompt: prompt,
    n: 1,
    size: CONFIG.openai.size,
    quality: CONFIG.openai.quality,
    response_format: 'b64_json',
  })

  const b64 = response.data[0]?.b64_json
  if (!b64) throw new Error('API 返回为空')

  const buffer = Buffer.from(b64, 'base64')
  writeFileSync(imgPath, buffer)
  log(C.dim, 'DALL-E', `《${poem.title}》生成成功 (${(buffer.length / 1024).toFixed(0)}KB)`)
}

// ===== 通义万相生成 =====
async function generateTongyiImage(poem, imgPath) {
  const { accessKeyId, accessKeySecret, endpoint, model, size } = CONFIG.tongyi
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('未设置阿里云 AccessKey。设置 ALIBABA_ACCESS_KEY_ID / ALIBABA_ACCESS_KEY_SECRET')
  }

  // 构建 prompt（通义万相支持中文 prompt）
  const dynasty = poem.dynasty
  const styleHint = CONFIG.prompt.dynastyStyles[dynasty] || '中国古典山水'
  const prompt = `中国水墨画风格，${styleHint}。画面灵感来自${poem.dynasty}诗人${poem.author}的《${poem.title}》：${poem.sections?.[0]?.original?.slice(0, 80) || ''}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessKeyId}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: model,
      input: { prompt },
      parameters: { size, n: 1 },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`通义万相 API 错误: ${response.status} ${text}`)
  }

  const data = await response.json()
  const imageUrl = data.output?.results?.[0]?.url
  if (!imageUrl) throw new Error('通义万相返回结果为空')

  // 下载图片
  const imgResp = await fetch(imageUrl)
  const buffer = Buffer.from(await imgResp.arrayBuffer())
  writeFileSync(imgPath, buffer)
  log(C.dim, '通义万相', `《${poem.title}》生成成功 (${(buffer.length / 1024).toFixed(0)}KB)`)
}

// ===== MiniMax 生成 =====
async function generateMiniMaxImage(poem, imgPath) {
  const { apiKey, endpoint, model } = CONFIG.minimax
  if (!apiKey) {
    throw new Error('未设置 MINIMAX_API_KEY 环境变量')
  }

  // 提取 1-2 句具象诗句（主体明确、有具体人物/动物/物品/动作）
  const concreteLines = extractConcreteLines(poem)
  const dynastyHint = dynastyStyleCn(poem.dynasty)
  const genderHint = genderHintFn(poem)
  const figureHint = hasFigureInConcrete(concreteLines) ? `
人物要求：
- 性别：${genderHint}
- 服饰：传统汉服（宽袍大袖、深衣或襦裙），不要现代服装
- 发型：传统发髻（高髻/道髻/束发/盘髻），不要现代发型
- 鞋履：传统布履或木屐，不要现代鞋袜
- 面部：五官清晰端正，性别特征明显，无扭曲变形
- 避免：模糊脸部、变形五官、错误手指数、丑陋` : ''
  // C 版 prompt（具象+人物质量+服饰约束）
  const prompt = `中国传统水墨画风格，${dynastyHint}。请直接具象描绘以下场景（不要抽象、不要以留白为主、主体要清晰可辨）：
《${poem.title}》— ${poem.author}（${poem.dynasty}）
场景内容：${concreteLines}

要求：
1. 主体鲜明，主要人物或动物占据画面中心或显著位置，占画面 1/3 以上
2. 背景山水为辅，不可喧宾夺主
3. 色彩淡雅但内容丰富，细节清晰
4. 不要任何文字、签名、印章、题款、边框、装饰
5. 风格：水墨淡彩，类似宋代院体画或文人小品
6. 不要额外添加原诗没有的花鸟、人物、物品${figureHint}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      aspect_ratio: '1:1',
      response_format: 'url',
      n: 1,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MiniMax API 错误: ${response.status} ${text}`)
  }

  const data = await response.json()
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax API 返回错误: ${data.base_resp?.status_msg || '未知错误'}`)
  }

  const imageUrl = data.data?.image_urls?.[0]
  if (!imageUrl) throw new Error('MiniMax 返回结果为空')

  // 下载图片（MiniMax 返回 JPEG）
  const imgResp = await fetch(imageUrl)
  const buffer = Buffer.from(await imgResp.arrayBuffer())
  writeFileSync(imgPath, buffer)
  log(C.dim, 'MiniMax', `《${poem.title}》生成成功 (${(buffer.length / 1024).toFixed(0)}KB)`)
}

// ===== Agnes AI 生成 =====
async function generateAgnesImage(poem, imgPath) {
  const { apiKey, endpoint, model } = CONFIG.agnes
  if (!apiKey) {
    throw new Error('未设置 AGNES_API_KEY 环境变量')
  }

  // 构造中文 prompt（Agnes 中文支持好）
  const concreteLines = extractConcreteLines(poem)
  const dynastyHint = dynastyStyleCn(poem.dynasty)
  const genderHint = genderHintFn(poem)
  const figureHint = hasFigureInConcrete(concreteLines) ? `
人物要求：
- 性别：${genderHint}
- 服饰：传统汉服（宽袍大袖），不要现代服装
- 发型：传统发髻，不要现代发型
- 面部：五官清晰端正，性别特征明显
- 避免：模糊脸部、变形五官、错误手指数` : ''

  const prompt = `中国传统水墨画，${dynastyHint}。请直接具象描绘以下场景（主体要清晰可辨）：
《${poem.title}》— ${poem.author}（${poem.dynasty}）
场景内容：${concreteLines}

要求：
1. 主体鲜明，主要人物或动物占据画面中心或显著位置
2. 背景山水为辅，不可喧宾夺主
3. 色彩淡雅但内容丰富，细节清晰
4. 不要任何文字、签名、印章、题款、边框、装饰
5. 风格：水墨淡彩，类似宋代院体画或文人小品
6. 不要额外添加原诗没有的花鸟、人物、物品${figureHint}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      n: 1,
      size: CONFIG.agnes.size,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Agnes API 错误: ${response.status} ${text}`)
  }

  const data = await response.json()

  const imageUrl = data.data?.[0]?.url
  if (!imageUrl) throw new Error('Agnes 返回结果为空')

  // 下载图片
  const imgResp = await fetch(imageUrl)
  const buffer = Buffer.from(await imgResp.arrayBuffer())
  writeFileSync(imgPath, buffer)
  log(C.dim, 'Agnes', `《${poem.title}》生成成功 (${(buffer.length / 1024).toFixed(0)}KB)`)
}

// 朝代→中文风格描述（用于 MiniMax 中文 prompt）
function dynastyStyleCn(dynasty) {
  const map = {
    '春秋战国': '先秦古朴简雅，远山淡雾',
    '汉': '汉风古拙，浑厚苍茫',
    '三国': '雄浑壮阔，风云变幻',
    '魏晋南北朝': '魏晋风骨，清逸洒脱',
    '唐': '盛唐气象，山水壮丽，色彩明快',
    '宋': '宋画清雅，水墨淡彩，留白深远',
    '元': '元人笔意，疏朗空灵，墨色淋漓',
    '明': '明代秀丽，工写结合，文人意趣',
    '清': '清代精致，笔墨细腻，意境悠远',
    '近现代': '现代水墨，中西融合，清新自然',
  }
  return map[dynasty] || '中国古典山水，诗意朦胧'
}

// 从诗的 sections 中提取 1-2 句"具象句"
// 规则：长度 4-25 字的短句优先，按标点断句，组合成画面描述
function extractConcreteLines(poem) {
  const orig = poem.sections?.[0]?.original
  if (!orig) return '古典诗意场景，有具体的人物或动物和动作'

  // 按中文标点断句，去空白
  const sentences = orig
    .split(/[，。！？；\n]/)
    .map(s => s.trim())
    .filter(s => s.length >= 4 && s.length <= 25)

  if (sentences.length === 0) {
    // fallback：截前 60 字
    return orig.slice(0, 60)
  }

  // 取前 1-2 句（最画面感）
  return sentences.slice(0, 2).join('，')
}

// 判断具象句里是否含人物（用于决定要不要加人物质量约束）
function hasFigureInConcrete(concrete) {
  // 包含常见人物指示词
  return /人|女|男|子|君|妇|翁|叟|童|士|将|臣|王|侯|妾|郎|娘|僧|道|客|夫|妻|父|母|兄|弟|姐|妹|儿|女/.test(concrete)
}

// 根据作者+诗题+朝代推断人物性别
// 已知女诗人 + 佚名/女性词牌 → 女；其他 → 男（古代诗人多为男性，AI 默认女是错的）
function genderHintFn(poem) {
  const FEMALE_AUTHORS = ['李清照', '薛涛', '鱼玄机', '上官婉儿', '班婕妤', '蔡文姬', '管道升', '朱淑真', '吴藻', '顾太清']
  const MALE_AUTHORS = ['李白', '杜甫', '王维', '孟浩然', '白居易', '王昌龄', '苏轼', '辛弃疾', '陆游', '李商隐', '杜牧', '王勃', '骆宾王', '王之涣', '刘禹锡', '韩愈', '柳宗元', '欧阳修', '王安石', '杨万里', '范成大', '陆游', '文天祥', '纳兰性德', '曹雪芹', '屈原', '陶渊明', '谢灵运', '王维']
  if (FEMALE_AUTHORS.some(a => poem.author?.includes(a))) return '女性（古代女性，婉约端庄）'
  // 男性作者 + 自述/自画像类诗 → 男
  if (MALE_AUTHORS.some(a => poem.author?.includes(a))) return '男性（古代士人/书生）'
  // 佚名：看诗中代词
  const orig = poem.sections?.[0]?.original || ''
  if (/我|吾|余|妾|奴|女儿|红颜|闺/.test(orig)) return '女性（古代女子）'
  if (/吾|男儿|壮志|丈夫|老夫|愚|予/.test(orig)) return '男性（古代士人）'
  return '性别由诗中主语决定（"我"=诗人本人）'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ===== 启动 =====
main().catch(err => {
  console.error(`\n${C.red}❌ 生成脚本异常:${C.reset}`, err)
  process.exit(1)
})
