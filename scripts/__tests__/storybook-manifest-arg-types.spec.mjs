import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractArgTypes, labelPropertiesWithAttributes } from '../../.storybook/manifest-arg-types.mjs';

const MANIFEST = {
  schemaVersion: '2.1.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/components/mud-fixture/mud-fixture.tsx',
      declarations: [
        {
          kind: 'class',
          customElement: true,
          tagName: 'mud-fixture',
          name: 'MudFixture',
          members: [
            {
              kind: 'field',
              name: 'fullWidth',
              description: 'Stretch.',
              type: { text: 'boolean' },
              default: 'false',
              attribute: 'full-width',
            },
            { kind: 'field', name: 'items', description: 'Rows.', type: { text: 'FixtureItem[]' } },
            { kind: 'field', name: 'label', description: 'Label prop.', type: { text: 'string' }, attribute: 'label' },
            {
              kind: 'method',
              name: 'setOpen',
              description: 'Open it.',
              parameters: [{ name: 'open', type: { text: 'boolean' } }],
              return: { type: { text: 'Promise<void>' } },
            },
            { kind: 'method', name: 'focusHeader', description: 'Focus.', return: { type: { text: 'Promise<void>' } } },
          ],
          attributes: [
            { name: 'full-width', fieldName: 'fullWidth' },
            { name: 'label', fieldName: 'label' },
          ],
          events: [{ name: 'mudChange', description: 'Changed.', type: { text: 'CustomEvent<FixtureDetail>' } }],
          slots: [
            { name: '', description: 'Body.' },
            { name: 'label', description: 'Label slot.' },
          ],
          cssParts: [{ name: 'label', description: 'Label part.' }],
        },
      ],
    },
  ],
};

describe('extractArgTypes', () => {
  it('keys a property by its name, labels it with its attribute, and fills type and default', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-fixture').fullWidth, {
      name: 'full-width',
      description: 'Stretch.',
      table: { category: 'properties', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    });
  });

  it('labels a property with no attribute by its own name', () => {
    const row = extractArgTypes(MANIFEST, 'mud-fixture').items;
    assert.equal(row.name, 'items');
    assert.equal(row.table.defaultValue, undefined);
  });

  it('keeps a property, a slot and a part that share a name as three rows', () => {
    const rows = extractArgTypes(MANIFEST, 'mud-fixture');
    assert.equal(rows.label.table.category, 'properties');
    assert.equal(rows['slot:label'].table.category, 'slots');
    assert.equal(rows['part:label'].table.category, 'css shadow parts');
    assert.equal(rows['part:label'].name, 'label');
  });

  it('lists the unnamed default slot', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-fixture')['slot:default'], {
      name: '(default)',
      description: 'Body.',
      table: { category: 'slots' },
    });
  });

  it('lists events with their event type', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-fixture')['event:mudChange'], {
      name: 'mudChange',
      description: 'Changed.',
      table: { category: 'events', type: { summary: 'CustomEvent<FixtureDetail>' } },
    });
  });

  it('lists methods with their signature', () => {
    const rows = extractArgTypes(MANIFEST, 'mud-fixture');
    assert.equal(rows['method:setOpen'].table.type.summary, '(open: boolean) => Promise<void>');
    assert.equal(rows['method:focusHeader'].table.type.summary, '() => Promise<void>');
    assert.equal(rows['method:setOpen'].table.category, 'methods');
  });

  it('does not emit attributes as rows of their own', () => {
    assert.equal(extractArgTypes(MANIFEST, 'mud-fixture')['full-width'], undefined);
  });

  it('gives no row a top-level type, so Storybook infers no control from the manifest', () => {
    assert.ok(Object.values(extractArgTypes(MANIFEST, 'mud-fixture')).every(row => !('type' in row)));
  });

  it('returns an empty object for an unknown tag, a legacy wca manifest, or no manifest', () => {
    assert.deepEqual(extractArgTypes(MANIFEST, 'mud-missing'), {});
    assert.deepEqual(extractArgTypes({ version: 'experimental', tags: [{ name: 'mud-fixture' }] }, 'mud-fixture'), {});
    assert.deepEqual(extractArgTypes(undefined, 'mud-fixture'), {});
  });
});

describe('labelPropertiesWithAttributes', () => {
  // Storybook normalizes a story's own argTypes with `name: <key>` and merges them over
  // the extracted rows, so a prop the story declares arrives labelled `fullWidth`.
  const merged = {
    'fullWidth': { name: 'fullWidth', control: { type: 'boolean' }, table: { category: 'properties' } },
    'items': { name: 'items', table: { category: 'properties' } },
    'slot:label': { name: 'label', table: { category: 'slots' } },
    'demoOnly': { name: 'demoOnly', control: { type: 'text' } },
  };

  it('relabels a property with its attribute name and keeps everything else on the row', () => {
    assert.deepEqual(labelPropertiesWithAttributes(MANIFEST, 'mud-fixture', merged).fullWidth, {
      name: 'full-width',
      control: { type: 'boolean' },
      table: { category: 'properties' },
    });
  });

  it('leaves attribute-less properties, other categories and story-only args untouched', () => {
    const rows = labelPropertiesWithAttributes(MANIFEST, 'mud-fixture', merged);
    assert.equal(rows.items, merged.items);
    assert.equal(rows['slot:label'], merged['slot:label']);
    assert.equal(rows.demoOnly, merged.demoOnly);
  });

  it('returns the argTypes unchanged for an unknown tag or no manifest', () => {
    assert.equal(labelPropertiesWithAttributes(MANIFEST, 'mud-missing', merged), merged);
    assert.equal(labelPropertiesWithAttributes(undefined, 'mud-fixture', merged), merged);
  });
});
