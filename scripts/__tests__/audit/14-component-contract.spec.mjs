/**
 * Smoke tests for scripts/audit/14-component-contract.mjs
 *
 * The contract is the foundation for scaffolders and redesign workflows, so
 * its shape is part of the public contract. These tests pin the schema.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { analyzeComponent, extractContractFromTsx, extractSlots } from '../../audit/14-component-contract.mjs';
import { resolveComponentPaths } from '../../audit/lib/component-paths.mjs';

const tempDirs = [];

function tempTsx(name, content) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'contract-spec-'));
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

describe('14-component-contract: extractSlots', () => {
  it('finds the default slot', () => {
    const slots = extractSlots(`<div><slot /></div>`);
    assert.deepEqual(slots, [{ name: 'default' }]);
  });

  it('finds named slots', () => {
    const slots = extractSlots(`<slot name="icon-left"/><slot name='helper-text' />`);
    const names = slots.map(s => s.name).sort();
    assert.deepEqual(names, ['helper-text', 'icon-left']);
  });

  it('dedups multiple references to the same slot', () => {
    const slots = extractSlots(`<slot name="x"/><slot name="x"/>`);
    assert.deepEqual(slots, [{ name: 'x' }]);
  });

  it('handles slot with attributes besides name', () => {
    const slots = extractSlots(`<slot name="content" onSlotChange={this.h}/>`);
    assert.deepEqual(
      slots.map(s => s.name),
      ['content'],
    );
  });

  it('returns empty array when no slots', () => {
    assert.deepEqual(extractSlots(`<div>no slots here</div>`), []);
  });
});

describe('14-component-contract: extractContractFromTsx', () => {
  it('extracts tag, shadow, formAssociated from @Component options', () => {
    const tsx = `
      import { Component } from '@stencil/core';
      /** Test. */
      @Component({ tag: 'cor-test', shadow: true, formAssociated: true })
      export class CorTest {}
    `;
    const p = tempTsx('cor-test', tsx);
    const { contract } = extractContractFromTsx(p, 'cor-test');
    assert.equal(contract.tag, 'cor-test');
    assert.equal(contract.shadow, true);
    assert.equal(contract.formAssociated, true);
  });

  it('extracts props with type/default/reflect/jsDoc', () => {
    const tsx = `
      import { Component, Prop } from '@stencil/core';
      /** Test. */
      @Component({ tag: 'cor-test' })
      export class CorTest {
        /** The variant. @default primary */
        @Prop({ reflect: true }) variant: string = 'primary';
        /** Optional flag. */
        @Prop() iconOnly?: boolean = false;
      }
    `;
    const p = tempTsx('cor-test', tsx);
    const { contract } = extractContractFromTsx(p, 'cor-test');
    assert.equal(contract.props.length, 2);

    const variant = contract.props.find(p => p.name === 'variant');
    assert.equal(variant.type, 'string');
    assert.equal(variant.default, "'primary'");
    assert.equal(variant.reflect, true);
    assert.ok(variant.jsDoc?.includes('variant'));
    assert.ok(variant.jsDocTags.includes('default'));

    const iconOnly = contract.props.find(p => p.name === 'iconOnly');
    assert.equal(iconOnly.optional, true);
  });

  it('extracts events with payload type from EventEmitter generic', () => {
    const tsx = `
      import { Component, Event, EventEmitter } from '@stencil/core';
      /** Test. */
      @Component({ tag: 'cor-test' })
      export class CorTest {
        /** Fires on change. */
        @Event() corChange: EventEmitter<string>;
        @Event({ eventName: 'cor-custom-name' }) corCustom: EventEmitter<{ value: number }>;
      }
    `;
    const p = tempTsx('cor-test', tsx);
    const { contract } = extractContractFromTsx(p, 'cor-test');
    assert.equal(contract.events.length, 2);

    const change = contract.events.find(e => e.name === 'corChange');
    assert.equal(change.payloadType, 'string');

    const custom = contract.events.find(e => e.name === 'corCustom');
    assert.equal(custom.eventName, 'cor-custom-name');
    assert.equal(custom.payloadType, '{ value: number }');
  });

  it('extracts methods with params + return type', () => {
    const tsx = `
      import { Component, Method } from '@stencil/core';
      /** Test. */
      @Component({ tag: 'cor-test' })
      export class CorTest {
        /** Opens the panel. */
        @Method() async open(direction: string, force?: boolean): Promise<void> {}
      }
    `;
    const p = tempTsx('cor-test', tsx);
    const { contract } = extractContractFromTsx(p, 'cor-test');
    assert.equal(contract.methods.length, 1);
    const method = contract.methods[0];
    assert.equal(method.name, 'open');
    assert.equal(method.params.length, 2);
    assert.equal(method.params[0].name, 'direction');
    assert.equal(method.params[0].type, 'string');
    assert.equal(method.params[1].optional, true);
    assert.equal(method.returnType, 'Promise<void>');
    assert.equal(method.isAsync, true);
  });

  it('errors when file has no @Component class', () => {
    const tsx = `export const foo = 1;`;
    const p = tempTsx('not-component', tsx);
    const { findings, contract } = extractContractFromTsx(p, 'cor-test');
    assert.equal(contract, null);
    assert.ok(findings.find(f => f.code === 'CONTRACT-NO-COMPONENT-CLASS'));
  });
});

describe('14-component-contract: baseline components', () => {
  it('cor-button — extracts expected shape', async () => {
    const target = resolveComponentPaths('cor-button');
    const { contract, findings } = await analyzeComponent(target);
    assert.equal(findings.filter(f => f.severity === 'error').length, 0);
    assert.equal(contract.tag, 'cor-button');
    assert.equal(contract.shadow, true);
    assert.equal(contract.formAssociated, false);
    assert.ok(contract.props.length >= 3, 'cor-button should have >= 3 props');
    // Default slot should be present
    assert.ok(contract.slots.some(s => s.name === 'default'));
  });

  it('cor-input — form-associated, has multiple slots', async () => {
    const target = resolveComponentPaths('cor-input');
    const { contract } = await analyzeComponent(target);
    assert.equal(contract.formAssociated, true);
    assert.ok(contract.slots.length >= 2, 'cor-input should have multiple named slots');
  });

  it('cor-tooltip — has events with proper EventEmitter<T> payloads', async () => {
    const target = resolveComponentPaths('cor-tooltip');
    const { contract } = await analyzeComponent(target);
    assert.ok(contract.events.length > 0, 'cor-tooltip should expose at least one event');
    for (const ev of contract.events) {
      assert.ok(ev.name.startsWith('cor'), `event ${ev.name} should start with cor*`);
    }
  });
});
