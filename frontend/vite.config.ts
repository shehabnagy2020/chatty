import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/chatty/',
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
      },
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})