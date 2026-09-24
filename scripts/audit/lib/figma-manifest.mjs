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
 *       "story": "components-date-picker--default",
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
 * - `shared` holds expectation lists several states repeat; a state lists
 *   `{ "use": "<key>" }` in `expect`. Each expanded entry cites its own `node`
 *   or the using state's node.
 * - `mask` (state or defaults) lists selectors painted with the page
 *   background on both images before the pixel diff — for mock data such as
 *   dates. Masked pixels are reported; style parity still checks the elements.
 *   A state's `"mask": []` opts out of `defaults.mask`.
 * - `figma.skip` lists Figma variants the manifest deliberately does not cover,
 *   each with a reason; `figma-refs --check` reports every other uncovered one.
 * - Styles accept any computed-style property plus `boxWidth`, `boxHeight`
 *   (border box) and `textContent` (trimmed).
 * - `override` on an `expect` entry records a correction the owner decided
 *   (e.g. a Figma typo): `{ "value": "…", "reason": "…", "decidedBy": "…" }`.
 *   The entry lists exactly one style; `15-style-parity` checks `value`
 *   instead of the Figma one, and the verdict lists the override.
 * - A component with no design declares it instead of states:
 *   `{ "figma": { "design": "none", "reason": "…", "decidedBy": "…" } }`.
 *   Figma checks are skipped and the verdict prints the reason.
 * - The audit honours all of this only from HEAD (`resolveHeadManifest`).
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
// Deliberately matching control characters (S1).
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/;

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
  if (manifest.figma?.design !== undefined) return validateDesignNone(manifest);
  const defaults = manifest.defaults ?? {};
  const states = manifest.states;

  if (manifest.figma !== undefined) {
    if (typeof manifest.figma?.fileKey !== 'string' || manifest.figma.fileKey.length === 0) {
      errors.push('figma.fileKey must be a non-empty string');
    }
    if (manifest.figma?.scale !== undefined && !(Number(manifest.figma.scale) > 0)) {
      errors.push('figma.scale must be a positive number');
    }
    if (manifest.figma?.skip !== undefined) {
      if (!Array.isArray(manifest.figma.skip)) {
        errors.push('figma.skip must be an array of { node, reason }');
      } else {
        manifest.figma.skip.forEach((s, i) => {
          if (
            typeof s?.node !== 'string' ||
            !NODE_ID_RE.test(s.node) ||
            typeof s?.reason !== 'string' ||
            !s.reason.trim()
          ) {
            errors.push(`figma.skip[${i}] needs a node id and a reason`);
          }
        });
      }
    }
  }
  const shared = manifest.shared ?? {};
  if (manifest.shared !== undefined && (typeof manifest.shared !== 'object' || Array.isArray(manifest.shared))) {
    errors.push('shared must be an object of { key: expectations[] }');
  }
  for (const [key, list] of Object.entries(shared)) {
    if (!STATE_NAME_RE.test(key)) errors.push(`shared["${key}"] key must be kebab-case`);
    if (!Array.isArray(list) || list.length === 0) errors.push(`shared["${key}"] must be a non-empty array`);
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
        state.expect.forEach((e, j) => {
          const where2 = `${where}.expect[${j}]`;
          if (e && e.use !== undefined) {
            if (Object.keys(e).length !== 1) errors.push(`${where2}: a use entry cannot carry other fields`);
            const list = shared[e.use];
            if (!Array.isArray(list)) {
              errors.push(`${where2}: use "${e.use}" names no shared block`);
              return;
            }
            list.forEach((s, k) => validateExpectation(s, `${where2} → shared["${e.use}"][${k}]`, state, errors));
            return;
          }
          validateExpectation(e, where2, state, errors);
        });
      }
    }
  });
  return errors;
}

/**
 * A component with no design (AGENTS.md Figma-First exception) declares it
 * once: `{ "figma": { "design": "none", "reason": "…", "decidedBy": "…" } }`,
 * with no `fileKey` and no `states` — there is no node to cite. Pure.
 */
function validateDesignNone(manifest) {
  const errors = [];
  const { design, reason, decidedBy, fileKey } = manifest.figma;
  if (design !== 'none') errors.push('figma.design can only be "none"');
  if (typeof reason !== 'string' || !reason.trim()) errors.push('figma.design "none" needs a reason');
  if (typeof decidedBy !== 'string' || !decidedBy.trim()) errors.push('figma.design "none" needs decidedBy');
  if (typeof reason === 'string' && CONTROL_CHAR_RE.test(reason)) {
    errors.push('figma.design reason contains a control character');
  }
  if (typeof decidedBy === 'string' && CONTROL_CHAR_RE.test(decidedBy)) {
    errors.push('figma.design decidedBy contains a control character');
  }
  if (fileKey !== undefined) errors.push('figma.design "none" cannot carry a fileKey');
  if (manifest.states !== undefined) errors.push('figma.design "none" cannot carry states');
  return errors;
}

/** True when the manifest declares that the component has no Figma design. Pure. */
export function isDesignNone(manifest) {
  return manifest?.figma?.design === 'none';
}

/**
 * The styles an expectation is checked against: the Figma values, except a
 * property carrying a committed correction (`override`), which is checked
 * against `override.value`. An override applies to exactly one property, so
 * an entry with one must list exactly one (validated). Pure.
 */
export function expectedStyles(exp) {
  if (!exp?.override) return exp?.styles ?? {};
  const [prop] = Object.keys(exp.styles);
  return { [prop]: exp.override.value };
}

/** Every `override` in a manifest, in state then shared order. Pure. */
export function listOverrides(manifest) {
  const out = [];
  const collect = (list, where) => {
    for (const e of list ?? []) {
      if (!e?.override || !e.styles) continue;
      const [prop] = Object.keys(e.styles);
      out.push({
        where,
        target: e.target,
        prop,
        figma: e.styles[prop],
        value: e.override.value,
        reason: e.override.reason,
        decidedBy: e.override.decidedBy,
      });
    }
  };
  for (const s of manifest?.states ?? []) collect(s?.expect, s?.name);
  for (const [key, list] of Object.entries(manifest?.shared ?? {})) collect(list, `shared:${key}`);
  return out;
}

function validateExpectation(e, where, state, errors) {
  if (typeof e?.target !== 'string' || e.target.length === 0) errors.push(`${where}.target must be a selector`);
  if (e?.absent !== undefined && e.absent !== true) errors.push(`${where}.absent can only be true`);
  if (e?.override !== undefined) {
    const o = e.override;
    if (!o || typeof o !== 'object' || typeof o.value !== 'string') {
      errors.push(`${where}.override needs a string value`);
    }
    if (typeof o?.reason !== 'string' || !o.reason.trim()) errors.push(`${where}.override needs a reason`);
    if (typeof o?.decidedBy !== 'string' || !o.decidedBy.trim()) errors.push(`${where}.override needs decidedBy`);
    if (e.absent === true || !e.styles || Object.keys(e.styles).length !== 1) {
      errors.push(`${where}.override corrects one value: its styles must list exactly one property`);
    }
  }
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
    errors.push(`${where}.story must be a Storybook story id like "components-button--default"`);
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
  if (obj.mask !== undefined) {
    // An empty list is valid: it lets a state opt out of defaults.mask.
    const ok = Array.isArray(obj.mask) && obj.mask.every(s => typeof s === 'string' && s.length > 0);
    if (!ok) errors.push(`${where}.mask must be an array of selectors`);
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
    mask: state.mask ?? d.mask ?? [],
    expect: (state.expect ?? [])
      .flatMap(e => (e.use !== undefined ? (manifest.shared?.[e.use] ?? []) : [e]))
      .map(e => ({ ...e, node: normalizeNodeId(e.node ?? state.node) })),
  };
}

/** Repo-relative path of a component's committed manifest. */
export function manifestRelPath(componentName) {
  return `src/components/${componentName}/test/${componentName}.figma.json`;
}

/**
 * The fixed, git-ignored path the orchestrator writes a component's HEAD
 * manifest to (Design §8). Fixed rather than a temp dir so no run-varying path
 * reaches a finding.
 */
export function headManifestRelPath(componentName) {
  return `.audit-figma/${componentName}/manifest@HEAD.json`;
}

/**
 * Resolve a component's Figma manifest from the committed tree (Design §8):
 * every Figma input — presence, `design`, `expect`, `override`, `skip` — is
 * read from `git show HEAD:<path>`, never from the working tree, so the audit
 * cannot grant itself a waiver or a correction. The HEAD copy is written to
 * `headManifestRelPath()` and passed to 11 / 15 / figma-refs via `--manifest`.
 *
 * @param {string} componentName
 * @param {object} [deps] — injection seam for tests
 * @param {(args: string[]) => {status: number|null, stdout: string}} deps.git
 * @param {string} [deps.repoRoot]
 * @param {(abs: string) => string|null} [deps.readWorkingTree] — null when absent
 * @param {(abs: string, text: string) => void} [deps.writeFile]
 * @returns {{ status: 'present'|'absent'|'design-none', path: string|null, rel: string,
 *   commit: string|null, pending: boolean, workingTreeOnly: boolean,
 *   design: {reason: string, decidedBy: string}|null, overrides: object[], skips: object[] }}
 */
export function resolveHeadManifest(componentName, deps) {
  const repoRoot = deps.repoRoot ?? REPO_ROOT;
  const rel = manifestRelPath(componentName);
  const show = deps.git(['show', `HEAD:${rel}`]);
  const headText = show.status === 0 ? show.stdout : null;
  const wtText = deps.readWorkingTree(join(repoRoot, rel));
  const base = {
    rel,
    pending: headText !== null && wtText !== headText,
    workingTreeOnly: headText === null && wtText !== null,
    design: null,
    overrides: [],
    skips: [],
  };
  if (headText === null) return { ...base, status: 'absent', path: null, commit: null };

  const log = deps.git(['log', '-1', '--format=%H', 'HEAD', '--', rel]);
  const commit = log.status === 0 ? log.stdout.trim() || null : null;
  const headRel = headManifestRelPath(componentName);
  deps.writeFile(join(repoRoot, headRel), headText);
  let manifest = null;
  try {
    manifest = JSON.parse(headText);
  } catch {
    // An unparsable HEAD manifest still goes to 11 / 15, which report it as MANIFEST-INVALID.
  }
  // A design-none waiver is granted only once the manifest itself validates
  // (S1): no reason/decidedBy, a fileKey or states beside it, or a control
  // character in reason/decidedBy falls through to `status: 'present'` below,
  // so 11 / 15 / figma-refs run and report MANIFEST-INVALID through their own
  // `loadManifest` call instead of the waiver being granted silently.
  if (isDesignNone(manifest) && validateDesignNone(manifest).length === 0) {
    return {
      ...base,
      status: 'design-none',
      path: headRel,
      commit,
      design: { reason: manifest.figma.reason, decidedBy: manifest.figma.decidedBy },
    };
  }
  return {
    ...base,
    status: 'present',
    path: headRel,
    commit,
    overrides: listOverrides(manifest),
    skips: (manifest?.figma?.skip ?? []).map(s => ({ node: s.node, reason: s.reason })),
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
