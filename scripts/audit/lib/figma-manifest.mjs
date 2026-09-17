/**
 * Figma state manifest — the evidence contract between a `mud-*` component and
 * its Figma design, shared by `11-pixel-diff-states`, `15-style-parity` and
 * `figma-refs`.
 *
 * Location: `src/components/<name>/test/<name>.figma.json`
 *
 * Every state names the Figma node it is checked against, how to render the
 * same state in Storybook, and — optionally — the exact values the node
 * specifies. A value in `expect` must be copied from Figma (node data or Dev
 * Mode), never inferred from a screenshot: the `node` on each entry is the
 * citation. `absent` entries are negative evidence — the node has no such
 * element, so rendering one is drift. See `.claude/skills/pixel-perfect/SKILL.md`.
 *
 * Shape:
 *   {
 *     "component": "mud-date-picker",
 *     "figma": { "fileKey": "doJ7tDY0PlQ0PqMgbpFVIC", "scale": 2 },
 *     "defaults": {
 *       "story": "molecules-date-picker--default",
 *       "clock": "2025-01-07T10:00:00Z",
 *       "viewport": { "width": 1280, "height": 900 },
 *       "capture": { "selector": "mud-date-picker", "bleed": "auto" }
 *     },
 *     "states": [
 *       {
 *         "name": "day-cell-hover",
 *         "node": "489:9029",
 *         "html": "<mud-date-picker …></mud-date-picker>",
 *         "props": { "mud-date-picker": { "disabledDates": ["2025-01-08"] } },
 *         "theme": "light",
 *         "pixel": false,
 *         "interaction": [{ "type": "hover", "target": "mud-date-picker button.day-cell[data-iso='2025-01-08']" }],
 *         "capture": { "selector": "…", "bleed": 0 },
 *         "expect": [
 *           { "target": "mud-date-picker button.day-cell[data-iso='2025-01-08']",
 *             "styles": { "backgroundColor": "#F5F5F5", "borderRadius": "6px" } },
 *           { "target": "mud-date-picker .footer", "absent": true }
 *         ]
 *       }
 *     ]
 *   }
 *
 * - `props` assigns JS properties after the fixture renders — for props that
 *   have no attribute form (arrays, objects). Keys are light-DOM selectors;
 *   every match gets the values.
 * - `interaction` is one step or a list of steps: hover | focus | press | click.
 * - `pixel: false` keeps a state out of the screenshot diff and reference
 *   export (e.g. a single cell whose Figma component has a different canvas),
 *   while its `expect` entries are still checked.
 * - Styles accept any computed-style property plus `boxWidth`, `boxHeight`
 *   (border box) and `textContent` (trimmed).
 *
 * Selectors are Playwright CSS selectors, which pierce open shadow roots, so
 * `mud-x .inner` reaches `.inner` inside `mud-x`'s shadow DOM.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './component-paths.mjs';

export const INTERACTION_TYPES = ['hover', 'focus', 'press', 'click'];
export const THEMES = ['light', 'dark'];
const STATE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const NODE_ID_RE = /^\d+[:-]\d+$/;
const STORY_ID_RE = /^[a-z0-9-]+--[a-z0-9-]+$/;

export function manifestPathFor(componentName) {
  return join(REPO_ROOT, 'src', 'components', componentName, 'test', `${componentName}.figma.json`);
}

export function defaultRefsDir(componentName) {
  return join(REPO_ROOT, '.audit-figma', componentName);
}

/** `489-9029` (URL form) → `489:9029` (API form). */
export function normalizeNodeId(id) {
  return typeof id === 'string' ? id.replace('-', ':') : id;
}

/** Reference PNG for a state. One file per state; the theme is part of the state. */
export function referenceFileName(state) {
  return `${state.name}.png`;
}

/** True when a state takes part in the screenshot diff and reference export. */
export function isPixelState(state) {
  return Boolean(state.node) && state.pixel !== false;
}

function interactionSteps(interaction) {
  if (interaction === undefined || interaction === null) return [];
  return Array.isArray(interaction) ? interaction : [interaction];
}

/**
 * Validate a parsed manifest. Returns a list of human-readable problems; an
 * empty list means the manifest is usable. Pure — no filesystem access.
 */
export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest must be a JSON object'];
  }
  const defaults = manifest.defaults ?? {};
  const states = manifest.states;

  if (manifest.figma !== undefined) {
    if (typeof manifest.figma?.fileKey !== 'string' || manifest.figma.fileKey.length === 0) {
      errors.push('figma.fileKey must be a non-empty string');
    }
    if (manifest.figma?.scale !== undefined && !(Number(manifest.figma.scale) > 0)) {
      errors.push('figma.scale must be a positive number');
    }
  }
  if (!Array.isArray(states) || states.length === 0) {
    errors.push('states must be a non-empty array');
    return errors;
  }

  validateCommon(defaults, 'defaults', errors);

  const seen = new Set();
  states.forEach((state, i) => {
    const where = `states[${i}]${state?.name ? ` ("${state.name}")` : ''}`;
    if (!state || typeof state !== 'object') {
      errors.push(`${where} must be an object`);
      return;
    }
    if (typeof state.name !== 'string' || !STATE_NAME_RE.test(state.name)) {
      errors.push(`${where}.name must be kebab-case (a-z, 0-9, -)`);
    } else if (seen.has(state.name)) {
      errors.push(`${where}.name is duplicated`);
    } else {
      seen.add(state.name);
    }
    if (state.node !== undefined && (typeof state.node !== 'string' || !NODE_ID_RE.test(state.node))) {
      errors.push(`${where}.node must be a Figma node id like "158:402"`);
    }
    if (state.node !== undefined && manifest.figma === undefined) {
      errors.push(`${where}.node needs figma.fileKey at the top level`);
    }
    if ((state.story ?? defaults.story) === undefined) {
      errors.push(`${where} needs a story (or defaults.story) — the page that loads the component`);
    }
    if (state.html !== undefined && typeof state.html !== 'string') {
      errors.push(`${where}.html must be a string`);
    }
    if (state.props !== undefined) {
      if (!state.props || typeof state.props !== 'object' || Array.isArray(state.props)) {
        errors.push(`${where}.props must be an object of { selector: { property: value } }`);
      } else {
        for (const [selector, values] of Object.entries(state.props)) {
          if (!values || typeof values !== 'object' || Array.isArray(values)) {
            errors.push(`${where}.props["${selector}"] must be an object of property values`);
          }
        }
      }
    }
    if (state.theme !== undefined && !THEMES.includes(state.theme)) {
      errors.push(`${where}.theme must be one of ${THEMES.join(', ')}`);
    }
    if (state.pixel !== undefined && typeof state.pixel !== 'boolean') {
      errors.push(`${where}.pixel must be a boolean`);
    }
    interactionSteps(state.interaction).forEach((step, k) => {
      const w = Array.isArray(state.interaction) ? `${where}.interaction[${k}]` : `${where}.interaction`;
      if (!step || !INTERACTION_TYPES.includes(step.type)) {
        errors.push(`${w}.type must be one of ${INTERACTION_TYPES.join(', ')}`);
      }
      if (typeof step?.target !== 'string' || step.target.length === 0) {
        errors.push(`${w}.target must be a selector`);
      }
    });
    validateCommon(state, where, errors);
    if (state.expect !== undefined) {
      if (!Array.isArray(state.expect)) {
        errors.push(`${where}.expect must be an array`);
      } else {
        state.expect.forEach((e, j) => validateExpectation(e, `${where}.expect[${j}]`, state, errors));
      }
    }
  });
  return errors;
}

function validateExpectation(e, where, state, errors) {
  if (typeof e?.target !== 'string' || e.target.length === 0) errors.push(`${where}.target must be a selector`);
  if (e?.absent !== undefined && e.absent !== true) errors.push(`${where}.absent can only be true`);
  if (e?.absent === true) {
    if (e.styles !== undefined) errors.push(`${where} cannot have both absent and styles`);
  } else if (!e?.styles || typeof e.styles !== 'object' || Object.keys(e.styles).length === 0) {
    errors.push(`${where}.styles must be a non-empty object (or set absent: true)`);
  } else {
    for (const [prop, value] of Object.entries(e.styles)) {
      if (typeof value !== 'string') errors.push(`${where}.styles.${prop} must be a string`);
    }
  }
  const node = e?.node ?? state.node;
  if (typeof node !== 'string' || !NODE_ID_RE.test(node)) {
    errors.push(`${where} must cite a Figma node (expect.node or the state's node)`);
  }
}

function validateCommon(obj, where, errors) {
  if (obj.story !== undefined && (typeof obj.story !== 'string' || !STORY_ID_RE.test(obj.story))) {
    errors.push(`${where}.story must be a Storybook story id like "atoms-button--default"`);
  }
  if (obj.clock !== undefined && Number.isNaN(Date.parse(obj.clock))) {
    errors.push(`${where}.clock must be an ISO date-time`);
  }
  if (obj.viewport !== undefined) {
    const { width, height } = obj.viewport ?? {};
    if (!(width > 0) || !(height > 0)) errors.push(`${where}.viewport needs positive width and height`);
  }
  if (obj.capture !== undefined) {
    const { selector, bleed } = obj.capture ?? {};
    if (selector !== undefined && (typeof selector !== 'string' || selector.length === 0)) {
      errors.push(`${where}.capture.selector must be a selector`);
    }
    if (bleed !== undefined && bleed !== 'auto' && !(typeof bleed === 'number' && bleed >= 0)) {
      errors.push(`${where}.capture.bleed must be "auto" or a non-negative number`);
    }
  }
}

/** Merge a state over the manifest defaults into the options a capture needs. */
export function resolveState(manifest, state, componentName) {
  const d = manifest.defaults ?? {};
  return {
    name: state.name,
    node: state.node ? normalizeNodeId(state.node) : null,
    pixel: isPixelState(state),
    story: state.story ?? d.story,
    html: state.html ?? null,
    props: state.props ?? null,
    theme: state.theme ?? 'light',
    clock: state.clock ?? d.clock ?? null,
    viewport: state.viewport ?? d.viewport ?? { width: 1280, height: 900 },
    interactions: interactionSteps(state.interaction),
    capture: {
      selector: state.capture?.selector ?? d.capture?.selector ?? componentName,
      bleed: state.capture?.bleed ?? d.capture?.bleed ?? 'auto',
    },
    expect: (state.expect ?? []).map(e => ({ ...e, node: normalizeNodeId(e.node ?? state.node) })),
  };
}

/**
 * Load and validate a manifest from disk.
 * @returns {{ path, manifest, errors }} — `manifest` is null when the file is missing or unparsable.
 */
export function loadManifest(path) {
  if (!existsSync(path)) return { path, manifest: null, errors: [`manifest not found: ${path}`] };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { path, manifest: null, errors: [`manifest is not valid JSON: ${err.message}`] };
  }
  return { path, manifest, errors: validateManifest(manifest) };
}
