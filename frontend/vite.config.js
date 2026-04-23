import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    // Bundle analysis — generates report.html after build
    visualizer({
      filename: 'dist/report.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    proxy: {
      '/rooms': 'http://localhost:3001',
      '/consumos': 'http://localhost:3001',
      '/prices': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/history': 'http://localhost:3001',
      '/state-history': 'http://localhost:3001',
      '/accounting': 'http://localhost:3001',
    }
  },
  build: {
    target: 'esnext', // Use modern JS for smaller, faster bundles
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.warn'], // More aggressive console removal
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split core libraries into their own chunks
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('react/')) return 'vendor-react-core';
            
            // UI libraries
            if (id.includes('framer-motion')) return 'vendor-animation';
            if (id.includes('swiper')) return 'vendor-ui-swiper';
            if (id.includes('icons')) return 'vendor-ui-icons';
            
            // Data fetching
            if (id.includes('@tanstack')) return 'vendor-query';
            
            // Default vendor chunk for other small libs
            return 'vendor-others';
          }
        }
      }
    }
  }
})
