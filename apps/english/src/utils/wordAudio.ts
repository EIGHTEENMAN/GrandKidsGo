import { words } from '../data/words'
import { registerWordAudio } from './audio'

/**
 * v3 修复版 audio 注册
 *
 * 修复了原 App.vue 的 3 个 bug：
 * 1. 正则改为 /^[a-zA-Z'\-\s]+$/ 允许 apostrophe（it's/don't）
 * 2. 取消 encodeURIComponent（mp3 文件名就是小写英文）
 * 3. 用 Set 去重（避免重复注册同一个词）
 */

const VALID_RE = /^[a-zA-Z'\-\s]+$/

let registered = false

export function registerAllWordAudio(): void {
  if (registered) return
  registered = true

  const seen = new Set<string>()
  let count = 0
  for (const w of words) {
    if (!w.word || !VALID_RE.test(w.word)) continue
    const key = w.word.toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    registerWordAudio(key, `/audio/${key}.mp3`)
    count++
  }
  console.log(`[wordAudio] 注册 ${count} 个单词音频`)
}