import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  server: {
    port: 5174,
    open: '/index.html',
    fs: {
      allow: [resolve(__dirname, '..'), resolve(__dirname, '../..')],
    },
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
  },
});
