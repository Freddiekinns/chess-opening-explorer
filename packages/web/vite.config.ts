import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // jsx-runtime listed explicitly — without it Rollup hoists it into
          // whichever chunk loads first, chaining every route to that chunk.
          vendor: ['react', 'react-dom', 'react/jsx-runtime'],
          router: ['react-router-dom'],
          // Interactive board stack — only the opening detail route imports
          // these (MiniBoard thumbnails use vendored SVGs, not this chunk).
          chess: ['chess.js', 'react-chessboard'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});
