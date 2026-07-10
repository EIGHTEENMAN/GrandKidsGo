/**
 * 错误上报 — 替代 Sentry 的轻量方案
 * 收集 window.onerror / console.error → POST /api/errors
 */

const errors: any[] = []
let started = false

export function initErrorReporter(opts: { endpoint: string; appName: string }) {
  if (started) return
  started = true

  // 1) 全局错误
  window.addEventListener('error', (e) => {
    report({
      type: 'error',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
    })
  })

  // 2) unhandledrejection
  window.addEventListener('unhandledrejection', (e) => {
    report({
      type: 'unhandledrejection',
      message: String(e.reason),
      stack: e.reason?.stack,
    })
  })

  // 3) console.error 拦截
  const origError = console.error
  console.error = (...args) => {
    origError.apply(console, args)
    report({
      type: 'console.error',
      message: args.map(String).join(' '),
    })
  }

  function report(err: any) {
    err.app = opts.appName
    err.url = location.href
    err.userAgent = navigator.userAgent
    err.timestamp = new Date().toISOString()
    errors.push(err)
    // 批量发送
    if (errors.length >= 5) flush()
  }

  function flush() {
    if (errors.length === 0) return
    const batch = errors.splice(0, errors.length)
    fetch(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: batch }),
      keepalive: true,
    }).catch(() => {})
  }

  // 页面卸载前 flush
  window.addEventListener('beforeunload', flush)
  // 定期 flush
  setInterval(flush, 30000)
}
