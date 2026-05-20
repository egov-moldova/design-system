import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { createReadStream, existsSync, statSync } from 'node:fs';

const DESIGN_SYSTEM_DIST = resolve(__dirname, '../../dist/design-system');

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
 * resolves SVGs to `/node_modules/@age/design-system/dist/design-system/assets/...`.
 *
 * This middleware intercepts those URLs and streams the file directly from
 * `<repo>/dist/design-system/`. It is dev-only; production builds serve the
 * assets statically once they are deployed alongside the bundle.
 */
function serveDesignSystemAssets(): Plugin {
  const urlPrefix = '/node_modules/@age/design-system/dist/design-system/';

  return {
    name: 'serve-age-design-system-assets',
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

export default defineConfig({
  root: __dirname,
  plugins: [serveDesignSystemAssets()],
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
  // Stencil's lazy bundle uses `import.meta.url` to resolve asset paths.
  // Pre-bundling would rewrite the URL into Vite's optimized-deps cache, which
  // doesn't contain the assets/ folder — leaving cor-icon SVGs at 404.
  optimizeDeps: {
    exclude: ['@age/design-system/dist/design-system/design-system.esm.js'],
  },
});
