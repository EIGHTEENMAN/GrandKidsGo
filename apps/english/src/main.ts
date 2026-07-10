import { createApp } from 'vue'
import { initErrorReporter } from '@shared/composables/useErrorReporter'
import './styles/reset.css'
import './styles/theme.css'
import App from './App.vue'
import { initRouter } from './router'

initRouter()

createApp(App).mount('#app')

initErrorReporter({
  endpoint: 'https://auth.grandand.com/api/errors',
  appName: 'english'
})