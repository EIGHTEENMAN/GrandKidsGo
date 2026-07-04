// Web Speech API TTS for xuetongshi
let utterance: SpeechSynthesisUtterance | null = null

export function speak(text: string, rate = 0.8, onEnd?: () => void) {
  if (!text.trim()) return
  window.speechSynthesis.cancel()
  utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = rate
  utterance.onend = () => { utterance = null; onEnd?.() }
  utterance.onerror = () => { utterance = null; onEnd?.() }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  window.speechSynthesis.cancel()
  utterance = null
}
