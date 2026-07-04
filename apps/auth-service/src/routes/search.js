
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'search');

function loadAllData() {
  try {
    const indexPath = path.join(DATA_DIR, 'index.json');
    if (fs.existsSync(indexPath)) {
      return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    }
  } catch (e) {
    console.error('[search] Error loading data:', e.message);
  }
  return [];
}

let allData = loadAllData();

router.get('/', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ code: 'OK', data: [] });
    }
    const kw = q.toLowerCase();
    const results = allData.filter(item => {
      const searchText = [item.title, item.type, item.author, item.summary, item.content||"",
        (item.tags||[]).join(' '), item.translation||''].join(' ').toLowerCase();
      return searchText.includes(kw);
    });
    results.sort((a, b) => {
      const aT = (a.title||'').toLowerCase().includes(kw) ? 2 : 0;
      const bT = (b.title||'').toLowerCase().includes(kw) ? 2 : 0;
      return (bT) - (aT);
    });
    res.json({ code: 'OK', data: results.slice(0, 30) });
  } catch (e) {
    console.error('[search] Error:', e.message);
    res.status(500).json({ code: 'ERROR', message: '搜索出错' });
  }
});

router.get('/doc', (req, res) => {
  try {
    const id = (req.query.id || '').trim();
    if (!id) return res.status(400).json({ code: 'INVALID_INPUT', message: 'Missing id' });
    const doc = allData.find(item => item.id === id);
    if (!doc) return res.status(404).json({ code: 'NOT_FOUND', message: '文档不存在' });
    res.json({ code: 'OK', data: doc });
  } catch (e) {
    res.status(500).json({ code: 'ERROR', message: '获取文档出错' });
  }
});

router.post('/reload', (_req, res) => {
  allData = loadAllData();
  res.json({ code: 'OK', message: 'Reloaded ' + allData.length + ' entries' });
});

module.exports = router;
