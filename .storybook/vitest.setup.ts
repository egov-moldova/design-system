// Vitest setup for the Storybook addon-vitest project.
//
// Since Storybook 10.3 the addon applies preview annotations (decorators,
// parameters) automatically. This file carries no story setup for that reason —
// only the resolution guard below, which no story needs and the lane does. Add
// story hooks here only when one genuinely needs cross-test setup (timers,
// network mocks, etc.).

// Guard for the `react` alias in `vitest.config.mts` (issue #23). A directory at
// the Vite root whose name matches an npm package shadows that package for a bare
// specifier, and `react/` — the MUD React adapter workspace — is exactly that.
// Without the alias this project loads the adapter as `react`, which is SILENT
// while the adapter's git-ignored generated sources happen to resolve, and fatal
// on a clean checkout where they do not. Asserting the outcome here is the point:
// this is the only place the resolution is exercised, and a check on the config's
// text would grade the spelling of the fix rather than its effect.
//
// Both entries, because the alias maps `react` to a DIRECTORY and object-form
// aliases rewrite a matching prefix: `react` proves the alias fired, and
// `react/jsx-runtime` proves it did not break subpath resolution on the way.
//
// NO TypeScript-only syntax in this file — not a style preference, a measured
// constraint. `@storybook/addon-vitest` re-exports this module through
// `dist/vitest-plugin/setup-file-with-project-annotations.js`, and on that path it
// is parsed as JavaScript: a type assertion here produced
// `SyntaxError: Unexpected token ':'` and took out 9 of the 47 story files while
// the other 38 passed, which is a failure shape that does not look like a syntax
// error at all. Named imports and plain `typeof` checks only.
import * as React from 'react';
import { jsx } from 'react/jsx-runtime';

if (typeof React.createElement !== 'function') {
  throw new Error(
    'the `storybook` project resolved `react` to something that is not React — ' +
      'the `resolve.alias` in vitest.config.mts is missing or ineffective (issue #23)',
  );
}

if (typeof jsx !== 'function') {
  throw new Error(
    'the `storybook` project resolved `react/jsx-runtime` to something that is not the ' +
      'JSX runtime — the `resolve.alias` in vitest.config.mts broke subpath resolution (issue #23)',
  );
}
