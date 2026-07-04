/**
 * Native capability utilities for UniApp
 * Handles share, clipboard, haptic feedback with graceful fallbacks
 */

export function shareContent(options: {
  title: string
  text?: string
  url?: string
}) {
  // Try Web Share API first (H5 modern browsers)
  if (navigator.share) {
    navigator.share({
      title: options.title,
      text: options.text || options.title,
      url: options.url || window.location.href,
    }).catch(() => {
      // User cancelled or error - silent
    })
    return
  }

  // Fallback: copy to clipboard
  const content = `${options.title}${options.text ? '\n' + options.text : ''}${options.url ? '\n' + options.url : ''}`
  copyToClipboard(content)
  uni.showToast({ title: '链接已复制', icon: 'success' })
}

export function copyToClipboard(text: string) {
  try {
    uni.setClipboardData({ data: text })
  } catch {
    // Clipboard unavailable
  }
}

export function vibrate(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    if (uni.vibrateShort) {
      uni.vibrateShort({ type: style === 'heavy' ? 'heavy' : 'light' })
    }
  } catch {
    // Vibration not supported
  }
}

export function formatShareText(poem: { title: string; author: string; dynasty: string }) {
  return {
    title: poem.title,
    text: `${poem.author} · ${poem.dynasty}`,
    url: `https://xueshici.grandand.com/`,
  }
}
