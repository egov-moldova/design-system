import { newSpecPage } from '@stencil/core/testing';
import { CorCheckbox } from '../cor-checkbox';
import { CorLabel } from '../../cor-label/cor-label';
import { CorIcon } from '../../cor-icon/cor-icon';

describe('cor-checkbox', () => {
  it('renders with default unchecked state', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox>Label text</cor-checkbox>`,
    });

    expect(page.root).toBeTruthy();
    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.checked).toBe(false);
    expect(page.root?.getAttribute('size')).toBe('md');
  });

  it('renders with checked state', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox checked>Label text</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('renders with indeterminate state', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox indeterminate>Label text</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
  });

  it('renders with small size', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox size="sm">Label text</cor-checkbox>`,
    });

    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox disabled>Label text</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('renders with invalid state', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox invalid>Label text</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(page.root?.getAttribute('invalid')).toBe('');
  });

  it('renders slot content', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox>Custom label text</cor-checkbox>`,
    });

    expect(page.root?.textContent).toContain('Custom label text');
  });

  it('applies name attribute for form submission', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox name="terms">Accept terms</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.name).toBe('terms');
  });

  it('applies value attribute for form submission', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox value="yes">Accept</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.value).toBe('yes');
  });

  it('uses default value "on" when value not specified', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox>Accept</cor-checkbox>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.value).toBe('on');
  });

  // Note: Icon state tests are covered in E2E tests where full component lifecycle works

  it('renders with label slot content', async () => {
    const page = await newSpecPage({
      components: [CorCheckbox, CorLabel, CorIcon],
      html: `<cor-checkbox>Label text</cor-checkbox>`,
    });

    expect(page.root?.textContent).toContain('Label text');
  });
});
