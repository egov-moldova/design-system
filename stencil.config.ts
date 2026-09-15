import { Config } from '@stencil/core';
import { OutputTarget } from '@stencil/core/internal';
import { postcss } from '@stencil/postcss';
import { reactOutputTarget as react } from '@stencil/react-output-target';

import { stencilPostcssPlugins } from './stencil-postcss.config.mjs';
// import postcssPresetEnv from 'postcss-preset-env';

const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch');
const isDevMode = args.includes('--dev');
const isReactBuild = args.includes('--react');
// PERF: Source maps only for non-watch dev builds (dx:stencil:once).
// Watch mode skips them for faster incremental rebuilds.
const shouldGenerateSourceMaps = isDevMode && !isWatchMode;

const outputTargets: OutputTarget[] = [
  {
    type: 'dist',
    esmLoaderPath: '../loader',
    // PERF: In watch mode, Style Dictionary writes directly to tokens/generated/
    // and Storybook reads from there — no copy needed. Skip in watch to avoid a second
    // dist write that triggers an extra stencil-hot-reload cycle in Storybook.
    copy: isWatchMode
      ? []
      : [
          {
            src: '../tokens/generated/*.css',
            dest: 'tokens',
            warn: false,
          },
          {
            src: 'assets/fonts/*.woff2',
            dest: 'assets/fonts',
            warn: false,
          },
        ],
  },
];

// Storybook builds every API table from this manifest (`.storybook/preview.js`).
// It is written by Stencil from the same decorators and `@part` tags as `readme.md`,
// replacing `web-component-analyzer`, which read JSDoc tags only (issue #18).
outputTargets.push({
  type: 'docs-custom-elements-manifest',
  file: '.storybook/custom-elements.json',
});

// PERF: The base build only needs 'dist' (lazy). www output is unused —
// skip it entirely. docs-readme only on --docs.
const hasDocs = args.includes('--docs');
if (hasDocs) {
  outputTargets.push({ type: 'docs-readme' });
}

// The standalone custom-elements bundle is part of the published contract —
// `package.json` declares `exports["./components"]` unconditionally and
// `react/src/index.ts` imports `setAssetPath` from it. It is therefore built
// for every non-dev build, not only under `--react`: what the package contains
// must not depend on which flag CI happened to pass.
//
// `!isDevMode` rather than unconditional, because `yarn dev` / `yarn start`
// rebuild in watch mode many times an hour and a second full component bundle
// per rebuild buys nothing there.
//
// Note: Stencil's `dist-custom-elements` target ignores the `copy` option for
// `assetsDirs` declared on components (Stencil v4 bug/limitation — copy on
// this target type silently no-ops). `scripts/copy-component-assets.mjs`
// mirrors `dist/mud/assets/` into `dist/components/assets/` afterwards, so
// consumers of the standalone bundle can resolve `getAssetPath('./assets/x')`.
// It runs from `wireit.build.command` and from `build.react`.
if (isReactBuild || !isDevMode) {
  outputTargets.push({ type: 'dist-custom-elements', externalRuntime: false });
}

// React proxies stay opt-in: they are generated into the React workspace, not
// into the published package, so `yarn build.react` still owns them.
if (isReactBuild) {
  outputTargets.push(
    react({
      outDir: 'react/src/components/stencil-generated',
      esModules: true,
      stencilPackageName: '@egov-moldova/mud',
      // The physical output stays `dist/components/`; this names the segment the
      // generated wrappers put in their import specifiers, which must match the
      // `./components/mud-*.js` key in package.json rather than the build
      // directory. `scripts/__tests__/validate-package.spec.mjs` asserts the two
      // agree — nothing else does, and the only other detector is `tsc --noEmit`
      // in a workspace whose build script is `tsc || true`.
      //
      // Setting it also takes the early-return branch of react-output-target's
      // own `validate()`, which otherwise asserts that a `dist-custom-elements`
      // target exists AND that its `externalRuntime` is false. Removing
      // `externalRuntime: false` above would therefore no longer fail the build;
      // the wrappers would generate against an external runtime and break at
      // runtime instead. Keep the two together.
      customElementsDir: 'components',
      excludeComponents: [],
    }),
  );
}

export const config: Config = {
  namespace: 'mud',
  srcDir: 'src',
  // Stencil compiles only `src`. The root-level `*.ts` files that
  // `tsconfig.json` includes for `yarn typecheck` (stencil.config.ts,
  // playwright.config.ts, vitest-setup.ts) must stay out of the emitted
  // program: they were being written to `dist/*.js`, and their declarations
  // landed under an absolute build-machine path in `dist/types/`.
  tsconfig: 'tsconfig.stencil.json',
  globalStyle: 'src/assets/css/index.css',
  sourceMap: shouldGenerateSourceMaps,
  // PERF: Always enable cache — allows incremental rebuilds in watch mode.
  enableCache: true,
  // PERF: Stable filenames in watch mode — no content-hash churn means Vite
  // module graph stays valid between rebuilds (fewer modules need invalidating).
  hashFileNames: !isWatchMode,
  outputTargets,
  // Docs output targets only run when this is true, and Stencil defaults it to false
  // under `--dev`. Forced on so the watch build behind `yarn dev` keeps the Storybook
  // manifest current. `docs-readme` is still added only under `--docs`, so dev builds
  // write no readme files. Measured on a one-shot `stencil build --dev` (3 runs each):
  // 7.27 s without the manifest target, 7.19 s with it; watch rebuilds were not timed.
  buildDocs: true,
  // Testing is now handled by Vitest via @stencil/vitest.
  // See vitest.config.ts + vitest-setup.ts.
  extras: {
    // Enable import injection for Vite/Storybook static build compatibility
    enableImportInjection: true,
  },
  plugins: [
    postcss({
      plugins: stencilPostcssPlugins(),
    }),
  ],
};
