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

import {
  analyzeComponent,
  extractContractFromTsx,
  extractSlots,
  inferArchetype,
} from '../../audit/14-component-contract.mjs';
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
      @Component({ tag: 'mud-test', shadow: true, formAssociated: true })
      export class MudTest {}
    `;
    const p = tempTsx('mud-test', tsx);
    const { contract } = extractContractFromTsx(p, 'mud-test');
    assert.equal(contract.tag, 'mud-test');
    assert.equal(contract.shadow, true);
    assert.equal(contract.formAssociated, true);
  });

  it('extracts props with type/default/reflect/jsDoc', () => {
    const tsx = `
      import { Component, Prop } from '@stencil/core';
      /** Test. */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /** The variant. @default primary */
        @Prop({ reflect: true }) variant: string = 'primary';
        /** Optional flag. */
        @Prop() iconOnly?: boolean = false;
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { contract } = extractContractFromTsx(p, 'mud-test');
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
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /** Fires on change. */
        @Event() mudChange: EventEmitter<string>;
        @Event({ eventName: 'mud-custom-name' }) mudCustom: EventEmitter<{ value: number }>;
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { contract } = extractContractFromTsx(p, 'mud-test');
    assert.equal(contract.events.length, 2);

    const change = contract.events.find(e => e.name === 'mudChange');
    assert.equal(change.payloadType, 'string');

    const custom = contract.events.find(e => e.name === 'mudCustom');
    assert.equal(custom.eventName, 'mud-custom-name');
    assert.equal(custom.payloadType, '{ value: number }');
  });

  it('extracts methods with params + return type', () => {
    const tsx = `
      import { Component, Method } from '@stencil/core';
      /** Test. */
      @Component({ tag: 'mud-test' })
      export class MudTest {
        /** Opens the panel. */
        @Method() async open(direction: string, force?: boolean): Promise<void> {}
      }
    `;
    const p = tempTsx('mud-test', tsx);
    const { contract } = extractContractFromTsx(p, 'mud-test');
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
    const { findings, contract } = extractContractFromTsx(p, 'mud-test');
    assert.equal(contract, null);
    assert.ok(findings.find(f => f.code === 'CONTRACT-NO-COMPONENT-CLASS'));
  });
});

describe('14-component-contract: inferArchetype (pure)', () => {
  it('returns the override value when @archetype JSDoc tag is set', () => {
    const result = inferArchetype({
      contract: { formAssociated: false, props: [], events: [] },
      tsxContent: '',
      componentName: 'mud-anything',
      overrideValue: 'FORM',
    });
    assert.equal(result.value, 'FORM');
    assert.equal(result.source, 'override');
    assert.equal(result.confidence, 'high');
    assert.ok(result.signals.some(s => s.includes('@archetype')));
  });

  it('ignores invalid override values and falls through to heuristics', () => {
    const result = inferArchetype({
      contract: { formAssociated: true, props: [], events: [] },
      tsxContent: '',
      componentName: 'mud-test',
      overrideValue: 'NOT_REAL',
    });
    assert.equal(result.value, 'FORM');
    assert.equal(result.source, 'heuristic');
  });

  it('FORM — high confidence when formAssociated: true', () => {
    const result = inferArchetype({
      contract: { formAssociated: true, props: [], events: [] },
      tsxContent: '<Host>...</Host>',
      componentName: 'mud-input',
    });
    assert.equal(result.value, 'FORM');
    assert.equal(result.confidence, 'high');
    assert.ok(result.signals.some(s => s.includes('formAssociated')));
  });

  it('STATUS — high confidence when TSX has static role="status"', () => {
    const result = inferArchetype({
      contract: { formAssociated: false, props: [], events: [] },
      tsxContent: `return <Host role="status">{children}</Host>;`,
      componentName: 'mud-banner',
    });
    assert.equal(result.value, 'STATUS');
    assert.equal(result.confidence, 'high');
    assert.ok(result.signals.some(s => s.includes('role="status"')));
  });

  it('STATUS — high confidence for alert/progressbar/timer roles', () => {
    for (const role of ['alert', 'progressbar', 'timer']) {
      const result = inferArchetype({
        contract: { formAssociated: false, props: [], events: [] },
        tsxContent: `<Host role="${role}"></Host>`,
        componentName: 'mud-something',
      });
      assert.equal(result.value, 'STATUS', `role=${role} should map to STATUS`);
      assert.equal(result.confidence, 'high');
    }
  });

  it('STATUS — medium confidence on name fallback when role is dynamic', () => {
    const result = inferArchetype({
      contract: { formAssociated: false, props: [], events: [] },
      tsxContent: `<Host role={this.ariaRole}>...</Host>`,
      componentName: 'mud-toast-notification',
    });
    assert.equal(result.value, 'STATUS');
    assert.equal(result.confidence, 'medium');
    assert.ok(result.signals.some(s => s.includes('name')));
    assert.ok(result.signals.some(s => s.includes('dynamic role')));
  });

  it('OVERLAY — high confidence when a boolean `open` prop is present', () => {
    const result = inferArchetype({
      contract: {
        formAssociated: false,
        props: [{ name: 'open', type: 'boolean' }],
        events: [{ name: 'mudOpen' }],
      },
      tsxContent: '<div></div>',
      componentName: 'mud-modal',
    });
    assert.equal(result.value, 'OVERLAY');
    assert.equal(result.confidence, 'high');
    assert.ok(result.signals.some(s => s.includes('open')));
  });

  it('OVERLAY — matches expanded/visible/isOpen/active prop names', () => {
    for (const name of ['expanded', 'visible', 'isOpen', 'active']) {
      const result = inferArchetype({
        contract: {
          formAssociated: false,
          props: [{ name, type: 'boolean' }],
          events: [],
        },
        tsxContent: '',
        componentName: 'mud-thing',
      });
      assert.equal(result.value, 'OVERLAY', `${name} should map to OVERLAY`);
    }
  });

  it('ACTION — high confidence when component has @Event() and no overlay props', () => {
    const result = inferArchetype({
      contract: {
        formAssociated: false,
        props: [{ name: 'variant', type: 'string' }],
        events: [{ name: 'mudClick' }, { name: 'mudHover' }],
      },
      tsxContent: '',
      componentName: 'mud-chip',
    });
    assert.equal(result.value, 'ACTION');
    assert.equal(result.confidence, 'high');
    assert.ok(result.signals.some(s => s.includes('2 @Event')));
  });

  it('ACTION not selected when an overlay-style prop is also present (even non-boolean)', () => {
    const result = inferArchetype({
      contract: {
        formAssociated: false,
        props: [{ name: 'open', type: 'string' /* odd, but realistic for stencil "true"|"false" */ }],
        events: [{ name: 'mudClick' }],
      },
      tsxContent: '',
      componentName: 'mud-weird',
    });
    assert.notEqual(result.value, 'ACTION');
  });

  it('CONTAINER — medium confidence for structural Host role', () => {
    const result = inferArchetype({
      contract: { formAssociated: false, props: [], events: [] },
      tsxContent: `<Host role="rowgroup"><slot/></Host>`,
      componentName: 'mud-tbody',
    });
    assert.equal(result.value, 'CONTAINER');
    assert.equal(result.confidence, 'medium');
    assert.ok(result.signals.some(s => s.includes('rowgroup')));
  });

  it('CONTAINER — low confidence as catch-all when nothing else matches', () => {
    const result = inferArchetype({
      contract: { formAssociated: false, props: [], events: [] },
      tsxContent: `<Host><slot/></Host>`,
      componentName: 'mud-card',
    });
    assert.equal(result.value, 'CONTAINER');
    assert.equal(result.confidence, 'low');
  });

  it('priority order: FORM beats STATUS-by-role', () => {
    const result = inferArchetype({
      contract: { formAssociated: true, props: [], events: [] },
      tsxContent: `<Host role="status"></Host>`,
      componentName: 'mud-progress-input',
    });
    assert.equal(result.value, 'FORM');
  });

  it('priority order: OVERLAY beats ACTION when both signals present', () => {
    const result = inferArchetype({
      contract: {
        formAssociated: false,
        props: [{ name: 'open', type: 'boolean' }],
        events: [{ name: 'mudOpen' }, { name: 'mudClose' }],
      },
      tsxContent: '',
      componentName: 'mud-popover',
    });
    assert.equal(result.value, 'OVERLAY');
  });
});

describe('14-component-contract: archetype emission (end-to-end)', () => {
  it('emits contract.archetype for components with formAssociated', () => {
    const tsx = `
      import { Component } from '@stencil/core';
      /** Form input. */
      @Component({ tag: 'mud-form-input', formAssociated: true })
      export class MudFormInput {}
    `;
    const p = tempTsx('mud-form-input', tsx);
    const { contract } = extractContractFromTsx(p, 'mud-form-input');
    assert.equal(contract.archetype.value, 'FORM');
    assert.equal(contract.archetype.source, 'heuristic');
  });

  it('respects @archetype JSDoc override on the class', () => {
    const tsx = `
      import { Component } from '@stencil/core';
      /**
       * Looks like a container but is really a button wrapper.
       * @archetype ACTION
       */
      @Component({ tag: 'mud-fancy-button' })
      export class MudFancyButton {}
    `;
    const p = tempTsx('mud-fancy-button', tsx);
    const { contract } = extractContractFromTsx(p, 'mud-fancy-button');
    assert.equal(contract.archetype.value, 'ACTION');
    assert.equal(contract.archetype.source, 'override');
    assert.equal(contract.archetype.confidence, 'high');
  });
});

describe('14-component-contract: baseline components', () => {
  it('mud-button — extracts expected shape', async () => {
    const target = resolveComponentPaths('mud-button');
    const { contract, findings } = await analyzeComponent(target);
    assert.equal(findings.filter(f => f.severity === 'error').length, 0);
    assert.equal(contract.tag, 'mud-button');
    assert.equal(contract.shadow, true);
    assert.equal(contract.formAssociated, false);
    assert.ok(contract.props.length >= 3, 'mud-button should have >= 3 props');
    // Default slot should be present
    assert.ok(contract.slots.some(s => s.name === 'default'));
  });

  it('mud-input — form-associated, has multiple slots', async () => {
    const target = resolveComponentPaths('mud-input');
    const { contract } = await analyzeComponent(target);
    assert.equal(contract.formAssociated, true);
    assert.ok(contract.slots.length >= 2, 'mud-input should have multiple named slots');
  });

  it('mud-tooltip — has events with proper EventEmitter<T> payloads', async () => {
    const target = resolveComponentPaths('mud-tooltip');
    const { contract } = await analyzeComponent(target);
    assert.ok(contract.events.length > 0, 'mud-tooltip should expose at least one event');
    for (const ev of contract.events) {
      assert.ok(ev.name.startsWith('mud'), `event ${ev.name} should start with mud*`);
    }
  });
});
