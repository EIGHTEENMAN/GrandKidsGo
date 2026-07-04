// Speech recognition for pronunciation validation

let currentRecognition: SpeechRecognition | null = null
let currentTimeout: ReturnType<typeof setTimeout> | null = null
let currentResolve: ((result: boolean) => void) | null = null

function createRecognition(): SpeechRecognition | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return null
  const sr = new SR()
  sr.lang = "en-US"
  sr.continuous = false
  sr.interimResults = false
  return sr
}

export function isSpeechSupported(): boolean {
  return !!createRecognition()
}

export function startListening(_targetWord: string): Promise<boolean> {
  return new Promise((resolve) => {
    stopListening()
    const sr = createRecognition()
    if (!sr) { resolve(false); return }

    currentRecognition = sr
    currentResolve = resolve
    currentTimeout = setTimeout(() => {
      try { sr.abort() } catch {}
      stopListening()
      resolve(false)
    }, 8000)

    sr.onresult = () => {
      resolve(true)
      stopListening()
    }

    sr.onerror = () => {
      resolve(false)
      stopListening()
    }

    sr.onend = () => {
      resolve(false)
      stopListening()
    }

    sr.start()
  })
}

export function stopListening(accept = false) {
  if (currentTimeout) {
    clearTimeout(currentTimeout)
    currentTimeout = null
  }
  if (currentRecognition) {
    try { currentRecognition.stop() } catch {}
    currentRecognition = null
  }
  if (accept && currentResolve) {
    currentResolve(true)
    currentResolve = null
  }
}
