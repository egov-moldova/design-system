/**
 * Tests for scripts/audit/figma-refs.mjs — pure planning helpers. The network
 * route is exercised manually with a FIGMA_TOKEN.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildImagesUrl, figmaToken, mcpCall, planDownloads } from '../../audit/figma-refs.mjs';

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

describe('figma-refs: mcpCall', () => {
  it('builds the download_figma_images call with a repo-relative path', () => {
    const plan = planDownloads(manifest, { outDir: '/repo/.audit-figma/mud-date-picker' });
    const call = mcpCall(manifest, plan, { outDir: '/repo/.audit-figma/mud-date-picker', scale: 2, repoRoot: '/repo' });
    assert.equal(call.tool, 'mcp__figma-mcp__download_figma_images');
    assert.deepEqual(call.input, {
      fileKey: 'doJ7tDY0PlQ0PqMgbpFVIC',
      localPath: path.join('.audit-figma', 'mud-date-picker'),
      pngScale: 2,
      nodes: [
        { nodeId: '157:4570', fileName: 'date-picker.png' },
        { nodeId: '524:1973', fileName: 'month-picker.png' },
      ],
    });
  });
});
