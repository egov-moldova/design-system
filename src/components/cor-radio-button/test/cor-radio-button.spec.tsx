import { newSpecPage } from '@stencil/core/testing';
import { CorRadioButton } from '../cor-radio-button';
import { CorLabel } from '../../cor-label/cor-label';
import { CorIcon } from '../../cor-icon/cor-icon';

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

describe('cor-radio-button', () => {
  it('renders with default unchecked state', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1">Label text</cor-radio-button>`,
    });

    expect(page.root).toBeTruthy();
    const input = page.root?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.checked).toBe(false);
    expect(page.root?.getAttribute('size')).toBe('md');
  });

  it('renders with checked state', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1" checked>Label text</cor-radio-button>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('renders with small size', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1" size="sm">Label text</cor-radio-button>`,
    });

    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('renders with large size', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1" size="lg">Label text</cor-radio-button>`,
    });

    expect(page.root?.getAttribute('size')).toBe('lg');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1" disabled>Label text</cor-radio-button>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('renders with invalid state', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1" invalid>Label text</cor-radio-button>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(page.root?.getAttribute('invalid')).toBe('');
  });

  it('renders slot content', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1">Custom label text</cor-radio-button>`,
    });

    expect(page.root?.textContent).toContain('Custom label text');
  });

  it('requires name attribute', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="group1" value="option1">Option 1</cor-radio-button>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.name).toBe('group1');
  });

  it('requires value attribute', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="group1" value="option1">Option 1</cor-radio-button>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(input.value).toBe('option1');
  });

  // Note: Icon state tests are covered in E2E tests where full component lifecycle works

  it('renders with label slot content', async () => {
    const page = await newSpecPage({
      components: [CorRadioButton, CorLabel, CorIcon],
      html: `<cor-radio-button name="option" value="1">Label text</cor-radio-button>`,
    });

    expect(page.root?.textContent).toContain('Label text');
  });
});
