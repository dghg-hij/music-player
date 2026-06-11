import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

export default defineConfig({
  base: '/music-player/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/163_music': {
        target: 'https://api.bugpk.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/163_music/, '/api/163_music'),
      },
      // 后端 API 代理 — Cloudflare Worker 本地开发服务器
      '/api/auth': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/user': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/playlist': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/member': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/feedback': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }),
    tsconfigPaths()
  ],
})
