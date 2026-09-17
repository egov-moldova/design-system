/**
 * Tests for scripts/audit/figma-refs.mjs — pure planning and coverage helpers.
 * The network route is exercised manually with a FIGMA_TOKEN; the coverage
 * fixture is trimmed from a real /v1/files/:key/nodes response.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildImagesUrl,
  buildNodesUrl,
  checkCoverage,
  citedNodeIds,
  componentSetIds,
  figmaToken,
  planDownloads,
  staleness,
} from '../../audit/figma-refs.mjs';

const manifest = {
  figma: { fileKey: 'doJ7tDY0PlQ0PqMgbpFVIC', scale: 2 },
  defaults: { story: 'a--b' },
  states: [
    { name: 'date-picker', node: '157:4570' },
    { name: 'day-cell-hover', node: '489:9029', pixel: false },
    { name: 'no-node' },
    { name: 'month-picker', node: '524-1973' },
  ],
};

describe('figma-refs: figmaToken', () => {
  it('prefers FIGMA_TOKEN, then FIGMA_ACCESS_TOKEN, then FIGMA_API_KEY', () => {
    assert.equal(figmaToken({ FIGMA_TOKEN: 'a', FIGMA_ACCESS_TOKEN: 'b' }), 'a');
    assert.equal(figmaToken({ FIGMA_ACCESS_TOKEN: 'b', FIGMA_API_KEY: 'c' }), 'b');
    assert.equal(figmaToken({ FIGMA_API_KEY: 'c' }), 'c');
    assert.equal(figmaToken({}), null);
  });
});

describe('figma-refs: planDownloads', () => {
  it('plans one file per pixel state with a node', () => {
    const plan = planDownloads(manifest, { outDir: '/refs' });
    assert.deepEqual(
      plan.map(p => [p.state, p.nodeId, p.fileName]),
      [
        ['date-picker', '157:4570', 'date-picker.png'],
        ['month-picker', '524:1973', 'month-picker.png'],
      ],
    );
    assert.equal(plan[0].path, path.join('/refs', 'date-picker.png'));
  });
});

describe('figma-refs: buildImagesUrl', () => {
  it('requests PNGs at the scale for de-duplicated ids', () => {
    const url = new URL(buildImagesUrl('KEY', ['1:2', '3:4', '1:2'], 2));
    assert.equal(url.origin + url.pathname, 'https://api.figma.com/v1/images/KEY');
    assert.equal(url.searchParams.get('ids'), '1:2,3:4');
    assert.equal(url.searchParams.get('format'), 'png');
    assert.equal(url.searchParams.get('scale'), '2');
  });
});

const probe = JSON.parse(readFileSync(new URL('./__fixtures__/figma-nodes.json', import.meta.url), 'utf8'));
const coverageManifest = {
  figma: {
    fileKey: 'doJ7tDY0PlQ0PqMgbpFVIC',
    skip: [{ node: '158:406', reason: 'selected is covered by the date-picker state' }],
  },
  defaults: { story: 'molecules-date-picker--default' },
  shared: { base: [{ target: 'x', styles: { color: '#000' }, node: '99999:1' }] },
  states: [{ name: 'default', node: '158:402', expect: [{ use: 'base' }] }],
};

describe('figma-refs: citedNodeIds', () => {
  it('collects state, expectation and shared nodes', () => {
    assert.deepEqual(citedNodeIds(coverageManifest), ['158:402', '99999:1']);
  });
});

describe('figma-refs: buildNodesUrl', () => {
  it('requests depth 1 for de-duplicated ids', () => {
    assert.equal(
      buildNodesUrl('abc', ['1:2', '1:2', '3:4']),
      'https://api.figma.com/v1/files/abc/nodes?ids=1%3A2%2C3%3A4&depth=1',
    );
  });
});

describe('figma-refs: coverage', () => {
  it('finds component sets, gone nodes and uncovered variants, honouring skip', () => {
    assert.deepEqual(componentSetIds(probe.cited), ['158:401']);
    assert.deepEqual(checkCoverage(coverageManifest, probe.cited, probe.sets), {
      version: '2399758890123564281',
      lastModified: '2026-09-16T09:26:19Z',
      gone: ['99999:1'],
      missing: [{ setId: '158:401', setName: '.day-cell', node: '158:404', name: 'State=Hover' }],
    });
  });
});

describe('figma-refs: staleness', () => {
  it('distinguishes never exported, changed and current', () => {
    assert.equal(staleness(null, '1'), 'never-exported');
    assert.equal(staleness({ version: '1' }, '2'), 'changed');
    assert.equal(staleness({ version: '2' }, '2'), 'none');
  });
});
