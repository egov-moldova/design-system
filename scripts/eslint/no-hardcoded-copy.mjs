/**
 * ESLint rule `mud/no-hardcoded-copy` — the guard behind issue #163's acceptance bar.
 *
 * JSX half (complete for JSX descendants): every JSX text node with a letter, and every
 * string literal / template quasi with a letter that is a descendant of a JSX expression
 * container or a JSX attribute value — including through a conditional, logical,
 * call-argument, object or spread expression — is reported, UNLESS it sits under an
 * attribute on `NON_COPY_ATTRIBUTES`, or is a direct operand of a comparison.
 *
 * Non-JSX half (a stated heuristic, not complete): a string literal / template quasi with a
 * space followed by a letter, or any non-ASCII letter, anywhere else in the file, except an
 * argument of `console.*`, `throw`, `matchMedia`, `querySelector*`, `closest`, an import
 * source, or `@Component` options. A single-word literal (`'Loading'`) passes this half by
 * design — the Storybook `ru-RU` runtime probe (`copy-probe.mjs`) is what catches those.
 */

const NON_COPY_ATTRIBUTES = new Set([
  'class',
  'id',
  'part',
  'exportparts',
  'slot',
  'name',
  'type',
  'role',
  'href',
  'target',
  'rel',
  'src',
  'srcset',
  'sizes',
  'loading',
  'decoding',
  'autocomplete',
  'inputMode',
  'inputmode',
  'enterkeyhint',
  'dir',
  'htmlFor',
  'for',
  'form',
  'method',
  'accept',
  'pattern',
  'key',
  'ref',
  'tabindex',
  'tabIndex',
  'variant',
  'size',
  'color',
  'appearance',
  'shape',
  'orientation',
  'placement',
  'iconName',
  'icon-name',
  'viewBox',
  'd',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'xmlns',
  'focusable',
  // Structural/geometry identifiers, not copy — same family as the SVG attrs above.
  'width',
  'height',
  'scope',
  'semantic',
  'fill-rule',
  'clip-rule',
  // A tooltip/popover side, and a form control's submitted value: data, never rendered copy.
  'position',
  'value',
  'style',
]);

/** `onClick`, `onKeyDown`, …: code that runs, not text that renders — the heuristic half still reads it. */
const EVENT_HANDLER_RE = /^on[A-Z]/;

/** A kebab-case identifier with a hyphen (`sep-first`, `sep-tail-`): a key or class fragment, never a sentence. */
const KEBAB_IDENTIFIER_RE = /^[a-z][a-z0-9]*-(?:[a-z0-9]+-?)*$/;

/** Link-type keywords only (`noopener noreferrer`): a `rel` value built outside JSX. */
const REL_TOKENS_RE =
  /^(?:noopener|noreferrer|nofollow|external|opener)(?:\s+(?:noopener|noreferrer|nofollow|external|opener))*$/;

const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration']);

/** Statements that keep a value local to a function rather than returning it into the JSX. */
const LOCAL_TYPES = new Set(['VariableDeclarator', 'AssignmentExpression', 'ExpressionStatement']);

/** Copy-bearing `aria-*` attributes: reported like any other JSX text, never exempt. */
const ARIA_COPY_BEARING = new Set([
  'aria-label',
  'aria-roledescription',
  'aria-valuetext',
  'aria-placeholder',
  'aria-description',
  'aria-braillelabel',
]);

const COMPARISON_OPERATORS = new Set(['==', '===', '!=', '!==', '<', '>', '<=', '>=']);

const LETTER_RE = /\p{L}/u;
const NON_JSX_HEURISTIC_RE = /(\s\p{L})|[^\x00-\x7F]/u;

const isNonCopyAttribute = name => {
  if (NON_COPY_ATTRIBUTES.has(name)) return true;
  if (name.startsWith('data-')) return true;
  if (name.startsWith('aria-')) return !ARIA_COPY_BEARING.has(name);
  return false;
};

const attributeName = node => {
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXNamespacedName') return `${node.namespace.name}:${node.name.name}`;
  return null;
};

/** Nearest enclosing JSXAttribute among `ancestors`, or `null`. */
const nearestJsxAttribute = ancestors => {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].type === 'JSXAttribute') return ancestors[i];
  }
  return null;
};

const BUTTON_LIKE_INPUT_TYPES = new Set(['submit', 'button', 'reset']);

/** Nearest enclosing JSXOpeningElement among `ancestors`, or `null`. */
const nearestJsxOpeningElement = ancestors => {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].type === 'JSXOpeningElement') return ancestors[i];
  }
  return null;
};

/**
 * Whether `attr` is the `value` attribute of an `<input type="submit"|"button"|"reset">` —
 * rendered as the control's own label, not a form value, so it IS copy. The element's `type`
 * must be a literal string on the same opening tag; a dynamic/spread `type` is left to the
 * "form value" default (never a false positive from a type this rule cannot read).
 */
const isButtonLikeInputValue = (attr, ancestors) => {
  if (attributeName(attr.name) !== 'value') return false;
  const opening = nearestJsxOpeningElement(ancestors);
  if (!opening || opening.name?.type !== 'JSXIdentifier' || opening.name.name !== 'input') return false;
  const typeAttr = opening.attributes.find(a => a.type === 'JSXAttribute' && attributeName(a.name) === 'type');
  const typeValue = typeAttr?.value;
  const literalType =
    typeValue?.type === 'Literal' && typeof typeValue.value === 'string'
      ? typeValue.value
      : typeValue?.type === 'JSXExpressionContainer' && typeValue.expression?.type === 'Literal'
        ? typeValue.expression.value
        : null;
  return typeof literalType === 'string' && BUTTON_LIKE_INPUT_TYPES.has(literalType.toLowerCase());
};

/**
 * Whether the literal reaches rendered JSX. Walking outward, a JSX container or attribute
 * reached first means yes. A function crossed on the way keeps the literal on the JSX path
 * only when it is that function's result (`items.map(i => cond ? 'Da' : 'Nu')`); a literal
 * held in a local, an assignment or a bare statement inside the function
 * (`const align = column.align ?? 'start'`) is ordinary code, left to the heuristic half.
 */
const hasJsxContext = ancestors => {
  let local = false;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor.type === 'JSXExpressionContainer' || ancestor.type === 'JSXAttribute') return true;
    if (LOCAL_TYPES.has(ancestor.type)) local = true;
    if (FUNCTION_TYPES.has(ancestor.type) && local) return false;
  }
  return false;
};

/** Whether `node` is the direct left/right operand of a comparison in `ancestors`' immediate parent. */
const isComparisonOperand = (node, parent) =>
  parent?.type === 'BinaryExpression' &&
  COMPARISON_OPERATORS.has(parent.operator) &&
  (parent.left === node || parent.right === node);

/**
 * Whether `node` is the KEY of an object literal property (`{ 'day-cell': true }`) rather
 * than its value. A key is never rendered or read by a user — it is a structural
 * identifier (a CSS class-flag name, a lookup key) — so it is exempt everywhere, JSX or not.
 */
const isObjectPropertyKey = (node, parent) => parent?.type === 'Property' && parent.key === node && !parent.computed;

const CALL_EXEMPT_NAMES = new Set(['matchMedia', 'closest']);
const CALL_EXEMPT_PREFIX = 'querySelector';

const calleeName = callee => {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') return callee.property.name;
  return null;
};

const isConsoleCall = callee =>
  callee?.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'console';

/** Whether an ancestor is a call/context this rule's non-JSX half never reports inside. */
const isNonJsxExempt = ancestors => {
  for (const ancestor of ancestors) {
    if (ancestor.type === 'ThrowStatement') return true;
    if (ancestor.type === 'ImportDeclaration') return true;
    if (ancestor.type === 'ImportExpression') return true;
    if (ancestor.type === 'CallExpression') {
      const name = calleeName(ancestor.callee);
      if (isConsoleCall(ancestor.callee)) return true;
      if (name && (CALL_EXEMPT_NAMES.has(name) || name.startsWith(CALL_EXEMPT_PREFIX))) return true;
    }
    if (
      ancestor.type === 'Decorator' &&
      ancestor.expression?.type === 'CallExpression' &&
      calleeName(ancestor.expression.callee) === 'Component'
    ) {
      return true;
    }
  }
  return false;
};

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'No hardcoded user-facing copy in a mud-* component — see _agents/localization.md.',
    },
    schema: [],
    messages: {
      jsxCopy: 'Hardcoded copy in JSX: "{{text}}". Route it through the component\'s .messages.ts dictionary.',
      heuristicCopy: 'Likely hardcoded copy: "{{text}}". Route it through the component\'s .messages.ts dictionary.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (/\.messages\.ts$/.test(filename)) return {};

    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const reported = new WeakSet();

    const checkStringLike = (node, text) => {
      if (reported.has(node)) return;
      const ancestors = sourceCode.getAncestors(node);
      const parent = ancestors[ancestors.length - 1];
      if (isObjectPropertyKey(node, parent)) return;

      if (hasJsxContext(ancestors)) {
        const attr = nearestJsxAttribute(ancestors);
        const name = attr ? attributeName(attr.name) : null;
        if (name && isNonCopyAttribute(name) && !(attr && isButtonLikeInputValue(attr, ancestors))) return;
        if (!(name && EVENT_HANDLER_RE.test(name))) {
          if (isComparisonOperand(node, parent)) return;
          if (!LETTER_RE.test(text)) return;
          if (KEBAB_IDENTIFIER_RE.test(text)) return;
          reported.add(node);
          context.report({ node, messageId: 'jsxCopy', data: { text: text.slice(0, 60) } });
          return;
        }
      }

      if (!NON_JSX_HEURISTIC_RE.test(text)) return;
      if (REL_TOKENS_RE.test(text)) return;
      if (isNonJsxExempt(ancestors)) return;
      reported.add(node);
      context.report({ node, messageId: 'heuristicCopy', data: { text: text.slice(0, 60) } });
    };

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        checkStringLike(node, node.value);
      },
      TemplateElement(node) {
        const text = node.value.cooked ?? '';
        if (!text) return;
        checkStringLike(node, text);
      },
      JSXText(node) {
        if (!LETTER_RE.test(node.value)) return;
        context.report({ node, messageId: 'jsxCopy', data: { text: node.value.trim().slice(0, 60) } });
      },
    };
  },
};
