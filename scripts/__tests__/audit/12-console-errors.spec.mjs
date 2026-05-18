/**
 * Smoke tests for scripts/audit/12-console-errors.mjs
 *
 * Pure helpers only — the actual browser-driving flow is integration-tested
 * separately once Playwright is installed (`yarn add -D playwright`).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyMessage } from '../../audit/12-console-errors.mjs';

describe('12-console-errors: classifyMessage', () => {
  it('classifies error messages as error', () => {
    assert.equal(classifyMessage('error', 'TypeError: cannot read x of undefined'), 'error');
  });

  it('drops favicon noise to info', () => {
    assert.equal(classifyMessage('error', 'Failed to load resource: favicon.ico'), 'info');
  });

  it('classifies warnings as warning', () => {
    assert.equal(classifyMessage('warning', 'Deprecated API X used'), 'warning');
  });

  it('drops HMR / webpack-internal noise to info', () => {
    assert.equal(classifyMessage('warning', '[HMR] Waiting for update signal from WDS...'), 'info');
    assert.equal(classifyMessage('warning', 'hot-module-reload triggered'), 'info');
    assert.equal(classifyMessage('warning', 'webpack-internal:///...'), 'info');
  });

  it('treats any other type as info', () => {
    assert.equal(classifyMessage('log', 'noise'), 'info');
    assert.equal(classifyMessage('debug', 'verbose'), 'info');
  });

  it('handles missing/null text gracefully', () => {
    assert.equal(classifyMessage('error', undefined), 'error');
    assert.equal(classifyMessage('warning', null), 'warning');
  });
});
