/**
 * Smoke tests for scripts/audit/17-adapter-contract.mjs
 *
 * Pure rule functions + fixture-driven `analyzeComponent` runs. No Storybook
 * or build required — Wave A reads TSX in-process, Wave B reads a fixture
 * CEM JSON file directly.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  RESERVED_PUBLIC_MEMBERS,
  NATIVE_DOM_EVENT_NAMES,
  checkA1EventPrefix,
  checkA2NativeEventName,
  checkA3ReflectSerializer,
  checkA4ReservedName,
  checkSourceRules,
  checkCemParity,
  isNonPrimitiveType,
  classifyPropType,
  extractTypeAliasKinds,
  extractSerializedProps,
  extractPartsFromTsx,
  extractCssPropsFromTsx,
  diffNameSets,
  findCemDeclaration,
  analyzeComponent,
} from '../../audit/17-adapter-contract.mjs';
import { extractContractFromTsx } from '../../audit/14-component-contract.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'adapter-contract');
const fixturePath = name => path.join(FIXTURES, name);
const fixtureContract = name => extractContractFromTsx(fixturePath(name), 'mud-fixture').contract;
const fixtureTsx = name => readFileSync(fixturePath(name), 'utf8');

describe('17-adapter-contract: RESERVED_PUBLIC_MEMBERS / NATIVE_DOM_EVENT_NAMES', () => {
  it('reserved set includes known HTMLElement/Element/Node/JSX members', () => {
    for (const name of ['slot', 'title', 'click', 'part', 'key', 'ref']) {
      assert.ok(RESERVED_PUBLIC_MEMBERS.has(name), `${name} should be reserved`);
    }
  });

  it('reserved set does NOT include an ordinary component prop name', () => {
    assert.equal(RESERVED_PUBLIC_MEMBERS.has('variant'), false);
  });

  // R10 (plan 2026-09-22-audit-depths-sentinel-fixes.md, Decision §4): compares
  // A4's RESERVED_PUBLIC_MEMBERS against `@stencil/eslint-plugin`'s own
  // `reserved-member-names` rule set, computed the same way the rule computes
  // it (node_modules/@stencil/eslint-plugin/dist/index.js:892-948) — GLOBAL_ATTRIBUTES
  // ∪ a jsdom walk of HTMLElement/Element/Node/EventTarget ∪ JSX_KEYS. Neither
  // set is a subset of the other, so A4 is kept (17-adapter-contract.mjs's
  // header records the citation and the counts this test proves).
  it("neither A4's set nor eslint's reserved-member-names set is a subset of the other — A4 is kept", async () => {
    const { JSDOM } = await import('jsdom');
    const { window: win } = new JSDOM();
    const { document: doc } = win;
    const el = doc.createElement('tester-component');
    const relevantInterfaces = [win.HTMLElement, win.Element, win.Node, win.EventTarget];
    const props = new Set();
    let current = el;
    while (current && relevantInterfaces.some(ri => current instanceof ri)) {
      Object.getOwnPropertyNames(current).forEach(p => props.add(p));
      current = Object.getPrototypeOf(current);
    }
    const GLOBAL_ATTRIBUTES = [
      'about',
      'accessKey',
      'autocapitalize',
      'autofocus',
      'class',
      'contenteditable',
      'contextmenu',
      'dir',
      'draggable',
      'enterkeyhint',
      'hidden',
      'id',
      'inert',
      'inputmode',
      'itemid',
      'itemprop',
      'itemref',
      'itemscope',
      'itemtype',
      'lang',
      'nonce',
      'part',
      'popover',
      'role',
      'slot',
      'spellcheck',
      'style',
      'tabindex',
      'title',
      'translate',
      'virtualkeyboardpolicy',
    ];
    const JSX_KEYS = ['ref', 'key'];
    const eslintSet = new Set([...GLOBAL_ATTRIBUTES, ...props, ...JSX_KEYS].map(p => p.toLowerCase()));

    const onlyA4 = [...RESERVED_PUBLIC_MEMBERS].filter(n => !eslintSet.has(n));
    const onlyEslint = [...eslintSet].filter(n => !RESERVED_PUBLIC_MEMBERS.has(n));
    assert.ok(onlyA4.length > 0, 'A4 should catch names eslint does not (e.g. onfocusout, requestfullscreen)');
    assert.ok(onlyEslint.length > 0, "eslint should catch names A4 does not (its GLOBAL_ATTRIBUTES, e.g. 'class')");
    assert.ok(onlyA4.includes('onfocusout'));
    assert.ok(onlyEslint.includes('class'));
  });

  it('native event names are derived from the on* handler keys, lower-cased, "on" stripped', () => {
    for (const name of ['click', 'change', 'focus', 'submit', 'input']) {
      assert.ok(NATIVE_DOM_EVENT_NAMES.has(name), `${name} should be a native DOM event`);
    }
    assert.equal(NATIVE_DOM_EVENT_NAMES.has('mudchange'), false);
  });
});

describe('17-adapter-contract: isNonPrimitiveType', () => {
  it('treats string/number/boolean as primitive', () => {
    assert.equal(isNonPrimitiveType('string'), false);
    assert.equal(isNonPrimitiveType('number'), false);
    assert.equal(isNonPrimitiveType('boolean'), false);
  });

  it('treats a union of string literals as primitive (enum-like prop)', () => {
    assert.equal(isNonPrimitiveType(`'primary' | 'secondary'`), false);
  });

  it('strips a trailing | undefined before judging', () => {
    assert.equal(isNonPrimitiveType('string | undefined'), false);
  });

  it('treats an object type as non-primitive', () => {
    assert.equal(isNonPrimitiveType('{ theme: string }'), true);
  });

  it('treats an array type as non-primitive', () => {
    assert.equal(isNonPrimitiveType('string[]'), true);
  });

  it('treats a function type as non-primitive', () => {
    assert.equal(isNonPrimitiveType('(x: string) => void'), true);
  });

  it('returns false for a missing type', () => {
    assert.equal(isNonPrimitiveType(null), false);
  });
});

describe('17-adapter-contract: extractTypeAliasKinds / classifyPropType', () => {
  const typesContent = `
    export const BUTTON_VARIANTS = ['primary', 'secondary'] as const;
    export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
    export type Mode = 'light' | 'dark';
    export interface ButtonConfig { theme: string; }
    export type Handler = (x: string) => void;
    export type Unresolved = SomeExternalThing;
  `;

  it('resolves the (typeof X_ARRAY)[number] idiom to primitive', () => {
    const kinds = extractTypeAliasKinds(typesContent);
    assert.equal(kinds.get('ButtonVariant'), 'primitive');
  });

  it('resolves a literal union to primitive', () => {
    const kinds = extractTypeAliasKinds(typesContent);
    assert.equal(kinds.get('Mode'), 'primitive');
  });

  it('resolves an interface to non-primitive', () => {
    const kinds = extractTypeAliasKinds(typesContent);
    assert.equal(kinds.get('ButtonConfig'), 'non-primitive');
  });

  it('resolves a function type alias to non-primitive', () => {
    const kinds = extractTypeAliasKinds(typesContent);
    assert.equal(kinds.get('Handler'), 'non-primitive');
  });

  it('resolves an alias referencing another unresolved identifier as unknown', () => {
    const kinds = extractTypeAliasKinds(typesContent);
    assert.equal(kinds.get('Unresolved'), 'unknown');
  });

  it('classifyPropType resolves a bare identifier against the alias map', () => {
    const kinds = extractTypeAliasKinds(typesContent);
    assert.equal(classifyPropType('ButtonVariant', kinds), 'primitive');
    assert.equal(classifyPropType('ButtonConfig', kinds), 'non-primitive');
  });

  it('classifyPropType returns "unknown" (not a guess) for an identifier with no alias entry', () => {
    assert.equal(classifyPropType('SomeImportedType', new Map()), 'unknown');
  });

  it('classifyPropType falls back to shape-only classification for non-identifier text', () => {
    assert.equal(classifyPropType('string[]', new Map()), 'non-primitive');
    assert.equal(classifyPropType('string', new Map()), 'primitive');
  });
});

describe('17-adapter-contract: checkA3ReflectSerializer — unknown type is not flagged', () => {
  it('does not flag a reflected prop whose type cannot be resolved', () => {
    const f = checkA3ReflectSerializer(
      { name: 'variant', type: 'ButtonVariant', reflect: true, line: 1 },
      new Set(),
      'f.tsx',
    );
    assert.equal(f, null);
  });
});

describe('17-adapter-contract: extractSerializedProps / extractPartsFromTsx / extractCssPropsFromTsx', () => {
  it('finds @PropSerialize method targets', () => {
    const names = extractSerializedProps(fixtureTsx('pass.tsx'));
    assert.ok(names.has('options'));
  });

  it('finds part="..." attributes, including multi-value', () => {
    const parts = extractPartsFromTsx(`<div part="a b" /><span part="c" />`);
    assert.deepEqual(parts.sort(), ['a', 'b', 'c']);
  });

  it('ignores a `part=` inside a CSS attribute-selector string (regression: mud-date-picker)', () => {
    const parts = extractPartsFromTsx('el.querySelector(`[part="${chip}"]`);');
    assert.deepEqual(parts, []);
  });

  it('finds @cssprop JSDoc tags', () => {
    const names = extractCssPropsFromTsx(`/** @cssprop --mud-button-bg - background */`);
    assert.deepEqual(names, ['--mud-button-bg']);
  });
});

describe('17-adapter-contract: A1 event prefix', () => {
  it('passes a properly prefixed event', () => {
    assert.equal(checkA1EventPrefix({ name: 'mudChange', eventName: 'mudChange', line: 1 }, 'f.tsx'), null);
  });

  it('passes a kebab eventName override', () => {
    assert.equal(checkA1EventPrefix({ name: 'mudChange', eventName: 'mud-custom-name', line: 1 }, 'f.tsx'), null);
  });

  it('flags an eventName override that drops the mud prefix', () => {
    const f = checkA1EventPrefix({ name: 'mudChange', eventName: 'change', line: 3 }, 'f.tsx');
    assert.equal(f.code, 'ADAPTER-A1-EVENT-PREFIX');
    assert.equal(f.severity, 'error');
  });
});

describe('17-adapter-contract: A2 native event collision', () => {
  it('passes a non-colliding event name', () => {
    assert.equal(checkA2NativeEventName({ name: 'mudChange', eventName: 'mudChange', line: 1 }, 'f.tsx'), null);
  });

  it('flags a native event name collision', () => {
    const f = checkA2NativeEventName({ name: 'click', eventName: 'click', line: 5 }, 'f.tsx');
    assert.equal(f.code, 'ADAPTER-A2-NATIVE-EVENT-COLLISION');
  });
});

describe('17-adapter-contract: A3 reflect + serializer', () => {
  it('passes a primitive reflected prop', () => {
    assert.equal(
      checkA3ReflectSerializer({ name: 'variant', type: 'string', reflect: true, line: 1 }, new Set(), 'f.tsx'),
      null,
    );
  });

  it('passes a non-reflected object prop', () => {
    assert.equal(
      checkA3ReflectSerializer({ name: 'config', type: '{ a: string }', reflect: false, line: 1 }, new Set(), 'f.tsx'),
      null,
    );
  });

  it('passes a reflected object prop that has a serializer', () => {
    assert.equal(
      checkA3ReflectSerializer(
        { name: 'options', type: 'string[]', reflect: true, line: 1 },
        new Set(['options']),
        'f.tsx',
      ),
      null,
    );
  });

  it('flags a reflected object prop with no serializer', () => {
    const f = checkA3ReflectSerializer(
      { name: 'config', type: '{ a: string }', reflect: true, line: 7 },
      new Set(),
      'f.tsx',
    );
    assert.equal(f.code, 'ADAPTER-A3-REFLECT-NO-SERIALIZER');
  });
});

describe('17-adapter-contract: A4 reserved member name', () => {
  it('passes an ordinary prop name', () => {
    assert.equal(checkA4ReservedName({ name: 'variant', kind: 'prop', line: 1, fileRel: 'f.tsx' }), null);
  });

  it('flags a prop name that shadows Element.slot', () => {
    const f = checkA4ReservedName({ name: 'slot', kind: 'prop', line: 4, fileRel: 'f.tsx' });
    assert.equal(f.code, 'ADAPTER-A4-RESERVED-MEMBER-NAME');
  });

  it('flags an event field name that shadows HTMLElement.click', () => {
    const f = checkA4ReservedName({ name: 'click', kind: 'event', line: 4, fileRel: 'f.tsx' });
    assert.equal(f.code, 'ADAPTER-A4-RESERVED-MEMBER-NAME');
  });

  it('flags a method name that shadows Node.contains', () => {
    const f = checkA4ReservedName({ name: 'contains', kind: 'method', line: 4, fileRel: 'f.tsx' });
    assert.equal(f.code, 'ADAPTER-A4-RESERVED-MEMBER-NAME');
  });
});

describe('17-adapter-contract: checkSourceRules (fixture-driven)', () => {
  it('pass.tsx — zero findings', () => {
    const contract = fixtureContract('pass.tsx');
    const findings = checkSourceRules(contract, fixtureTsx('pass.tsx'), 'pass.tsx');
    assert.deepEqual(findings, []);
  });

  it('a1-fail.tsx — eventName "change" fails both A1 (no mud prefix) and A2 (native collision)', () => {
    const contract = fixtureContract('a1-fail.tsx');
    const findings = checkSourceRules(contract, fixtureTsx('a1-fail.tsx'), 'a1-fail.tsx');
    assert.deepEqual(findings.map(f => f.code).sort(), [
      'ADAPTER-A1-EVENT-PREFIX',
      'ADAPTER-A2-NATIVE-EVENT-COLLISION',
    ]);
  });

  it('a2-native-collision.tsx — field "click" fails A1, A2 (native) and A4 (reserved member)', () => {
    const contract = fixtureContract('a2-native-collision.tsx');
    const findings = checkSourceRules(contract, fixtureTsx('a2-native-collision.tsx'), 'a2-native-collision.tsx');
    assert.deepEqual(findings.map(f => f.code).sort(), [
      'ADAPTER-A1-EVENT-PREFIX',
      'ADAPTER-A2-NATIVE-EVENT-COLLISION',
      'ADAPTER-A4-RESERVED-MEMBER-NAME',
    ]);
  });

  it('a3-fail.tsx — ADAPTER-A3-REFLECT-NO-SERIALIZER only', () => {
    const contract = fixtureContract('a3-fail.tsx');
    const findings = checkSourceRules(contract, fixtureTsx('a3-fail.tsx'), 'a3-fail.tsx');
    assert.deepEqual(
      findings.map(f => f.code),
      ['ADAPTER-A3-REFLECT-NO-SERIALIZER'],
    );
  });

  it('a4-fail.tsx — ADAPTER-A4-RESERVED-MEMBER-NAME only', () => {
    const contract = fixtureContract('a4-fail.tsx');
    const findings = checkSourceRules(contract, fixtureTsx('a4-fail.tsx'), 'a4-fail.tsx');
    assert.deepEqual(
      findings.map(f => f.code),
      ['ADAPTER-A4-RESERVED-MEMBER-NAME'],
    );
  });
});

describe('17-adapter-contract: diffNameSets / findCemDeclaration', () => {
  it('no findings when the two sets match', () => {
    assert.deepEqual(
      diffNameSets({ kind: 'prop', sourceNames: ['a', 'b'], cemNames: ['a', 'b'], fileRel: 'f.tsx' }),
      [],
    );
  });

  it('flags names missing from the CEM', () => {
    const findings = diffNameSets({ kind: 'prop', sourceNames: ['a', 'b'], cemNames: ['a'], fileRel: 'f.tsx' });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'ADAPTER-CEM-PROP-MISSING');
    assert.match(findings[0].message, /b/);
  });

  it('flags stale names present only in the CEM', () => {
    const findings = diffNameSets({
      kind: 'event',
      sourceNames: ['mudChange'],
      cemNames: ['mudChange', 'mudOld'],
      fileRel: 'f.tsx',
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'ADAPTER-CEM-EVENT-STALE');
    assert.match(findings[0].message, /mudOld/);
  });

  it('finds a declaration by tagName across modules', () => {
    const cem = { modules: [{ declarations: [{ tagName: 'mud-a' }, { tagName: 'mud-b' }] }] };
    assert.equal(findCemDeclaration(cem, 'mud-b').tagName, 'mud-b');
    assert.equal(findCemDeclaration(cem, 'mud-c'), null);
  });
});

describe('17-adapter-contract: checkCemParity (fixture-driven)', () => {
  const readCem = name => JSON.parse(readFileSync(fixturePath(name), 'utf8'));

  it('cem-pass.json — matches pass.tsx exactly, zero findings', () => {
    const contract = fixtureContract('pass.tsx');
    const findings = checkCemParity(contract, fixtureTsx('pass.tsx'), 'pass.tsx', readCem('cem-pass.json'));
    assert.deepEqual(findings, []);
  });

  it('cem-mismatch.json — missing event/slot/part surfaces as findings naming the rebuild command', () => {
    const contract = fixtureContract('pass.tsx');
    const findings = checkCemParity(contract, fixtureTsx('pass.tsx'), 'pass.tsx', readCem('cem-mismatch.json'));
    const codes = findings.map(f => f.code);
    assert.ok(codes.includes('ADAPTER-CEM-PROP-MISSING'));
    assert.ok(codes.includes('ADAPTER-CEM-EVENT-MISSING'));
    assert.ok(codes.includes('ADAPTER-CEM-SLOT-MISSING'));
    assert.ok(codes.includes('ADAPTER-CEM-PART-MISSING'));
    assert.ok(findings.every(f => f.fix.includes('yarn dx:stencil:once')));
  });

  it('missing declaration entirely — ADAPTER-CEM-ENTRY-MISSING naming the rebuild command', () => {
    const contract = fixtureContract('pass.tsx');
    const findings = checkCemParity(contract, fixtureTsx('pass.tsx'), 'pass.tsx', { modules: [] });
    assert.deepEqual(
      findings.map(f => f.code),
      ['ADAPTER-CEM-ENTRY-MISSING'],
    );
    assert.match(findings[0].fix, /yarn dx:stencil:once/);
  });
});

describe('17-adapter-contract: analyzeComponent — not-found / no-tsx', () => {
  it('reports STRUCTURE-NOT-FOUND for an unknown component', () => {
    const { findings } = analyzeComponent(
      { found: false, name: null, input: 'mud-nope' },
      { part: 'source', cem: null },
    );
    assert.equal(findings[0].code, 'STRUCTURE-NOT-FOUND');
  });
});

describe('17-adapter-contract: analyzeComponent — real component, Wave A (source)', () => {
  it('mud-button — reflected enum props typed via the (typeof ARR)[number] idiom are not flagged (A3 false-positive regression)', () => {
    const target = resolveComponentPaths('mud-button');
    const { findings } = analyzeComponent(target, { part: 'source', cem: null });
    assert.deepEqual(
      findings.filter(f => f.code === 'ADAPTER-A3-REFLECT-NO-SERIALIZER'),
      [],
    );
  });
});
