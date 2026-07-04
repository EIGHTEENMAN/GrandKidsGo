/**
 * 诗词朗读 — 使用预生成的 Edge TTS mp3 真人朗诵 + 背景音乐
 *
 * 优势：
 *   - 真人音色，发音自然有感情（vs Web Speech 机械）
 *   - 已按诗人生平选音色（李白/苏轼用男声，李清照用女声）
 *   - 朗读时自动循环背景音乐（按诗体选曲）
 *
 * 资源路径：
 *   - 朗诵：/audio/poems/{id}_original.mp3 / {id}_translation.mp3 / {id}_interpretation.mp3
 *   - BGM：  /audio/bgm/{heroic|lyric|pastoral|frontier|narrative|graceful}.mp3
 */

// ===== 活跃 audio 追踪（修复用户连点多个按钮时残留音频的 bug）=====
// 必须用 Set 追踪所有正在播放的 audio 实例，不能只用单个 currentAudio
// 否则点完"朗读原文"立刻点"朗读译文"时，第一个 audio 没引用会残留播放
const activeAudios = new Set<HTMLAudioElement>()
const activeBgms = new Set<HTMLAudioElement>()

// ===== 朗诵 =====

export interface PlayOptions {
  src: string             // mp3 URL
  onEnd?: () => void
  bgmSrc?: string         // 背景音乐 URL（可选）
  bgmVolume?: number      // 0-1，默认 0.3
  playbackRate?: number   // 播放速率，默认 0.85（更慢适合儿童）
}

export function playMp3(opts: PlayOptions): void {
  // 先停掉所有正在播放的音频（包括之前残留的）
  stopAll()

  const audio = new Audio(opts.src)
  audio.preload = 'auto'
  // 不再用 playbackRate + preservesPitch——某些浏览器（iOS Safari 16+）上会触发 onerror
  // 让浏览器用默认 1.0 速度播放，保证稳定
  // 注册到活跃集合，确保后续 stopAll 能停掉
  activeAudios.add(audio)

  const cleanup = () => {
    activeAudios.delete(audio)
    try { audio.pause() } catch {}
    try { audio.src = '' } catch {}
  }

  audio.onended = () => {
    cleanup()
    opts.onEnd?.()
    stopBgm()
  }
  audio.onerror = () => {
    cleanup()
    console.warn('[audio] mp3 load failed:', opts.src)
    opts.onEnd?.()
    stopBgm()
  }
  audio.play().catch(err => {
    cleanup()
    console.warn('[audio] play failed:', err, opts.src)
    opts.onEnd?.()
  })

  // 启动背景音乐
  if (opts.bgmSrc) {
    playBgm(opts.bgmSrc, opts.bgmVolume ?? 0.3)
  }
}

export function stopAll(): void {
  // 停止所有活跃的朗诵 audio
  // 关键修复（2026-06-19）：必须先把 onended/onerror handler 置 null，
  // 否则 a.src = '' 会异步触发 onerror → opts.onEnd → 清空新设的 playingTarget，
  // 导致连续播放时按钮永远不变 ⏹ 停止朗读
  for (const a of activeAudios) {
    try { a.onended = null } catch {}
    try { a.onerror = null } catch {}
    try { a.pause() } catch {}
    try { a.src = '' } catch {}
  }
  activeAudios.clear()
  stopBgm()
}

/** @deprecated 兼容旧 API，等价于 stopAll() */
export function stopSpeaking(): void {
  stopAll()
}

// ===== 背景音乐 =====

export function playBgm(src: string, volume: number = 0.3): void {
  stopBgm()
  const bgm = new Audio(src)
  bgm.loop = true
  bgm.volume = volume
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

// ===== Web Speech 兜底（mp3 加载失败时） =====

let synth = typeof window !== 'undefined' ? window.speechSynthesis : null

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

// ===== BGM 选曲（按诗体） =====

/**
 * 根据诗的风格选 BGM
 * - 诗经 / 楚辞 / 春秋战国 → pastoral（田园古朴）
 * - 边塞诗 / 战争 → frontier（边塞苍凉）
 * - 豪放（李白/苏轼/辛弃疾）→ heroic
 * - 婉约（李清照/柳永/秦观）→ lyric
 * - 田园（王维/陶渊明）→ pastoral
 * - 咏史/叙事 → narrative
 * - 默认 → graceful
 */
export type PoemMood = 'heroic' | 'lyric' | 'pastoral' | 'frontier' | 'narrative' | 'graceful'

export function selectBgm(poem: { author?: string; tags?: string; title?: string } | null): string {
  const mood = detectMood(poem)
  return `/audio/bgm/${mood}.mp3`
}

export function detectMood(poem: { author?: string; tags?: string; title?: string } | null): PoemMood {
  if (!poem) return 'graceful'
  const text = `${poem.author || ''} ${poem.tags || ''} ${poem.title || ''}`.toLowerCase()

  // 边塞
  if (/边塞|战争|从军|塞下|凉州|出塞|战|戍/.test(text)) return 'frontier'
  // 楚辞 / 诗经 / 春秋战国 → 田园古朴
  if (/楚辞|诗经|春秋战国/.test(text)) return 'pastoral'
  // 豪放派
  if (/李白|苏轼|辛弃疾|陆游|岳飞|豪放|豪迈|壮观|雄/.test(text)) return 'heroic'
  // 婉约派
  if (/李清照|柳永|秦观|晏殊|婉约|闺怨|相思|愁|离情/.test(text)) return 'lyric'
  // 田园
  if (/王维|陶渊明|孟浩然|田园|山水|隐逸/.test(text)) return 'pastoral'
  // 咏史叙事
  if (/杜甫|白居易|叙事|咏史|怀古|史记/.test(text)) return 'narrative'

  return 'graceful'
}