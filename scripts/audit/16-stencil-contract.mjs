#!/usr/bin/env node
/**
 * 16-stencil-contract.mjs
 *
 * Parser-decidable Stencil rules that the compiler, `tsc --strict` and the
 * enabled ESLint rules do not already enforce. Report-only: exit 1 means
 * findings, never a gate. Declaration facts come from script 14's contract
 * extractor; this file walks the AST only for method bodies and JSX.
 *
 * Codes are cited by `.claude/skills/stencil-compliance/`. The parity spec
 * `scripts/__tests__/stencil-compliance-skill.spec.mjs` keeps both in step.
 *
 * Usage:
 *   node scripts/audit/16-stencil-contract.mjs mud-button [--json]
 *   node scripts/audit/16-stencil-contract.mjs --all --json
 */
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import {
  createSourceFile,
  getComponentClass,
  getDecorators,
  getDecoratorName,
  getMemberName,
  getLineNumber,
} from './lib/ts-parser.mjs';
import { extractContractFromTsx } from './14-component-contract.mjs';

const TOOL = 'stencil-contract';

const USAGE = defaultUsage(
  '16-stencil-contract',
  'Check parser-decidable Stencil rules (shadow, form callbacks, member order, @Watch, JSX keys).',
);

export const RULES = [
  { code: 'STENCIL-SHADOW-REQUIRED', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-FORM-CALLBACKS', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE', severity: 'warning', ruleScope: 'stencil' },
  { code: 'STENCIL-MEMBER-ORDER', severity: 'warning', ruleScope: 'stencil' },
  { code: 'STENCIL-WATCH-ASYNC', severity: 'error', ruleScope: 'stencil' },
  { code: 'STENCIL-WATCH-WRITES-WATCHED', severity: 'warning', ruleScope: 'stencil' },
  { code: 'STENCIL-MAP-KEY', severity: 'warning', ruleScope: 'stencil' },
];

const severityOf = code => RULES.find(r => r.code === code).severity;

// Canonical group order: src/components/_agents/component-structure.md "Member Order".
export const GROUP_ORDER = [
  'Prop',
  'State',
  'Element',
  'AttachInternals',
  'Event',
  'Watch',
  'Listen',
  'lifecycle',
  'render',
];
const LIFECYCLE = new Set([
  'connectedCallback',
  'disconnectedCallback',
  'componentWillLoad',
  'componentDidLoad',
  'componentShouldUpdate',
  'componentWillRender',
  'componentDidRender',
  'componentWillUpdate',
  'componentDidUpdate',
]);

function memberGroup(member) {
  const names = getDecorators(member).map(getDecoratorName);
  const decorated = GROUP_ORDER.find(g => names.includes(g));
  if (decorated) return decorated;
  const name = getMemberName(member);
  if (name === 'render') return 'render';
  if (LIFECYCLE.has(name)) return 'lifecycle';
  return null; // private fields/methods may sit anywhere before render
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, child => walk(child, visit));
}

function isInsideIf(node, stopAt) {
  for (let p = node.parent; p && p !== stopAt; p = p.parent) {
    if (ts.isIfStatement(p)) return true;
  }
  return false;
}

const isLiteral = n =>
  ts.isStringLiteral(n) ||
  ts.isNumericLiteral(n) ||
  (ts.isPrefixUnaryExpression(n) &&
    (n.operator === ts.SyntaxKind.MinusToken || n.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(n.operand)) ||
  (ts.isIdentifier(n) && n.text === 'undefined') ||
  ts.isNoSubstitutionTemplateLiteral(n) ||
  n.kind === ts.SyntaxKind.TrueKeyword ||
  n.kind === ts.SyntaxKind.FalseKeyword ||
  n.kind === ts.SyntaxKind.NullKeyword;

function jsxRootLacksKey(body) {
  let expr = body;
  if (ts.isBlock(body)) {
    const ret = body.statements.find(ts.isReturnStatement);
    expr = ret?.expression;
  }
  while (expr && ts.isParenthesizedExpression(expr)) expr = expr.expression;
  if (!expr) return false;
  const attrs = ts.isJsxElement(expr)
    ? expr.openingElement.attributes
    : ts.isJsxSelfClosingElement(expr)
      ? expr.attributes
      : null;
  if (!attrs) return false;
  return !attrs.properties.some(p => ts.isJsxAttribute(p) && p.name.getText() === 'key');
}

// The callback body of `.map(cb)`: an inline function, or a class member passed as `this.name`.
function mapCallbackBody(fn, classNode) {
  if (!fn) return undefined;
  if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) return fn.body;
  if (!ts.isPropertyAccessExpression(fn) || fn.expression.kind !== ts.SyntaxKind.ThisKeyword) return undefined;
  const member = classNode.members.find(m => getMemberName(m) === fn.name.text);
  if (member && ts.isMethodDeclaration(member)) return member.body;
  const init = member && ts.isPropertyDeclaration(member) ? member.initializer : undefined;
  return init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) ? init.body : undefined;
}

export function checkSource(tsxPath, componentName) {
  const { contract, findings: contractFindings } = extractContractFromTsx(tsxPath, componentName);
  // No component class: nothing was checked, so pass on script 14's finding rather than report clean.
  if (!contract) return contractFindings;
  const sourceFile = createSourceFile(tsxPath);
  const classNode = getComponentClass(sourceFile);
  const file = relativeToRepo(tsxPath);
  const out = [];
  const add = (code, node, message) =>
    out.push(
      finding({
        severity: severityOf(code),
        code,
        file,
        line: node ? getLineNumber(sourceFile, node) : undefined,
        message,
      }),
    );

  if (!contract.shadow) {
    add(
      'STENCIL-SHADOW-REQUIRED',
      classNode,
      '`@Component` must enable shadow DOM (`shadow: true` or `shadow: { … }`).',
    );
  }

  const methodNames = new Set(classNode.members.map(getMemberName).filter(Boolean));
  const classText = classNode.getText(sourceFile);

  if (contract.formAssociated) {
    const isSubmitter = /\binternals\.form\?*\.requestSubmit\(/.test(classText);
    const required = [
      'formResetCallback',
      'formDisabledCallback',
      ...(isSubmitter ? [] : ['formStateRestoreCallback']),
    ];
    const missing = required.filter(n => !methodNames.has(n));
    if (missing.length) {
      add('STENCIL-FORM-CALLBACKS', classNode, `Form-associated component lacks ${missing.join(', ')}.`);
    }
    for (const prop of contract.props) {
      // An unannotated `@Prop() clearable = true` has type null and is still boolean.
      const types = prop.type === null ? ['boolean'] : prop.type.split('|').map(t => t.trim());
      const isBoolean = types.filter(t => t !== 'undefined' && t !== 'null').join('|') === 'boolean';
      if (isBoolean && prop.default === 'true') {
        const member = classNode.members.find(m => getMemberName(m) === prop.name);
        add(
          'STENCIL-FORM-BOOLEAN-DEFAULT-TRUE',
          member,
          `Boolean prop \`${prop.name}\` defaults to true on a form-associated component; a string "false" set on the property parses as true here, so a consumer binding the property from a template string cannot turn it off (HTML attributes are coerced to a boolean first).`,
        );
      }
    }
  }

  let highest = -1;
  let reported = false;
  for (const member of classNode.members) {
    const group = memberGroup(member);
    if (!group) continue;
    const rank = GROUP_ORDER.indexOf(group);
    if (rank < highest && !reported) {
      add(
        'STENCIL-MEMBER-ORDER',
        member,
        `\`${getMemberName(member)}\` (${group}) is declared after a later member group; order is ${GROUP_ORDER.join(' → ')}.`,
      );
      reported = true;
    }
    highest = Math.max(highest, rank);
  }
  const renderIndex = classNode.members.findIndex(m => getMemberName(m) === 'render');
  const afterRender = renderIndex === -1 ? undefined : classNode.members[renderIndex + 1];
  if (afterRender) {
    add(
      'STENCIL-MEMBER-ORDER',
      afterRender,
      `\`${getMemberName(afterRender)}\` is declared after render(); render() is always last.`,
    );
  }

  for (const member of classNode.members) {
    const watch = getDecorators(member).filter(d => getDecoratorName(d) === 'Watch');
    if (!watch.length || !ts.isMethodDeclaration(member) || !member.body) continue;
    if (member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      add('STENCIL-WATCH-ASYNC', member, `@Watch method \`${getMemberName(member)}\` is async.`);
    }
    const watched = new Set(
      watch
        .map(d => d.expression.arguments?.[0])
        .filter(a => a && ts.isStringLiteral(a))
        .map(a => a.text),
    );
    const isThisWatched = target =>
      ts.isPropertyAccessExpression(target) &&
      target.expression.kind === ts.SyntaxKind.ThisKeyword &&
      watched.has(target.name.text);
    walk(member.body, node => {
      let target = null;
      let plainLiteralAssign = false;
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        target = node.left;
        plainLiteralAssign = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && isLiteral(node.right);
      } else if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
      ) {
        target = node.operand;
      }
      if (!target || !isThisWatched(target)) return;
      if (plainLiteralAssign && isInsideIf(node, member.body)) return; // validation fallback (Decision 2)
      add(
        'STENCIL-WATCH-WRITES-WATCHED',
        node,
        `@Watch method writes the watched prop \`${target.name.text}\` outside a validation fallback.`,
      );
    });
  }

  walk(classNode, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text !== 'map') return;
    const body = mapCallbackBody(node.arguments[0], classNode);
    if (body && jsxRootLacksKey(body)) add('STENCIL-MAP-KEY', node, 'JSX element returned from `.map()` has no `key`.');
  });

  return out;
}

async function main() {
  const args = parseAuditArgs({ toolName: TOOL, usage: USAGE });
  const t0 = Date.now();
  const targets = args.all
    ? listAllComponents().map(c => resolveComponentPaths(c.name))
    : [resolveComponentPaths(args.component)];
  const findings = [];
  for (const target of targets) {
    if (!target.found || !target.exists.tsx) {
      findings.push(
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found (no .tsx to check).`,
        }),
      );
      continue;
    }
    findings.push(...checkSource(target.paths.tsx, target.name));
  }
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : (targets[0]?.name ?? null),
    findings,
    meta: { durationMs: Date.now() - t0, componentsScanned: targets.length, rulesEvaluated: RULES.length },
  });
  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
