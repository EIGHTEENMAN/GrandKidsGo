import { createApp } from 'vue'
import './styles/reset.css'
import './styles/theme.css'
import App from './App.vue'
import { initRouter } from './router'

initRouter()

createApp(App).mount('#app')