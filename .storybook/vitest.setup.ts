// Vitest setup for the Storybook addon-vitest project.
//
// Since Storybook 10.3 the addon applies preview annotations (decorators,
// parameters) automatically. This file carries no story setup for that reason —
// only the guards below, which no story needs and the lane does. Add
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

// Guard for the lane's styling (issue #28). An unstyled lane is SILENT: every
// story that asserts nothing visual stays green, and one that does fails pointing
// at the component instead of at this setup. Two independent sources, two checks.

// 1. Design tokens. Storybook links `tokens/generated/*.css` from
//    `.storybook/preview-head.html`; that directory is git-ignored, so on a clean
//    checkout the links 404 and every `var(--…)` resolves empty. Both files are
//    checked by their loaded rules rather than by reading one token, so a renamed
//    token cannot masquerade as a missing file and a missing dark file cannot hide
//    behind a present light one. The read is synchronous because `<link>` tags in
//    the head block script execution; were that ever not so, this check fails loudly
//    rather than passing. `yarn tokens.build` produces the files.
for (const tokenFile of ['core.tokens.css', 'core.dark.tokens.css']) {
  // `*=` rather than `$=`: a cache-busting query on the href must not read as a
  // missing file.
  const link = document.querySelector(`link[rel='stylesheet'][href*='tokens/generated/${tokenFile}']`);
  const rules = link && link.sheet ? link.sheet.cssRules.length : 0;
  if (rules === 0) {
    throw new Error(
      `the \`storybook\` project has no design tokens — \`tokens/generated/${tokenFile}\` ` +
        'is missing or empty, so its `var(--…)` values resolve empty. Run `yarn tokens.build` (issue #28)',
    );
  }
}

// 2. Shadow-root stylesheets, the three things vitest.config.mts must get right for
//    a shadow tree to match the shipped build. Each is identified by content, never
//    by counting sheets, and the two must be different sheets, so one present sheet
//    cannot stand in for a missing one:
//    - the component's own sheet (carries `:host`) — absent without
//      `stencilVitestPlugin({ css: true })`;
//    - the global sheet (carries `*`, the `box-sizing` reset of
//      `src/assets/css/base/html.css`) — absent without `laneBuildCssParity`, or
//      without `dist/mud/mud.css`;
//    - no nested style rule left anywhere in the component sheet, including inside
//      `@media`/`@supports` — the build flattens nesting with postcss-nested, so a
//      nested rule means the lane skipped that pipeline.
//
//    `mud-icon` is the probe because its source is the one component stylesheet that
//    nests, so it is the only one that can fail the third check. Baseline:
//    `rg -n '^\s+[^\s@*/][^;{}]*\{' src/components/mud-icon/mud-icon.css` -> 5 openers,
//    four of them style rules nested in style rules. If that file ever stops nesting,
//    move the probe to one that does. It gets a `name` from the icon manifest because
//    the default one is not in it and would log `Icon not found` for every story file.
//
//    The loader is imported here directly because preview.js has not run yet when
//    this file does, and it is the same module preview.js reaches through the
//    redirect in vitest.config.mts. Stencil adopts the component sheet on first
//    render; the frame budget is a ceiling, not a delay — the loop exits on the first
//    hit, and a render slower than the ceiling fails loudly rather than passing.
await import('./vitest-component-loader.ts');

const PROBE_TAG = 'mud-icon';
if (!customElements.get(PROBE_TAG)) {
  throw new Error(
    `the \`storybook\` style guard's probe \`${PROBE_TAG}\` is not defined — the component loader did ` +
      'not register it. Point the probe in .storybook/vitest.setup.ts at a component that nests (issue #28)',
  );
}

const styleProbe = document.createElement(PROBE_TAG);
styleProbe.setAttribute('name', 'checkmark-large');
document.body.appendChild(styleProbe);
const rulesOf = sheet => Array.from(sheet.cssRules);
const hasNestedStyleRule = rules =>
  rules.some(rule => {
    const children = rule.cssRules ? Array.from(rule.cssRules) : [];
    // A style rule (it has a selector) with children is nesting; a grouping rule
    // such as `@media` is walked for nesting inside it.
    return (rule.selectorText !== undefined && children.length > 0) || hasNestedStyleRule(children);
  });
let componentSheet;
let globalSheet;
for (let frame = 0; frame < 300 && !componentSheet; frame += 1) {
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  const sheets = styleProbe.shadowRoot ? Array.from(styleProbe.shadowRoot.adoptedStyleSheets) : [];
  componentSheet = sheets.find(sheet => rulesOf(sheet).some(rule => rule.cssText.includes(':host')));
  globalSheet = sheets.find(
    sheet => sheet !== componentSheet && rulesOf(sheet).some(rule => rule.selectorText === '*'),
  );
}
const probeHadShadowRoot = Boolean(styleProbe.shadowRoot);
styleProbe.remove();

if (!probeHadShadowRoot) {
  throw new Error(
    `the \`storybook\` style guard's probe \`${PROBE_TAG}\` never attached a shadow root within 300 frames — ` +
      'it did not render, so no stylesheet could be checked (issue #28)',
  );
}
if (!componentSheet) {
  throw new Error(
    `the \`storybook\` project renders components unstyled — \`${PROBE_TAG}\` adopted no component ` +
      'stylesheet. `stencilVitestPlugin` in vitest.config.mts needs `{ css: true }` (issue #28)',
  );
}
if (!globalSheet) {
  throw new Error(
    'the `storybook` project renders shadow trees without the global styles the build adopts — ' +
      '`dist/mud/mud.css` is missing (run `yarn build`) or `laneBuildCssParity` in vitest.config.mts ' +
      'is missing or ineffective (issue #28)',
  );
}
if (hasNestedStyleRule(rulesOf(componentSheet))) {
  throw new Error(
    `the \`storybook\` project skipped the build's PostCSS pass — \`${PROBE_TAG}\` still carries nested ` +
      'rules the build flattens. `laneBuildCssParity` in vitest.config.mts (issue #28)',
  );
}
