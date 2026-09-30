// Standalone flat config enabling only `mud/no-hardcoded-copy`, at `error`, over
// `src/components/**/*.tsx` — never specs or stories. Kept out of `eslint.config.mjs` until
// Phase 6 (`yarn lint --max-warnings 0` + the pre-commit hook would otherwise block every
// phase's commit before every component is migrated). Run directly:
//   npx eslint -c scripts/eslint/copy.config.mjs src/components
import stencil from '@stencil/eslint-plugin';
import tseslint from 'typescript-eslint';

import noHardcodedCopy from './no-hardcoded-copy.mjs';

export default tseslint.config({
  files: ['src/components/**/*.tsx'],
  ignores: ['src/components/**/*.spec.tsx', 'src/components/**/*.stories.tsx'],
  // The components' own `eslint-disable` comments name `@stencil/*` and `@typescript-eslint/*`
  // rules: registering both plugins (no rule enabled) keeps those comments resolvable, and
  // they are not reported as unused here since this pass enables none of their rules.
  // No file under src/ may disable THIS rule inline — its spec greps for that.
  linterOptions: { reportUnusedDisableDirectives: 'off' },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      ecmaVersion: 2020,
      sourceType: 'module',
      projectService: false,
    },
  },
  plugins: {
    'mud': { rules: { 'no-hardcoded-copy': noHardcodedCopy } },
    '@stencil': stencil,
    '@typescript-eslint': tseslint.plugin,
  },
  rules: {
    'mud/no-hardcoded-copy': 'error',
  },
});
