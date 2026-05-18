#!/usr/bin/env node
/**
 * 04-jsdoc-completeness.mjs
 *
 * Uses the TypeScript compiler API to extract the public API surface of a
 * `cor-*` component and verify each piece has a JSDoc block:
 *
 *   - Component class itself     → must have @description + ideally @example/@slot
 *   - @Prop()                     → JSDoc with description; optional props need @default
 *   - @Event()                    → JSDoc with description; generic type covered separately
 *   - @Method()                   → JSDoc with @param (per arg) and @returns
 *
 * Replaces AI work in:
 *   - `.claude/agents/audit-production.md` Phase 8.1 (JSDoc completeness)
 *   - `.claude/skills/audit-component/SKILL.md` Wave 2 docs check
 *
 * Usage:
 *   node scripts/audit/04-jsdoc-completeness.mjs cor-button [--json] [--out file]
 *   node scripts/audit/04-jsdoc-completeness.mjs --all
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import {
  createSourceFile,
  getComponentClass,
  getDecorators,
  getDecoratorName,
  hasJSDoc,
  getJSDocText,
  getJSDocTags,
  getLineNumber,
  getMemberName,
} from './lib/ts-parser.mjs';

const TOOL = 'jsdoc-completeness';

const USAGE = defaultUsage(
  '04-jsdoc-completeness',
  'Verify component class, props, events, and methods all have JSDoc blocks (with @default for optional props, @param/@returns for methods).',
);

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
      apiSurface: perComponent.reduce(
        (acc, c) => ({
          props: acc.props + (c.api?.props ?? 0),
          events: acc.events + (c.api?.events ?? 0),
          methods: acc.methods + (c.api?.methods ?? 0),
        }),
        { props: 0, events: 0, methods: 0 },
      ),
    },
  });

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze one component's TSX file. Pure async function — exported for tests.
 * Returns { findings, api: { props, events, methods }, componentName }.
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
      api: null,
      componentName: target.name ?? null,
    };
  }
  if (!target.exists.tsx) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'JSDOC-NO-TSX',
          file: relativeToRepo(target.paths.tsx),
          message: `Cannot audit JSDoc — TSX file missing.`,
        }),
      ],
      api: null,
      componentName: target.name,
    };
  }

  return analyzeTsxFile(target.paths.tsx, target.name);
}

/**
 * Analyze a TSX file directly. Exported separately so tests can pass arbitrary
 * file paths (including fixtures) without going through resolveComponentPaths.
 */
export function analyzeTsxFile(tsxPath, componentName) {
  const sourceFile = createSourceFile(tsxPath);
  const classNode = getComponentClass(sourceFile);
  const fileRel = relativeToRepo(tsxPath);
  const findings = [];

  if (!classNode) {
    findings.push(
      finding({
        severity: 'error',
        code: 'JSDOC-NO-COMPONENT-CLASS',
        file: fileRel,
        message: `No class with @Component decorator found in ${fileRel}.`,
      }),
    );
    return { findings, api: { props: 0, events: 0, methods: 0 }, componentName };
  }

  // 1. Component-level JSDoc
  if (!hasJSDoc(classNode)) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'JSDOC-COMPONENT-MISSING',
        file: fileRel,
        line: getLineNumber(sourceFile, classNode),
        message: `Component class ${classNode.name?.text ?? '(anonymous)'} has no JSDoc block.`,
        fix: 'Add a JSDoc above the class with @element, @slot (if applicable), and a brief description.',
      }),
    );
  } else {
    const text = getJSDocText(classNode);
    if (!text || text.length < 10) {
      findings.push(
        finding({
          severity: 'info',
          code: 'JSDOC-COMPONENT-THIN',
          file: fileRel,
          line: getLineNumber(sourceFile, classNode),
          message: `Component JSDoc is very short — consider adding @element, @slot, and an example.`,
        }),
      );
    }
  }

  // 2. Member-level: walk @Prop, @Event, @Method
  let propCount = 0;
  let eventCount = 0;
  let methodCount = 0;

  for (const member of classNode.members) {
    const decorators = getDecorators(member);
    if (decorators.length === 0) continue;

    const memberName = getMemberName(member);

    for (const decorator of decorators) {
      const decoratorName = getDecoratorName(decorator);

      if (decoratorName === 'Prop') {
        propCount++;
        checkPropJSDoc({ member, memberName, sourceFile, fileRel, findings });
      } else if (decoratorName === 'Event') {
        eventCount++;
        checkEventJSDoc({ member, memberName, sourceFile, fileRel, findings });
      } else if (decoratorName === 'Method') {
        methodCount++;
        checkMethodJSDoc({ member, memberName, sourceFile, fileRel, findings });
      }
    }
  }

  return {
    findings,
    api: { props: propCount, events: eventCount, methods: methodCount },
    componentName,
  };
}

// ─── Member checks ─────────────────────────────────────────────────────────

function checkPropJSDoc({ member, memberName, sourceFile, fileRel, findings }) {
  const line = getLineNumber(sourceFile, member);
  if (!hasJSDoc(member)) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'JSDOC-PROP-MISSING',
        file: fileRel,
        line,
        message: `@Prop() ${memberName ?? '(unnamed)'} has no JSDoc block.`,
        fix: 'Add a JSDoc block describing what the prop does and @default if optional.',
      }),
    );
    return;
  }

  const tags = getJSDocTags(member);
  const text = getJSDocText(member);
  if (!text || text.length < 5) {
    findings.push(
      finding({
        severity: 'info',
        code: 'JSDOC-PROP-THIN',
        file: fileRel,
        line,
        message: `@Prop() ${memberName} JSDoc is very short.`,
      }),
    );
  }

  // Has a default value (initialiser) but no @default tag?
  if (member.initializer && !tags.has('default')) {
    findings.push(
      finding({
        severity: 'info',
        code: 'JSDOC-PROP-DEFAULT-TAG',
        file: fileRel,
        line,
        message: `@Prop() ${memberName} has a default value but no @default tag — Storybook controls will lack default docs.`,
        fix: 'Add `@default <value>` to the JSDoc.',
      }),
    );
  }
}

function checkEventJSDoc({ member, memberName, sourceFile, fileRel, findings }) {
  const line = getLineNumber(sourceFile, member);
  if (!hasJSDoc(member)) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'JSDOC-EVENT-MISSING',
        file: fileRel,
        line,
        message: `@Event() ${memberName} has no JSDoc block.`,
        fix: 'Add a JSDoc describing when the event fires and its payload.',
      }),
    );
  }
}

function checkMethodJSDoc({ member, memberName, sourceFile, fileRel, findings }) {
  const line = getLineNumber(sourceFile, member);
  if (!hasJSDoc(member)) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'JSDOC-METHOD-MISSING',
        file: fileRel,
        line,
        message: `@Method() ${memberName} has no JSDoc block.`,
        fix: 'Add a JSDoc with @param for each argument and @returns for the return value.',
      }),
    );
    return;
  }
  const tags = getJSDocTags(member);
  const arity = (member.parameters ?? []).length;
  if (arity > 0 && !tags.has('param')) {
    findings.push(
      finding({
        severity: 'info',
        code: 'JSDOC-METHOD-PARAM-MISSING',
        file: fileRel,
        line,
        message: `@Method() ${memberName} takes ${arity} parameter(s) but JSDoc has no @param tag.`,
        fix: 'Document each parameter with @param {Type} name - description.',
      }),
    );
  }
  // Methods that have a non-void return type should have @returns
  if (member.type && !tags.has('returns') && !tags.has('return')) {
    findings.push(
      finding({
        severity: 'info',
        code: 'JSDOC-METHOD-RETURNS-MISSING',
        file: fileRel,
        line,
        message: `@Method() ${memberName} declares a return type but JSDoc has no @returns tag.`,
        fix: 'Add @returns describing the resolved value.',
      }),
    );
  }
}

// ─── Resolving targets (same pattern as 01/02) ─────────────────────────────

async function resolveTargets(args) {
  if (args.all) {
    return listAllComponents().map(c => resolveComponentPaths(c.name));
  }
  if (args.changed) {
    return listChangedComponents().map(n => resolveComponentPaths(n));
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
