import { Config } from '@stencil/core';
import { OutputTarget } from '@stencil/core/internal';
import { postcss } from '@stencil/postcss';
import { reactOutputTarget as react } from '@stencil/react-output-target';
import * as postcssNested from 'postcss-nested';
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
            src: 'assets/fonts/*.ttf',
            dest: 'assets/fonts',
            warn: false,
          },
        ],
  },
];

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
      // `./components/*` key in package.json rather than the build directory.
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
  // Testing is now handled by Vitest via @stencil/vitest.
  // See vitest.config.ts + vitest-setup.ts.
  extras: {
    // Enable import injection for Vite/Storybook static build compatibility
    enableImportInjection: true,
  },
  plugins: [
    postcss({
      plugins: [(postcssNested.default ?? postcssNested)()],
    }),
  ],
};
