import { createApp } from "vue"
import { initErrorReporter } from "@shared/composables/useErrorReporter"; import App from "./App.vue"; createApp(App).mount("#app")

initErrorReporter({
  endpoint: 'https://auth.grandand.com/api/errors',
  appName: 'xueshici'
}); console.log("[VERSION] xueshici-2026-07-07-v4-chunk-path-fix");
