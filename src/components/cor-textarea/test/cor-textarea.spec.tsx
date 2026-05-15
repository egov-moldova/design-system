import { newSpecPage } from '@stencil/core/testing';
import { CorTextarea } from '../cor-textarea';
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

describe('cor-textarea', () => {
  it('renders with default state', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea label="Test Label"></cor-textarea>`,
    });

    expect(page.root).toBeTruthy();
    const textarea = page.root?.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(page.root?.getAttribute('label-position')).toBe('inside');
  });

  it('renders with outside label position', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea label-position="outside" label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('label-position')).toBe('outside');
  });

  it('renders with disabled state', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea disabled label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('renders with invalid state', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea invalid label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('invalid')).toBe('');
  });

  it('renders with required attribute', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea required label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('required')).toBe('');
  });

  it('renders with skeleton state', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea skeleton label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('skeleton')).toBe('');
  });

  it('renders with name and value', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea name="comment" value="test" label="Comment"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('name')).toBe('comment');
    expect(page.root?.getAttribute('value')).toBe('test');
  });

  it('renders with placeholder', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea placeholder="Enter text" label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('placeholder')).toBe('Enter text');
  });

  it('renders with rows attribute', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea rows="5" label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('rows')).toBe('5');
  });

  it('renders with maxlength attribute', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea maxlength="100" label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('maxlength')).toBe('100');
  });

  it('renders with resize mode', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea resize="vertical" label="Test"></cor-textarea>`,
    });

    expect(page.root?.getAttribute('resize')).toBe('vertical');
  });

  it('shows error message for invalid helper-text slot tag', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea label="Test"><button slot="helper-text">Invalid</button></cor-textarea>`,
    });

    expect(page.root?.shadowRoot?.textContent).toContain('button is invalid');
  });

  it('renders helper-text slot with span', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea label="Test"><span slot="helper-text">Helper text</span></cor-textarea>`,
    });

    const helperSlot = page.root?.querySelector('[slot="helper-text"]');
    expect(helperSlot?.tagName.toLowerCase()).toBe('span');
  });

  it('renders label text', async () => {
    const page = await newSpecPage({
      components: [CorTextarea, CorLabel, CorIcon, CorTypography],
      html: `<cor-textarea label="Test Label"></cor-textarea>`,
    });

    const label = page.root?.shadowRoot?.querySelector('label');
    expect(label?.textContent).toContain('Test Label');
  });
});
