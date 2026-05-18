/**
 * Minimal TypeScript AST helpers for audit scripts.
 *
 * We use the `typescript` compiler API directly (it's already a devDep) instead
 * of ts-morph to avoid adding a new dependency. The API is verbose but stable,
 * and we only need a small slice (decorators, JSDoc, named exports).
 *
 * Helpers exported here:
 *   - createSourceFile(filePath)            — read a .ts/.tsx file into a SourceFile
 *   - getClassDeclaration(sourceFile)        — find the @Component-decorated class
 *   - getDecoratorName(node)                 — "Prop", "Event", "Method", ...
 *   - getDecorators(node)                    — TypeScript's modifier-decorator getter (handles ES decorators API)
 *   - hasJSDoc(node)                         — JSDoc block above
 *   - getJSDocText(node)                     — concatenated JSDoc text
 *   - getJSDocTags(node)                     — tag names ("default", "param", "returns")
 *   - listExports(sourceFile)                — named exports ({ name, kind, line })
 *   - getLineNumber(sourceFile, node)        — 1-based line number for a node
 */
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export function createSourceFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, /*setParentNodes*/ true, kind);
}

/**
 * Find the first class declaration with an `@Component` decorator — that's the
 * Stencil component class. Returns null if none.
 */
export function getComponentClass(sourceFile) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isClassDeclaration(stmt)) continue;
    const decorators = getDecorators(stmt);
    if (decorators.some(d => getDecoratorName(d) === 'Component')) return stmt;
  }
  return null;
}

/**
 * Read decorators from a node in a way that works with both the legacy and ES
 * decorators API (TS 5.0+ moved decorators out of `node.decorators`).
 */
export function getDecorators(node) {
  // Legacy: node.decorators (deprecated but still present in some configs)
  if (Array.isArray(node.decorators) && node.decorators.length > 0) {
    return node.decorators;
  }
  // Modern: ts.getDecorators() reads from modifiers
  if (typeof ts.getDecorators === 'function') {
    return ts.getDecorators(node) ?? [];
  }
  return [];
}

/** Returns the simple identifier name of a decorator ("Prop" for @Prop(...)). */
export function getDecoratorName(decorator) {
  const expr = decorator.expression;
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
    return expr.expression.text;
  }
  if (ts.isIdentifier(expr)) return expr.text;
  return null;
}

/**
 * Whether a node has a JSDoc block immediately above it.
 *
 * Uses ts.getJSDocCommentsAndTags which is the supported API; falls back to
 * scanning node.jsDoc when present (older API).
 */
export function hasJSDoc(node) {
  const docs = ts.getJSDocCommentsAndTags(node);
  if (docs && docs.length > 0) return true;
  return Array.isArray(node.jsDoc) && node.jsDoc.length > 0;
}

/** Concatenated comment text of all JSDoc blocks above a node. May be ""  */
export function getJSDocText(node) {
  const docs = ts.getJSDocCommentsAndTags(node);
  if (!docs || docs.length === 0) return '';
  return docs
    .map(d => {
      if (typeof d.comment === 'string') return d.comment;
      if (Array.isArray(d.comment)) return d.comment.map(c => c.text ?? '').join('');
      return '';
    })
    .join('\n')
    .trim();
}

/** Set of JSDoc tag names present on the node ("default", "param", "returns", ...) */
export function getJSDocTags(node) {
  const tags = ts.getJSDocTags(node) ?? [];
  return new Set(tags.map(t => t.tagName.text));
}

/** 1-based line number of a node's start. */
export function getLineNumber(sourceFile, node) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return line + 1;
}

/**
 * List named exports of a source file (used by story-exports script).
 * Returns [{ name, kind: "variable" | "function" | "class" | "re-export", line }]
 */
export function listExports(sourceFile) {
  const out = [];
  for (const stmt of sourceFile.statements) {
    // export const X = ... ; export const { X } = ...
    if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          out.push({ name: decl.name.text, kind: 'variable', line: getLineNumber(sourceFile, decl) });
        }
      }
      continue;
    }
    // export function X() {}
    if (ts.isFunctionDeclaration(stmt) && hasExportModifier(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, kind: 'function', line: getLineNumber(sourceFile, stmt) });
      continue;
    }
    // export class X {}
    if (ts.isClassDeclaration(stmt) && hasExportModifier(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, kind: 'class', line: getLineNumber(sourceFile, stmt) });
      continue;
    }
    // export { Foo, Bar };  export { Foo } from './x';
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const spec of stmt.exportClause.elements) {
        out.push({
          name: spec.name.text,
          kind: stmt.moduleSpecifier ? 're-export' : 'named',
          line: getLineNumber(sourceFile, spec),
        });
      }
    }
  }
  return out;
}

function hasExportModifier(node) {
  const mods = node.modifiers ?? [];
  return mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Get a Stencil class member's name as a string (for @Prop / @Event / @Method members).
 */
export function getMemberName(member) {
  if (!member.name) return null;
  if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) return member.name.text;
  return null;
}
