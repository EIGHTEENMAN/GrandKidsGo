import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// shared 包未就绪前的占位：appName 透传给未来 Sentry/PostHog 错误上报
function initErrorReporter(_opts: { endpoint: string; appName: string }) {
  // no-op, 占位
}

export function createApp() {
  const app = createSSRApp(App)
  if (typeof window !== 'undefined') {
    initErrorReporter({ endpoint: 'https://auth.grandand.com/api/errors', appName: 'mobile' })
    // 隐藏启动画面
    const splash = document.getElementById('app-splash')
    if (splash) {
      splash.style.transition = 'opacity 0.3s ease'
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 350)
    }
  }
  app.use(createPinia())
  return { app }
}
