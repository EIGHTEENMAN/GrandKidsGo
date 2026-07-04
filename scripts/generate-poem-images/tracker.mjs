/**
 * 诗配画引擎 — 生成状态追踪器
 *
 * 维护一个 JSON 文件记录每首诗的生成状态：
 *   - pending: 等待生成
 *   - generating: 正在生成
 *   - done: 生成成功
 *   - failed: 生成失败（记录错误信息）
 *   - skipped: 跳过（图片已存在）
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { STATUS_FILE } from './config.mjs'

export class Tracker {
  constructor() {
    this.data = this._load()
  }

  _load() {
    if (existsSync(STATUS_FILE)) {
      try {
        return JSON.parse(readFileSync(STATUS_FILE, 'utf-8'))
      } catch {
        console.warn('⚠️ 状态文件损坏，重新创建')
      }
    }
    return { version: 1, updatedAt: new Date().toISOString(), poems: {} }
  }

  _save() {
    this.data.updatedAt = new Date().toISOString()
    writeFileSync(STATUS_FILE, JSON.stringify(this.data, null, 2))
  }

  /**
   * 注册所有诗词到追踪器
   */
  registerPoems(poems) {
    let added = 0
    for (const p of poems) {
      const id = String(p.id)
      if (!this.data.poems[id]) {
        this.data.poems[id] = {
          title: p.title,
          author: p.author,
          dynasty: p.dynasty,
          status: 'pending',
          attempts: 0,
        }
        added++
      }
    }
    if (added > 0) {
      console.log(`📝 注册了 ${added} 首新诗词到追踪器 (共 ${Object.keys(this.data.poems).length} 首)`)
      this._save()
    }
    return added
  }

  /**
   * 获取需要生成的诗词列表
   */
  getPending(retryFailed = false) {
    const list = []
    for (const [id, info] of Object.entries(this.data.poems)) {
      if (info.status === 'pending') list.push(id)
      if (retryFailed && info.status === 'failed') {
        info.status = 'pending'
        list.push(id)
      }
    }
    if (retryFailed) this._save()
    return list
  }

  markGenerating(id) {
    if (this.data.poems[id]) {
      this.data.poems[id].status = 'generating'
      this.data.poems[id].attempts = (this.data.poems[id].attempts || 0) + 1
      this.data.poems[id].lastAttempt = new Date().toISOString()
      this._save()
    }
  }

  markDone(id) {
    if (this.data.poems[id]) {
      this.data.poems[id].status = 'done'
      this.data.poems[id].completedAt = new Date().toISOString()
      this._save()
    }
  }

  markFailed(id, error) {
    if (this.data.poems[id]) {
      this.data.poems[id].status = 'failed'
      this.data.poems[id].lastError = error?.message || String(error)
      this.data.poems[id].failedAt = new Date().toISOString()
      this._save()
    }
  }

  markSkipped(id) {
    if (this.data.poems[id]) {
      this.data.poems[id].status = 'skipped'
      this._save()
    }
  }

  getStats() {
    const stats = { total: 0, done: 0, pending: 0, failed: 0, skipped: 0, generating: 0 }
    for (const info of Object.values(this.data.poems)) {
      stats.total++
      if (stats[info.status] !== undefined) stats[info.status]++
    }
    return stats
  }

  printStats() {
    const stats = this.getStats()
    console.log('\n📊 生成状态统计:')
    console.log(`   总计: ${stats.total}`)
    console.log(`   ✅ 完成: ${stats.done}`)
    console.log(`   ⏳ 待生成: ${stats.pending}`)
    console.log(`   🔄 生成中: ${stats.generating}`)
    console.log(`   ❌ 失败: ${stats.failed}`)
    console.log(`   ⏭️  跳过: ${stats.skipped}`)
    console.log(`   完成率: ${stats.total > 0 ? ((stats.done / stats.total) * 100).toFixed(1) : 0}%\n`)
    return stats
  }
}
