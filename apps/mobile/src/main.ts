import { createSSRApp } from 'vue'
import { initErrorReporter } from '@shared/composables/useErrorReporter'
import { createPinia } from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  if (typeof window !== 'undefined') {
    initErrorReporter({ endpoint: 'https://auth.grandand.com/api/errors', appName: 'mobile' })
  }
  app.use(createPinia())
  return { app }
}
