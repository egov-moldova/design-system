#!/usr/bin/env node
// Generates angular-design-system/src/public-api.ts from the upstream
// @age/design-system build output. Run after stencil build, before
// ng-packagr. Regenerating prevents drift when new enums or event-detail
// types are added upstream — the wrapper's public surface stays in sync
// without manual edits.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const wrapperRoot = resolve(here, '..');
const upstreamRoot = resolve(wrapperRoot, '..');
const componentsJs = resolve(upstreamRoot, 'dist/components/index.js');
const upstreamIndex = resolve(upstreamRoot, 'src/index.ts');
const typesIndex = resolve(upstreamRoot, 'dist/types/index.d.ts');
const out = resolve(wrapperRoot, 'src/public-api.ts');

// --- value exports (enums + ICON_NAMES) — read from compiled JS ---------
// Format: export{a as Foo,b as Bar}from"./path"
function collectValueExports() {
  const src = readFileSync(componentsJs, 'utf8');
  const seen = new Set();
  for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*from\s*["'][^"']+["']/g)) {
    for (const piece of m[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)) {
      const name = piece.includes(' as ') ? piece.split(' as ')[1].trim() : piece;
      seen.add(name);
    }
  }
  return [...seen].sort();
}

// Things that are exported from upstream but should NOT be in the wrapper API:
// - Stencil runtime helpers (consumers should use provideDesignSystem instead)
// - The unaliased `NotificationState` (ambiguous between two components — the
//   aliased `CorBannerNotificationState` / `CorInlineNotificationState` shadow it)
const VALUE_BLOCKLIST = new Set([
  'getAssetPath',
  'setAssetPath',
  'setNonce',
  'setPlatformOptions',
  'render',
  'NotificationState',
  // CARBON_ICON_NAMES is deprecated alias for ICON_NAMES upstream — keep one
  'CARBON_ICON_NAMES',
]);

// --- type exports — read from upstream src/index.ts (the curated list) --
function collectTypeExports() {
  const src = readFileSync(upstreamIndex, 'utf8');
  const eventDetailNames = new Set();
  for (const m of src.matchAll(/export\s+type\s*\{\s*([\w\s,]+?)\s*\}\s*from\s*["'][^"']*\.types["']/g)) {
    for (const piece of m[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)) {
      eventDetailNames.add(piece);
    }
  }
  return { eventDetailNames: [...eventDetailNames].sort() };
}

// --- CustomEvent generic types — read from dist/types/index.d.ts --------
function collectCustomEventTypes() {
  const src = readFileSync(typesIndex, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/Cor\w+CustomEvent\b/g)) names.add(m[0]);
  return [...names].sort();
}

// ---------------------------------------------------------------------------
const valueExports = collectValueExports().filter(n => !VALUE_BLOCKLIST.has(n));
const enumNames = valueExports.filter(n => n !== 'ICON_NAMES');
const { eventDetailNames } = collectTypeExports();
const customEventTypes = collectCustomEventTypes();

const enumList = enumNames.map(n => `  ${n},`).join('\n');
const detailList = eventDetailNames.map(n => `  ${n},`).join('\n');
const customEventList = customEventTypes.map(n => `  ${n},`).join('\n');

const file = `/* eslint-disable */
/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: angular-design-system/scripts/generate-public-api.mjs
 *
 * Re-exports the upstream @age/design-system public surface that
 * Angular consumers need: component prop interfaces (Components, JSX),
 * runtime enums, icon name constants, and Stencil CustomEvent generics.
 *
 * The wrapper's main entry point (src/index.ts) re-exports from here so
 * everything is reachable as \`import { … } from '@age/angular-design-system'\`.
 */

// ---------------------------------------------------------------------------
// Component prop interfaces & JSX namespace
// ---------------------------------------------------------------------------

/** Stencil-generated namespace; \`Components.CorButton\` etc. for typing refs. */
export type { Components, JSX } from '@age/design-system';

// ---------------------------------------------------------------------------
// Icon name constant + literal-union type
// ---------------------------------------------------------------------------

export { ICON_NAMES } from '@age/design-system';
export type { IconName } from '@age/design-system';

// ---------------------------------------------------------------------------
// Component-specific runtime enums (auto-discovered from upstream build)
// ---------------------------------------------------------------------------

export {
${enumList}
} from '@age/design-system';

// ---------------------------------------------------------------------------
// Stencil CustomEvent<T> generic helpers — \`@Output\` payload typing
// ---------------------------------------------------------------------------

export type {
${customEventList}
} from '@age/design-system';

// ---------------------------------------------------------------------------
// Named event-detail interfaces (the \`detail\` payload inside CustomEvent<T>)
// ---------------------------------------------------------------------------

export type {
${detailList}
} from '@age/design-system';
`;

writeFileSync(out, file);
console.log(
  `[public-api] wrote ${out} ` +
    `(${enumNames.length} enums, ${customEventTypes.length} CustomEvent types, ${eventDetailNames.length} EventDetail types)`,
);
