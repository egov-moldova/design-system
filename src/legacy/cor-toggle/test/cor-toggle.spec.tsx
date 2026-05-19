import { newSpecPage } from '@stencil/core/testing';
import { CorToggle } from '../cor-toggle';
import { CorLabel } from '../../cor-label/cor-label';

// Mock ElementInternals for unit tests
beforeEach(() => {
  if (typeof window !== 'undefined') {
    (window as Window & { ElementInternals: unknown }).ElementInternals = class MockElementInternals {
      setFormValue(_value: FormDataEntryValue | null): void {
        // no-op for mock
      }

      checkValidity(): boolean {
        return true;
      }

      reportValidity(): boolean {
        return true;
      }
    };
  }
});

describe('cor-toggle', () => {
  it('renders with default unchecked state', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle>Label text</cor-toggle>`,
    });

    expect(page.root).toBeTruthy();
    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.checked).toBe(false);
    expect(page.root?.getAttribute('size')).toBe('md');
  });

  it('renders with checked state', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle checked>Label text</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('renders with small size', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle size="sm">Label text</cor-toggle>`,
    });

    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle disabled>Label text</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('renders with invalid state', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle invalid>Label text</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(page.root?.getAttribute('invalid')).toBe('');
  });

  it('renders default slot content', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle>Right label text</cor-toggle>`,
    });

    expect(page.root?.textContent).toContain('Right label text');
  });

  it('renders label-left slot content', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle><span slot="label-left">Left label</span></cor-toggle>`,
    });

    expect(page.root?.textContent).toContain('Left label');
  });

  it('renders both label slots', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle><span slot="label-left">Left</span>Right</cor-toggle>`,
    });

    expect(page.root?.textContent).toContain('Left');
    expect(page.root?.textContent).toContain('Right');
  });

  it('applies name attribute for form submission', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle name="notifications">Enable notifications</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.name).toBe('notifications');
  });

  it('applies value attribute for form submission', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle value="enabled">Toggle</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.value).toBe('enabled');
  });

  it('uses default value "on" when value not specified', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle>Toggle</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.value).toBe('on');
  });

  it('has role="switch" for accessibility', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle>Toggle</cor-toggle>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('switch');
  });

  it('renders with label slot content', async () => {
    const page = await newSpecPage({
      components: [CorToggle, CorLabel],
      html: `<cor-toggle>Label text</cor-toggle>`,
    });

    expect(page.root?.textContent).toContain('Label text');
  });
});
