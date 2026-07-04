// Audio manager: word pronunciation + Bruce Lee sound effects
//
// 2026-06-30 修复：原版用 Map 预创建所有单词的 Audio()，
// 导致 2201 个 Audio 元素同时存在，触发 Chromium WebMediaPlayer 上限。
// 改为懒加载：只缓存 URL 字符串，播放时才 new Audio()。
// 同时维护一个 LRU-style pool，限制同时存在的 Audio 元素 ≤ MAX_POOL_SIZE。

let audioCtx: AudioContext | null = null

// URL 缓存（永远不大）
const audioUrlCache = new Map<string, string>()

// 活跃 Audio 元素池（LRU：超过 MAX_POOL_SIZE 时清理最旧的）
const MAX_POOL_SIZE = 8
const audioPool: HTMLAudioElement[] = []

// 当前正在播放的 Audio（任何新播放前先 pause 它，避免音频重叠）
let currentAudio: HTMLAudioElement | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// 停掉当前播放的音频（包括 TTS），避免重叠
function stopCurrent() {
  if (currentAudio) {
    try { currentAudio.pause() } catch {}
    try { currentAudio.currentTime = 0 } catch {}
    currentAudio = null
  }
  // 同时停掉 TTS
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel() } catch {}
  }
}

function playWithPool(url: string, onEnd?: () => void): HTMLAudioElement {
  // 关键：先停掉上一个音频，避免重叠
  stopCurrent()
  const audio = new Audio(url)
  audio.preload = "auto"
  audioPool.push(audio)
  if (audioPool.length > MAX_POOL_SIZE) {
    const oldest = audioPool.shift()
    try { oldest?.pause() } catch {}
  }
  currentAudio = audio
  if (onEnd) audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
    onEnd()
  }
  audio.play().catch(() => {
    if (currentAudio === audio) currentAudio = null
    // autoplay 失败或加载失败
    onEnd?.()
  })
  return audio
}

// Play word pronunciation from file or TTS fallback
export function playWordAudio(word: string, onEnd?: () => void) {
  const url = audioUrlCache.get(word)
  if (url) {
    playWithPool(url, onEnd)
    return
  }
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = "en-US"
    u.rate = 0.8
    u.onend = () => { onEnd?.() }
    speechSynthesis.speak(u)
  } else {
    onEnd?.()
  }
}

// Register a URL for a word (NO Audio creation - lazy loading)
export function registerWordAudio(word: string, url: string) {
  audioUrlCache.set(word, url)
}

// 2026-07-01：组件卸载或路由切换时调用，停止所有音频 + TTS
export function stopAllAudio() {
  stopCurrent()
  // 同时 pause 掉池里所有还活着的 audio
  for (const audio of audioPool) {
    try { audio.pause() } catch {}
    try { audio.currentTime = 0 } catch {}
  }
  audioPool.length = 0
  currentAudio = null
}

// 播放预生成的例句 mp3（按 id 命名 sent_${id}.mp3）
// mp3 缺失/加载失败时自动降级到浏览器 speechSynthesis
export function playSentenceAudio(id: number, sentence?: string, onEnd?: () => void) {
  stopCurrent()
  const url = `/audio/sentences/sent_${id}.mp3`
  const audio = new Audio(url)
  audio.preload = "auto"
  currentAudio = audio
  audioPool.push(audio)
  if (audioPool.length > MAX_POOL_SIZE) {
    const oldest = audioPool.shift()
    try { oldest?.pause() } catch {}
  }
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null
    if (sentence) speakSentence(sentence)
    onEnd?.()
  }
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
    onEnd?.()
  }
  audio.play().catch(() => {
    if (currentAudio === audio) currentAudio = null
    // autoplay 失败 → 降级 TTS
    if (sentence) speakSentence(sentence)
    onEnd?.()
  })
}

// 朗读英文例句（浏览器内置 TTS，零成本、即时）
// 注意：2026-06-30 起，例句优先播放预生成的 Edge TTS mp3（en-US-JennyNeural + friendly）
// 这里只是 mp3 缺失时的兜底。pitch 调高会让机器人感加重，去掉改用默认音色。
let cachedEnVoice: SpeechSynthesisVoice | null = null
function pickEnVoice(): SpeechSynthesisVoice | null {
  if (cachedEnVoice) return cachedEnVoice
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  // 优先级：英文女声（柔和） → 任意英文
  cachedEnVoice =
    voices.find(v => /^en/i.test(v.lang) && /female|samantha|victoria|karen|tessa|moira|fiona|aria|jenny/i.test(v.name)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    null
  return cachedEnVoice
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    pickEnVoice()
  }
}

export function speakSentence(text: string) {
  if (!("speechSynthesis" in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "en-US"
  u.rate = 0.9
  // 不再设 pitch，让系统默认（pitch=1）最自然
  const voice = pickEnVoice()
  if (voice) u.voice = voice
  speechSynthesis.speak(u)
}

// === Bruce Lee "阿达!" Sound (Web Audio API synthesis) ===

export function playBruceLeeShout(pitch = 1.0) {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    // Main oscillator - rising frequency for "阿达!" effect
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(500 * pitch, now)
    osc.frequency.linearRampToValueAtTime(1200 * pitch, now + 0.15)
    osc.frequency.linearRampToValueAtTime(800 * pitch, now + 0.3)

    // Gain envelope - quick attack, quick decay
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)

    // Extra harmonics for SpecialMove (pitch > 1.3)
    if (pitch > 1.3) {
      const osc2 = ctx.createOscillator()
      osc2.type = "square"
      osc2.frequency.setValueAtTime(1000 * pitch, now)
      osc2.frequency.linearRampToValueAtTime(1800 * pitch, now + 0.15)
      const gain2 = ctx.createGain()
      gain2.gain.setValueAtTime(0.2, now)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now)
      osc2.stop(now + 0.35)
    }
  } catch { /* audio not available */ }
}

export function getSkillPitch(skillIndex: number): number {
  return [1.0, 1.2, 1.3, 1.4, 1.5][skillIndex] || 1.0
}
