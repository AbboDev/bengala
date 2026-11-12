import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function htmlDemoPlugin(): Plugin {
  return {
    name: 'html-demo-plugin',
    closeBundle() {
      const distDir = resolve(import.meta.dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        return;
      }

      for (const file of ['index.html', 'test.html']) {
        const srcPath = resolve(import.meta.dirname, file);
        if (fs.existsSync(srcPath)) {
          let html = fs.readFileSync(srcPath, 'utf-8');
          html = html.replace(
            /<script\s+type="module"\s+src="\/src\/tracker\.ts"><\/script>/,
            '<script type="text/javascript" src="/script.js"></script>'
          );
          fs.writeFileSync(resolve(distDir, file), html);
        }
      }
    }
  };
}

export default defineConfig({
  server: {
    port: parseInt(process.env.STATIC_PORT || '3000', 10),
    host: true
  },
  plugins: [htmlDemoPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/tracker.ts'),
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
