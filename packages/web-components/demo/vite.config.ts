import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { globSync } from 'node:fs';

const GENERATED_TOKENS = resolve(__dirname, '../../../tokens/generated');

// Multi-page build: the table of contents (index.html) + one page per component under
// pages/<category>/<tag>.html. Dev server serves any .html by path already;
// this only matters for `vite build`.
const htmlInputs = Object.fromEntries(
  ['index.html', ...globSync('pages/**/*.html', { cwd: __dirname })].map(rel => {
    const norm = rel.replace(/\\/g, '/');
    return [norm.replace(/\.html$/, ''), resolve(__dirname, norm)];
  }),
);

export default defineConfig(({ command }) => ({
  root: __dirname,
  // Emit relative asset URLs (./assets/...) so the built bundle works whether
  // it is served from the domain root, a subpath, or opened directly via
  // file:// (which is what the user does when sanity-checking the output).
  base: './',
  // Stencil's watch build does not copy tokens into dist/ (stencil.config.ts, `copy: isWatchMode ? []`),
  // so `yarn dev:all` (no `build` dependency) reads them from where Style Dictionary writes them.
  // Serve only: `vite build` still resolves the package export to dist/mud/tokens/.
  resolve: {
    alias:
      command === 'serve'
        ? [{ find: /^@egov-moldova\/mud\/tokens\/(.*\.css)$/, replacement: `${GENERATED_TOKENS}/$1` }]
        : [],
  },
  server: {
    port: 5174,
    // scripts/check-dev-all.mjs sets this so a headless run never opens a browser window.
    open: process.env.MUD_DEMO_NO_OPEN ? false : '/index.html',
    fs: {
      allow: [resolve(__dirname, '..'), resolve(__dirname, '../../..')],
    },
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      input: htmlInputs,
    },
  },
}));
