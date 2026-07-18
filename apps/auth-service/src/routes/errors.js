const { Router } = require('express')
const fs = require('fs')
const path = require('path')

const router = Router()

// 前端错误日志 — 写入 /var/log/frontend-errors.log
const LOG_DIR = process.env.ERROR_LOG_DIR || '/var/log/grandkidsgo'
const LOG_FILE = path.join(LOG_DIR, 'frontend-errors.log')

// 接收批量错误
router.post('/errors', (req, res) => {
  try {
    const errors = req.body?.errors || []
    if (!Array.isArray(errors) || errors.length === 0) {
      return res.status(400).json({ code: 'INVALID_INPUT', message: 'no errors' })
    }
    // 写文件（按行 JSON）
    try { fs.mkdirSync(LOG_DIR, { recursive: true }) } catch (e) {}
    const lines = errors.map(e => JSON.stringify({
      ...e,
      receivedAt: new Date().toISOString(),
    })).join('\n') + '\n'
    fs.appendFileSync(LOG_FILE, lines)
    res.json({ code: 'OK', count: errors.length })
  } catch (err) {
    console.error('[errors] write failed:', err.message)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message })
  }
})

// 查最新错误（仅 admin 角色）
router.get('/errors/recent', (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) return res.json({ errors: [] })
    const content = fs.readFileSync(LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean).slice(-50)
    const errors = lines.map(line => {
      try { return JSON.parse(line) } catch (e) { return { raw: line } }
    })
    res.json({ errors })
  } catch (err) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message })
  }
})

module.exports = router
