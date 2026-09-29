#!/usr/bin/env node
/**
 * 02-stencil-antipatterns.mjs
 *
 * Scans TSX and CSS for Stencil and project anti-patterns. Each rule's `code` is
 * its stable identifier; its `ruleScope` names the doc that owns it:
 * `'stencil'` → `.claude/skills/stencil-compliance/`, `'project'` →
 * `_agents/anti-patterns.md` and the token/icon/security docs.
 *
 * Replaces AI work in:
 *   - `.claude/commands/pre-pr-check.md` Wave 1 (6 separate rg calls)
 *   - `.claude/skills/audit-component/SKILL.md` Wave 1 (~14 anti-pattern greps)
 *   - `.claude/agents/audit-production.md` Phase 1.2.1 + 1.2.2 (lifecycle + reactivity)
 *
 * Patterns are evaluated per-line for fast O(n) scans. Two patterns need
 * file-level state (lifecycle pairing, form-associated context); they have
 * dedicated check functions.
 *
 * Usage:
 *   node scripts/audit/02-stencil-antipatterns.mjs mud-button [--json] [--out file]
 *   node scripts/audit/02-stencil-antipatterns.mjs --all --json
 *
 * Output JSON envelope: see scripts/audit/lib/json-output.mjs (schemaVersion 1.0.0).
 *
 * Quality note: this script produces structurally MORE detail than the prior
 * AI workflow (every match gets file:line; the AI workflow only reported counts).
 * That extra detail is additive, not lossy — AI consumers can ignore line info
 * if they only want the count, but they gain precise navigation when desired.
 */
import { readFile } from 'node:fs/promises';
import { isEntrypoint } from '../lib/is-entrypoint.mjs';
import postcss from 'postcss';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';

const TOOL = 'stencil-antipatterns';

const USAGE = defaultUsage(
  '02-stencil-antipatterns',
  'Scan TSX and CSS for Stencil 4.x and project-specific anti-patterns (lifecycle leaks, reactive mutations, inline styles, raw colors, etc.).',
);

/**
 * Components whose documented content API is a hybrid: a text prop that renders,
 * and a slot that overrides it (ANTIPATTERN-026). Issue #165 decided the rule
 * (Option C of docs/backlog/2026-05-27-slot-first-content-refactor.md); each
 * entry carries the reason. A new hybrid is added here deliberately, never
 * silenced in place.
 */
export const HYBRID_CONTENT_COMPONENTS = new Map([
  // Field labels and helper text: a plain string in ~95% of uses, and the
  // component wires it itself (`<label for>`, `aria-describedby`).
  ['mud-checkbox', 'field label and supporting text'],
  ['mud-date-input', 'field label and helper text'],
  ['mud-file-input', 'field label and helper text'],
  ['mud-input-chip', 'field label and helper text'],
  ['mud-numeric-input', 'field label and helper text'],
  ['mud-phone-input', 'field label and helper text'],
  ['mud-radio', 'field label and supporting text'],
  ['mud-search-input', 'field label and helper text'],
  ['mud-select', 'field label and helper text'],
  ['mud-switch', 'field label and supporting text'],
  ['mud-text-input', 'field label and helper text'],
  ['mud-textarea', 'field label and helper text'],
  ['mud-time-input', 'field label and helper text'],
  // Short plain text with a rich override.
  ['mud-accordion-item', 'heading and supporting text'],
  ['mud-breadcrumb-item', 'item label'],
  ['mud-menu-item', 'item label'],
  ['mud-modal', 'title (wired to aria-labelledby) and image'],
  ['mud-separator', 'separator label'],
  ['mud-sidebar-item', 'item label'],
  ['mud-tab', 'tab label'],
  ['mud-tag', 'tag label'],
  ['mud-tooltip', 'tooltip content'],
  // Data first, slot as the per-cell override.
  ['mud-table', 'cell values, header labels and the empty-state text'],
]);

/** `content` with JS comments replaced by spaces, newlines kept, so line numbers hold. */
export function blankJsComments(content) {
  return content.replace(
    /\/\*[\s\S]*?\*\/|(^|[^:'"`\\])\/\/[^\n]*/g,
    (match, lead = '') => lead + match.slice(lead.length).replace(/[^\n]/g, ' '),
  );
}

/** Index of the `}` closing the `{` at `open`, or -1. */
function matchingBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/**
 * Whether JSX `text` holds a `{...}` in the position of a child — text content —
 * rather than inside a tag's attributes. With `insideOnly`, a child of an element
 * counts but a top-level expression does not (for a JS body mixing code and JSX).
 */
export function hasChildExpression(text, from = 0, insideOnly = false) {
  let elementDepth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '<' && /[A-Za-z/]/.test(text[i + 1] ?? '')) {
      const closing = text[i + 1] === '/';
      let j = i + 1;
      for (; j < text.length && text[j] !== '>'; j++) {
        if (text[j] === '{') {
          j = matchingBrace(text, j);
          if (j === -1) return false;
        }
      }
      const selfClosing = text[j - 1] === '/';
      if (closing) elementDepth = Math.max(0, elementDepth - 1);
      else if (!selfClosing) elementDepth++;
      i = j;
    } else if (ch === '{') {
      if (!insideOnly || elementDepth > 0) return true;
      const end = matchingBrace(text, i);
      if (end === -1) return false;
      if (hasChildExpression(text.slice(i + 1, end), 0, true)) return true;
      i = end;
    }
  }
  return false;
}

/**
 * Pattern registry. Each entry:
 *   - code:     stable identifier (referenced by AI workflows and tests)
 *   - severity: error | warning | info
 *   - scope:     'tsx' | 'css' (which file kind to scan)
 *   - ruleScope: 'stencil' | 'project' (which doc owns the rule)
 *   - regex:     matched line-by-line; capture group 0 is the snippet shown
 *   - filter:    optional fn(match, ctx) => boolean — skip false positives
 *   - message:   human-readable description
 *   - fix:       optional one-line remediation hint
 *
 * Cite rules by `code`; the number inside a code is historical, not an index
 * into any doc.
 */
export const PATTERNS = [
  // ── TSX patterns ──────────────────────────────────────────────────────────
  {
    code: 'ANTIPATTERN-TS-ANY',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'project',
    regex: /:\s*any\b/,
    message: 'TypeScript `any` violates strict mode — use a specific type or `unknown`.',
    fix: 'Replace `: any` with a specific type or `unknown` + narrowing.',
  },
  {
    code: 'ANTIPATTERN-001-INLINE-STYLE',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /\bstyle=\{/,
    message: 'Inline `style={}` in JSX — violates CSP and bypasses design tokens.',
    fix: 'Move styles to the CSS file and toggle via classes / attribute selectors on :host.',
  },
  {
    code: 'ANTIPATTERN-002-HOST-CLASSLIST',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /this\.host\.classList\.(add|remove|toggle)/,
    message: 'Imperative `host.classList.*` — Stencil expects declarative state via @State + render().',
    fix: 'Add @State() classes or compute className in render() returning <Host class={...}>.',
  },
  {
    code: 'ANTIPATTERN-023-CLASSNAME',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /\bclassName=/,
    message: '`className=` is React syntax — Stencil JSX uses `class=`.',
    fix: 'Replace `className=` with `class=`.',
  },
  {
    code: 'ANTIPATTERN-004-EVENTEMITTER-UNTYPED',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    // Type-annotation context only (`: EventEmitter`) — avoids matching `import { EventEmitter }`.
    regex: /:\s*EventEmitter(?!<)/,
    message: '`EventEmitter` without a generic type — payload type is `any`.',
    fix: 'Use `EventEmitter<PayloadType>` with the exact payload shape.',
  },
  {
    code: 'ANTIPATTERN-005-ARRAY-MUTATION',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /\bthis\.\w+\.(push|pop|shift|unshift|splice|sort|reverse)\(/,
    message: 'Direct mutation of a reactive array via push/pop/splice/sort/etc — Stencil will not re-render.',
    fix: 'Use immutable updates: `this.items = [...this.items, x]` or `this.items = this.items.filter(...)`.',
  },
  {
    code: 'ANTIPATTERN-013-FORCEUPDATE',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /\bforceUpdate\(/,
    message: '`forceUpdate()` is an escape hatch — usually masks a reactivity bug.',
    fix: 'Use @State() correctly; ensure props/state are reassigned (not mutated).',
  },
  {
    code: 'ANTIPATTERN-014-SHOULDUPDATE',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /\bcomponentShouldUpdate\b/,
    message: '`componentShouldUpdate` is forbidden — Stencil already optimizes rerenders.',
    fix: 'Remove and trust the framework; investigate root reactivity bug if needed.',
  },
  {
    code: 'ANTIPATTERN-TS-IGNORE',
    severity: 'warning',
    scope: 'tsx',
    ruleScope: 'project',
    regex: /@ts-(ignore|expect-error)\b/,
    message: 'TypeScript suppression directive — usually hides a real issue.',
    fix: 'Investigate the underlying type error; if suppression is truly needed, leave a // why-comment above.',
  },
  // ANTIPATTERN-025-EVENT-PREFIX — handled in FILE_CHECKS (needs cross-line pairing)
  {
    code: 'ANTIPATTERN-021-RAW-SVG',
    severity: 'warning',
    scope: 'tsx',
    ruleScope: 'project',
    regex: /<svg\b/,
    message: 'Raw `<svg>` in JSX — use <mud-icon> component for consistency and accessibility.',
    fix: 'Replace with <mud-icon name="..."/> or add a local icon to src/assets/icons/.',
    filter: ({ componentName }) => componentName !== 'mud-icon' && componentName !== 'mud-illustration',
  },
  {
    code: 'ANTIPATTERN-SECURITY-INNERHTML',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'project',
    regex: /\binnerHTML\s*=/,
    message: 'innerHTML assignment — XSS risk. Use textContent or a sanitized renderer.',
    fix: 'Use textContent for plain text; if HTML is required, sanitize via DOMPurify or equivalent.',
  },
  {
    code: 'ANTIPATTERN-010-SETFORMVALUE-1ARG',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    regex: /\bsetFormValue\(\s*[^,)]+\s*\)/,
    message: 'setFormValue() called with 1 argument — Stencil requires (value, state) for form restoration.',
    fix: 'Pass the second `state` argument: this.internals.setFormValue(value, value).',
  },

  // ── CSS patterns ──────────────────────────────────────────────────────────
  {
    code: 'ANTIPATTERN-020-PALETTE-IN-CSS',
    severity: 'error',
    scope: 'css',
    ruleScope: 'project',
    regex: /var\(\s*--palette-/,
    message: 'Component CSS references --palette-* directly — breaks 3-tier hierarchy.',
    fix: 'Use a semantic token (--color-*, --spacing-*, --font-*) instead; map via tokens/core/components/<name>.tokens.json.',
  },
  {
    code: 'ANTIPATTERN-019-RAW-HEX',
    severity: 'error',
    scope: 'css',
    ruleScope: 'project',
    regex: /#[0-9a-fA-F]{3,8}\b/,
    message: 'Hardcoded hex color — should be a design token.',
    fix: 'Replace with var(--color-*) semantic token; if no token exists, add one to tokens/core/.',
    filter: ({ line }) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) return false;
      return true;
    },
  },
  {
    code: 'ANTIPATTERN-RAW-PIXELS',
    severity: 'warning',
    scope: 'css',
    ruleScope: 'project',
    // Not inside a name (`--size-x2px`, `--space-2px`); a negative value (`-2px`) still counts.
    regex: /(?<![\w.])(?<!\w-)(\d+(?:\.\d+)?)px\b/,
    message: 'Hardcoded pixel value — should use a spacing/sizing token.',
    fix: 'Replace with var(--spacing-*) or var(--size-*); allow 0px and 1px (borders/resets) only.',
    filter: ({ match, line }) => {
      const num = Number(match[1]);
      if (num <= 1) return false;
      const trimmed = line.trim();
      if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return false;
      // No token scale covers these: breakpoint conditions (including a condition continued on
      // the next line), the literal fallback of a token reference, arithmetic inside calc(), and
      // sub-pixel hairlines (`0.5px`, already excluded by the `<= 1` test above).
      if (/^@(media|container)\b/.test(trimmed)) return false;
      if (
        /^(?:(?:and|or|not|only)\s+)?(?:(?:screen|print|all)\s+(?:and\s+)?)?\(\s*(?:(?:min|max)-)?(?:width|height)\s*[:<>=]/.test(
          trimmed,
        )
      ) {
        return false;
      }
      const before = line.slice(0, match.index);
      if (/var\(\s*--[\w-]+\s*,\s*-?$/.test(before)) return false;
      if (isInsideCalc(before)) return false;
      return true;
    },
  },
];

/**
 * File-level checks that need cross-line state. Each entry returns an array of
 * findings for the given file content.
 */
export const FILE_CHECKS = [
  {
    code: 'ANTIPATTERN-007-LIFECYCLE-LEAK',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    check: (content, ctx) => {
      const hasObserver =
        /\b(setInterval|setTimeout|addEventListener|ResizeObserver|MutationObserver|IntersectionObserver)\b/.test(
          content,
        );
      if (!hasObserver) return [];
      const hasCleanup = /\bdisconnectedCallback\s*\(/.test(content);
      if (hasCleanup) return [];
      const re = /\b(setInterval|setTimeout|addEventListener|ResizeObserver|MutationObserver|IntersectionObserver)\b/;
      const lineIdx = content.split('\n').findIndex(l => re.test(l));
      return [
        finding({
          severity: 'error',
          code: 'ANTIPATTERN-007-LIFECYCLE-LEAK',
          file: ctx.fileRel,
          line: lineIdx >= 0 ? lineIdx + 1 : undefined,
          message: `Uses observer/timer (setInterval, addEventListener, ResizeObserver, etc.) but lacks disconnectedCallback() — memory leak risk.`,
          fix: 'Add disconnectedCallback() that clears intervals/timeouts and removes listeners/observers.',
        }),
      ];
    },
  },
  {
    code: 'ANTIPATTERN-025-EVENT-PREFIX',
    severity: 'error',
    scope: 'tsx',
    ruleScope: 'stencil',
    check: (content, ctx) => {
      const findings = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/@Event\(/.test(lines[i])) continue;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const m = lines[j].match(/^\s*(?:private\s+|public\s+|readonly\s+)?(\w+)\s*[!:]/);
          if (!m) continue;
          const fieldName = m[1];
          if (!/^mud[A-Z]/.test(fieldName)) {
            findings.push(
              finding({
                severity: 'error',
                code: 'ANTIPATTERN-025-EVENT-PREFIX',
                file: ctx.fileRel,
                line: j + 1,
                message: `@Event field "${fieldName}" does not start with mud + PascalCase — project convention.`,
                snippet: lines[j].trim().slice(0, 120),
                fix: 'Rename the @Event field to start with `mud` + PascalCase (e.g., mudChange, mudClick).',
              }),
            );
          }
          break;
        }
      }
      return findings;
    },
  },
  // ─── Asset-loader patterns (lessons from mud-logo audit, 2026-05) ──────────
  {
    // A component that participates in the ARIA tree (reads the host's
    // `aria-label` through src/utils/aria-label.ts, or — in fixtures and legacy
    // code — declares an `ariaLabel` prop)
    // must keep its host attribute set even when the render bails — otherwise
    // screen readers traverse a nameless generic element. Use
    // `<Host aria-hidden="true" />` as the decorative fallback instead of
    // `return null;`.
    code: 'ANTIPATTERN-RENDER-NULL-NO-FALLBACK-ARIA',
    severity: 'warning',
    scope: 'tsx',
    ruleScope: 'project',
    check: (content, ctx) => {
      // Gate: the component names itself from `aria-label` (signals ARIA participation).
      if (!/@Prop\([^)]*\)\s+ariaLabel\b|\b(?:observeAriaLabel|nameHostWithFallback)\(/.test(content)) return [];

      const lines = content.split('\n');

      // Find `return null;` lines that sit inside what looks like a render() method.
      // Cheap heuristic: any `return null;` at all in a file that declares ariaLabel
      // AND a render() method. If the file contains a `<Host[^>]*aria-hidden` somewhere
      // (the recommended fallback shape), we accept that as the decorative branch.
      const hasReturnNull = /^\s*return\s+null\s*;\s*$/m.test(content);
      if (!hasReturnNull) return [];

      const hasRenderFn = /\brender\s*\(\s*\)\s*\{/.test(content);
      if (!hasRenderFn) return [];

      const hasHostHiddenFallback = /<Host[^>]*aria-hidden/.test(content);
      if (hasHostHiddenFallback) return [];

      const lineIdx = lines.findIndex(l => /^\s*return\s+null\s*;\s*$/.test(l));
      return [
        finding({
          severity: 'warning',
          code: 'ANTIPATTERN-RENDER-NULL-NO-FALLBACK-ARIA',
          file: ctx.fileRel,
          line: lineIdx >= 0 ? lineIdx + 1 : undefined,
          message:
            '`return null` in a component that declares `ariaLabel` strips the host from the a11y tree. Screen readers will traverse a nameless generic element.',
          snippet: lineIdx >= 0 ? lines[lineIdx].trim().slice(0, 120) : undefined,
          fix: 'Return `<Host aria-hidden="true" />` instead of `null` so the host stays explicitly decorative for assistive tech.',
        }),
      ];
    },
  },
  {
    // A Map used to cache fetch promises must evict null results, otherwise a
    // transient failure (404 during deploy, network blip) permanently locks
    // future consumers out of retrying the same URL.
    code: 'ANTIPATTERN-FETCH-CACHE-NO-EVICTION',
    severity: 'warning',
    scope: 'providers',
    ruleScope: 'project',
    check: (content, ctx) => {
      // Gate: file must actually do fetch-based caching.
      if (!/\bfetch\s*\(/.test(content)) return [];

      const findings = [];
      const cacheDecls = [...content.matchAll(/\bconst\s+(\w*[Cc]ache\w*)\s*=\s*new\s+Map\b/g)];
      if (cacheDecls.length === 0) return findings;

      const lines = content.split('\n');
      for (const decl of cacheDecls) {
        const name = decl[1];
        const setRe = new RegExp(`\\b${name}\\.set\\s*\\(`);
        const deleteRe = new RegExp(`\\b${name}\\.delete\\s*\\(`);
        if (!setRe.test(content)) continue;
        if (deleteRe.test(content)) continue;

        const setLine = lines.findIndex(l => setRe.test(l));
        findings.push(
          finding({
            severity: 'warning',
            code: 'ANTIPATTERN-FETCH-CACHE-NO-EVICTION',
            file: ctx.fileRel,
            line: setLine >= 0 ? setLine + 1 : undefined,
            message: `Cache "${name}" stores fetch promises but never deletes failed results — a transient null/404 locks future consumers out of retrying.`,
            snippet: setLine >= 0 ? lines[setLine].trim().slice(0, 120) : undefined,
            fix: `After ${name}.set(url, p), add: p.then(r => { if (r === null) ${name}.delete(url); });`,
          }),
        );
      }
      return findings;
    },
  },
  {
    // Content API rule (src/components/_agents/slot-patterns.md, "Prop, Slot or Hybrid"):
    // a text prop rendered as a slot's fallback (a hybrid) is the documented API
    // of the components in HYBRID_CONTENT_COMPONENTS only. Anywhere else it is a
    // second way to set the same content that nobody decided on.
    //
    // Flags text, not markup: a `{...}` in the position of a child (the fallback's
    // text) counts; an attribute value (`<mud-icon name={iconName} />`, a default
    // icon) and a comment do not.
    //   Variant A — inside the slot:   <slot name="x">{this.label}</slot>
    //   Variant B — beside the slot:   <slot /> {!this.hasLabelSlot && labelText}
    //     (only behind a `has*Slot` guard, the "slot is empty" marker, so a data
    //     render such as `{this.renderDataTabs()}` beside a slot is not a fallback)
    code: 'ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK',
    severity: 'warning',
    scope: 'tsx',
    ruleScope: 'project',
    check: (raw, ctx) => {
      if (HYBRID_CONTENT_COMPONENTS.has(ctx.componentName)) return [];
      const content = blankJsComments(raw);
      const findings = [];

      const openRe = /<slot\b[^>]*[^/]>/g;
      let m;
      while ((m = openRe.exec(content)) !== null) {
        const openEnd = openRe.lastIndex;
        const closeIdx = content.indexOf('</slot>', openEnd);
        if (closeIdx === -1) continue;
        const inner = content.slice(openEnd, closeIdx);
        if (!hasChildExpression(inner, 0)) continue;
        findings.push(
          finding({
            severity: 'warning',
            code: 'ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK',
            file: ctx.fileRel,
            line: content.slice(0, m.index).split('\n').length,
            message:
              'Slot falls back to text from a JSX expression (a hybrid: text prop, slot overrides it). Hybrids are the documented API only of the components in HYBRID_CONTENT_COMPONENTS.',
            snippet: `${m[0]}${inner.trim().slice(0, 60)}…</slot>`.slice(0, 140),
            fix: 'Plain text the component wires itself stays a prop; rich content is a slot. If this component should be a hybrid (a field label or helper text, short plain text), add it to HYBRID_CONTENT_COMPONENTS with the reason.',
          }),
        );
      }

      const siblingSlotRe = /<slot\b[^>]*(?:\/>|>\s*<\/slot>)/g;
      let s;
      while ((s = siblingSlotRe.exec(content)) !== null) {
        const trimmed = content.slice(siblingSlotRe.lastIndex, siblingSlotRe.lastIndex + 240).replace(/^\s+/, '');
        if (!trimmed.startsWith('{')) continue;
        const end = matchingBrace(trimmed, 0);
        if (end === -1) continue;
        const body = trimmed.slice(1, end);
        if (!/\bhas\w*Slot\b/.test(body)) continue;
        // A bare value is text; markup counts only when an element inside it renders text.
        if (/<[A-Za-z]/.test(body) && !hasChildExpression(body, 0, true)) continue;
        findings.push(
          finding({
            severity: 'warning',
            code: 'ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK',
            file: ctx.fileRel,
            line: content.slice(0, s.index).split('\n').length,
            message:
              'Slot sibling renders text when the slot is empty (a hybrid: text prop, slot overrides it). Hybrids are the documented API only of the components in HYBRID_CONTENT_COMPONENTS.',
            snippet: `${s[0]} ${trimmed.slice(0, end + 1).slice(0, 80)}…`.slice(0, 160),
            fix: 'Plain text the component wires itself stays a prop; rich content is a slot. If this component should be a hybrid (a field label or helper text, short plain text), add it to HYBRID_CONTENT_COMPONENTS with the reason.',
          }),
        );
      }

      return findings;
    },
  },
  {
    code: 'ANTIPATTERN-HOST-DISPLAY',
    severity: 'warning',
    scope: 'css',
    ruleScope: 'stencil',
    check: (content, ctx) => {
      let root;
      try {
        root = postcss.parse(content);
      } catch {
        // Stylelint parses every stylesheet in `yarn lint` and fails on a syntax error; this
        // check has nothing to add to that report.
        return [];
      }
      if (!root.nodes.some(node => node.type !== 'comment')) return [];
      // Only a rule whose selector list includes a bare `:host` sets the element's default
      // display, and only when nothing conditional wraps it: `:host(...)` state rules, a `:host`
      // under `@media`/`@supports` and a `:host` nested in another rule do not. `@layer` applies
      // unconditionally. Rules nested inside a bare block (postcss-nested) style something else,
      // so only the block's own declarations count. No bare rule at all leaves it inline.
      const hostRules = [];
      root.walkRules(rule => {
        if (!rule.selectors.includes(':host')) return;
        for (let p = rule.parent; p !== root; p = p.parent) {
          if (p.type !== 'atrule' || p.name !== 'layer') return;
        }
        hostRules.push(rule);
      });
      if (hostRules.some(rule => rule.nodes.some(node => node.type === 'decl' && node.prop === 'display'))) {
        return [];
      }
      const line = hostRules[0]?.source?.start?.line ?? 1;
      return [
        finding({
          severity: 'warning',
          code: 'ANTIPATTERN-HOST-DISPLAY',
          file: ctx.fileRel,
          line,
          message: '`:host` has no `display` — a custom element defaults to `display: inline`.',
          fix: 'Declare `display` in the bare `:host { }` rule.',
        }),
      ];
    },
  },
];

async function main() {
  const args = parseAuditArgs({ toolName: TOOL, usage: USAGE });
  const t0 = Date.now();

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({
          tool: TOOL,
          target: 'changed',
          findings: [],
          meta: { durationMs: Date.now() - t0, componentsScanned: 0, note: 'no changed components' },
        }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const perComponent = await Promise.all(targets.map(target => analyzeComponent(target)));

  const findings = perComponent.flatMap(c => c.findings);
  const filesScanned = perComponent.reduce((sum, c) => sum + c.filesScanned, 0);

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      filesScanned,
      patternsEvaluated: PATTERNS.length + FILE_CHECKS.length,
    },
  });

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze a single component target. Pure async function — exported for tests.
 *
 * Reads TSX + CSS files (if they exist) and applies every pattern in parallel.
 * Returns { findings, filesScanned, componentName }.
 */
export async function analyzeComponent(target) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      filesScanned: 0,
      componentName: target.name ?? null,
    };
  }

  const filesToScan = [];
  if (target.exists.tsx) filesToScan.push({ kind: 'tsx', path: target.paths.tsx });
  if (target.exists.css) filesToScan.push({ kind: 'css', path: target.paths.css });
  if (target.exists.providers) filesToScan.push({ kind: 'providers', path: target.paths.providers });

  if (filesToScan.length === 0) {
    return { findings: [], filesScanned: 0, componentName: target.name };
  }

  const fileContents = await Promise.all(
    filesToScan.map(async f => ({
      kind: f.kind,
      path: f.path,
      rel: relativeToRepo(f.path),
      content: await readFile(f.path, 'utf8'),
    })),
  );

  const findings = [];
  for (const file of fileContents) {
    findings.push(...scanFile(file, target.name));
  }

  return { findings, filesScanned: filesToScan.length, componentName: target.name };
}

/**
 * Replace every character inside CSS block comments with a space, preserving
 * newlines (and therefore line numbers) so downstream regex matching skips
 * the comment text without disturbing the file's line layout.
 */
export function stripCssBlockComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));
}

/**
 * True when the text ending at a match leaves a `calc(` open, i.e. the match sits
 * inside that calc's parentheses (nested `var(...)` groups are balanced out).
 */
function isInsideCalc(before) {
  const stack = [];
  // Every `(` is pushed, named or bare, so each `)` pops its own group. The innermost named
  // function decides: a pixel literal inside `min()`, `max()` or `clamp()` is a hard-coded
  // size even within `calc()`. CSS function names are case-insensitive and may carry a vendor prefix.
  for (const m of before.matchAll(/([\w-]*)\(|\)/g)) {
    if (m[0] === ')') stack.pop();
    else stack.push(m[1] ? m[1].toLowerCase().replace(/^-[a-z]+-/, '') : null);
  }
  return stack.filter(name => name !== null).at(-1) === 'calc';
}

/**
 * Apply all patterns + file checks to one file's content. Exported for tests
 * so we can pass synthetic content without touching disk.
 */
export function scanFile(file, componentName) {
  const findings = [];
  // For CSS, blank out block-comment bodies so multi-line comments don't
  // trip patterns like RAW-PIXELS / RAW-HEX. Line numbers stay intact because
  // we only replace non-newline characters with spaces.
  const scanContent = file.kind === 'css' ? stripCssBlockComments(file.content) : file.content;
  const lines = scanContent.split('\n');

  for (const pattern of PATTERNS) {
    if (pattern.scope !== file.kind) continue;

    const isMultilinePattern = pattern.regex.source.includes('[\\s\\n]+');
    if (isMultilinePattern) {
      const multiRe = new RegExp(pattern.regex.source, 'g');
      let m;
      while ((m = multiRe.exec(scanContent)) !== null) {
        if (pattern.filter && !pattern.filter({ match: m, line: m[0], componentName })) continue;
        const lineNum = scanContent.slice(0, m.index).split('\n').length;
        findings.push(
          finding({
            severity: pattern.severity,
            code: pattern.code,
            file: file.rel,
            line: lineNum,
            message: pattern.message,
            snippet: m[0].slice(0, 120).replace(/\s+/g, ' '),
            fix: pattern.fix,
          }),
        );
      }
      continue;
    }

    // Run the pattern with `g` flag so we catch ALL matches on each line
    // (e.g. `width: 32px; height: 200px;` has two raw-pixel hits).
    const globalRe = new RegExp(
      pattern.regex.source,
      pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g',
    );
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      globalRe.lastIndex = 0;
      let m;
      while ((m = globalRe.exec(line)) !== null) {
        if (pattern.filter && !pattern.filter({ match: m, line, componentName })) {
          // Avoid infinite loop when filter rejects a zero-width match
          if (m.index === globalRe.lastIndex) globalRe.lastIndex++;
          continue;
        }
        findings.push(
          finding({
            severity: pattern.severity,
            code: pattern.code,
            file: file.rel,
            line: i + 1,
            column: m.index !== undefined ? m.index + 1 : undefined,
            message: pattern.message,
            snippet: line.trim().slice(0, 120),
            fix: pattern.fix,
          }),
        );
        if (m.index === globalRe.lastIndex) globalRe.lastIndex++;
      }
    }
  }

  for (const check of FILE_CHECKS) {
    if (check.scope !== file.kind) continue;
    findings.push(...check.check(file.content, { fileRel: file.rel, componentName }));
  }

  return findings;
}

async function resolveTargets(args) {
  if (args.all) {
    return listAllComponents().map(c => resolveComponentPaths(c.name));
  }
  if (args.changed) {
    const names = listChangedComponents();
    return names.map(n => resolveComponentPaths(n));
  }
  return [resolveComponentPaths(args.component, { allowSubComponent: true })];
}

const isDirectRun = isEntrypoint(import.meta.url);
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
