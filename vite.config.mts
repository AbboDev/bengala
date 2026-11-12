import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  server: {
    port: parseInt(process.env.STATIC_PORT || '3000', 10),
    host: true
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/client/tracker.ts'),
      name: '_bengala',
      fileName: (format) =>
        format === 'iife' ? 'script.js' : `bengala.${format}.js`,
      formats: ['es', 'umd', 'iife']
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  }
});
