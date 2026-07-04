import { createApp } from 'vue'
import SearchPage from './components/SearchPage.vue'
import { createPinia } from 'pinia'

const app = createApp(SearchPage)
app.use(createPinia())
app.mount('#search-app')
