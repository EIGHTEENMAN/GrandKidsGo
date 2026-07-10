#!/usr/bin/env node
// 生成 sitemap.xml — 2026 首诗
const fs = require('fs')
const path = require('path')

// 从 poems-full.ts 提取 id 列表
const poemsFile = path.join(__dirname, '../src/data/poems-full.ts')
const content = fs.readFileSync(poemsFile, 'utf-8')
const ids = []
const m = content.matchAll(/^\s*\{\s*id:\s*(\d+),/gm)
for (const match of m) {
  ids.push(parseInt(match[1]))
}

console.log(`Found ${ids.length} poems`)

// 生成 sitemap.xml
const baseUrl = 'https://xueshici.grandand.com'
const today = new Date().toISOString().split('T')[0]

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml += '  <url><loc>' + baseUrl + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n'

// 只为最近 100 首诗生成 URL（sitemap 大小限制 50MB / 50000 URL）
const recentIds = ids.slice(-100)
for (const id of recentIds) {
  xml += `  <url><loc>${baseUrl}/#reader/${id}-1</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`
}
xml += '</urlset>'

const outDir = path.join(__dirname, '../public')
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf-8')
console.log(`Sitemap written: ${recentIds.length} URLs`)

// robots.txt
const robots = `# 童慧行学诗词
User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
fs.writeFileSync(path.join(outDir, 'robots.txt'), robots, 'utf-8')
console.log('robots.txt written')
