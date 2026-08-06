/**
 * 一次性脚本：在 server 上重新生成 shici.json（从最新版 poems-data.json）
 * + 重新合并 index.json
 *
 * 用法：node /tmp/rebuild-shici.cjs
 * 输入：/tmp/poems-data.json（= apps/xueshici/public/images/poems/poems-data.json 的拷贝）
 * 输出：
 *   /grandkidsgo/apps/auth-service/data/search/shici.json  ← 新版（2026 首）
 *   /grandkidsgo/apps/auth-service/data/search/index.json ← 重新合并（= shici+tongshi+guoxue+english+tiaozhan）
 *
 * 2026-08-06 应急修复：旧 shici.json（1004 首，2026-05-18）不含招隐士等新诗
 */
const fs = require('fs');
const path = require('path');

const SOURCE = '/tmp/poems-data.json';
const SEARCH_DIR = '/grandkidsgo/apps/auth-service/data/search';
const SOURCE_URL = 'https://xueshici.grandand.com';

function buildShici() {
  const poems = JSON.parse(fs.readFileSync(SOURCE, 'utf-8'));
  const out = [];
  for (const p of poems) {
    if (!p || !p.title) continue;
    const sections = p.sections || [];
    const contentText = sections.map(s => {
      let t = (s.title ? s.title + '\n' : '');
      if (Array.isArray(s.original)) t += s.original.join('\n');
      else t += s.original || '';
      if (s.translation) t += '\n' + s.translation;
      return t;
    }).join('\n\n');
    const summary = sections[0]?.translation || contentText.split('\n').slice(0, 2).join('\n');
    const tags = typeof p.tags === 'string' ? p.tags.split(/[,，、]\s*/).filter(Boolean) : (p.tags || []);
    out.push({
      id: 'shici-' + String(p.id).padStart(4, '0'),
      title: p.title,
      type: '诗词',
      author: p.author || '',
      dynasty: p.dynasty || '',
      content: contentText,
      summary,
      translation: sections[0]?.translation || '',
      tags,
      source: 'shici',
      sourceName: '学诗词',
      sourceUrl: SOURCE_URL,
    });
  }
  return out;
}

const newShici = buildShici();
console.log('newShici:', newShici.length);

// 备份原文件
['shici.json', 'index.json'].forEach(fn => {
  const orig = path.join(SEARCH_DIR, fn);
  if (fs.existsSync(orig)) {
    const bk = path.join(SEARCH_DIR, fn + '.bak.' + new Date().toISOString().slice(0,10).replace(/-/g,''));
    fs.copyFileSync(orig, bk);
    console.log('backup:', bk);
  }
});

fs.writeFileSync(path.join(SEARCH_DIR, 'shici.json'), JSON.stringify(newShici, null, 2));
console.log('wrote shici.json:', newShici.length, 'entries');

// 重新合并 index.json：shici（新版）+ tongshi/guoxue/english/tiaozhan（旧版）
const parts = [newShici];
for (const f of ['tongshi.json', 'guoxue.json', 'english.json', 'tiaozhan.json']) {
  const p = path.join(SEARCH_DIR, f);
  if (fs.existsSync(p)) {
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf-8'));
      parts.push(arr);
      console.log('kept', f, ':', arr.length);
    } catch (e) {
      console.log('skip', f, ':', e.message);
    }
  }
}
const merged = [].concat(...parts);
fs.writeFileSync(path.join(SEARCH_DIR, 'index.json'), JSON.stringify(merged, null, 2));
console.log('wrote index.json:', merged.length, 'entries');

// 招隐士应已收录
const found = merged.find(x => x.title === '招隐士');
console.log('招隐士 found in index:', !!found, found ? found.id + ' author=' + found.author : '');

// 触发 auth-service 内存 reload（如果它支持 /api/search/reload 的话），不直接 restart
console.log('done.');
