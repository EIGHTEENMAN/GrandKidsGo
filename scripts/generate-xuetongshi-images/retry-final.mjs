import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import sharp from 'sharp'

const userEnvPath = join(homedir(), '.config/haodaer/secrets.env')
if (existsSync(userEnvPath)) {
  for (const line of (await import('fs')).readFileSync(userEnvPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const targets = [
  { id: 'sculpture-sc6', title: 'Sculpture art gallery indoor exhibition' },
  { id: 'comic-anime-co1', title: 'Manga anime comic books reading' },
  { id: 'monetary-policy-mp5', title: 'Central bank monetary policy meeting' },
  { id: 'chinese-dialects-cd7', title: 'Chinese regional dialect speakers' },
  { id: 'chinese-arch-ca7', title: 'Traditional Chinese architecture pavilion' },
  { id: 'grow-puberty-gp10', title: 'Teenage puberty growth education' },
]

const baseStyle = `Canon EOS R5, 85mm f/1.4, golden hour lighting, National Geographic Kids photography style. Realistic photo, no illustration.`

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
for (let i = 0; i < targets.length; i++) {
  const { id, title } = targets[i]
  const prompt = `${baseStyle} Subject: ${title}. DEPICT literally.`
  try {
    const res = await fetch('https://api.minimaxi.com/v1/image_generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}` },
      body: JSON.stringify({ model: 'image-01', prompt, aspect_ratio: '16:9' }),
    })
    const data = await res.json()
    let buf
    if (data.data?.image_urls?.[0]) {
      buf = Buffer.from(await (await fetch(data.data.image_urls[0])).arrayBuffer())
    } else {
      log(`[${i+1}/${targets.length}] ${id} ❌ ${JSON.stringify(data).slice(0, 200)}`)
      continue
    }
    const processed = await sharp(buf).resize(800).jpeg({ quality: 82 }).toBuffer()
    writeFileSync(join('/Users/eighteenman/工作/童慧行/apps/xuetongshi/public/images/sections', `${id}.jpg`), processed)
    log(`[${i+1}/${targets.length}] ${id} ✅ ${(processed.length/1024).toFixed(0)}KB`)
  } catch (e) {
    log(`[${i+1}/${targets.length}] ${id} ❌ ${e.message}`)
  }
  await new Promise(r => setTimeout(r, 3000))
}