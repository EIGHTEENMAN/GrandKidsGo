/**
 * 学通识真图生成 — 太阳系 PoC
 *
 * 用法：
 *   AI_PROVIDER=minimax node poc-solar-system.mjs
 *
 * 验证 MiniMax API 是否仍可用 + 写实水彩风效果
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 加载 secrets.env
const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  const envText = readFileSync(userEnvPath, 'utf-8')
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
const MINIMAX_ENDPOINT = 'https://api.minimaxi.com/v1/image_generation'
const MODEL = process.env.MINIMAX_MODEL || 'image-01'

// 输出目录
const OUT_DIR = resolve(__dirname, '../../apps/xuetongshi/public/images/knowledge')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

// 太阳系 prompt
const TOPIC = {
  id: 'solar-system',
  title: '太阳系',
  category: '科学',
  prompt: `写实水彩画风格，太阳系全家福。画面中心是明亮的太阳，散发着金黄色的光芒。
周围是太阳系的 8 大行星，沿椭圆形轨道运行：
- 水星（最近太阳，灰色岩石）
- 金星（橙黄色，浓厚大气）
- 地球（蓝色海洋+绿色大陆）
- 火星（红色，有奥林匹斯山）
- 木星（最大，带条纹和红斑）
- 土星（带壮观的环）
- 天王星（青蓝色，侧身自转）
- 海王星（深蓝色，最远）

要求：
1. 写实水彩风格，色彩饱和但不刺眼
2. 行星大小按真实比例（不必严格）
3. 远景深邃的星空背景
4. 不要任何文字、标签、边框
5. 适合 6-12 岁儿童的天文启蒙
6. 16:9 横构图`,
}

async function generate() {
  if (!MINIMAX_API_KEY) {
    console.error('❌ 未设置 MINIMAX_API_KEY')
    console.error('   在 ~/.config/haodaer/secrets.env 中配置')
    process.exit(1)
  }

  console.log(`🎨 太阳系 PoC 生成`)
  console.log(`   端点: ${MINIMAX_ENDPOINT}`)
  console.log(`   模型: ${MODEL}`)
  console.log(`   prompt: ${TOPIC.prompt.slice(0, 60)}...`)
  console.log('')

  const startTime = Date.now()

  try {
    const response = await fetch(MINIMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: TOPIC.prompt,
        aspect_ratio: '16:9',
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API 错误 ${response.status}: ${errText.slice(0, 200)}`)
    }

    const data = await response.json()
    console.log('📦 API 响应结构:')
    console.log(JSON.stringify(Object.keys(data), null, 2))

    // MiniMax 响应结构：data.image_base64[] 或 data.image_urls[]
    let buffer = null
    if (data.data?.image_base64?.[0]) {
      buffer = Buffer.from(data.data.image_base64[0], 'base64')
    } else if (data.data?.image_urls?.[0]) {
      const imgRes = await fetch(data.data.image_urls[0])
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } else if (data.image_base64) {
      buffer = Buffer.from(data.image_base64, 'base64')
    } else if (data.image_url) {
      const imgRes = await fetch(data.image_url)
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } else {
      console.log('⚠️ 未知响应结构:', JSON.stringify(data).slice(0, 500))
      throw new Error('未识别的响应结构')
    }

    const outPath = resolve(OUT_DIR, `${TOPIC.id}.jpg`)
    writeFileSync(outPath, buffer)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ 成功！`)
    console.log(`   输出: ${outPath}`)
    console.log(`   大小: ${(buffer.length / 1024).toFixed(0)} KB`)
    console.log(`   耗时: ${elapsed}s`)
  } catch (err) {
    console.error(`❌ 失败: ${err.message}`)
    process.exit(1)
  }
}

generate()
