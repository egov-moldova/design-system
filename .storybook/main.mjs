import fs from 'node:fs';
import path from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';

const devAddons = ['@storybook/addon-docs', '@storybook/addon-a11y'];

const prodAddons = [...devAddons, '@storybook/addon-links'];

export default {
  stories: ['./stories/**/*.mdx', '../src/components/**/*.stories.@(js|jsx|ts|tsx)'],
  // Map tokens/generated/ → /tokens/generated/ in production build output.
  // In dev mode, the custom middleware in viteFinal serves these files instead.
  // Map illustration SVGs to /assets/assets/ — in production Vite bundles the Stencil ESM into
  // /assets/[hash].js, so getAssetPath('./assets/illustrations/name.svg') resolves to
  // /assets/assets/illustrations/*. In dev, Vite serves dist/design-system/ from the filesystem
  // directly (fs.allow: ['..']), so staticDirs is not needed there and the correct URL is
  // /dist/design-system/assets/illustrations/* regardless of this mapping.
  staticDirs: [
    { from: '../tokens/generated', to: 'tokens/generated' },
    // Disabled during legacy migration — cor-illustration is in src/legacy/ and not shipped.
    // Re-enable (and update path) when a new illustration component is introduced.
    // { from: '../src/components/cor-illustration/assets', to: 'assets/assets' },
    { from: '../assets/font', to: 'assets/font' },
  ],
  addons: isDev ? devAddons : prodAddons,
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  typescript: {
    check: false,
    // reactDocgen: 'react-docgen-typescript',
    // reactDocgenTypescriptOptions: {
    //   shouldExtractLiteralValuesFromEnum: true,
    //   propFilter: prop => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    // },
    reactDocgen: false, // performance purposes
  },

  viteFinal: async config => {
    // // PRE-BUNDLE DEPENDENCIES - prevents runtime re-optimization
    // Disabled on Vite v7+ - optimizeDeps is now handled automatically
    // config.optimizeDeps = {
    //   ...config.optimizeDeps,
    //   exclude: [...(config.optimizeDeps?.exclude || []), '@stencil/core'],
    //   include: [
    //     ...(config.optimizeDeps?.include || []),
    //     '@storybook/web-components',
    //     '@storybook/web-components-vite',
    //     '@storybook/addon-a11y/preview',
    //     'lit-html',
    //     'lodash',
    //     'axe-core',
    //   ],
    // };

    config.server = {
      ...config.server,
      fs: {
        allow: ['..'],
      },
      watch: {
        // PERF: Disable polling — uses native FS events (faster, less CPU on Windows)
        usePolling: false,
        // PERF: Only dist/design-system matters for hot reload (handled by stencil-hot-reload
        // plugin via Node fs.watch). All other dist subdirs are ignored to prevent spurious
        // Vite watcher events on every Stencil incremental rebuild.
        ignored: [
          '**/node_modules/**',
          '**/.stencil/**',
          '**/.git/**',
          '**/storybook-static/**',
          '**/www/**',
          '**/loader/**',
          '**/dist/esm/**',
          '**/dist/cjs/**',
          '**/dist/collection/**',
          '**/dist/types/**',
          '**/dist/components/**',
          '**/tokens/generated/**',
        ],
      },
    };

    // Pre-transform preview entry for faster initial load
    config.server.warmup = {
      clientFiles: ['./.storybook/preview.js'],
    };

    // PERF: Skip CSS source maps in dev for speed
    config.css = {
      ...config.css,
      devSourcemap: false,
    };

    // PERF: Skip syntax lowering in dev — modern browsers don't need it
    config.esbuild = {
      ...config.esbuild,
      target: 'esnext',
      legalComments: 'none',
    };

    // Vite 7 changed default build.target from 'modules' to 'baseline-widely-available'
    // Preserve the previous dev behavior with explicit esnext target
    config.build = {
      ...config.build,
      target: 'esnext',
    };

    // Storybook v9: @storybook/blocks is a subpath export of @storybook/addon-docs.
    // Vite cannot resolve the bare specifier without this alias.
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias || {}),
        '@storybook/blocks': '@storybook/addon-docs/blocks',
      },
    };

    // Reload Storybook when Stencil rebuilds dist/ or Style Dictionary rebuilds tokens/.
    // Both dirs are gitignored so Vite's chokidar won't see changes — we use Node
    // fs.watch and send a full-reload via Vite's WebSocket.
    config.plugins = config.plugins || [];
    config.plugins.push({
      name: 'stencil-hot-reload',
      configureServer(server) {
        const projectRoot = path.resolve(__dirname, '..');

        // Serve token CSS as raw files (tokens/generated/ is gitignored,
        // so Vite won't serve it natively). Loaded via <link> in preview-head.html.
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (url.startsWith('/tokens/generated/') && url.endsWith('.css')) {
            const filePath = path.resolve(projectRoot, url.split('?')[0].slice(1));
            if (!filePath.startsWith(projectRoot + path.sep)) return next();
            try {
              res.setHeader('Content-Type', 'text/css');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.end(fs.readFileSync(filePath, 'utf8'));
            } catch {
              next();
            }
            return;
          }
          next();
        });

        // Watch both gitignored dirs with separate debounce per dir.
        // Token-only changes skip module invalidation (tokens are <link> tags).
        // Component changes invalidate only dist/design-system modules.
        const timers = {};
        const watchers = [];

        function onTokenChange(filename) {
          clearTimeout(timers.tokens);
          timers.tokens = setTimeout(() => {
            console.log(`[stencil-hot-reload] tokens/generated/${filename || '?'} changed, reloading CSS...`);
            // Token CSS is loaded via <link> tags — no module invalidation needed.
            // Just trigger full-reload so the browser re-fetches the <link> hrefs.
            server.ws.send({ type: 'full-reload' });
          }, 200);
        }

        function onComponentChange(filename) {
          clearTimeout(timers.component);
          timers.component = setTimeout(() => {
            // Only invalidate dist/design-system modules — keep Storybook core cached
            let invalidated = 0;
            for (const [id, mod] of server.moduleGraph.idToModuleMap) {
              if (id.includes('/dist/design-system/') || id.includes('\\dist\\design-system\\')) {
                server.moduleGraph.invalidateModule(mod);
                invalidated++;
              }
            }
            console.log(
              `[stencil-hot-reload] dist/design-system/${filename || '?'} changed, ${invalidated} modules invalidated, reloading...`,
            );
            server.ws.send({ type: 'full-reload' });
          }, 300);
        }

        const watchMap = {
          'tokens/generated': onTokenChange,
          'dist/design-system': onComponentChange,
        };

        for (const [dir, handler] of Object.entries(watchMap)) {
          try {
            const w = fs.watch(path.resolve(projectRoot, dir), { recursive: true }, (_event, filename) => {
              handler(filename);
            });
            watchers.push(w);
          } catch (e) {
            console.warn(`[stencil-hot-reload] Could not watch ${dir}:`, e.message);
          }
        }

        server.httpServer?.on('close', () => watchers.forEach(w => w.close()));
      },
    });

    return config;
  },
};
