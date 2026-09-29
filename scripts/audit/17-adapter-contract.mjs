#!/usr/bin/env node
/**
 * 17-adapter-contract.mjs
 *
 * Checks a `mud-*` component's public API against the rules a JS-framework
 * adapter (React, Vue, etc.) relies on but Stencil itself only warns — or
 * says nothing — about. Two independent parts, selected with `--part`:
 *
 *   --part source   (Wave A, no build required) — calls 14-component-contract's
 *                    `extractContractFromTsx` in-process and runs the A1-A4
 *                    rules below against the extracted contract.
 *   --part cem      (Wave B, after `yarn dx:stencil:once`) — compares the
 *                    component's `.storybook/custom-elements.json` entry
 *                    against the same source contract (props/attributes,
 *                    events, slots, parts, CSS custom properties).
 *
 * Rule citations (plan `2026-09-21-audit-component-depths.md`, Design §4 +
 * "Phase 0 results"):
 *   - A1: `src/components/_agents/component-structure.md:193`,
 *     `.claude/skills/stencil-compliance/references/anti-patterns.md:144`.
 *     `02-stencil-antipatterns.mjs`'s `ANTIPATTERN-025-EVENT-PREFIX` checks
 *     the class FIELD name only, so an `eventName` override escapes it —
 *     this rule checks the name actually emitted on the wire.
 *   - A2: react.dev, `reference/react-dom/components` § Custom HTML elements
 *     — listeners are `on<eventName>`, case-sensitive; an emitted name that
 *     collides with a native DOM event is indistinguishable to a consumer.
 *   - A3: react.dev same section — a non-string value only reaches a DOM
 *     property when that property exists on the class at construction,
 *     otherwise it is serialized to an attribute; `stencil-compliance` SE1
 *     (`.claude/skills/stencil-compliance/references/form-reactivity.md:164`).
 *     A `@PropSerialize('<prop>')` method on the class satisfies this rule
 *     (Stencil 4.38+, same reference file's "Serialization" section).
 *   - A4: `node_modules/@stencil/core/compiler/stencil.js:279782-280030`
 *     (`RESERVED_PUBLIC_MEMBERS`, built from `ALL_KEYS` — the union of
 *     `HTML_ELEMENT_KEYS`, `ELEMENT_KEYS`, `NODE_KEYS`, `JSX_KEYS`,
 *     lower-cased). The compiler only WARNS about a collision; this rule
 *     makes it a finding. `NATIVE_DOM_EVENT_NAMES` (A2) is derived from the
 *     same on-* entries in that citation, so both rules share one source.
 *     R10 (plan `2026-09-22-audit-depths-sentinel-fixes.md`, Decision §4):
 *     compared against `@stencil/eslint-plugin`'s own `reserved-member-names`
 *     rule (`node_modules/@stencil/eslint-plugin/dist/index.js:873-950`,
 *     `eslint.config.mjs:64`, level `error`, already enforced on every PR).
 *     Neither set is a subset of the other, so A4 is KEPT, not deleted. Point
 *     measurement (2026-09-22, re-derivable by diffing `RESERVED_PUBLIC_MEMBERS`
 *     below against the eslint rule's own `RESERVED_PUBLIC_MEMBERS` at
 *     `node_modules/@stencil/eslint-plugin/dist/index.js:945-948`, itself
 *     `GLOBAL_ATTRIBUTES` (:892) ∪ `getHtmlElementProperties()` (a jsdom walk
 *     of `HTMLElement`/`Element`/`Node`/`EventTarget`, :922-940) ∪ `JSX_KEYS`):
 *     44 names A4 catches that eslint's rule does not (this codebase's
 *     curated `ALL_KEYS`, e.g. `onfocusout`, `requestfullscreen`,
 *     `scrollintoview` — absent from jsdom's `HTMLElement`, which the eslint
 *     rule walks instead of a real browser's), and 80 names eslint's rule
 *     catches that A4 does not (its `GLOBAL_ATTRIBUTES` list — `class`, `id`,
 *     `style`, `slot`, `part`, every `aria-*` attribute — A4 never included
 *     those). The eslint rule also fires only on `@Prop`/`@Method` decorators
 *     (`node_modules/@stencil/eslint-plugin/dist/index.js:873`) — never
 *     `@Event`, which A4 also checks (`kind: 'event'` below) — a second,
 *     independent reason A4 cannot be deleted. P11
 *     (`.claude/skills/stencil-compliance/SKILL.md:106`) stays mapped to
 *     `eslint:@stencil/reserved-member-names` (upstream #110, kept as-is);
 *     A4 is enforced here alongside it for the reserved names that rule
 *     misses and for `@Event` members it never reaches. Phase 4 records this
 *     outcome in the SKILL.md/wave-2 rows.
 *
 * Not encoded (Design §4): `@Method` async — already `eslint:@stencil/async-
 * methods` (stencil-compliance M1) — and a serializable event `detail` (no
 * doc citation found).
 *
 * Usage:
 *   node scripts/audit/17-adapter-contract.mjs mud-button --part source --json
 *   yarn dx:stencil:once
 *   node scripts/audit/17-adapter-contract.mjs mud-button --part cem --json
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo, REPO_ROOT } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { extractContractFromTsx } from './14-component-contract.mjs';
import path from 'node:path';

const TOOL = 'adapter-contract';
const CEM_REL = '.storybook/custom-elements.json';

const USAGE = defaultUsage(
  '17-adapter-contract',
  "Check a Stencil component's public API against adapter-contract rules (A1-A4, source) or against the built custom-elements.json (CEM parity).",
  ['', 'Extra options:', '  --part <source|cem>   Which half to run (required)'],
);

// ─── A4: Stencil's reserved public member set ──────────────────────────────
// Copied verbatim from node_modules/@stencil/core/compiler/stencil.js:279782-
// 280029 (Stencil 4.45.0) — see the header citation. Re-derive by re-reading
// that file if the pinned Stencil version moves.
const HTML_ELEMENT_KEYS = [
  'popover',
  'title',
  'lang',
  'translate',
  'dir',
  'tabIndex',
  'accessKey',
  'draggable',
  'contentEditable',
  'isContentEditable',
  'offsetParent',
  'offsetTop',
  'offsetLeft',
  'offsetWidth',
  'offsetHeight',
  'style',
  'innerText',
  'outerText',
  'oncopy',
  'oncut',
  'onpaste',
  'onabort',
  'onblur',
  'oncancel',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'onclose',
  'oncontextmenu',
  'oncuechange',
  'ondblclick',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onended',
  'onerror',
  'onfocus',
  'onfocusin',
  'onfocusout',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onpause',
  'onplay',
  'onplaying',
  'onprogress',
  'onratechange',
  'onreset',
  'onresize',
  'onscroll',
  'onseeked',
  'onseeking',
  'onselect',
  'onstalled',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'onvolumechange',
  'onwaiting',
  'onwheel',
  'onauxclick',
  'ongotpointercapture',
  'onlostpointercapture',
  'onpointerdown',
  'onpointermove',
  'onpointerup',
  'onpointercancel',
  'onpointerover',
  'onpointerout',
  'onpointerenter',
  'onpointerleave',
  'onselectstart',
  'onselectionchange',
  'nonce',
  'click',
  'focus',
  'blur',
];
const ELEMENT_KEYS = [
  'namespaceURI',
  'prefix',
  'localName',
  'tagName',
  'id',
  'className',
  'classList',
  'slot',
  'attributes',
  'shadowRoot',
  'assignedSlot',
  'innerHTML',
  'outerHTML',
  'scrollTop',
  'scrollLeft',
  'scrollWidth',
  'scrollHeight',
  'clientTop',
  'clientLeft',
  'clientWidth',
  'clientHeight',
  'attributeStyleMap',
  'onbeforecopy',
  'onbeforecut',
  'onbeforepaste',
  'onsearch',
  'previousElementSibling',
  'nextElementSibling',
  'children',
  'firstElementChild',
  'lastElementChild',
  'childElementCount',
  'onfullscreenchange',
  'onfullscreenerror',
  'onwebkitfullscreenchange',
  'onwebkitfullscreenerror',
  'setPointerCapture',
  'releasePointerCapture',
  'hasPointerCapture',
  'hasAttributes',
  'getAttributeNames',
  'getAttribute',
  'getAttributeNS',
  'setAttribute',
  'setAttributeNS',
  'removeAttribute',
  'removeAttributeNS',
  'hasAttribute',
  'hasAttributeNS',
  'toggleAttribute',
  'getAttributeNode',
  'getAttributeNodeNS',
  'setAttributeNode',
  'setAttributeNodeNS',
  'removeAttributeNode',
  'closest',
  'matches',
  'webkitMatchesSelector',
  'attachShadow',
  'getElementsByTagName',
  'getElementsByTagNameNS',
  'getElementsByClassName',
  'insertAdjacentElement',
  'insertAdjacentText',
  'insertAdjacentHTML',
  'requestPointerLock',
  'getClientRects',
  'getBoundingClientRect',
  'scrollIntoView',
  'scroll',
  'scrollTo',
  'scrollBy',
  'scrollIntoViewIfNeeded',
  'animate',
  'computedStyleMap',
  'before',
  'after',
  'replaceWith',
  'remove',
  'prepend',
  'append',
  'querySelector',
  'querySelectorAll',
  'requestFullscreen',
  'webkitRequestFullScreen',
  'webkitRequestFullscreen',
  'part',
  'createShadowRoot',
  'getDestinationInsertionPoints',
];
const NODE_KEYS = [
  'ELEMENT_NODE',
  'ATTRIBUTE_NODE',
  'TEXT_NODE',
  'CDATA_SECTION_NODE',
  'ENTITY_REFERENCE_NODE',
  'ENTITY_NODE',
  'PROCESSING_INSTRUCTION_NODE',
  'COMMENT_NODE',
  'DOCUMENT_NODE',
  'DOCUMENT_TYPE_NODE',
  'DOCUMENT_FRAGMENT_NODE',
  'NOTATION_NODE',
  'DOCUMENT_POSITION_DISCONNECTED',
  'DOCUMENT_POSITION_PRECEDING',
  'DOCUMENT_POSITION_FOLLOWING',
  'DOCUMENT_POSITION_CONTAINS',
  'DOCUMENT_POSITION_CONTAINED_BY',
  'DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC',
  'nodeType',
  'nodeName',
  'baseURI',
  'isConnected',
  'ownerDocument',
  'parentNode',
  'parentElement',
  'childNodes',
  'firstChild',
  'lastChild',
  'previousSibling',
  'nextSibling',
  'nodeValue',
  'textContent',
  'hasChildNodes',
  'getRootNode',
  'normalize',
  'cloneNode',
  'isEqualNode',
  'isSameNode',
  'compareDocumentPosition',
  'contains',
  'lookupPrefix',
  'lookupNamespaceURI',
  'isDefaultNamespace',
  'insertBefore',
  'appendChild',
  'replaceChild',
  'removeChild',
];
const JSX_KEYS = ['ref', 'key'];

const ALL_KEYS = [...HTML_ELEMENT_KEYS, ...ELEMENT_KEYS, ...NODE_KEYS, ...JSX_KEYS].map(k => k.toLowerCase());
export const RESERVED_PUBLIC_MEMBERS = new Set(ALL_KEYS);

// ─── A2: native DOM event names ────────────────────────────────────────────
// Derived from the same citation as A4 above: every `on*` handler property in
// HTML_ELEMENT_KEYS / ELEMENT_KEYS names a native DOM event once its `on`
// prefix is stripped. One source, two rules.
export const NATIVE_DOM_EVENT_NAMES = new Set(
  [...HTML_ELEMENT_KEYS, ...ELEMENT_KEYS].filter(k => k.startsWith('on')).map(k => k.slice(2).toLowerCase()),
);

// ─── A1: mud-prefix pattern ─────────────────────────────────────────────────
// Matches `mudChange` (PascalCase-after-mud) and `mud-custom-name` (kebab
// eventName override) — the two spellings Stencil accepts for an emitted
// event name.
const MUD_PREFIX_PATTERN = /^mud(?:[A-Z-]|$)/;

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      part: { type: 'string' },
    },
  });
  const t0 = Date.now();
  const part = args.extras.part;
  if (part !== 'source' && part !== 'cem') {
    process.stderr.write(`${TOOL}: --part must be "source" or "cem" (got "${part ?? ''}").\n\n${USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({
          tool: TOOL,
          target: 'changed',
          findings: [],
          meta: { durationMs: Date.now() - t0, componentsScanned: 0, part },
        }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  let cem = null;
  if (part === 'cem') {
    const cemAbs = path.join(REPO_ROOT, CEM_REL);
    if (!existsSync(cemAbs)) {
      process.stderr.write(`${TOOL}: ${CEM_REL} not found. Run \`yarn dx:stencil:once\` first.\n`);
      process.exit(EXIT_INTERNAL);
    }
    try {
      cem = JSON.parse(readFileSync(cemAbs, 'utf8'));
    } catch (err) {
      process.stderr.write(`${TOOL}: failed to parse ${CEM_REL}: ${err.message}\n`);
      process.exit(EXIT_INTERNAL);
    }
  }

  const perComponent = targets.map(t => analyzeComponent(t, { part, cem }));
  const findings = perComponent.flatMap(c => c.findings);

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: { durationMs: Date.now() - t0, componentsScanned: targets.length, part },
  });

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze one component for the selected part. Pure (given an already-parsed
 * `cem` object) — exported for tests.
 */
export function analyzeComponent(target, { part, cem }) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      componentName: target.name ?? null,
    };
  }
  if (!target.exists.tsx) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'CONTRACT-NO-TSX',
          file: relativeToRepo(target.paths.tsx),
          message: 'Cannot extract contract — TSX file missing.',
        }),
      ],
      componentName: target.name,
    };
  }

  const { findings: extractFindings, contract } = extractContractFromTsx(target.paths.tsx, target.name);
  if (!contract) {
    return { findings: extractFindings, componentName: target.name };
  }

  const tsxContent = readFileSync(target.paths.tsx, 'utf8');
  const fileRel = relativeToRepo(target.paths.tsx);

  if (part === 'source') {
    // `mud-<name>.types.ts` is optional (component-paths.mjs) — a component
    // with no companion types file simply resolves no bare-identifier prop
    // type, which is the same as an unresolvable one (Wave A leaves it be).
    const typesContent = target.exists.types ? readFileSync(target.paths.types, 'utf8') : '';
    return {
      findings: [...extractFindings, ...checkSourceRules(contract, tsxContent, fileRel, typesContent)],
      componentName: target.name,
    };
  }

  return {
    findings: [...extractFindings, ...checkCemParity(contract, tsxContent, fileRel, cem)],
    componentName: target.name,
  };
}

// ─── Wave A: source rules (A1-A4) ──────────────────────────────────────────

export function checkSourceRules(contract, tsxContent, fileRel, typesContent = '') {
  const findings = [];
  const serializedProps = extractSerializedProps(tsxContent);
  const aliasKinds = extractTypeAliasKinds(typesContent);

  for (const event of contract.events ?? []) {
    const a1 = checkA1EventPrefix(event, fileRel);
    if (a1) findings.push(a1);
    const a2 = checkA2NativeEventName(event, fileRel);
    if (a2) findings.push(a2);
    const a4Event = checkA4ReservedName({ name: event.name, kind: 'event', line: event.line, fileRel });
    if (a4Event) findings.push(a4Event);
  }

  for (const prop of contract.props ?? []) {
    const a3 = checkA3ReflectSerializer(prop, serializedProps, fileRel, aliasKinds);
    if (a3) findings.push(a3);
    const a4Prop = checkA4ReservedName({ name: prop.name, kind: 'prop', line: prop.line, fileRel });
    if (a4Prop) findings.push(a4Prop);
  }

  for (const method of contract.methods ?? []) {
    const a4Method = checkA4ReservedName({ name: method.name, kind: 'method', line: method.line, fileRel });
    if (a4Method) findings.push(a4Method);
  }

  return findings;
}

/** A1 — emitted event name carries the `mud` prefix. */
export function checkA1EventPrefix(event, fileRel) {
  const emitted = event.eventName ?? event.name;
  if (MUD_PREFIX_PATTERN.test(emitted)) return null;
  return finding({
    severity: 'error',
    code: 'ADAPTER-A1-EVENT-PREFIX',
    file: fileRel,
    line: event.line,
    message: `Emitted event "${emitted}" (field "${event.name}") does not carry the mud prefix — an eventName override escapes ANTIPATTERN-025, which only checks the field name.`,
    fix: `Set eventName to start with "mud" (e.g. "mud${emitted.charAt(0).toUpperCase()}${emitted.slice(1)}").`,
  });
}

/** A2 — emitted event name is not a native DOM event name. */
export function checkA2NativeEventName(event, fileRel) {
  const emitted = event.eventName ?? event.name;
  if (!NATIVE_DOM_EVENT_NAMES.has(emitted.toLowerCase())) return null;
  return finding({
    severity: 'error',
    code: 'ADAPTER-A2-NATIVE-EVENT-COLLISION',
    file: fileRel,
    line: event.line,
    message: `Emitted event "${emitted}" collides with the native DOM "${emitted.toLowerCase()}" event — a consumer's on${emitted} listener cannot tell them apart (react.dev, Custom HTML elements).`,
    fix: 'Rename the emitted event to something that cannot collide with a native DOM event.',
  });
}

/**
 * A3 — non-primitive reflected prop needs a @PropSerialize.
 *
 * `aliasKinds` (from `extractTypeAliasKinds`, the sibling `.types.ts` file)
 * resolves a bare type reference (`ButtonVariant`) to what it actually is.
 * Without it every enum-style prop typed via this codebase's
 * `(typeof X_ARRAY)[number]` idiom would misreport as non-primitive —
 * `classifyPropType` only flags a reference it can prove is non-primitive;
 * an unresolved one is left alone rather than guessed.
 */
export function checkA3ReflectSerializer(prop, serializedProps, fileRel, aliasKinds = new Map()) {
  if (!prop.reflect) return null;
  if (classifyPropType(prop.type, aliasKinds) !== 'non-primitive') return null;
  if (serializedProps.has(prop.name)) return null;
  return finding({
    severity: 'error',
    code: 'ADAPTER-A3-REFLECT-NO-SERIALIZER',
    file: fileRel,
    line: prop.line,
    message: `Prop "${prop.name}" (type: ${prop.type}) has reflect: true but no @PropSerialize('${prop.name}') — a non-primitive value is never written to the attribute (stencil-compliance SE1).`,
    fix: `Add a @PropSerialize('${prop.name}') method, or drop reflect: true.`,
  });
}

/** A4 — no prop/event/method name in Stencil's reserved public member set. */
export function checkA4ReservedName({ name, kind, line, fileRel }) {
  if (!RESERVED_PUBLIC_MEMBERS.has(name.toLowerCase())) return null;
  return finding({
    severity: 'error',
    code: 'ADAPTER-A4-RESERVED-MEMBER-NAME',
    file: fileRel,
    line,
    message: `${kind} "${name}" is in Stencil's reserved public member set (RESERVED_PUBLIC_MEMBERS) — the compiler only warns, this is a finding.`,
    fix: `Rename the ${kind} "${name}" so it does not collide with an existing HTMLElement/Element/Node prototype member.`,
  });
}

/** Non-primitive = not string/number/boolean and not a union of only literals of those. Exported for tests. */
export function isNonPrimitiveType(typeText) {
  if (!typeText) return false;
  const stripped = typeText
    .trim()
    .replace(/\s*\|\s*(undefined|null)\b/g, '')
    .trim();
  const parts = stripped.split('|').map(p => p.trim());
  const isPrimitiveOrLiteral = p =>
    /^(string|number|boolean)$/.test(p) || /^'[^']*'$/.test(p) || /^"[^"]*"$/.test(p) || /^-?\d+(\.\d+)?$/.test(p);
  return !parts.every(isPrimitiveOrLiteral);
}

/**
 * Classify a prop's type text as `'primitive' | 'non-primitive' | 'unknown'`.
 * A bare type-reference identifier (`ButtonVariant`) is resolved against
 * `aliasKinds`; everything else falls back to the shape-only
 * `isNonPrimitiveType` check. `'unknown'` means "could not be proven either
 * way" — A3 treats that the same as primitive (no finding), never as a guess.
 * Exported for tests.
 */
export function classifyPropType(typeText, aliasKinds = new Map()) {
  if (!typeText) return 'unknown';
  const stripped = typeText
    .trim()
    .replace(/\s*\|\s*(undefined|null)\b/g, '')
    .trim();
  if (!/^(string|number|boolean)$/.test(stripped) && /^[A-Za-z_$][\w$]*$/.test(stripped)) {
    return aliasKinds.has(stripped) ? aliasKinds.get(stripped) : 'unknown';
  }
  return isNonPrimitiveType(stripped) ? 'non-primitive' : 'primitive';
}

/**
 * Resolve every `export type NAME = ...;` / `export interface NAME { ... }`
 * declared in a component's `.types.ts` file to `'primitive' | 'non-
 * primitive' | 'unknown'`. Recognizes two shapes seen across this codebase:
 *   - a literal union:            `type X = 'a' | 'b';`
 *   - the `as const` array idiom: `const ARR = ['a','b'] as const;`
 *                                  `type X = (typeof ARR)[number];`
 * Regex over raw text, same tradeoff as `extractSlots` in 14 — a full type
 * checker is out of scope for a script that must stay fast. Exported for
 * tests.
 */
export function extractTypeAliasKinds(typesContent) {
  const kinds = new Map();
  if (!typesContent) return kinds;

  const isLiteralOrPrimitive = p =>
    /^'[^']*'$/.test(p) || /^"[^"]*"$/.test(p) || /^(string|number|boolean)$/.test(p) || /^-?\d+(\.\d+)?$/.test(p);

  const stringConstArrays = new Set();
  const arrRe = /const\s+(\w+)\s*=\s*\[([^\]]*)\]\s*as\s+const/g;
  let m;
  while ((m = arrRe.exec(typesContent)) !== null) {
    const elements = m[2]
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    if (elements.length > 0 && elements.every(e => /^'[^']*'$/.test(e) || /^"[^"]*"$/.test(e))) {
      stringConstArrays.add(m[1]);
    }
  }

  const typeRe = /\btype\s+(\w+)\s*=\s*([^;]+);/g;
  while ((m = typeRe.exec(typesContent)) !== null) {
    const name = m[1];
    const rhs = m[2].trim();
    const typeofMatch = rhs.match(/^\(typeof\s+(\w+)\)\[number\]$/);
    if (typeofMatch) {
      kinds.set(name, stringConstArrays.has(typeofMatch[1]) ? 'primitive' : 'unknown');
      continue;
    }
    const parts = rhs.split('|').map(p => p.trim());
    if (parts.every(isLiteralOrPrimitive)) {
      kinds.set(name, 'primitive');
      continue;
    }
    if (rhs.startsWith('{') || rhs.startsWith('Record<') || /\[\]$/.test(rhs) || rhs.includes('=>')) {
      kinds.set(name, 'non-primitive');
      continue;
    }
    kinds.set(name, 'unknown');
  }

  const ifaceRe = /\binterface\s+(\w+)\s*\{/g;
  while ((m = ifaceRe.exec(typesContent)) !== null) kinds.set(m[1], 'non-primitive');

  return kinds;
}

/** `@PropSerialize('propName')` method names — regex scan, same cost tradeoff as extractSlots. Exported for tests. */
export function extractSerializedProps(tsxContent) {
  const names = new Set();
  const re = /@PropSerialize\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(tsxContent)) !== null) names.add(m[1]);
  return names;
}

// ─── Wave B: CEM parity ─────────────────────────────────────────────────────

export function checkCemParity(contract, tsxContent, fileRel, cem) {
  const findings = [];
  const decl = findCemDeclaration(cem, contract.tag);

  if (!decl) {
    findings.push(
      finding({
        severity: 'error',
        code: 'ADAPTER-CEM-ENTRY-MISSING',
        file: fileRel,
        message: `No custom-elements.json entry for tag "${contract.tag}" — the CEM is stale.`,
        fix: 'Run `yarn dx:stencil:once` to regenerate .storybook/custom-elements.json.',
      }),
    );
    return findings;
  }

  const sourcePropNames = (contract.props ?? []).map(p => p.name);
  const cemFieldNames = (decl.members ?? []).filter(m => m.kind === 'field').map(m => m.name);
  findings.push(...diffNameSets({ kind: 'prop', sourceNames: sourcePropNames, cemNames: cemFieldNames, fileRel }));

  const sourceEventNames = (contract.events ?? []).map(e => e.eventName ?? e.name);
  const cemEventNames = (decl.events ?? []).map(e => e.name);
  findings.push(...diffNameSets({ kind: 'event', sourceNames: sourceEventNames, cemNames: cemEventNames, fileRel }));

  const sourceSlotNames = (contract.slots ?? []).map(s => s.name);
  const cemSlotNames = (decl.slots ?? []).map(s => (s.name === '' ? 'default' : s.name));
  findings.push(...diffNameSets({ kind: 'slot', sourceNames: sourceSlotNames, cemNames: cemSlotNames, fileRel }));

  const sourcePartNames = extractPartsFromTsx(tsxContent);
  const cemPartNames = (decl.cssParts ?? []).map(p => p.name);
  findings.push(...diffNameSets({ kind: 'part', sourceNames: sourcePartNames, cemNames: cemPartNames, fileRel }));

  const sourceCssPropNames = extractCssPropsFromTsx(tsxContent);
  const cemCssPropNames = (decl.cssProperties ?? []).map(p => p.name);
  findings.push(
    ...diffNameSets({ kind: 'css-property', sourceNames: sourceCssPropNames, cemNames: cemCssPropNames, fileRel }),
  );

  return findings;
}

/** Find the declaration for `tagName` across every module in a CEM document. Exported for tests. */
export function findCemDeclaration(cem, tagName) {
  for (const mod of cem?.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      if (decl.tagName === tagName) return decl;
    }
  }
  return null;
}

/**
 * Two-way name comparison between the source contract and the built CEM.
 * A mismatch is never judged by file mtime (wireit caches by content) — the
 * fix is always the same rebuild command. Exported for tests.
 */
export function diffNameSets({ kind, sourceNames, cemNames, fileRel }) {
  const findings = [];
  const sourceSet = new Set(sourceNames);
  const cemSet = new Set(cemNames);

  const missingFromCem = [...sourceSet].filter(n => !cemSet.has(n));
  const extraInCem = [...cemSet].filter(n => !sourceSet.has(n));

  if (missingFromCem.length > 0) {
    findings.push(
      finding({
        severity: 'error',
        code: `ADAPTER-CEM-${kind.toUpperCase()}-MISSING`,
        file: fileRel,
        message: `${kind}(s) in source but not in the built CEM: ${missingFromCem.join(', ')}.`,
        fix: 'Run `yarn dx:stencil:once` to regenerate .storybook/custom-elements.json.',
      }),
    );
  }
  if (extraInCem.length > 0) {
    findings.push(
      finding({
        severity: 'error',
        code: `ADAPTER-CEM-${kind.toUpperCase()}-STALE`,
        file: fileRel,
        message: `${kind}(s) in the built CEM but not in source (stale build): ${extraInCem.join(', ')}.`,
        fix: 'Run `yarn dx:stencil:once` to regenerate .storybook/custom-elements.json.',
      }),
    );
  }
  return findings;
}

/**
 * `part="..."` attribute values scraped from JSX — same tradeoff as
 * extractSlots. A match containing `$` is skipped: this codebase also uses
 * `part=` inside a CSS attribute-selector STRING (e.g. `` `[part="${chip}"]` ``
 * for `querySelector`), which the regex cannot tell apart from a real JSX
 * `part` attribute — a real one is always a static value in this codebase.
 * Exported for tests.
 */
export function extractPartsFromTsx(tsxContent) {
  const parts = new Set();
  const re = /\bpart\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(tsxContent)) !== null) {
    if (m[1].includes('$')) continue;
    for (const name of m[1].split(/\s+/).filter(Boolean)) parts.add(name);
  }
  return [...parts];
}

/** `@cssprop --name` JSDoc tags scraped from the raw file. Exported for tests. */
export function extractCssPropsFromTsx(tsxContent) {
  const names = new Set();
  const re = /@cssprop\s+(--[\w-]+)/g;
  let m;
  while ((m = re.exec(tsxContent)) !== null) names.add(m[1]);
  return [...names];
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component, { allowSubComponent: true })];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
