import { newSpecPage } from '@stencil/core/testing';
import { CorInput } from '../cor-input';
import { CorLabel } from '../../cor-label/cor-label';
import { CorIcon } from '../../cor-icon/cor-icon';
import { CorTypography } from '../../cor-typography/cor-typography';

// Mock ElementInternals for unit tests
beforeEach(() => {
  if (typeof window !== 'undefined') {
    (window as Window & { ElementInternals: unknown }).ElementInternals = class MockElementInternals {
      private validityState: ValidityStateFlags = {};

      setFormValue(_value: FormDataEntryValue | null): void {
        // no-op for mock
      }

      setValidity(flags: ValidityStateFlags, _message?: string, _anchor?: HTMLElement): void {
        this.validityState = flags;
      }

      checkValidity(): boolean {
        return Object.keys(this.validityState).length === 0;
      }

      reportValidity(): boolean {
        return this.checkValidity();
      }

      get validity(): ValidityState {
        return {
          valid: this.checkValidity(),
          ...this.validityState,
        } as ValidityState;
      }
    };
  }
});

describe('cor-input', () => {
  it('renders with default state', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test Label"></cor-input>`,
    });

    expect(page.root).toBeTruthy();
    const input = page.root?.shadowRoot?.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(page.root?.getAttribute('size')).toBe('lg');
    expect(page.root?.getAttribute('label-position')).toBe('inside');
  });

  it('renders with small size', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input size="sm" label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('renders with medium size', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input size="md" label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('size')).toBe('md');
  });

  it('renders with large size', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input size="lg" label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('size')).toBe('lg');
  });

  it('renders with outside label position', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label-position="outside" label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('label-position')).toBe('outside');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input disabled label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('renders with invalid state', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input invalid label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('invalid')).toBe('');
  });

  it('renders with required attribute', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input required label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('required')).toBe('');
  });

  it('renders with skeleton state', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input skeleton label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('skeleton')).toBe('');
  });

  it('renders with name and value', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input name="username" value="test" label="Username"></cor-input>`,
    });

    expect(page.root?.getAttribute('name')).toBe('username');
    expect(page.root?.getAttribute('value')).toBe('test');
  });

  it('renders with placeholder', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input placeholder="Enter text" label="Test"></cor-input>`,
    });

    expect(page.root?.getAttribute('placeholder')).toBe('Enter text');
  });

  it('renders with type attribute', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input type="email" label="Email"></cor-input>`,
    });

    expect(page.root?.getAttribute('type')).toBe('email');
  });

  it('shows error message for invalid icon-left slot tag', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test"><span slot="icon-left">Invalid</span></cor-input>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('span is invalid');
    expect(page.root?.shadowRoot?.textContent).toContain('cor-icon');
  });

  it('shows error message for invalid icon-right slot tag', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test"><div slot="icon-right">Invalid</div></cor-input>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('div is invalid');
    expect(page.root?.shadowRoot?.textContent).toContain('cor-icon');
  });

  it('shows error message for invalid helper-text slot tag', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test"><button slot="helper-text">Invalid</button></cor-input>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('button is invalid');
  });

  it('renders icon-left slot with cor-icon', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test"><cor-icon slot="icon-left" name="carbon:search"></cor-icon></cor-input>`,
    });

    const iconSlot = page.root?.querySelector('[slot="icon-left"]');
    expect(iconSlot?.tagName.toLowerCase()).toBe('cor-icon');
  });

  it('renders icon-right slot with cor-icon', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test"><cor-icon slot="icon-right" name="carbon:close"></cor-icon></cor-input>`,
    });

    const iconSlot = page.root?.querySelector('[slot="icon-right"]');
    expect(iconSlot?.tagName.toLowerCase()).toBe('cor-icon');
  });

  it('renders label text', async () => {
    const page = await newSpecPage({
      components: [CorInput, CorLabel, CorIcon, CorTypography],
      html: `<cor-input label="Test Label"></cor-input>`,
    });

    const label = page.root?.shadowRoot?.querySelector('label');
    expect(label?.textContent).toContain('Test Label');
  });
});
