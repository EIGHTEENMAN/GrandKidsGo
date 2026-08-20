#!/usr/bin/env node
/**
 * 学诗词 sitemap 生成脚本（v1.2 — 2026-08-20 加 lastmod + 热门诗词子集）
 * 输出：apps/xueshici/public/sitemap.xml
 */
const fs = require('fs');
const path = require('path');
const poemsFile = path.join(__dirname, '../src/data/poems-full.ts');
const ids = [];
const content = fs.readFileSync(poemsFile, 'utf-8');
const m = content.matchAll(/^\s*\{\s*id:\s*(\d+),/gm);
for (const match of m) ids.push(parseInt(match[1]));

// 筛热门诗词（id 1-100 是小学必背 75 首 + 唐诗精选前 25）
const hotIds = ids.filter(id => id <= 100);

const baseUrl = 'https://xueshici.grandand.com';
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
xml += `  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
// 热门诗词（小学必背 75 + 唐诗精选 25）：优先级 0.9
for (const id of hotIds) xml += `  <url><loc>${baseUrl}/#reader/${id}-1</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>\n`;
// 全量诗词：优先级 0.8
for (const id of ids) {
  if (hotIds.includes(id)) continue; // 已加入热门，跳过
  xml += `  <url><loc>${baseUrl}/#reader/${id}-1</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
}
xml += '</urlset>';
fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml, 'utf-8');
console.log('Sitemap: ' + ids.length + ' URLs (lastmod=' + today + ', hot=' + hotIds.length + ')');
