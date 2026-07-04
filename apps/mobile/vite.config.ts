import { defineConfig } from 'vite'
import { createRequire } from 'module'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const require = createRequire(import.meta.url)
const uniPlugin = require('@dcloudio/vite-plugin-uni')
const uni = uniPlugin.default || uniPlugin

export default defineConfig({
  plugins: [
    uni(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: '童慧行',
        short_name: '童慧行',
        description: '童慧行儿童免费学习乐园 - 读万卷书，行万里路',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/grandand\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'grandkidsgo-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3009,
    proxy: {
      '/api': {
        target: 'http://localhost:3007',
        changeOrigin: true,
      },
    },
  },
})
