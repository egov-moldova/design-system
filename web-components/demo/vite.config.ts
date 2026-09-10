import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { createReadStream, existsSync, statSync, globSync } from 'node:fs';
import { cp } from 'node:fs/promises';

const DESIGN_SYSTEM_DIST = resolve(__dirname, '../../dist/mud');

// Multi-page build: the table of contents (index.html) + one page per component under
// pages/<category>/<tag>.html. Dev server serves any .html by path already;
// this only matters for `vite build`.
const htmlInputs = Object.fromEntries(
  ['index.html', ...globSync('pages/**/*.html', { cwd: __dirname })].map(rel => {
    const norm = rel.replace(/\\/g, '/');
    return [norm.replace(/\.html$/, ''), resolve(__dirname, norm)];
  }),
);

const MIME_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Vite, by default, falls back to `index.html` for unknown URLs under
 * `/node_modules/...`. That breaks Stencil's lazy `getAssetPath()`, which
 * resolves SVGs to `/node_modules/@egov-moldova/mud/dist/mud/assets/...`.
 *
 * This middleware intercepts those URLs and streams the file directly from
 * `<repo>/dist/mud/`. It is dev-only; production builds serve the
 * assets statically once they are deployed alongside the bundle.
 */
function serveDesignSystemAssets(): Plugin {
  const urlPrefix = '/node_modules/@egov-moldova/mud/dist/mud/';

  return {
    name: 'serve-mud-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith(urlPrefix)) return next();

        const relative = url.slice(urlPrefix.length).split('?')[0];
        const filePath = resolve(DESIGN_SYSTEM_DIST, relative);

        // Path-traversal guard.
        if (!filePath.startsWith(DESIGN_SYSTEM_DIST)) return next();
        if (!existsSync(filePath) || !statSync(filePath).isFile()) return next();

        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
        res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

/**
 * Production-only counterpart of `serveDesignSystemAssets`. Stencil's lazy
 * loader resolves `getAssetPath('./assets/<size>/<name>.svg')` against
 * `import.meta.url` of the bundle that contains it. After `vite build`, that
 * bundle lives in `dist-demo/assets/`, so Stencil looks for the icon/logo SVGs
 * at `dist-demo/assets/assets/...`. The dev middleware short-circuits this by
 * intercepting `/node_modules/@egov-moldova/mud/dist/mud/...` requests, but in a
 * deployed build nothing serves those bytes — copy them next to the bundle so
 * `<mud-icon>`, `<mud-logo>`, etc. work from any host (including file://).
 */
function copyDesignSystemAssetsToBuild(): Plugin {
  const srcAssets = resolve(DESIGN_SYSTEM_DIST, 'assets');
  return {
    name: 'copy-age-design-system-assets',
    apply: 'build',
    async closeBundle() {
      if (!existsSync(srcAssets)) {
        this.warn(
          `[demo] design-system assets not found at ${srcAssets} — run \`yarn build\` first so mud-icon/mud-logo can resolve their SVGs.`,
        );
        return;
      }
      const destAssets = resolve(__dirname, 'dist-demo', 'assets', 'assets');
      await cp(srcAssets, destAssets, { recursive: true });
    },
  };
}

export default defineConfig({
  root: __dirname,
  // Emit relative asset URLs (./assets/...) so the built bundle works whether
  // it is served from the domain root, a subpath, or opened directly via
  // file:// (which is what the user does when sanity-checking the output).
  base: './',
  plugins: [serveDesignSystemAssets(), copyDesignSystemAssetsToBuild()],
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
    rollupOptions: {
      input: htmlInputs,
    },
  },
  // Stencil's lazy bundle uses `import.meta.url` to resolve asset paths.
  // Pre-bundling would rewrite the URL into Vite's optimized-deps cache, which
  // doesn't contain the assets/ folder — leaving mud-icon SVGs at 404.
  optimizeDeps: {
    exclude: ['@egov-moldova/mud/mud.esm.js'],
  },
});
