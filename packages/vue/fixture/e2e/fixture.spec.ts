import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test as base, type Locator, type Page } from '@playwright/test';

// Every test runs with a console watch: "no console error" is part of every check, not one
// more test that could run before the error happens. A failed request (a 404 on an asset)
// is also logged by the browser as a console error; a request that never completes is caught too.
const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('requestfailed', request => errors.push(`request failed: ${request.url()}`));
    await page.goto('/');
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

const host = (page: Page, id: string): Locator => page.locator(`[data-testid="${id}"]`);
const model = (page: Page, id: string): Locator => page.locator(`[data-testid="${id}-model"]`);
const press = (page: Page, id: string) => page.locator(`button[data-testid="${id}-set"]`).click();
const prop = (page: Page, id: string, name: string) =>
  host(page, id).evaluate((el, key) => (el as unknown as Record<string, unknown>)[key], name);

test('upgrade: every wrapped host has a shadow root', async ({ page }) => {
  for (const id of ['text', 'date', 'numeric', 'checkbox', 'select', 'chips', 'files', 'phone', 'icon', 'logo']) {
    await expect.poll(() => host(page, id).evaluate(el => el.shadowRoot !== null), { message: id }).toBe(true);
  }
});

test('string on mudInput (text-input), both ways', async ({ page }) => {
  await host(page, 'text').locator('input').fill('hello');
  await expect(model(page, 'text')).toHaveText('"hello"');
  await press(page, 'text');
  await expect(model(page, 'text')).toHaveText('"from model"');
  await expect.poll(() => host(page, 'text').evaluate(el => (el as HTMLInputElement).value)).toBe('from model');
});

test('string on mudChange (date-input): a partial keystroke leaves the model unchanged', async ({ page }) => {
  const input = host(page, 'date').locator('input.native');
  await input.pressSequentially('15/0');
  // The component holds the partial text, and its model has not moved.
  await expect.poll(() => host(page, 'date').evaluate(el => (el as HTMLInputElement).value)).toBe('15/0');
  await expect(model(page, 'date')).toHaveText('""');
  await input.pressSequentially('42025');
  await expect(model(page, 'date')).toHaveText('""');
  await input.press('Tab');
  await expect(model(page, 'date')).toHaveText('"15/04/2025"');
  await press(page, 'date');
  await expect(model(page, 'date')).toHaveText('"01/02/2024"');
  await expect.poll(() => host(page, 'date').evaluate(el => (el as HTMLInputElement).value)).toBe('01/02/2024');
});

test('number (numeric-input): typed past max, clamped on blur, and the model holds the clamp', async ({ page }) => {
  const input = host(page, 'numeric').locator('input.native');
  await input.fill('999');
  // The wrapper listens to mudInput too, so the model follows the keystroke before the commit.
  await expect(model(page, 'numeric')).toHaveText('999');
  await input.blur();
  // The clamp writes `value` and emits only mudChange: the model must follow it.
  await expect(model(page, 'numeric')).toHaveText('10');
  await expect.poll(() => prop(page, 'numeric', 'value')).toBe(10);
  await press(page, 'numeric');
  await expect(model(page, 'numeric')).toHaveText('7');
  await expect.poll(() => prop(page, 'numeric', 'value')).toBe(7);
});

test('number (numeric-input): clearing the field leaves a null model', async ({ page }) => {
  const input = host(page, 'numeric').locator('input.native');
  await input.fill('5');
  await expect(model(page, 'numeric')).toHaveText('5');
  await input.fill('');
  // The component sets `value` to undefined; the model is null, never NaN, 0 or ''.
  await expect(model(page, 'numeric')).toHaveText('null');
  await input.blur();
  await expect(model(page, 'numeric')).toHaveText('null');
});

for (const cleared of ['null', 'undefined']) {
  test(`number (numeric-input): a ${cleared} model leaves the element empty, never 0`, async ({ page }) => {
    await press(page, 'numeric');
    await expect.poll(() => prop(page, 'numeric', 'value')).toBe(7);
    await page.locator(`button[data-testid="numeric-${cleared}"]`).click();
    // Vue's patchDOMProp writes 0 for a null/undefined prop on an element whose value is a number.
    await expect.poll(() => prop(page, 'numeric', 'value')).toBeUndefined();
    await expect(host(page, 'numeric').locator('input.native')).toHaveValue('');
    await expect(model(page, 'numeric')).toHaveText('null');
  });
}

test('number (numeric-input): an empty model at mount leaves the element empty', async ({ page }) => {
  await expect.poll(() => prop(page, 'numeric', 'value')).toBeUndefined();
  await expect(host(page, 'numeric').locator('input.native')).toHaveValue('');
});

test('boolean (checkbox), both ways', async ({ page }) => {
  await host(page, 'checkbox').locator('label.root').click();
  await expect(model(page, 'checkbox')).toHaveText('true');
  await host(page, 'checkbox').locator('label.root').click();
  await expect(model(page, 'checkbox')).toHaveText('false');
  await press(page, 'checkbox');
  await expect(model(page, 'checkbox')).toHaveText('true');
  await expect.poll(() => host(page, 'checkbox').evaluate(el => (el as HTMLInputElement).checked)).toBe(true);
});

test('select (select), both ways', async ({ page }) => {
  await host(page, 'select').locator('input[role="combobox"]').click();
  await host(page, 'select').locator('[role="option"][data-value="apple"]').click();
  await expect(model(page, 'select')).toHaveText('"apple"');
  await press(page, 'select');
  await expect(model(page, 'select')).toHaveText('"pear"');
  await expect.poll(() => host(page, 'select').evaluate(el => (el as HTMLInputElement).value)).toBe('pear');
});

test('string array (input-chip), initialised with null, both ways', async ({ page }) => {
  // The model starts as `null`; the component must render it as an empty list.
  await expect(model(page, 'chips')).toHaveText('null');
  await expect.poll(() => prop(page, 'chips', 'chips')).toEqual([]);
  const input = host(page, 'chips').locator('input.native');
  await input.fill('alpha');
  await input.press('Enter');
  await expect(model(page, 'chips')).toHaveText('["alpha"]');
  await press(page, 'chips');
  await expect(model(page, 'chips')).toHaveText('["x","y"]');
  await expect
    .poll(() => host(page, 'chips').evaluate(el => (el as unknown as { chips: string[] }).chips))
    .toEqual(['x', 'y']);
});

test('file array (file-input), through its inner input', async ({ page }) => {
  // The model starts as `null`; the component must render it as an empty list.
  await expect(model(page, 'files')).toHaveText('[]');
  await expect.poll(() => host(page, 'files').evaluate(el => (el as unknown as { files: File[] }).files)).toEqual([]);
  await host(page, 'files')
    .locator('input[type="file"]')
    .setInputFiles([
      { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('a') },
      { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('b') },
    ]);
  await expect(model(page, 'files')).toHaveText('["a.txt","b.txt"]');
  await expect
    .poll(() => host(page, 'files').evaluate(el => (el as unknown as { files: File[] }).files.map(file => file.name)))
    .toEqual(['a.txt', 'b.txt']);
});

test('phone-input: a country switch updates the model to the new E.164 value', async ({ page }) => {
  await host(page, 'phone').locator('input.native').pressSequentially('60123456');
  await expect(model(page, 'phone')).toHaveText('"+37360123456"');
  await host(page, 'phone').locator('button[role="combobox"]').click();
  await host(page, 'phone').locator('[role="option"][data-iso="RO"]').click();
  // The switch rewrites `value` and emits only mudCountryChange: the model must follow it.
  await expect.poll(() => prop(page, 'phone', 'value')).toBe('+4060123456');
  await expect(model(page, 'phone')).toHaveText('"+4060123456"');
});

test('tokens: a semantic token from core.tokens.css reaches a rendered host', async ({ page }) => {
  // Read from the installed file, so a token value the design system changes cannot break this.
  const css = readFileSync(
    resolve(process.cwd(), 'node_modules/@egov-moldova/mud/dist/mud/tokens/core.tokens.css'),
    'utf8',
  );
  const token = '--color-background-brand-default';
  const declared = new RegExp(`${token}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
  expect(declared, `${token} is not defined by core.tokens.css`).toBeTruthy();
  const computed = await host(page, 'text').evaluate(
    (el, name) => getComputedStyle(el).getPropertyValue(name).trim(),
    token,
  );
  expect(computed).toBe(declared);
});

test('assets: mud-icon and mud-logo each render an svg in their shadow root', async ({ page }) => {
  for (const id of ['icon', 'logo']) {
    await expect
      .poll(() => host(page, id).evaluate(el => el.shadowRoot?.querySelector('svg') != null), { message: id })
      .toBe(true);
  }
});
