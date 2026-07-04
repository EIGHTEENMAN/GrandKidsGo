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
const prompt = `Canon EOS R5, 85mm f/1.4, golden hour lighting, golden hour.
Realistic photo of a cargo train traveling through Central Asia mountains, modern freight railway.
Photography style, no illustration.`
const res = await fetch('https://api.minimaxi.com/v1/image_generation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}` },
  body: JSON.stringify({ model: 'image-01', prompt, aspect_ratio: '16:9' }),
})
const data = await res.json()
let buf
if (data.data?.image_urls?.[0]) {
  buf = Buffer.from(await (await fetch(data.data.image_urls[0])).arrayBuffer())
} else { console.log('FAIL:', JSON.stringify(data).slice(0, 300)); process.exit(1) }
const processed = await sharp(buf).resize(800).jpeg({ quality: 82 }).toBuffer()
writeFileSync('/Users/eighteenman/工作/童慧行/apps/xuetongshi/public/images/sections/ct-silk-road-ct-silk-road-s10.jpg', processed)
console.log('OK', processed.length, 'bytes')
