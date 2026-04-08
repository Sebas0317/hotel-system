import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    proxy: {
      '/rooms': 'http://localhost:3001',
      '/consumos': 'http://localhost:3001',
      '/prices': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    }
  }
})
