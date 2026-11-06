/**
 * 错误上报 — 替代 Sentry 的轻量方案
 * 收集 window.onerror / unhandledrejection / console.error / 手动 report()
 *   → POST {endpoint}
 *
 * 2026-11-06 新增导出 report() / flushErrors()：
 *   React 生产构建不会把 error boundary 捕获的错误输出到 console
 *   （react-dom.production.min.js 里没有 logCapturedError），
 *   所以 ErrorBoundary 必须显式调 report() 上报，不能指望 console.error 拦截。
 */

export interface ErrorPayload {
  type: string
  message?: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  /** React 的 componentStack 类型是 string | null */
  componentStack?: string | null
  [key: string]: unknown
}

export interface ReporterOptions {
  endpoint: string
  appName: string
}

const errors: ErrorPayload[] = []
let started = false
let current: ReporterOptions | null = null

/** 立即把队列里的错误发出去（fire-and-forget，失败静默） */
export function flushErrors(): void {
  if (!current || errors.length === 0) return
  const batch = errors.splice(0, errors.length)
  fetch(current.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ errors: batch }),
    keepalive: true,
  }).catch(() => {})
}

/**
 * 手动上报一条错误。
 * @param err       错误内容（type 必填，如 'react-error'）
 * @param immediate true = 立刻发送（致命错误用）；false = 入队，满 5 条自动批量
 */
export function report(err: ErrorPayload, immediate = false): void {
  errors.push({
    ...err,
    app: err.app ?? current?.appName ?? 'unknown',
    url: typeof location !== 'undefined' ? location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: new Date().toISOString(),
  })
  // 批量发送
  if (immediate || errors.length >= 5) flushErrors()
}

/** 初始化错误上报（幂等） */
export function initErrorReporter(opts: ReporterOptions) {
  current = opts
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

  // 页面卸载前 flush
  window.addEventListener('beforeunload', flushErrors)
  // 定期 flush
  setInterval(flushErrors, 30000)
}
