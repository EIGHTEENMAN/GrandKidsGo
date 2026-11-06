import React from 'react'
import { report } from '@shared/composables/useErrorReporter'

interface Props {
  children: React.ReactNode
  /** 上报用的应用名（= 目录名） */
  appName?: string
  /** 额外的错误回调（如埋点） */
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface State {
  error: Error | null
}

/**
 * 全局错误边界
 *
 * 背景：2026-11-05 小答答答题页因 useEffect 依赖数组 TDZ 崩溃，
 * 没有错误边界 → 整个 React 树卸载 → 整页白屏。
 * 本组件兜住渲染期异常，至少让用户看到提示 + 重试按钮，而不是白屏。
 *
 * 注意：React 生产构建不会把 error boundary 捕获的错误输出到 console，
 * 所以必须显式调 report() 上报，不能依赖 initErrorReporter 的 console.error 拦截。
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  // 用字段初始化而不是构造函数赋值 —— 配合 store 的 useDefineForClassFields: true 安全
  state: State = { error: null }

  // 同一个错误只上报一次（StrictMode 下 componentDidCatch 可能触发两次）
  private reportedError: Error | null = null

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.reportedError !== error) {
      this.reportedError = error
      report(
        {
          type: 'react-error',
          message: error?.message || String(error),
          stack: error?.stack,
          componentStack: info?.componentStack,
          app: this.props.appName,
        },
        true, // 立即发送，别等 30s 批量
      )
    }
    this.props.onError?.(error, info)
  }

  handleRetry = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #f8fafc)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '40px 24px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😵</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #0f172a)', margin: '0 0 12px' }}>
            出错了
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: '0 0 8px' }}>
            页面出了点问题，请重试
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
            如果反复出错，请把这个页面的链接告诉我们
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 24px',
                background: 'var(--primary, #0ea5e9)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              重试
            </button>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: 'transparent',
                color: 'var(--primary, #0ea5e9)',
                border: '1px solid var(--primary, #0ea5e9)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              返回首页
            </a>
          </div>
        </div>
      </div>
    )
  }
}
