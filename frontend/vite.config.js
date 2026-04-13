import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
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
    }
  },
  build: {
    target: 'es2015', // Ensure compatibility with older browsers
    sourcemap: false, // Don't ship source maps to production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core + router — keep together (stable, rarely changes)
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // UI libraries — can update independently
            if (id.includes('swiper') || id.includes('datepicker') || id.includes('icons')) {
              return 'vendor-ui';
            }
            // Data fetching layer
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
          }
        }
      }
    }
  }
})
