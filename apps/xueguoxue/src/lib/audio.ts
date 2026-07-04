/**
 * 国学朗读 — 预生成 Edge TTS mp3 + 背景音乐
 *
 * 功能：
 *   - 预生成 mp3 真人语音朗读
 *   - 自动循环背景音乐（按书籍类别选曲）
 *   - Web Speech 兜底（mp3 加载失败时）
 *
 * 资源路径：
 *   - 朗诵：/audio/books/{classicId}_{sectionId}_{type}.mp3
 *   - BGM：  /audio/bgm/{heroic|lyric|pastoral|frontier|narrative|graceful}.mp3
 */

// ===== 活跃 audio 追踪 =====
const activeAudios = new Set<HTMLAudioElement>()
const activeBgms = new Set<HTMLAudioElement>()

// ===== 朗诵 =====

export interface PlayOptions {
  src: string
  onEnd?: () => void
  bgmSrc?: string
  bgmVolume?: number  // 0-1，默认 0.15
}

export interface PlayResult {
  audio: HTMLAudioElement
  src: string
}

export function playMp3(opts: PlayOptions): PlayResult | null {
  // 单例互斥：先停掉所有正在播放的朗诵（包括同 src 和其他 src）
  // 解决两个 bug：
  //   1) 点开始→点停止→点开始 → 不会两遍叠加
  //   2) 同时点多个朗读按钮 → 不会出现 N 段同时播
  for (const a of Array.from(activeAudios)) {
    try { a.onended = null; a.onerror = null; a.pause(); a.src = '' } catch {}
    activeAudios.delete(a)
  }
  // BGM：每次新朗读都重新选曲（如果 opts.bgmSrc 跟当前 BGM 不同，先停）
  if (opts.bgmSrc) {
    stopBgm()
  } else {
    stopBgm()
  }
  const audio = new Audio(opts.src)
  audio.preload = 'auto'
  activeAudios.add(audio)

  const cleanup = () => {
    if (!activeAudios.has(audio)) return
    activeAudios.delete(audio)
    try { audio.pause() } catch {}
    try { audio.src = '' } catch {}
  }

  audio.onended = () => {
    cleanup()
    opts.onEnd?.()
  }
  audio.onerror = () => {
    cleanup()
    console.warn('[audio] mp3 load failed:', opts.src)
    opts.onEnd?.()
  }
  audio.play().catch(err => {
    cleanup()
    console.warn('[audio] play failed:', err, opts.src)
    opts.onEnd?.()
  })

  if (opts.bgmSrc) {
    playBgm(opts.bgmSrc, opts.bgmVolume ?? 0.15)
  }

  return { audio, src: opts.src }
}

// 停止单个播放实例（从 activeAudios 中移除并停止）
export function stopOne(audio: HTMLAudioElement): void {
  try { audio.onended = null } catch {}
  try { audio.onerror = null } catch {}
  try { audio.pause() } catch {}
  try { audio.src = '' } catch {}
  activeAudios.delete(audio)
}

export function stopAll(): void {
  for (const a of activeAudios) {
    try { a.onended = null } catch {}
    try { a.onerror = null } catch {}
    try { a.pause() } catch {}
    try { a.src = '' } catch {}
  }
  activeAudios.clear()
  stopBgm()
}

// ===== 背景音乐 =====

export function playBgm(src: string, volume: number = 0.15): void {
  stopBgm()
  const bgm = new Audio(src)
  bgm.loop = true
  bgm.volume = volume       // 默认 0.15 已在 playMp3 设定
  bgm.preload = 'auto'
  activeBgms.add(bgm)
  bgm.play().catch(err => {
    activeBgms.delete(bgm)
    console.warn('[audio] bgm play failed:', err)
  })
}

export function stopBgm(): void {
  for (const b of activeBgms) {
    try { b.onended = null } catch {}
    try { b.onerror = null } catch {}
    try { b.pause() } catch {}
    try { b.src = '' } catch {}
  }
  activeBgms.clear()
}

export function setBgmVolume(v: number): void {
  for (const b of activeBgms) {
    b.volume = Math.max(0, Math.min(1, v))
  }
}

// ===== Web Speech 兜底 =====

let synth = typeof window !== 'undefined' ? window.speechSynthesis : null

/** 按中文名拼装 mp3 路径：书名_节名_类型.mp3 */
const typeLabels: Record<string, string> = { original: '原文', translation: '译文', interpretation: '解读' }

function buildAudioPath(classicTitle: string, sectionTitle: string, type: string): string {
  // 替换文件名不兼容字符
  const sanitize = (s: string) => s.replace(/[（）()]/g, '').replace(/\s+/g, '')
  // v=3 cache-busting: 强制浏览器重新下载（避免旧缓存）
  return `/audio/books/${sanitize(classicTitle)}_${sanitize(sectionTitle)}_${typeLabels[type] || type}.mp3?v=3`
}

/**
 * 检测 mp3 是否可用，不可用时转 Web Speech
 */
export async function playSectionAudioWithFallback(
  classicTitle: string,
  sectionTitle: string,
  type: 'original' | 'translation' | 'interpretation',
  text: string,
  onEnd?: () => void
): Promise<HTMLAudioElement | null> {
  const src = buildAudioPath(classicTitle, sectionTitle, type)

  // 尝试 HEAD 检测 mp3 是否存在
  let mp3Exists = false
  try {
    const resp = await fetch(src, { method: 'HEAD' })
    mp3Exists = resp.ok
  } catch {}

  if (mp3Exists) {
    const bgm = selectBgmByBook(classicTitle)
    const result = playMp3({ src, onEnd, bgmSrc: bgm })
    return result?.audio || null
  } else {
    speakWithFallback(text, onEnd)
    return null
  }
}

export function speakWithFallback(text: string, onEnd?: () => void): void {
  if (!synth) {
    onEnd?.()
    return
  }
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 0.8
  u.onend = () => onEnd?.()
  synth.speak(u)
}

export { synth as speechSynth }

/** @deprecated 兼容旧 API */
export function speak(text: string, rate: number = 0.8, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (!synth) return null
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = rate
  u.onend = () => onEnd?.()
  synth.speak(u)
  return u
}

/** @deprecated 兼容旧 API */
export function stopSpeaking(): void {
  synth?.cancel()
  stopAll()
}

// ===== BGM 选曲（按书籍类型） =====

type BgmMood = 'heroic' | 'lyric' | 'pastoral' | 'frontier' | 'narrative' | 'graceful'

/**
 * 按书籍标题选 BGM
 *
 * 规则：
 * 经部经典 → narrative（咏史叙事，适合朗读经典）
 * 道家类 → pastoral（田园古朴）
 * 兵家法家 → heroic（豪迈雄壮）
 * 医书 → graceful（平和舒缓）
 * 蒙学 → pastoral（启蒙轻快）
 * 史部 → narrative
 * 默认 → graceful
 */
export function selectBgmByBook(title: string): string {
  const mood = detectBookMood(title)
  return `/audio/bgm/${mood}.mp3`
}

export function detectBookMood(title: string): BgmMood {
  // 兵家/法家/纵横家 → heroic
  if (/孙子|兵法|鬼谷|商君|韩非/.test(title)) return 'heroic'
  // 道家 → pastoral
  if (/道德经|庄子|列子|淮南子/.test(title)) return 'pastoral'
  // 儒家经典 → narrative（咏史叙事）
  if (/论语|孟子|大学|中庸|孝经|诗经|尚书|礼记|周易|春秋|左传|孔子/.test(title)) return 'narrative'
  // 历史 → narrative
  if (/史记|资治通鉴|汉书|后汉书|三国志|国语|战国策/.test(title)) return 'narrative'
  // 医书 → graceful
  if (/黄帝内经|伤寒论|本草|千金|养生/.test(title)) return 'graceful'
  // 蒙学 → pastoral
  if (/三字经|弟子规|千字文|百家姓/.test(title)) return 'pastoral'
  // 婉约文学 → lyric
  if (/菜根谭|小窗幽记|忍经|省心/.test(title)) return 'lyric'
  // 志怪小说 → lyric
  if (/世说新语|洛阳伽蓝/.test(title)) return 'lyric'
  // 蒙学诗歌类 → heroic（激昂朗读）
  if (/千家诗|神童诗|笠翁对韵/.test(title)) return 'heroic'
  // 默认
  return 'graceful'
}

// ===== 录音功能（保留，暂未在前端使用） =====

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let startTime = 0

export async function startRecording(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  chunks = []
  startTime = Date.now()
  mediaRecorder = new MediaRecorder(stream)
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  mediaRecorder.start()
}

export function stopRecording(): Promise<{ blob: Blob; duration: number }> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) return reject('No recorder')
    const dur = (Date.now() - startTime) / 1000
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      mediaRecorder?.stream.getTracks().forEach(t => t.stop())
      mediaRecorder = null
      resolve({ blob, duration: dur })
    }
    mediaRecorder.stop()
  })
}

export function playBlob(blob: Blob): HTMLAudioElement {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
  return audio
}
