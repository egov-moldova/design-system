#!/usr/bin/env node
/**
 * 14-component-contract.mjs
 *
 * Extracts the public API surface of a `cor-*` Stencil component using the
 * TypeScript compiler API:
 *
 *   - tag                 — from @Component({ tag: '...' })
 *   - shadow              — @Component({ shadow: true|false })
 *   - formAssociated      — @Component({ formAssociated: true })
 *   - props               — every @Prop()  → { name, type, default, reflect, mutable, jsDoc, line }
 *   - events              — every @Event() → { name, payloadType, jsDoc, line }
 *   - methods             — every @Method() → { name, params, returnType, jsDoc, line }
 *   - slots               — scraped from JSX `<slot>` / `<slot name="..."/>` usages
 *
 * This is the upstream data source for:
 *   - scripts/scaffold/story-scaffold.mjs  (generate CSF3 boilerplate)
 *   - scripts/scaffold/test-scaffold.mjs   (generate spec.tsx skeleton)
 *   - redesign-component agent Step 1 (read existing implementation)
 *
 * Replaces AI work in:
 *   - story-writer Step 1
 *   - test-writer Step 1
 *   - redesign-component Step 1 (the "read existing implementation" portion)
 *
 * Usage:
 *   node scripts/audit/14-component-contract.mjs cor-button --json
 *   node scripts/audit/14-component-contract.mjs --all --out contracts.json
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import {
  createSourceFile,
  getComponentClass,
  getDecorators,
  getDecoratorName,
  getJSDocText,
  getJSDocTags,
  getLineNumber,
  getMemberName,
} from './lib/ts-parser.mjs';

const TOOL = 'component-contract';

const USAGE = defaultUsage(
  '14-component-contract',
  "Extract a Stencil component's public API surface (tag, props, events, methods, slots) as structured JSON. Foundation for scaffolders and redesign workflows.",
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
          meta: { durationMs: Date.now() - t0, componentsScanned: 0 },
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
    },
  });

  // Attach full contracts in meta — the script's whole point is to expose data.
  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.contract = perComponent[0].contract;
  } else {
    result.meta.contracts = perComponent.map(c => c.contract).filter(Boolean);
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze a single component. Pure async — exported for tests.
 * Returns { findings, contract, componentName }.
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
      contract: null,
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
          message: `Cannot extract contract — TSX file missing.`,
        }),
      ],
      contract: null,
      componentName: target.name,
    };
  }

  return extractContractFromTsx(target.paths.tsx, target.name);
}

/**
 * Extract a contract from a TSX file path. Exported so tests can pass arbitrary
 * paths (including fixtures) without going through component-paths.
 */
export function extractContractFromTsx(tsxPath, componentName) {
  const sourceFile = createSourceFile(tsxPath);
  const classNode = getComponentClass(sourceFile);
  const fileRel = relativeToRepo(tsxPath);
  const findings = [];

  if (!classNode) {
    findings.push(
      finding({
        severity: 'error',
        code: 'CONTRACT-NO-COMPONENT-CLASS',
        file: fileRel,
        message: `No class with @Component decorator found in ${fileRel}.`,
      }),
    );
    return { findings, contract: null, componentName };
  }

  const componentDecorator = getDecorators(classNode).find(d => getDecoratorName(d) === 'Component');
  const componentOpts = extractDecoratorOptions(componentDecorator);

  const contract = {
    componentName,
    file: fileRel,
    className: classNode.name?.text ?? null,
    tag: componentOpts.tag ?? null,
    shadow: componentOpts.shadow ?? false,
    formAssociated: componentOpts.formAssociated ?? false,
    styleUrl: componentOpts.styleUrl ?? null,
    classDescription: getJSDocText(classNode) || null,
    props: [],
    events: [],
    methods: [],
    states: [],
    slots: [],
  };

  for (const member of classNode.members) {
    const decorators = getDecorators(member);
    if (decorators.length === 0) continue;
    const memberName = getMemberName(member);
    if (!memberName) continue;

    for (const decorator of decorators) {
      const decoratorName = getDecoratorName(decorator);
      const decoratorOpts = extractDecoratorOptions(decorator);

      if (decoratorName === 'Prop') {
        contract.props.push(extractPropInfo(member, decoratorOpts, sourceFile));
      } else if (decoratorName === 'Event') {
        contract.events.push(extractEventInfo(member, decoratorOpts, sourceFile));
      } else if (decoratorName === 'Method') {
        contract.methods.push(extractMethodInfo(member, sourceFile));
      } else if (decoratorName === 'State') {
        contract.states.push({
          name: memberName,
          type: typeText(member.type),
          line: getLineNumber(sourceFile, member),
        });
      }
    }
  }

  // Slots are scraped from JSX render() output via regex (cheaper than walking JSX).
  contract.slots = extractSlots(readFileSync(tsxPath, 'utf8'));

  return { findings, contract, componentName };
}

// ─── Per-decorator extractors ──────────────────────────────────────────────

function extractPropInfo(member, decoratorOpts, sourceFile) {
  const name = getMemberName(member);
  return {
    name,
    type: typeText(member.type),
    default: member.initializer ? sourceText(member.initializer, sourceFile) : null,
    reflect: decoratorOpts.reflect ?? false,
    mutable: decoratorOpts.mutable ?? false,
    optional: !!member.questionToken,
    jsDoc: getJSDocText(member) || null,
    jsDocTags: [...getJSDocTags(member)],
    line: getLineNumber(sourceFile, member),
  };
}

function extractEventInfo(member, decoratorOpts, sourceFile) {
  const name = getMemberName(member);
  let payloadType = null;
  if (member.type && ts.isTypeReferenceNode(member.type)) {
    if (member.type.typeArguments && member.type.typeArguments.length > 0) {
      payloadType = typeText(member.type.typeArguments[0]);
    }
  }
  return {
    name,
    payloadType,
    eventName: decoratorOpts.eventName ?? name,
    bubbles: decoratorOpts.bubbles ?? true,
    cancelable: decoratorOpts.cancelable ?? true,
    composed: decoratorOpts.composed ?? true,
    jsDoc: getJSDocText(member) || null,
    line: getLineNumber(sourceFile, member),
  };
}

function extractMethodInfo(member, sourceFile) {
  const name = getMemberName(member);
  const params = (member.parameters ?? []).map(p => ({
    name: p.name && ts.isIdentifier(p.name) ? p.name.text : '_',
    type: typeText(p.type),
    optional: !!p.questionToken,
  }));
  return {
    name,
    params,
    returnType: typeText(member.type),
    isAsync: hasAsyncModifier(member),
    jsDoc: getJSDocText(member) || null,
    line: getLineNumber(sourceFile, member),
  };
}

function hasAsyncModifier(node) {
  return (node.modifiers ?? []).some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
}

/**
 * Extract slot names from JSX. Returns [{ name }] where the default slot has
 * name === 'default'. Uses regex over the raw text — JSX AST walking is overkill.
 */
export function extractSlots(tsxContent) {
  const slots = new Map();
  const re = /<slot\b([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(tsxContent)) !== null) {
    const attrs = m[1] ?? '';
    const nameMatch = attrs.match(/\bname\s*=\s*["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1] : 'default';
    if (!slots.has(name)) slots.set(name, { name });
  }
  return [...slots.values()];
}

// ─── Decorator option helpers ──────────────────────────────────────────────

function extractDecoratorOptions(decorator) {
  if (!decorator) return {};
  const expr = decorator.expression;
  if (!ts.isCallExpression(expr) || expr.arguments.length === 0) return {};
  const arg = expr.arguments[0];
  if (!ts.isObjectLiteralExpression(arg)) return {};
  const out = {};
  for (const prop of arg.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
    const key = prop.name.text;
    const value = literalValue(prop.initializer);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isNullKeyword?.(node)) return null;
  return undefined;
}

function typeText(typeNode) {
  if (!typeNode) return null;
  return typeNode.getText();
}

function sourceText(node, sourceFile) {
  return node.getText(sourceFile).slice(0, 120);
}

// ─── Target resolution ─────────────────────────────────────────────────────

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
