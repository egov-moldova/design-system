import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { budgetFor, compareImages, storiesFor, storyIdsToCompare } from '../assets/story-regression.mjs';

describe('storiesFor', () => {
  const index = {
    entries: {
      'components-icon--default': {
        type: 'story',
        id: 'components-icon--default',
        importPath: './src/components/mud-icon/mud-icon.stories.ts',
      },
      'components-icon--docs': {
        type: 'docs',
        id: 'components-icon--docs',
        importPath: './src/components/mud-icon/mud-icon.stories.ts',
      },
      'components-button--default': {
        type: 'story',
        id: 'components-button--default',
        importPath: './src/components/mud-button/mud-button.stories.ts',
      },
    },
  };
  it('maps every story to its component dir and drops docs entries', () => {
    assert.deepEqual(storiesFor(index), {
      'components-icon--default': 'mud-icon',
      'components-button--default': 'mud-button',
    });
  });
  it('filters by component dir', () => {
    assert.deepEqual(Object.keys(storiesFor(index, ['mud-icon'])), ['components-icon--default']);
  });
});

describe('storyIdsToCompare', () => {
  it('takes the union, so a story that vanished from either side is reported', () => {
    const { ids, onlyIn } = storyIdsToCompare({ a: {}, b: {} }, { b: {}, c: {} });
    assert.deepEqual(ids, ['a', 'b', 'c']);
    assert.deepEqual(onlyIn, { baseline: ['a'], after: ['c'] });
  });
});

describe('compareImages', () => {
  it('reports zero for identical images and the differing pixel count otherwise', async () => {
    const { PNG } = await import('pngjs');
    const a = new PNG({ width: 2, height: 1 });
    a.data.fill(255);
    const b = new PNG({ width: 2, height: 1 });
    b.data.fill(255);
    b.data[0] = 0;
    assert.equal(compareImages(a, a).pixels, 0);
    assert.equal(compareImages(a, b).pixels, 1);
  });
});

describe('budgetFor', () => {
  it('defaults to zero and reads a per-component budget', () => {
    assert.equal(budgetFor('mud-icon', { 'mud-phone-input': 279 }), 0);
    assert.equal(budgetFor('mud-phone-input', { 'mud-phone-input': 279 }), 279);
  });
});
