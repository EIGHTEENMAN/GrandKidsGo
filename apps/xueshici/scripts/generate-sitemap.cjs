#!/usr/bin/env node
/**
 * 学诗词 sitemap 生成脚本（v1.1 — 2026-08-20 加 lastmod）
 * 输出：apps/xueshici/public/sitemap.xml
 */
const fs = require('fs');
const path = require('path');
const poemsFile = path.join(__dirname, '../src/data/poems-full.ts');
const ids = [];
const content = fs.readFileSync(poemsFile, 'utf-8');
const m = content.matchAll(/^\s*\{\s*id:\s*(\d+),/gm);
for (const match of m) ids.push(parseInt(match[1]));

const baseUrl = 'https://xueshici.grandand.com';
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
xml += `  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
for (const id of ids) xml += `  <url><loc>${baseUrl}/#reader/${id}-1</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
xml += '</urlset>';
fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml, 'utf-8');
console.log('Sitemap: ' + ids.length + ' URLs (lastmod=' + today + ')');
