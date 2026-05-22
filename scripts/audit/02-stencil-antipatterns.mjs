#!/usr/bin/env node
/**
 * 02-stencil-antipatterns.mjs
 *
 * Scans TSX and CSS for the 16+ Stencil + project anti-patterns documented in
 * `.claude/skills/stencil-compliance/references/anti-patterns.md` and
 * `.claude/skills/audit-component/SKILL.md` Wave 1.
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
 *   node scripts/audit/02-stencil-antipatterns.mjs cor-button [--json] [--out file]
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
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';

const TOOL = 'stencil-antipatterns';

const USAGE = defaultUsage(
  '02-stencil-antipatterns',
  'Scan TSX and CSS for Stencil 4.x and project-specific anti-patterns (lifecycle leaks, reactive mutations, inline styles, raw colors, etc.).',
);

/**
 * Pattern registry. Each entry:
 *   - code:     stable identifier (referenced by AI workflows and tests)
 *   - severity: error | warning | info
 *   - scope:    'tsx' | 'css' (which file kind to scan)
 *   - regex:    matched line-by-line; capture group 0 is the snippet shown
 *   - filter:   optional fn(match, ctx) => boolean — skip false positives
 *   - message:  human-readable description
 *   - fix:      optional one-line remediation hint
 *
 * Anti-pattern numbers reference
 * `.claude/skills/stencil-compliance/references/anti-patterns.md`.
 */
export const PATTERNS = [
  // ── TSX patterns ──────────────────────────────────────────────────────────
  {
    code: 'ANTIPATTERN-TS-ANY',
    severity: 'error',
    scope: 'tsx',
    regex: /:\s*any\b/,
    message: 'TypeScript `any` violates strict mode — use a specific type or `unknown`.',
    fix: 'Replace `: any` with a specific type or `unknown` + narrowing.',
  },
  {
    code: 'ANTIPATTERN-001-INLINE-STYLE',
    severity: 'error',
    scope: 'tsx',
    regex: /\bstyle=\{/,
    message: 'Inline `style={}` in JSX — violates CSP and bypasses design tokens.',
    fix: 'Move styles to the CSS file and toggle via classes / attribute selectors on :host.',
  },
  {
    code: 'ANTIPATTERN-002-HOST-CLASSLIST',
    severity: 'error',
    scope: 'tsx',
    regex: /this\.host\.classList\.(add|remove|toggle)/,
    message: 'Imperative `host.classList.*` — Stencil expects declarative state via @State + render().',
    fix: 'Add @State() classes or compute className in render() returning <Host class={...}>.',
  },
  {
    code: 'ANTIPATTERN-023-CLASSNAME',
    severity: 'error',
    scope: 'tsx',
    regex: /\bclassName=/,
    message: '`className=` is React syntax — Stencil JSX uses `class=`.',
    fix: 'Replace `className=` with `class=`.',
  },
  // ANTIPATTERN-003-METHOD-NON-ASYNC — handled in FILE_CHECKS (needs cross-line pairing)
  {
    code: 'ANTIPATTERN-004-EVENTEMITTER-UNTYPED',
    severity: 'error',
    scope: 'tsx',
    // Type-annotation context only (`: EventEmitter`) — avoids matching `import { EventEmitter }`.
    regex: /:\s*EventEmitter(?!<)/,
    message: '`EventEmitter` without a generic type — payload type is `any`.',
    fix: 'Use `EventEmitter<PayloadType>` with the exact payload shape.',
  },
  {
    code: 'ANTIPATTERN-005-ARRAY-MUTATION',
    severity: 'error',
    scope: 'tsx',
    regex: /\bthis\.\w+\.(push|pop|shift|unshift|splice|sort|reverse)\(/,
    message: 'Direct mutation of a reactive array via push/pop/splice/sort/etc — Stencil will not re-render.',
    fix: 'Use immutable updates: `this.items = [...this.items, x]` or `this.items = this.items.filter(...)`.',
  },
  {
    code: 'ANTIPATTERN-013-FORCEUPDATE',
    severity: 'error',
    scope: 'tsx',
    regex: /\bforceUpdate\(/,
    message: '`forceUpdate()` is an escape hatch — usually masks a reactivity bug.',
    fix: 'Use @State() correctly; ensure props/state are reassigned (not mutated).',
  },
  {
    code: 'ANTIPATTERN-014-SHOULDUPDATE',
    severity: 'error',
    scope: 'tsx',
    regex: /\bcomponentShouldUpdate\b/,
    message: '`componentShouldUpdate` is forbidden — Stencil already optimizes rerenders.',
    fix: 'Remove and trust the framework; investigate root reactivity bug if needed.',
  },
  {
    code: 'ANTIPATTERN-TS-IGNORE',
    severity: 'warning',
    scope: 'tsx',
    regex: /@ts-(ignore|expect-error)\b/,
    message: 'TypeScript suppression directive — usually hides a real issue.',
    fix: 'Investigate the underlying type error; if suppression is truly needed, leave a // why-comment above.',
  },
  // ANTIPATTERN-025-EVENT-PREFIX — handled in FILE_CHECKS (needs cross-line pairing)
  {
    code: 'ANTIPATTERN-021-RAW-SVG',
    severity: 'warning',
    scope: 'tsx',
    regex: /<svg\b/,
    message: 'Raw `<svg>` in JSX — use <cor-icon> component for consistency and accessibility.',
    fix: 'Replace with <cor-icon name="..."/> or add a local icon to src/assets/icons/.',
    filter: ({ componentName }) => componentName !== 'cor-icon' && componentName !== 'cor-illustration',
  },
  {
    code: 'ANTIPATTERN-SECURITY-INNERHTML',
    severity: 'error',
    scope: 'tsx',
    regex: /\binnerHTML\s*=/,
    message: 'innerHTML assignment — XSS risk. Use textContent or a sanitized renderer.',
    fix: 'Use textContent for plain text; if HTML is required, sanitize via DOMPurify or equivalent.',
  },
  {
    code: 'ANTIPATTERN-010-SETFORMVALUE-1ARG',
    severity: 'error',
    scope: 'tsx',
    regex: /\bsetFormValue\(\s*[^,)]+\s*\)/,
    message: 'setFormValue() called with 1 argument — Stencil requires (value, state) for form restoration.',
    fix: 'Pass the second `state` argument: this.internals.setFormValue(value, value).',
  },

  // ── CSS patterns ──────────────────────────────────────────────────────────
  {
    code: 'ANTIPATTERN-020-PALETTE-IN-CSS',
    severity: 'error',
    scope: 'css',
    regex: /var\(\s*--palette-/,
    message: 'Component CSS references --palette-* directly — breaks 3-tier hierarchy.',
    fix: 'Use a semantic token (--color-*, --spacing-*, --font-*) instead; map via tokens/core/components/<name>.tokens.json.',
  },
  {
    code: 'ANTIPATTERN-019-RAW-HEX',
    severity: 'error',
    scope: 'css',
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
    regex: /\b(\d+)px\b/,
    message: 'Hardcoded pixel value — should use a spacing/sizing token.',
    fix: 'Replace with var(--spacing-*) or var(--size-*); allow 0px and 1px (borders/resets) only.',
    filter: ({ match, line }) => {
      const num = Number(match[1]);
      if (num === 0 || num === 1) return false;
      const trimmed = line.trim();
      if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return false;
      return true;
    },
  },
  {
    code: 'ANTIPATTERN-IMPORTANT',
    severity: 'warning',
    scope: 'css',
    regex: /!important\b/,
    message: '!important is a code smell — usually indicates specificity issues.',
    fix: 'Remove !important; restructure selectors so the rule wins by specificity.',
  },
  {
    code: 'ANTIPATTERN-018-TRANSITION-ALL',
    severity: 'warning',
    scope: 'css',
    regex: /transition:\s*all\b/,
    message: '`transition: all` triggers reflow on every animatable property — performance and animation-bug magnet.',
    fix: 'Enumerate specific properties: `transition: background-color 0.2s, transform 0.2s`.',
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
    code: 'ANTIPATTERN-003-METHOD-NON-ASYNC',
    severity: 'error',
    scope: 'tsx',
    check: (content, ctx) => {
      const findings = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/@Method\(/.test(lines[i])) continue;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const sig = lines[j];
          // signature: <name>(...): <returnType>
          const m = sig.match(/^\s*\w+\s*\([^)]*\)\s*:\s*([A-Za-z_]\w*)/);
          if (!m) {
            if (/^\s*async\s+\w+\s*\(/.test(sig) || /^\s*\w+\s*\([^)]*\)\s*\{/.test(sig)) break;
            continue;
          }
          const returnType = m[1];
          if (returnType !== 'Promise' && returnType !== 'void') {
            if (!/\basync\b/.test(sig)) {
              findings.push(
                finding({
                  severity: 'error',
                  code: 'ANTIPATTERN-003-METHOD-NON-ASYNC',
                  file: ctx.fileRel,
                  line: j + 1,
                  message: `@Method() must return Promise<T> or be async — got "${returnType}".`,
                  snippet: sig.trim().slice(0, 120),
                  fix: 'Add `async` to the method or change return type to Promise<T>.',
                }),
              );
            }
          }
          break;
        }
      }
      return findings;
    },
  },
  {
    code: 'ANTIPATTERN-025-EVENT-PREFIX',
    severity: 'error',
    scope: 'tsx',
    check: (content, ctx) => {
      const findings = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/@Event\(/.test(lines[i])) continue;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const m = lines[j].match(/^\s*(?:private\s+|public\s+|readonly\s+)?(\w+)\s*[!:]/);
          if (!m) continue;
          const fieldName = m[1];
          if (!/^cor[A-Z]/.test(fieldName)) {
            findings.push(
              finding({
                severity: 'error',
                code: 'ANTIPATTERN-025-EVENT-PREFIX',
                file: ctx.fileRel,
                line: j + 1,
                message: `@Event field "${fieldName}" does not start with cor + PascalCase — project convention.`,
                snippet: lines[j].trim().slice(0, 120),
                fix: 'Rename the @Event field to start with `cor` + PascalCase (e.g., corChange, corClick).',
              }),
            );
          }
          break;
        }
      }
      return findings;
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
  return [resolveComponentPaths(args.component)];
}

function listChangedComponents() {
  const res = spawnSync('git', ['diff', '--name-only', 'main...HEAD'], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  const names = new Set();
  for (const line of (res.stdout ?? '').split('\n')) {
    const m = line.match(/^src\/(components|hidden)\/(cor-[a-z0-9-]+)\//);
    if (m) names.add(m[2]);
  }
  return [...names].sort();
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
