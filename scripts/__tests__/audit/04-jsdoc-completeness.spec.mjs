/**
 * Smoke tests for scripts/audit/04-jsdoc-completeness.mjs
 *
 * Strategy:
 *   - Sanity-scan our 3 baseline components (mud-button, mud-text-input, mud-tooltip) —
 *     these are mature and should report 0 errors. Some `info` findings are OK
 *     (e.g. missing @default on a freshly-added optional prop).
 *   - Synthetic TSX fixtures injected via analyzeTsxFile() exercise each
 *     finding code (missing prop JSDoc, missing @default, missing @param, etc.).
 *
 * Quality bar (from the plan):
 *   - 0 error-level findings on mud-button, mud-text-input, mud-tooltip.
 *   - Warnings may be present but should match real issues; we don't pin counts.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { analyzeComponent, analyzeTsxFile } from '../../audit/04-jsdoc-completeness.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

const tempDirs = [];

function tempTsx(name, content) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'jsdoc-spec-'));
  tempDirs.push(dir);
  const p = path.join(dir, `${name}.tsx`);
  writeFileSync(p, content, 'utf8');
  return p;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('04-jsdoc-completeness: baseline regression', () => {
  it('mud-button has zero error-level findings', async () => {
    const target = resolveComponentPaths('mud-button');
    const { findings, api } = await analyzeComponent(target);
    const errors = findings.filter(f => f.severity === 'error');
    assert.deepEqual(errors, [], `unexpected errors:\n${JSON.stringify(errors, null, 2)}`);
    assert.ok(api.props > 0, 'expected at least one prop on mud-button');
  });

  it('mud-text-input and mud-tooltip both produce 0 errors', async () => {
    for (const name of ['mud-text-input', 'mud-tooltip']) {
      const target = resolveComponentPaths(name);
      const { findings } = await analyzeComponent(target);
      const errors = findings.filter(f => f.severity === 'error');
      assert.deepEqual(errors, [], `${name} should have 0 errors; got:\n${JSON.stringify(errors, null, 2)}`);
    }
  });
});

describe('04-jsdoc-completeness: prop checks', () => {
  it('flags @Prop() without JSDoc as warning (JSDOC-PROP-MISSING)', () => {
    const tsx = `
      import { Component, Prop } from '@stencil/core';
      /**
       * A test component.
       */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        @Prop({ reflect: true }) variant: string;
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    const missing = findings.find(f => f.code === 'JSDOC-PROP-MISSING');
    assert.ok(missing, 'expected JSDOC-PROP-MISSING finding');
    assert.equal(missing.severity, 'warning');
  });

  it('does NOT flag @Prop with proper JSDoc + @default', () => {
    const tsx = `
      import { Component, Prop } from '@stencil/core';
      /**
       * A test component.
       */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /**
         * The button variant.
         * @default primary
         */
        @Prop({ reflect: true }) variant: string = 'primary';
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    const propMissing = findings.find(f => f.code === 'JSDOC-PROP-MISSING');
    const defaultTag = findings.find(f => f.code === 'JSDOC-PROP-DEFAULT-TAG');
    assert.equal(propMissing, undefined);
    assert.equal(defaultTag, undefined);
  });

  it('suggests @default when prop has initializer but JSDoc lacks @default', () => {
    const tsx = `
      import { Component, Prop } from '@stencil/core';
      /**
       * A test component.
       */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /**
         * The button variant.
         */
        @Prop({ reflect: true }) variant: string = 'primary';
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    const defaultTag = findings.find(f => f.code === 'JSDOC-PROP-DEFAULT-TAG');
    assert.ok(defaultTag, 'expected JSDOC-PROP-DEFAULT-TAG finding');
    assert.equal(defaultTag.severity, 'info');
  });
});

describe('04-jsdoc-completeness: event checks', () => {
  it('flags @Event() without JSDoc', () => {
    const tsx = `
      import { Component, Event, EventEmitter } from '@stencil/core';
      /** A test component. */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        @Event() mudChange: EventEmitter<string>;
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    const missing = findings.find(f => f.code === 'JSDOC-EVENT-MISSING');
    assert.ok(missing, 'expected JSDOC-EVENT-MISSING finding');
  });

  it('accepts @Event() with JSDoc', () => {
    const tsx = `
      import { Component, Event, EventEmitter } from '@stencil/core';
      /** A test component. */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /** Fires when the value changes. */
        @Event() mudChange: EventEmitter<string>;
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    assert.equal(
      findings.find(f => f.code === 'JSDOC-EVENT-MISSING'),
      undefined,
    );
  });
});

describe('04-jsdoc-completeness: method checks', () => {
  it('flags @Method() without JSDoc', () => {
    const tsx = `
      import { Component, Method } from '@stencil/core';
      /** A test component. */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        @Method() async open(): Promise<void> {}
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    assert.ok(findings.find(f => f.code === 'JSDOC-METHOD-MISSING'));
  });

  it('suggests @param when method has params but JSDoc lacks @param', () => {
    const tsx = `
      import { Component, Method } from '@stencil/core';
      /** A test component. */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /** Opens the panel. */
        @Method() async open(direction: string): Promise<void> {}
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    const paramMissing = findings.find(f => f.code === 'JSDOC-METHOD-PARAM-MISSING');
    assert.ok(paramMissing, 'expected JSDOC-METHOD-PARAM-MISSING finding');
    assert.equal(paramMissing.severity, 'info');
  });
});

describe('04-jsdoc-completeness: component-level checks', () => {
  it('warns on missing class JSDoc', () => {
    const tsx = `
      import { Component } from '@stencil/core';
      @Component({ tag: 'mud-test' })
      export class MudTest {}
    `;
    const p = tempTsx('mud-test', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-test');
    assert.ok(findings.find(f => f.code === 'JSDOC-COMPONENT-MISSING'));
  });

  it('errors when file has no @Component class', () => {
    const tsx = `export const foo = 1;`;
    const p = tempTsx('not-a-component', tsx);
    const { findings } = analyzeTsxFile(p, 'mud-fake');
    assert.ok(findings.find(f => f.code === 'JSDOC-NO-COMPONENT-CLASS'));
  });
});
