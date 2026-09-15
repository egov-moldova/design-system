import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineVitestConfig } from '@stencil/vitest/config';
import { stencilVitestPlugin } from '@stencil/vitest/plugin';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import postcss from 'postcss';
import type { Plugin } from 'vite';

import { stencilPostcssPlugins } from './stencil-postcss.config.mjs';

// Stencil + Vitest configuration.
//
// Two test projects:
//   1. `spec`      — node-side rendering via Stencil's mock-doc DOM (replaces
//                    the retired Jest + `newSpecPage` stack). Setup file loads
//                    the compiled lazy bundle and applies the ElementInternals
//                    mock. Legacy components in src/legacy/ are excluded.
//
//   2. `storybook` — browser-mode tests powered by `@storybook/addon-vitest`.
//                    Each story is executed as a Vitest test inside a real
//                    Chromium (Playwright) instance, with the Storybook config
//                    in `.storybook/` providing the framework + addons.
//                    Run via `yarn test.storybook` or from the Storybook UI
//                    Test panel.
//
// References:
//   https://stenciljs.com/docs/testing-vitest
//   https://storybook.js.org/docs/writing-tests/integrations/vitest-addon

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The prefix `stencilVitestPlugin` gives each component stylesheet module
// (`node_modules/@stencil/vitest/dist/plugin.js`, its `resolveId`).
const STENCIL_STYLE_PREFIX = '\0stencil-style:';
const APP_GLOBALS = '@stencil/core/internal/app-globals';
const RESOLVED_APP_GLOBALS = '\0mud-lane:app-globals';

// Makes the `storybook` project style components the way the Stencil build does
// (issue #28). `stencilVitestPlugin({ css: true })` attaches each component's own
// CSS, but it differs from what ships in two ways, both of which a `play`
// function asserting layout or computed style would otherwise measure wrongly:
//
// 1. Global styles. The shipped runtime adopts `globalStyles` — the compiled
//    `globalStyle` of stencil.config.ts (`* { box-sizing: border-box }`, scrollbar
//    and overlay utilities) — into EVERY shadow root, right after `attachShadow`.
//    From source, `@stencil/core/internal/app-globals` exports `globalStyles = ""`,
//    so the lane rendered shadow trees in `content-box`. `dist/mud/mud.css` is that
//    compiled global style, and `.storybook/preview.js` already requires it to exist.
//    Baseline: `node -e "const f=require('fs'),c=f.readFileSync('dist/mud/mud.css','utf8');console.log(f.readdirSync('dist/mud').some(n=>n.endsWith('.js')&&f.readFileSync('dist/mud/'+n,'utf8').includes(JSON.stringify(c).slice(1,-1))))"`
//    -> true: the file's content is the string literal the runtime adopts. Being
//    build output, it reflects `src/assets/css/**` as of the last `yarn build`.
//
// 2. PostCSS. The build compiles component CSS with `stencilPostcssPlugins`; the
//    plugin hands raw source to Chromium. Native nesting agrees with postcss-nested
//    for every stylesheet today, but not for forms such as `&(…)` or `&-suffix`,
//    so the lane runs the same list rather than depending on no one writing them.
//
// Both files are registered as watch dependencies: the style modules are virtual
// ids, so without `addWatchFile` an edited `.css` never reruns
// `yarn test.storybook.watch` and later runs keep the stale stylesheet.
//
// Must be listed BEFORE `stencilVitestPlugin`: both are `enforce: 'pre'`, and this
// transform has to see the raw CSS before that plugin compiles it into a module.
// `.storybook/vitest.setup.ts` fails the lane if any part of this stops working.
function laneBuildCssParity(): Plugin {
  const globalStylePath = path.join(__dirname, 'dist/mud/mud.css');
  const processor = postcss(stencilPostcssPlugins());

  return {
    name: 'mud:lane-build-css-parity',
    enforce: 'pre',
    // The dependency optimizer pre-bundles the Stencil runtime and inlines
    // `app-globals` into that bundle, where `resolveId` below never sees the import.
    // Vite matches `exclude` by package name, so this covers every
    // `@stencil/core/internal/*` entry the runtime is reached through.
    config() {
      return { optimizeDeps: { exclude: ['@stencil/core'] } };
    },
    resolveId(source) {
      return source === APP_GLOBALS ? RESOLVED_APP_GLOBALS : null;
    },
    load(id) {
      if (id !== RESOLVED_APP_GLOBALS) return null;
      this.addWatchFile(globalStylePath);
      // An empty string rather than a throw when the build output is missing, so the
      // run stops at the setup guard's "run `yarn build`" message instead of a raw
      // ENOENT from inside the Stencil runtime's module graph.
      const css = existsSync(globalStylePath) ? readFileSync(globalStylePath, 'utf8') : '';
      return `export const globalScripts = () => {};\nexport const globalStyles = ${JSON.stringify(css)};\n`;
    },
    async transform(code, id) {
      if (!id.startsWith(STENCIL_STYLE_PREFIX)) return null;
      const cssPath = `${id.slice(STENCIL_STYLE_PREFIX.length).split('?')[0]}.css`;
      this.addWatchFile(cssPath);
      const result = await processor.process(code, { from: cssPath });
      // Loud on purpose: `@stencil/postcss` replaces a stylesheet that raised a
      // warning with a comment, which here would render one component unstyled
      // while every story stays green.
      const warnings = result.warnings();
      if (warnings.length > 0) {
        this.error(`PostCSS on ${cssPath}: ${warnings.map(warning => warning.toString()).join('; ')}`);
      }
      return { code: result.css, map: null };
    },
  };
}

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  // Vite 8 transforms JSX via Oxc; setting `oxc.jsx` explicitly tells
  // `@stencil/vitest/config` that Oxc is configured, so it stops emitting
  // the legacy `esbuild.jsxFactory` fallback. Without this, Vite logs:
  //   "Both esbuild and oxc options were set. oxc options will be used..."
  // on every test run.
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'Fragment',
    },
  },
  test: {
    // Coverage excludes — legacy components are in active redesign (see memory
    // legacy-components-migration) and must not pollute the headline number.
    // Spec/story/type/asset files are not production code; they're not part of
    // the unit-under-test surface.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/legacy/**',
        'src/utils/**',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.e2e.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/test/**',
        'src/**/*.types.ts',
        'src/**/*.enums.ts',
        'src/**/*.constants.ts',
        'src/assets/**',
        'dist/**',
        'node_modules/**',
      ],
    },
    projects: [
      {
        // `stencilVitestPlugin` compiles each `.tsx` component on-the-fly via
        // Vite's transform pipeline (instead of loading the pre-built lazy
        // bundle). Two consequences:
        //   1. Components must be imported from source in the spec
        //      (e.g. `import '../mud-spinner';`) — that triggers the compile
        //      and the appended `customElements.define()` call.
        //   2. Coverage v8 sees the source TSX directly and produces real
        //      per-file numbers (the dist-loader path reports 0%).
        // See: https://github.com/stenciljs/vitest#stencil-vitest-plugin
        plugins: [stencilVitestPlugin()],
        test: {
          name: 'spec',
          include: ['src/**/*.spec.{ts,tsx}'],
          exclude: ['src/legacy/**', 'node_modules/**', 'dist/**'],
          environment: 'stencil',
          setupFiles: ['./vitest-setup.ts'],
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        resolve: {
          // `react/` is a workspace directory at the Vite root, and a root-level
          // directory whose name matches an npm package shadows that package for a
          // bare specifier. Measured: this project resolved `react` to
          // `<root>/react/src/index.ts` — the MUD React adapter — while
          // `react/jsx-runtime`, a subpath with no file under `<root>/react/`,
          // resolved correctly into `node_modules`. That pulled the adapter's
          // git-ignored generated sources into the dep graph, where a clean
          // checkout has none, and `yarn test.storybook` died in pre-bundling
          // before running a test (#23). Storybook's own Vite (`sp.dev`,
          // `sp.build`) never had this — it resolves `react` to `node_modules`.
          //
          // The value is the package DIRECTORY, not its entry file: object-form
          // aliases replace a matching prefix, so an entry-file value would
          // rewrite `react/jsx-runtime` to `.../index.js/jsx-runtime`.
          //
          // `.storybook/vitest.setup.ts` asserts the outcome, so deleting this
          // fails the lane in the next local `yarn test.storybook`. It does NOT
          // fail CI: no workflow runs that lane yet (issue #20 owns wiring it).
          //
          // Scoped to this project rather than the root: `spec` resolves `react`
          // correctly today and does not need the entry. The cost of that choice
          // is that a future project touching React re-acquires #23 silently —
          // accepted, because the durable fix is the directory rename recorded in
          // the plan's § Deferred, not a wider alias.
          //
          // Same spelling as `getAbsolutePath` in `.storybook/main.mjs` — one
          // idiom for "the directory of an installed package", measured to work
          // through Vite's config loading.
          alias: {
            react: path.dirname(fileURLToPath(import.meta.resolve('react/package.json'))),
          },
        },
        plugins: [
          // Rewrite preview.js's lazy bundle import to the source loader so
          // coverage tooling sees the real component files. A `pre` resolver and
          // not a `resolve.alias` because this matches the END of a specifier:
          // object-form aliases match a prefix, which a path suffix cannot express.
          // (Bare-package aliases do work here — see the `react` entry above.)
          // The dist bundle is still used by regular Storybook dev / prod.
          {
            name: 'age:redirect-dist-bundle-to-source-loader',
            enforce: 'pre',
            resolveId(source) {
              if (source.endsWith('/dist/mud/mud.esm.js') || source.endsWith('\\dist\\mud\\mud.esm.js')) {
                return path.join(__dirname, '.storybook/vitest-component-loader.ts');
              }
              return null;
            },
          },
          // `stencilVitestPlugin` compiles each `.tsx` on-the-fly in Vite's
          // transform pipeline (the same trick we use for `spec`). Coverage
          // v8 / istanbul then see the real source files in the module graph.
          //
          // `css: true` is what gives the rendered components their stylesheet:
          // without it the plugin transpiles with `style: null` and every shadow
          // root adopts nothing, so the lane runs green while unable to see any
          // computed style, hit-test or layout (issue #28). `spec` omits it on
          // purpose — mock-doc computes no styles. `.storybook/vitest.setup.ts`
          // fails the lane if this is dropped.
          //
          // `css: true` alone renders a stylesheet the shipped build does not; the
          // parity plugin just above closes the two gaps.
          laneBuildCssParity(),
          stencilVitestPlugin({ css: true }),
          storybookTest({
            configDir: path.join(__dirname, '.storybook'),
            // Storybook dev server URL — must match `yarn sp.dev` port (6007).
            storybookUrl: 'http://localhost:6007',
            // Auto-start Storybook in watch mode if it's not already running.
            storybookScript: 'yarn sp.dev',
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            // Force IPv4 + pin port outside Windows Hyper-V reserved ranges.
            // Vitest's default port 63315 falls inside the 63233-63432 range
            // that Windows reserves for Hyper-V when WSL2/Docker Desktop are
            // installed, producing `EACCES` at server bind. Inspect with:
            //   netsh interface ipv4 show excludedportrange protocol=tcp
            api: { host: '127.0.0.1', port: 6065 },
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
