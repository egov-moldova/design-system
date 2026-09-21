import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../tokens-validate.mjs', import.meta.url));
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const color = $value => ({ $value, $type: 'color' });

/**
 * Lays out a project the way the repo does — `tokens/core/**`, `tokens/generated/core.tokens.css`,
 * `src/components/mud-<name>/mud-<name>.css` — and runs the validator over its `tokens` root.
 */
function validate({
  component,
  componentName = 'date-input',
  css = '',
  generatedCss = '',
  withComponentCss = true,
  files = {},
}) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-validate-'));
  tempDirs.push(project);
  const write = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(project, rel)), { recursive: true });
    fs.writeFileSync(path.join(project, rel), typeof content === 'string' ? content : JSON.stringify(content));
  };
  const semantic = { color: { border: { brand: { 'focus-ring': color('{palette.blue.500}') } } } };
  write('tokens/core/palette.tokens.json', { palette: { blue: { 200: color('#bbdefb'), 500: color('#2196f3') } } });
  write('tokens/core/color.tokens.json', semantic);
  write('tokens/core.dark/color.tokens.json', semantic);
  write(`tokens/core/components/${componentName}.tokens.json`, component);
  const foundationCss =
    '  --palette-blue-200: #bbdefb;\n  --palette-blue-500: #2196f3;\n  --color-border-brand-focus-ring: #2196f3;\n';
  write('tokens/generated/core.tokens.css', `:root {\n${foundationCss}${generatedCss}}\n`);
  if (withComponentCss) write(`src/components/mud-${componentName}/mud-${componentName}.css`, css);
  for (const [rel, content] of Object.entries(files)) write(rel, content);
  const out = path.join(project, 'report.json');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, '--root', path.join(project, 'tokens'), '--out', out, '--no-color'],
    {
      encoding: 'utf8',
    },
  );
  const { findings } = JSON.parse(fs.readFileSync(out, 'utf8'));
  return { status: run.status, codes: findings.map(f => `${f.code} ${f.jsonPath}`) };
}

describe('tokens-validate — component CSS coverage', () => {
  it('matches CSS variables to a camelCase component root such as `dateInput`', () => {
    const { codes } = validate({
      component: { dateInput: { container: { heightMd: { $value: '40px', $type: 'dimension' } } } },
      css: ':host { height: var(--date-input-container-height-md); }\n',
      generatedCss: '  --date-input-container-height-md: 40px;\n',
    });
    assert.deepEqual(codes, []);
  });

  it('still reports a variable with no token behind it', () => {
    const { codes } = validate({
      component: { dateInput: { gap: { $value: '4px', $type: 'dimension' } } },
      css: ':host { gap: var(--date-input-gap); width: var(--date-input-width); }\n',
      generatedCss: '  --date-input-gap: 4px;\n',
    });
    assert.deepEqual(codes, ['css-uses-undefined-token date-input.width']);
  });

  it('does not require tokens for custom properties declared in the component CSS itself', () => {
    const { codes } = validate({
      component: { dateInput: {} },
      css: ':host { --date-input-arrow-size: 4px; } .a { top: var(--date-input-arrow-size); }\n',
    });
    assert.deepEqual(codes, []);
  });

  it('still reports a variable with no token behind it when every read carries a fallback', () => {
    const { codes } = validate({
      component: { dateInput: {} },
      css: '.a { color: var(--date-input-bordr-color, var(--color-border-brand-focus-ring)); }\n',
    });
    assert.deepEqual(codes, ['css-uses-undefined-token date-input.bordr-color']);
  });

  it('warns instead of silently skipping coverage when the component CSS directory is not there', () => {
    const { codes } = validate({ component: { dateInput: {} }, withComponentCss: false });
    assert.deepEqual(codes, ['component-css-missing ']);
  });
});

describe('tokens-validate — generated CSS drift', () => {
  it('derives the expected variable name the way Style Dictionary does (`stackZIndex` → `stack-z-index`)', () => {
    const { codes } = validate({
      componentName: 'date-picker',
      component: { 'date-picker': { container: { stackZIndex: { $value: '1000', $type: 'number' } } } },
      generatedCss: '  --date-picker-container-stack-z-index: 1000;\n',
    });
    assert.deepEqual(codes, []);
  });

  it('reports a token whose variable is missing from the generated CSS', () => {
    const { status, codes } = validate({
      componentName: 'date-picker',
      component: { 'date-picker': { container: { stackZIndex: { $value: '1000', $type: 'number' } } } },
      generatedCss: '  --date-picker-container-stack-zindex: 1000;\n',
    });
    assert.deepEqual(codes, ['css-drift date-picker.container.stackZIndex']);
    assert.equal(status, 0);
  });
});

describe('tokens-validate — dark-mode parity', () => {
  const halo = { focusRing: { color: { halo: { brand: color('{palette.blue.200}') } } } };
  const darkParity = files =>
    validate({ component: {}, withComponentCss: false, files }).codes.filter(c => c.startsWith('dark-mode-missing'));

  it('warns about a colour outside color.* that points at a palette shade and has no dark override', () => {
    // The focus-ring halo kept its light `*.200` shades in dark mode because only color.* was checked (#75).
    assert.deepEqual(darkParity({ 'tokens/core/focusRing.tokens.json': halo }), [
      'dark-mode-missing focusRing.color.halo.brand',
    ]);
  });

  it('accepts that colour once tokens/core.dark overrides it', () => {
    const dark = { focusRing: { color: { halo: { brand: color('{palette.blue.500}') } } } };
    assert.deepEqual(
      darkParity({ 'tokens/core/focusRing.tokens.json': halo, 'tokens/core.dark/focusRing.tokens.json': dark }),
      [],
    );
  });

  it('accepts a colour that follows the theme through a semantic token', () => {
    const outer = { focusRing: { color: { outer: color('{color.border.brand.focus-ring}') } } };
    assert.deepEqual(darkParity({ 'tokens/core/focusRing.tokens.json': outer }), []);
  });

  it('accepts transparent and currentColor, which look right in both themes, in color.* too', () => {
    const keywords = { overlay: { clear: color('transparent'), ink: color('currentColor') } };
    const light = {
      color: {
        border: { brand: { 'focus-ring': color('{palette.blue.500}') } },
        background: { clear: color('transparent') },
      },
    };
    assert.deepEqual(
      darkParity({ 'tokens/core/overlay.tokens.json': keywords, 'tokens/core/color.tokens.json': light }),
      [],
    );
  });

  it('still warns about inherit, which a custom property never passes through var()', () => {
    const host = { overlay: { host: color('inherit') } };
    assert.deepEqual(darkParity({ 'tokens/core/overlay.tokens.json': host }), ['dark-mode-missing overlay.host']);
  });

  it('does not ask a non-colour token for a dark override', () => {
    const width = { focusRing: { width: { outer: { $value: '3px', $type: 'dimension' } } } };
    assert.deepEqual(darkParity({ 'tokens/core/focusRing.tokens.json': width }), []);
  });

  it('warns about a hard-coded colour outside color.* with no dark override', () => {
    const literal = { overlay: { scrim: color('#000000') } };
    assert.deepEqual(darkParity({ 'tokens/core/overlay.tokens.json': literal }), ['dark-mode-missing overlay.scrim']);
  });
});

describe('tokens-validate — tier purity', () => {
  const generatedCss = '  --date-input-focus-ring: #bbdefb;\n';

  it('rejects a component token that references the palette', () => {
    const { status, codes } = validate({
      component: { dateInput: { focusRing: color('{palette.blue.200}') } },
      generatedCss,
    });
    assert.deepEqual(codes, ['tier-purity dateInput.focusRing']);
    assert.equal(status, 1);
  });

  it('accepts a palette reference that records its reason in $extensions', () => {
    const focusRing = {
      ...color('{palette.blue.200}'),
      $extensions: { 'md.egov.mud': { tierPurityException: 'theme-locked for QR scanning' } },
    };
    const { status, codes } = validate({ component: { dateInput: { focusRing } }, generatedCss });
    assert.deepEqual(codes, []);
    assert.equal(status, 0);
  });

  it('does not accept an exception marker without a reason', () => {
    const focusRing = { ...color('{palette.blue.200}'), $extensions: { 'md.egov.mud': { tierPurityException: ' ' } } };
    const { codes } = validate({ component: { dateInput: { focusRing } }, generatedCss });
    assert.deepEqual(codes, ['tier-purity dateInput.focusRing']);
  });

  it('warns about an exception marker on a token that no longer references the palette', () => {
    const focusRing = {
      ...color('{color.border.brand.focus-ring}'),
      $extensions: { 'md.egov.mud': { tierPurityException: 'stale' } },
    };
    const { status, codes } = validate({ component: { dateInput: { focusRing } }, generatedCss });
    assert.deepEqual(codes, ['tier-purity-exception-unused dateInput.focusRing']);
    assert.equal(status, 0);
  });
});
