#!/usr/bin/env node
/**
 * 清理长期不活跃用户
 * 策略：2 年未登录 → 标记 suspended + 删除 session
 *       过期验证码 → 30 天以上清理
 * 每月 1 号 04:00 执行
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const dbPath = resolve(__dirname, '../apps/auth-service/data/auth.db')
  if (!existsSync(dbPath)) {
    console.error('auth.db not found:', dbPath)
    process.exit(1)
  }

  const betterSqlite3 = await import(resolve(__dirname, '../apps/auth-service/node_modules/better-sqlite3/lib/index.js'))
  const conn = betterSqlite3.default(dbPath)
  const logFile = resolve(__dirname, '../backup/db/cleanup.log')
  const now = new Date().toISOString()
  const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString()

  // 1. 标记 2 年不活跃用户 + 清理 session
  const staleUsers = conn.prepare(
    `SELECT id, username, nickname FROM users WHERE updated_at < ? AND suspended = 0`
  ).all(twoYearsAgo)

  console.log(`[${now}] stale users: ${staleUsers.length}`)
  if (staleUsers.length > 0) {
    const ids = staleUsers.map(u => u.id)
    const placeholders = ids.map(() => '?').join(',')

    conn.prepare(`UPDATE users SET suspended = 1, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(...ids)
    conn.prepare(`DELETE FROM sessions WHERE user_id IN (${placeholders})`).run(...ids)

    staleUsers.forEach(u => console.log(`  suspended: ${u.username || u.id}`))
  }

  // 2. 清理过期验证码
  const delCodes = conn.prepare(`DELETE FROM verification_codes WHERE created_at < datetime('now', '-30 days')`).run()
  console.log(`  codes cleaned: ${delCodes.changes}`)

  // 3. 写日志
  let logContent = `[${now}] stale=${staleUsers.length} codes_clean=${delCodes.changes}\n`
  try {
    if (existsSync(logFile)) {
      logContent += readFileSync(logFile, 'utf-8').split('\n').slice(0, 99).join('\n')
    }
    writeFileSync(logFile, logContent)
  } catch {}

  conn.close()
  console.log('done')
}

main().catch(e => { console.error('error:', e.message); process.exit(1) })