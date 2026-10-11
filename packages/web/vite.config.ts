import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      // Without `include`, v8 reports only files some test imports, so a file
      // with no test at all is invisible and the total flatters (#166).
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/test/**', 'src/**/*.d.ts'],
      // A ratchet, not a target: set a little under the measured figures
      // (2026-10-11: lines 82, statements 81, functions 81, branches 74).
      // Raise them as coverage rises; never lower them to get green.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 72,
      },
    },
  },
});
