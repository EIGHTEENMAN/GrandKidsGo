import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initErrorReporter } from '@shared/composables/useErrorReporter'

initErrorReporter({ endpoint: 'https://auth.grandand.com/api/errors', appName: 'tiaozhan' })
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
