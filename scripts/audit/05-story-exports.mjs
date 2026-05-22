#!/usr/bin/env node
/**
 * 05-story-exports.mjs
 *
 * Enumerates named exports of a `cor-X.stories.ts` file and maps them to
 * Storybook IDs, then reports coverage against the project's standard story
 * lineup (Default / AllVariants / AllSizes / States / etc.).
 *
 * Story ID convention:
 *   `${kebab(titleSegment1)}-${kebab(titleSegment2)}--${kebab(storyExportName)}`
 *   where title comes from the default export's `title` field (`Atoms/Button`).
 *
 * Replaces AI work in:
 *   - `.claude/agents/pixel-perfect-verifier.md` Step 2
 *   - `.claude/agents/story-writer.md` Step 1 (story enumeration)
 *   - `.claude/agents/audit-production.md` Phase 4.1 (story coverage)
 *
 * Two parsing strategies:
 *   1. Inline default export (`export default { title: '...', ... }`) — common in older stories
 *   2. Variable + default reference (`const meta: Meta = { ... }; export default meta;`) — CSF3 idiom
 *
 * Usage:
 *   node scripts/audit/05-story-exports.mjs cor-button --json
 *   node scripts/audit/05-story-exports.mjs --all --json
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { createSourceFile, getLineNumber } from './lib/ts-parser.mjs';

const TOOL = 'story-exports';

const USAGE = defaultUsage(
  '05-story-exports',
  'Enumerate stories exported by *.stories.ts and report Storybook IDs + coverage against the standard story lineup.',
);

/**
 * The standard story lineup the project expects for production components.
 * Each entry: { canonical: pretty name, regex: matches the named export.
 *               recommended: true means warn if missing, false means info-only. }
 */
const STANDARD_STORIES = [
  // Every production component should have a Default story (the primary example).
  { canonical: 'Default', regex: /^Default$/, recommended: true },
  // Variant/size/state lineup is optional — depends on component API.
  // Surfaced as info-only so AI can judge whether the component needs them.
  { canonical: 'AllVariants', regex: /^(All)?Variants?(Table|Grid|List)?$/i, recommended: false },
  { canonical: 'AllSizes', regex: /^(All)?Sizes?(Table|Grid|List)?$/i, recommended: false },
  { canonical: 'States', regex: /^(All)?States?(Table|Grid|List)?$/i, recommended: false },
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

  const perComponent = await Promise.all(targets.map(t => analyzeComponent(t)));
  const findings = perComponent.flatMap(c => c.findings);

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      storiesTotal: perComponent.reduce((acc, c) => acc + (c.stories?.length ?? 0), 0),
    },
  });

  // Attach per-component story data when single-target so consumers can read it without re-running
  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.stories = perComponent[0].stories;
    result.meta.coverage = perComponent[0].coverage;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze a single component's story file. Pure async — exported for tests.
 * Returns { findings, stories, coverage, componentName }.
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
      stories: [],
      coverage: null,
      componentName: target.name ?? null,
    };
  }
  if (!target.exists.stories) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STORY-FILE-MISSING',
          file: relativeToRepo(target.paths.stories),
          message: `No stories file at ${relativeToRepo(target.paths.stories)}.`,
          fix: 'Run scripts/scaffold/story-scaffold.mjs (Sprint 2) or write a stories file manually.',
        }),
      ],
      stories: [],
      coverage: null,
      componentName: target.name,
    };
  }

  return analyzeStoriesFile(target.paths.stories, target.name);
}

/**
 * Analyze a stories file directly. Exported so tests can pass arbitrary paths.
 */
export function analyzeStoriesFile(storiesPath, componentName) {
  const sourceFile = createSourceFile(storiesPath);
  const fileRel = relativeToRepo(storiesPath);
  const findings = [];

  const title = extractStoryTitle(sourceFile);
  if (!title) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'STORY-NO-TITLE',
        file: fileRel,
        message: `Could not extract default export's "title" field — story IDs may be wrong.`,
        fix: `Add { title: 'Atoms/${componentName?.replace(/^cor-/, '')}', component: '${componentName}', ... } to the default export.`,
      }),
    );
  }

  const exports = extractStoryExports(sourceFile);
  const stories = exports.map(e => ({
    name: e.name,
    storyId: title ? buildStoryId(title, e.name) : null,
    line: e.line,
  }));

  const coverage = computeCoverage(exports.map(e => e.name));

  // Missing recommended stories → warning
  for (const slot of STANDARD_STORIES) {
    if (!coverage[slot.canonical] && slot.recommended) {
      findings.push(
        finding({
          severity: 'warning',
          code: `STORY-MISSING-${slot.canonical.toUpperCase()}`,
          file: fileRel,
          message: `No story matching "${slot.canonical}" exported.`,
          fix: `Add \`export const ${slot.canonical} = { args: {...}, render: (args) => html\\\`...\\\` };\`.`,
        }),
      );
    } else if (!coverage[slot.canonical]) {
      findings.push(
        finding({
          severity: 'info',
          code: `STORY-MISSING-${slot.canonical.toUpperCase()}`,
          file: fileRel,
          message: `Optional story "${slot.canonical}" not present (skip if component truly has no ${slot.canonical.toLowerCase()}).`,
        }),
      );
    }
  }

  if (exports.length === 0) {
    findings.push(
      finding({
        severity: 'error',
        code: 'STORY-NO-EXPORTS',
        file: fileRel,
        message: `No story exports found in ${fileRel}.`,
      }),
    );
  }

  // docs.source contract checks — lessons captured from the cor-logo audit
  // (2026-05): see .claude/skills/audit-component/SKILL.md story-coverage list.
  findings.push(...checkDocsSource(sourceFile, fileRel));

  return { findings, stories, coverage, title, componentName };
}

// ─── docs.source contract helpers ────────────────────────────────────────────

function findPropertyInit(objLiteral, name) {
  if (!objLiteral || !ts.isObjectLiteralExpression(objLiteral)) return null;
  for (const prop of objLiteral.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name) ? prop.name.text : null;
    if (key === name) return prop.initializer;
  }
  return null;
}

function unwrapAsSatisfies(node) {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))) {
    node = node.expression;
  }
  return node ?? null;
}

/**
 * Walk each named story export and apply 3 docs.source rules.
 *
 * Returns findings for any of:
 *   - STORY-DOCS-SOURCE-MISSING-DYNAMIC — `transform` is present but
 *     `parameters.docs.source.type` is not `'dynamic'`. The global `'code'`
 *     mode (.storybook/preview.js) caches the snippet at registration so the
 *     transform never re-runs on Controls changes.
 *   - STORY-DOCS-SOURCE-ARGS-ANY — the transform signature uses `any` for
 *     its parameter type(s) — usually `({ args }: any)`. Type the destructure.
 *   - STORY-COMPOSITE-NO-CODE-OVERRIDE — story disables Controls AND uses a
 *     helper-laden render (template-string `${…}` interpolations) AND
 *     provides neither `code` nor `transform`. The global `'code'` mode then
 *     exposes the demo render verbatim (wrapper divs, inline styles, loop
 *     guts) as the "Show code" snippet — useless to consumers.
 */
export function checkDocsSource(sourceFile, fileRel) {
  const findings = [];
  const sourceText = sourceFile.text;

  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt) || !hasExport(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const storyName = decl.name.text;
      const init = unwrapAsSatisfies(decl.initializer);
      if (!init || !ts.isObjectLiteralExpression(init)) continue;

      const params = findPropertyInit(init, 'parameters');
      const render = findPropertyInit(init, 'render');

      let controlsDisabled = false;
      let hasSourceCode = false;
      let hasSourceTransform = false;
      let sourceTypeIsDynamic = false;
      let transformNode = null;

      if (params && ts.isObjectLiteralExpression(params)) {
        const controls = findPropertyInit(params, 'controls');
        if (controls && ts.isObjectLiteralExpression(controls)) {
          const disable = findPropertyInit(controls, 'disable');
          if (disable && disable.kind === ts.SyntaxKind.TrueKeyword) controlsDisabled = true;
        }
        const docs = findPropertyInit(params, 'docs');
        const source = docs && ts.isObjectLiteralExpression(docs) ? findPropertyInit(docs, 'source') : null;
        if (source && ts.isObjectLiteralExpression(source)) {
          if (findPropertyInit(source, 'code')) hasSourceCode = true;
          const transform = findPropertyInit(source, 'transform');
          if (transform) {
            hasSourceTransform = true;
            transformNode = transform;
          }
          const typeInit = findPropertyInit(source, 'type');
          if (typeInit && ts.isStringLiteralLike(typeInit) && typeInit.text === 'dynamic') {
            sourceTypeIsDynamic = true;
          }
        }
      }

      // 1) STORY-DOCS-SOURCE-MISSING-DYNAMIC
      if (hasSourceTransform && !sourceTypeIsDynamic) {
        findings.push(
          finding({
            severity: 'warning',
            code: 'STORY-DOCS-SOURCE-MISSING-DYNAMIC',
            file: fileRel,
            line: getLineNumber(sourceFile, transformNode),
            message: `Story "${storyName}" provides docs.source.transform but no \`type: 'dynamic'\`. The global 'code' mode caches the snippet at registration so the transform never re-runs on Controls changes.`,
            fix: "Add `type: 'dynamic'` to `parameters.docs.source` alongside the transform.",
          }),
        );
      }

      // 2) STORY-DOCS-SOURCE-ARGS-ANY — textual scan of the transform's parameter list
      if (transformNode) {
        const txt = sourceText.slice(transformNode.pos, transformNode.end);
        const paramMatch = txt.match(/^\s*\(([^)]*)\)/);
        if (paramMatch && /\bany\b/.test(paramMatch[1])) {
          findings.push(
            finding({
              severity: 'warning',
              code: 'STORY-DOCS-SOURCE-ARGS-ANY',
              file: fileRel,
              line: getLineNumber(sourceFile, transformNode),
              message: `Story "${storyName}" docs.source.transform uses \`any\` in its parameter signature — typed destructure required.`,
              fix: 'Replace with `({ args }: { args: ComponentArgs })`.',
            }),
          );
        }
      }

      // 3) STORY-COMPOSITE-NO-CODE-OVERRIDE
      if (controlsDisabled && !hasSourceCode && !hasSourceTransform && render) {
        const renderText = sourceText.slice(render.pos, render.end);
        // Detect a template literal that interpolates JS (helpers, loops, etc.).
        const tplMatch = renderText.match(/`([\s\S]*)`/);
        if (tplMatch && /\$\{/.test(tplMatch[1])) {
          findings.push(
            finding({
              severity: 'warning',
              code: 'STORY-COMPOSITE-NO-CODE-OVERRIDE',
              file: fileRel,
              line: getLineNumber(sourceFile, render),
              message: `Story "${storyName}" disables Controls and uses a helper-laden render but has no \`parameters.docs.source.code\` override. The "Show code" panel will expose demo chrome (wrapper divs, inline styles, \${…} guts) verbatim.`,
              fix: 'Add a static `parameters.docs.source.code` with one clean `<cor-component …></cor-component>` per variation. See `src/components/cor-logo/cor-logo.stories.ts`.',
            }),
          );
        }
      }
    }
  }

  return findings;
}

/**
 * Walk the source file looking for the default export and extract its `title`
 * field. Supports both inline literals and `const meta = {...}; export default meta;`.
 */
export function extractStoryTitle(sourceFile) {
  // Strategy A: export default { title: '...', ... }
  for (const stmt of sourceFile.statements) {
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const expr = stmt.expression;
      if (ts.isObjectLiteralExpression(expr)) {
        return findTitle(expr);
      }
      if (ts.isIdentifier(expr)) {
        // Strategy B: const meta = {...}; export default meta;
        const varName = expr.text;
        const decl = findVariableInit(sourceFile, varName);
        if (decl && ts.isObjectLiteralExpression(decl)) return findTitle(decl);
        // Handle `meta satisfies Meta` and `meta as Meta`
        if (decl && (ts.isAsExpression(decl) || ts.isSatisfiesExpression(decl))) {
          const inner = decl.expression;
          if (ts.isObjectLiteralExpression(inner)) return findTitle(inner);
        }
      }
    }
  }
  return null;
}

function findTitle(objLiteral) {
  for (const prop of objLiteral.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'title') {
      if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
        return prop.initializer.text;
      }
    }
  }
  return null;
}

function findVariableInit(sourceFile, varName) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === varName && decl.initializer) {
        return decl.initializer;
      }
    }
  }
  return null;
}

/**
 * Collect named exports that look like Storybook stories. Filters out the
 * default export and helper re-exports.
 */
export function extractStoryExports(sourceFile) {
  const out = [];
  for (const stmt of sourceFile.statements) {
    if (ts.isVariableStatement(stmt) && hasExport(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          out.push({ name: decl.name.text, line: getLineNumber(sourceFile, decl) });
        }
      }
    }
  }
  return out;
}

function hasExport(node) {
  const mods = node.modifiers ?? [];
  return mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Build a Storybook story ID. Storybook lowercases + kebab-cases title and
 * concatenates with `--<storyName-kebab>`.
 *
 *   "Atoms/Button"   + "Default"      → "atoms-button--default"
 *   "Molecules/Tooltip" + "AllSizes"  → "molecules-tooltip--all-sizes"
 */
export function buildStoryId(title, storyName) {
  const titlePart = title
    .split('/')
    .map(s => kebabCase(s))
    .join('-');
  return `${titlePart}--${kebabCase(storyName)}`;
}

function kebabCase(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Coverage check: for each STANDARD_STORIES entry, does an exported name match?
 * Returns a map { canonicalName: matchedExportName | false }.
 */
export function computeCoverage(exportNames) {
  const coverage = {};
  for (const slot of STANDARD_STORIES) {
    const match = exportNames.find(n => slot.regex.test(n));
    coverage[slot.canonical] = match ?? false;
  }
  return coverage;
}

// ─── Target resolution (same pattern as other scripts) ─────────────────────

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
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

export { TOOL, STANDARD_STORIES };
