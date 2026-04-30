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
        manualChunks: (id) => {
          if (id.includes('plotly.js-dist-min')) return 'plotly';
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('@duckdb/duckdb-wasm')) return 'duckdb';
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
