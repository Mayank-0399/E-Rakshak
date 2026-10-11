import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET

  if (mode === 'development' && !apiProxyTarget) {
    throw new Error('Set VITE_API_PROXY_TARGET in frontend/.env.local to the backend URL.')
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      ...(apiProxyTarget && {
        proxy: {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true
          }
        }
      })
    }
  }
})
