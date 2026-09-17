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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
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

// A validation fallback runs in the watcher itself, under a real condition: an `if` between the
// write and the watcher body, with no nested function in between (a deferred write re-triggers
// the watcher later) and a condition that is not a literal `true`.
function isInsideIf(node, stopAt) {
  for (let p = node.parent; p && p !== stopAt; p = p.parent) {
    if (ts.isFunctionLike(p)) return false;
    if (ts.isIfStatement(p)) return p.expression.kind !== ts.SyntaxKind.TrueKeyword;
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

const hasKey = element => {
  const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  return attrs.properties.some(p => ts.isJsxAttribute(p) && p.name.getText() === 'key');
};

// The body of a class member callable as `this.name`: a method, or a property holding a function.
function memberBody(classNode, name) {
  const member = classNode.members.find(m => getMemberName(m) === name);
  if (member && ts.isMethodDeclaration(member)) return member.body;
  const init = member && ts.isPropertyDeclaration(member) ? member.initializer : undefined;
  return init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) ? init.body : undefined;
}

// Every value a function body can return: an arrow's expression body, or each `return` in a
// block (returns inside nested functions belong to those functions).
function returnedExpressions(body) {
  if (!body) return [];
  if (!ts.isBlock(body)) return [body];
  const out = [];
  const visit = node => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) out.push(node.expression);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(body, visit);
  return out;
}

// The JSX elements an expression can evaluate to, through parentheses, `?:`, logical operators,
// array literals and calls to a class member (`this.renderRow(i)`, two levels deep). A fragment,
// `null` or any other value yields nothing, so it is never reported.
function jsxRoots(expr, classNode, depth = 0) {
  while (expr && ts.isParenthesizedExpression(expr)) expr = expr.expression;
  if (!expr) return [];
  if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) return [expr];
  if (ts.isConditionalExpression(expr)) {
    return [...jsxRoots(expr.whenTrue, classNode, depth), ...jsxRoots(expr.whenFalse, classNode, depth)];
  }
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return jsxRoots(expr.right, classNode, depth);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      return [...jsxRoots(expr.left, classNode, depth), ...jsxRoots(expr.right, classNode, depth)];
    }
    return [];
  }
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.flatMap(e => jsxRoots(e, classNode, depth));
  if (
    depth < 2 &&
    ts.isCallExpression(expr) &&
    ts.isPropertyAccessExpression(expr.expression) &&
    expr.expression.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return returnedExpressions(memberBody(classNode, expr.expression.name.text)).flatMap(e =>
      jsxRoots(e, classNode, depth + 1),
    );
  }
  return [];
}

// The callback body of `.map(cb)`: an inline function, or a class member passed as `this.name`.
function mapCallbackBody(fn, classNode) {
  if (!fn) return undefined;
  if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) return fn.body;
  if (!ts.isPropertyAccessExpression(fn) || fn.expression.kind !== ts.SyntaxKind.ThisKeyword) return undefined;
  return memberBody(classNode, fn.name.text);
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

  // Shadow DOM is decidable only from literal options; `@Component(OPTS)` or `shadow: SHADOW` is skipped.
  const componentCall = getDecorators(classNode).find(d => getDecoratorName(d) === 'Component')?.expression;
  const options = componentCall && ts.isCallExpression(componentCall) ? componentCall.arguments[0] : undefined;
  const shadowProp =
    options && ts.isObjectLiteralExpression(options)
      ? options.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(sourceFile) === 'shadow')
      : undefined;
  const shadowDecidable =
    options &&
    ts.isObjectLiteralExpression(options) &&
    (!shadowProp ||
      shadowProp.initializer.kind === ts.SyntaxKind.TrueKeyword ||
      shadowProp.initializer.kind === ts.SyntaxKind.FalseKeyword ||
      ts.isObjectLiteralExpression(shadowProp.initializer));
  if (shadowDecidable && !contract.shadow) {
    add(
      'STENCIL-SHADOW-REQUIRED',
      classNode,
      '`@Component` must enable shadow DOM (`shadow: true` or `shadow: { … }`).',
    );
  }

  const methodNames = new Set(classNode.members.map(getMemberName).filter(Boolean));

  if (contract.formAssociated) {
    // A submitter calls `this.internals.form.requestSubmit()` (any optional-chaining spelling).
    let isSubmitter = false;
    const unwrap = n => (n && ts.isNonNullExpression(n) ? n.expression : n);
    walk(classNode, node => {
      if (!ts.isCallExpression(node)) return;
      const call = unwrap(node.expression);
      if (!ts.isPropertyAccessExpression(call) || call.name.text !== 'requestSubmit') return;
      const form = unwrap(call.expression);
      if (!ts.isPropertyAccessExpression(form) || form.name.text !== 'form') return;
      const internals = unwrap(form.expression);
      if (ts.isPropertyAccessExpression(internals) && internals.name.text === 'internals') isSubmitter = true;
    });
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
  let reported;
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
      reported = member;
    }
    highest = Math.max(highest, rank);
  }
  const renderIndex = classNode.members.findIndex(m => getMemberName(m) === 'render');
  const afterRender =
    renderIndex === -1 ? undefined : classNode.members.slice(renderIndex + 1).find(m => !ts.isSemicolonClassElement(m));
  if (afterRender && afterRender !== reported) {
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
    // `this.size` or `this['size']`; returns the prop name when it is a watched one.
    const watchedName = target => {
      if (!target || target.expression?.kind !== ts.SyntaxKind.ThisKeyword) return undefined;
      const name = ts.isPropertyAccessExpression(target)
        ? target.name.text
        : ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)
          ? target.argumentExpression.text
          : undefined;
      return watched.has(name) ? name : undefined;
    };
    walk(member.body, node => {
      let written;
      let plainLiteralAssign = false;
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        written = watchedName(node.left);
        plainLiteralAssign = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && isLiteral(node.right);
        // Destructuring assignment: `[this.size] = …`, `({ size: this.size } = …)`.
        if (!written && (ts.isArrayLiteralExpression(node.left) || ts.isObjectLiteralExpression(node.left))) {
          walk(node.left, n => {
            written ??= watchedName(n);
          });
          plainLiteralAssign = false;
        }
      } else if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
      ) {
        written = watchedName(node.operand);
      }
      if (!written) return;
      if (plainLiteralAssign && isInsideIf(node, member.body)) return; // validation fallback (Decision 2)
      add(
        'STENCIL-WATCH-WRITES-WATCHED',
        node,
        `@Watch method writes the watched prop \`${written}\` outside a validation fallback.`,
      );
    });
  }

  walk(classNode, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text !== 'map') return;
    const roots = returnedExpressions(mapCallbackBody(node.arguments[0], classNode)).flatMap(e =>
      jsxRoots(e, classNode),
    );
    if (roots.some(root => !hasKey(root))) {
      add('STENCIL-MAP-KEY', node, 'JSX element returned from `.map()` has no `key`.');
    }
  });

  return out;
}

// Every `@Component` .tsx a name stands for. A folder name (`mud-header`) covers each component
// file in that folder, sub-components included (`mud-header-nav-item.tsx`); a sub-component
// name resolves to its own file in whichever component folder holds it.
export function isComponentFile(file) {
  return (
    /\.tsx$/.test(file) &&
    !/\.(spec|e2e|stories)\.tsx$/.test(file) &&
    fs.existsSync(file) &&
    /@Component\(/.test(fs.readFileSync(file, 'utf8'))
  );
}

function componentFiles(name) {
  const target = resolveComponentPaths(name);
  if (!target.found) return [];
  if (target.subComponent) return isComponentFile(target.paths.tsx) ? [target.paths.tsx] : [];
  return fs
    .readdirSync(target.root)
    .map(entry => path.join(target.root, entry))
    .filter(isComponentFile)
    .sort();
}

async function main() {
  const args = parseAuditArgs({ toolName: TOOL, usage: USAGE });
  const t0 = Date.now();
  const targets = args.all
    ? listAllComponents().map(c => c.name)
    : args.changed
      ? listChangedComponents()
      : [args.component];
  const findings = [];
  let filesScanned = 0;
  for (const name of targets) {
    const files = componentFiles(name);
    if (!files.length) {
      findings.push(
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${name}" not found (no @Component .tsx to check).`,
        }),
      );
      continue;
    }
    for (const file of files) findings.push(...checkSource(file, path.basename(file, '.tsx')));
    filesScanned += files.length;
  }
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : (targets[0] ?? null),
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      filesScanned,
      rulesEvaluated: RULES.length,
    },
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
