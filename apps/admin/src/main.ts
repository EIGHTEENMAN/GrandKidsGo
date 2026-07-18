import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')


// init error reporter（shared 包未就绪前占位）
if (typeof window !== 'undefined') {
  function initErrorReporter(_opts: { endpoint: string; appName: string }) {
    // no-op
  }
  initErrorReporter({ endpoint: 'https://auth.grandand.com/api/errors', appName: 'admin' })
}