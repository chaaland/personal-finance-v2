import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  // Base path for GitHub Pages deployment
  base: '/personal-finance-v2/',

  plugins: [svelte()],

  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
    conditions: ['browser', 'development', 'module'],
  },

  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },

  build: {
    target: 'esnext',
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'plotly': ['plotly.js-dist-min'],
          'xlsx': ['xlsx'],
          'duckdb': ['@duckdb/duckdb-wasm'],
        },
      },
    },
  },

  // Required for DuckDB-WASM to work properly (dev server only)
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Preview server also needs these headers
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
