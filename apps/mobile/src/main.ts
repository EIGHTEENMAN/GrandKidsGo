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
  }
  app.use(createPinia())
  return { app }
}
