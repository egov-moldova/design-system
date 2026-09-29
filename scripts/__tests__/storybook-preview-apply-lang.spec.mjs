/**
 * .storybook/preview.js — `applyLang`'s no-op-when-unchanged guard.
 *
 * `applyLang` is exported so it CAN be imported, but `preview.js` itself statically imports
 * Storybook/Vite packages, `../dist/mud/*` build output and `.json` config with import
 * attributes — none of it resolvable or needed under plain `node --test` (this repo's
 * Storybook Vitest lane, not `test:scripts`, is what runs a real browser-like environment).
 * So this spec extracts `applyLang`'s own source text (and its `setLangIfChanged` helper,
 * which is not itself exported) out of the file and evaluates JUST that text via `Function` —
 * both are pure DOM logic with no reference to anything else in the module — rather than
 * importing the module and needing to stub every one of those unrelated dependencies.
 *
 * Before the fix, `applyLang` called `el.setAttribute('lang', lang)` unconditionally on
 * `<html>` and every retagged Docs wrapper, so re-applying the SAME lang (e.g. a
 * `GLOBALS_UPDATED` event that changes `mode` but not `lang`) still mutated the attribute and
 * fired every component's lang `MutationObserver`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const PREVIEW_PATH = fileURLToPath(new URL('../../.storybook/preview.js', import.meta.url));

/** Pulls a top-level function declaration's full source (including any leading `export `) by name. */
function extractFunction(source, name) {
  const re = new RegExp(`(?:export )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`);
  const match = source.match(re);
  assert.ok(match, `could not find "function ${name}" in ${PREVIEW_PATH}`);
  return match[0].replace(/^export /, '');
}

/** Evaluates `applyLang` and its private `setLangIfChanged` helper in isolation and returns `applyLang`. */
function loadApplyLang() {
  const source = fs.readFileSync(PREVIEW_PATH, 'utf8');
  const setLangIfChangedSrc = extractFunction(source, 'setLangIfChanged');
  const applyLangSrc = extractFunction(source, 'applyLang');
  const factory = new Function(`
    ${setLangIfChangedSrc}
    ${applyLangSrc}
    return applyLang;
  `);
  return factory();
}

/** A minimal element: tracks every `setAttribute` call and starts with an optional `lang`. */
function fakeElement(initialLang) {
  const calls = [];
  const attrs = new Map();
  if (initialLang !== undefined) attrs.set('lang', initialLang);
  return {
    calls,
    getAttribute: name => (attrs.has(name) ? attrs.get(name) : null),
    setAttribute(name, value) {
      calls.push([name, value]);
      attrs.set(name, value);
    },
  };
}

/** A fake `document`: `documentElement` plus every element the wrapper selector should match. */
function fakeDoc(wrappers, documentElement) {
  return {
    documentElement,
    querySelectorAll: selector =>
      selector === '[id^="story--"][id$="-inner"][lang]' ? wrappers : assert.fail(`unexpected selector: ${selector}`),
  };
}

describe('.storybook/preview.js — applyLang', () => {
  it('sets lang on <html> and every wrapper when it actually changes', () => {
    const applyLang = loadApplyLang();
    const html = fakeElement('ro-MD');
    const wrapper = fakeElement('ro-MD');
    applyLang('ru-MD', fakeDoc([wrapper], html));
    assert.deepEqual(html.calls, [['lang', 'ru-MD']]);
    assert.deepEqual(wrapper.calls, [['lang', 'ru-MD']]);
  });

  it('does not call setAttribute when the value is already current (<html> and wrappers)', () => {
    const applyLang = loadApplyLang();
    const html = fakeElement('ru-MD');
    const wrapper = fakeElement('ru-MD');
    applyLang('ru-MD', fakeDoc([wrapper], html));
    assert.deepEqual(html.calls, []);
    assert.deepEqual(wrapper.calls, []);
  });

  it('defaults to ro-MD for a falsy value, and only writes what actually changes', () => {
    const applyLang = loadApplyLang();
    const html = fakeElement('ru-MD');
    const wrapper = fakeElement('ro-MD');
    applyLang(undefined, fakeDoc([wrapper], html));
    assert.deepEqual(html.calls, [['lang', 'ro-MD']]);
    assert.deepEqual(wrapper.calls, []);
  });

  it('writes independently per wrapper — only the ones that differ', () => {
    const applyLang = loadApplyLang();
    const html = fakeElement('en-US');
    const stale = fakeElement('ro-MD');
    const current = fakeElement('en-US');
    applyLang('en-US', fakeDoc([stale, current], html));
    assert.deepEqual(stale.calls, [['lang', 'en-US']]);
    assert.deepEqual(current.calls, []);
    assert.deepEqual(html.calls, []);
  });
});
