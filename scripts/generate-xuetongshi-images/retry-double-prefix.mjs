// retry 6 张双重前缀 sections 图（直接 hardcode title）
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import sharp from 'sharp'

const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  for (const line of readFileSync(userEnvPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const SECTIONS_DIR = '/Users/eighteenman/工作/童慧行/apps/xuetongshi/public/images/sections'

const targets = [
  { id: 'ct-four-great-ct-four-great-s7', title: '四大发明' },
  { id: 'ct-silk-road-ct-silk-road-s4', title: '丝绸之路的衰落' },
  { id: 'ct-silk-road-ct-silk-road-s10', title: '一带一路' },
  { id: 'ct-chinese-music-ct-chinese-music-s10', title: '中国民乐' },
  { id: 'ct-school-etiquette-ct-school-etiquette-s4', title: '课堂礼仪' },
  { id: 'ct-school-etiquette-ct-school-etiquette-s9', title: '尊师礼仪' },
]

const baseStyle = `Canon EOS R5, 85mm f/1.4, golden hour lighting, National Geographic Kids photography style.
Realistic photo, NO illustration, NO watercolor, NO cartoon, NO 3D render.
Sharp focus, vivid natural colors, child-friendly educational content.`

async function gen(prompt) {
  const res = await fetch('https://api.minimaxi.com/v1/image_generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}` },
    body: JSON.stringify({ model: 'image-01', prompt, aspect_ratio: '16:9' }),
  })
  const data = await res.json()
  if (data.data?.image_urls?.[0]) {
    const r = await fetch(data.data.image_urls[0])
    return Buffer.from(await r.arrayBuffer())
  }
  throw new Error('AI 未识别响应')
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
for (let i = 0; i < targets.length; i++) {
  const { id, title } = targets[i]
  const prompt = `${baseStyle}\n\nSubject: ${title}\nDEPICT "${title}" LITERALLY.`
  try {
    const buf = await gen(prompt)
    const processed = await sharp(buf).resize(800).jpeg({ quality: 82 }).toBuffer()
    writeFileSync(join(SECTIONS_DIR, `${id}.jpg`), processed)
    log(`[${i+1}/${targets.length}] ${id} ✅ ${(processed.length/1024).toFixed(0)}KB`)
  } catch (e) {
    log(`[${i+1}/${targets.length}] ${id} ❌ ${e.message}`)
  }
  await new Promise(r => setTimeout(r, 3000))
}