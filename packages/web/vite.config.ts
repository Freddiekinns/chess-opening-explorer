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
        // Rolldown (vite 8) dropped the object form of `manualChunks`; the
        // same split is expressed as `codeSplitting.groups`, matched on module
        // id and evaluated in order, first match winning. (`advancedChunks`
        // takes the identical shape and is already deprecated in 8.2.2.)
        codeSplitting: {
          groups: [
            {
              // The `react/` prefix covers react/jsx-runtime as well, which has
              // to land here: left out, it is hoisted into whichever chunk
              // loads first, chaining every route to that chunk.
              name: 'vendor',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            },
            { name: 'router', test: /[\\/]node_modules[\\/]react-router/ },
            {
              // Interactive board stack — only the opening detail route imports
              // these (MiniBoard thumbnails use vendored SVGs, not this chunk).
              name: 'chess',
              test: /[\\/]node_modules[\\/](chess\.js|react-chessboard)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Three LandingPage tests have run between 5s and 9.5s since long before
    // this was raised; vitest 1 never enforced the 5s default against them and
    // vitest 4 does. The suite is the same speed under both (41.2s vs 41.9s
    // for that file), so this restores the behaviour rather than hiding a
    // regression. Making those tests fast is tracked separately.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});
