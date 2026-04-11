import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    compression({ algorithm: 'gzip' })
  ],
  server: {
    proxy: {
      '/rooms': 'http://localhost:3001',
      '/consumos': 'http://localhost:3001',
      '/prices': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('swiper') || id.includes('datepicker') || id.includes('icons')) {
              return 'vendor-ui';
            }
          }
        }
      }
    }
  }
})