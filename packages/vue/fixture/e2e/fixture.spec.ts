import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test as base, type Locator, type Page } from '@playwright/test';

// Every test runs with a console watch: "no console error" is part of every check, not one
// more test that could run before the error happens. A failed request (a 404 on an asset)
// is also logged by the browser as a console error.
const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('/');
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

const host = (page: Page, id: string): Locator => page.locator(`[data-testid="${id}"]`);
const model = (page: Page, id: string): Locator => page.locator(`[data-testid="${id}-model"]`);
const press = (page: Page, id: string) => page.locator(`button[data-testid="${id}-set"]`).click();

test('upgrade: every wrapped host has a shadow root', async ({ page }) => {
  for (const id of ['text', 'date', 'numeric', 'checkbox', 'select', 'chips', 'files', 'icon', 'logo']) {
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

test('number (numeric-input): a value typed past max is clamped on blur, and the model holds it', async ({ page }) => {
  const input = host(page, 'numeric').locator('input.native');
  await input.fill('999');
  // Vue binds mudChange for this control, so the model moves on commit, not per keystroke.
  await expect(model(page, 'numeric')).toHaveText('null');
  await input.blur();
  await expect(model(page, 'numeric')).toHaveText('10');
  await expect.poll(() => host(page, 'numeric').evaluate(el => (el as HTMLInputElement).value)).toBe(10);
  await press(page, 'numeric');
  await expect(model(page, 'numeric')).toHaveText('7');
  await expect.poll(() => host(page, 'numeric').evaluate(el => (el as HTMLInputElement).value)).toBe(7);
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

test('string array (input-chip), both ways', async ({ page }) => {
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
