import { createApp } from 'vue'
import { initErrorReporter } from '@shared/composables/useErrorReporter'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')


// init error reporter
if (typeof window !== 'undefined') {
  initErrorReporter({ endpoint: 'https://auth.grandand.com/api/errors', appName: 'admin' })
}