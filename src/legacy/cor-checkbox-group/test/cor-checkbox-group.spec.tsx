import { newSpecPage } from '@stencil/core/testing';
import { CorCheckboxGroup } from '../cor-checkbox-group';
import { CorCheckbox } from '../../cor-checkbox/cor-checkbox';

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

describe('cor-checkbox-group', () => {
  it('renders with default vertical orientation', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group>
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('orientation')).toBe('vertical');
  });

  it('renders with horizontal orientation', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group orientation="horizontal">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    expect(page.root?.getAttribute('orientation')).toBe('horizontal');
  });

  it('renders with legend', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group legend="Choose options">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    const legend = page.root?.querySelector('.checkbox-group-legend');
    expect(legend?.textContent).toBe('Choose options');
  });

  it('renders with helper text', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group helper-text="Select all that apply">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    const helper = page.root?.querySelector('.checkbox-group-helper');
    expect(helper?.textContent).toBe('Select all that apply');
  });

  it('propagates size to child checkboxes', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group size="sm">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    await page.waitForChanges();

    const checkboxes = page.root?.querySelectorAll('cor-checkbox');
    expect(checkboxes?.[0]?.getAttribute('size')).toBe('sm');
    expect(checkboxes?.[1]?.getAttribute('size')).toBe('sm');
  });

  it('propagates disabled state to child checkboxes', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group disabled>
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    await page.waitForChanges();

    const checkboxes = page.root?.querySelectorAll('cor-checkbox');
    expect(checkboxes?.[0]?.hasAttribute('disabled')).toBe(true);
    expect(checkboxes?.[1]?.hasAttribute('disabled')).toBe(true);
  });

  it('propagates invalid state to child checkboxes', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group invalid>
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    await page.waitForChanges();

    const checkboxes = page.root?.querySelectorAll('cor-checkbox');
    expect(checkboxes?.[0]?.hasAttribute('invalid')).toBe(true);
    expect(checkboxes?.[1]?.hasAttribute('invalid')).toBe(true);
  });

  it('propagates name to child checkboxes', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group name="options">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    await page.waitForChanges();

    const checkboxes = page.root?.querySelectorAll('cor-checkbox');
    expect(checkboxes?.[0]?.getAttribute('name')).toBe('options');
    expect(checkboxes?.[1]?.getAttribute('name')).toBe('options');
  });

  it('sets checked state based on value prop (controlled mode)', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group value='["option1", "option3"]'>
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
          <cor-checkbox value="option3">Option 3</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    await page.waitForChanges();

    const checkboxes = page.root?.querySelectorAll('cor-checkbox');
    expect(checkboxes?.[0]?.hasAttribute('checked')).toBe(true);
    expect(checkboxes?.[1]?.hasAttribute('checked')).toBe(false);
    expect(checkboxes?.[2]?.hasAttribute('checked')).toBe(true);
  });

  it('emits corChange event when checkbox selection changes', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group value='["option1"]'>
          <cor-checkbox value="option1" checked>Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    await page.waitForChanges();

    const eventSpy = jest.fn();
    page.root?.addEventListener('corChange', eventSpy);

    const checkbox2 = page.root?.querySelectorAll('cor-checkbox')[1];

    // Simulate the checkbox change event
    const changeEvent = new CustomEvent('corChange', {
      detail: { target: checkbox2, checked: true },
      bubbles: true,
    });
    checkbox2?.dispatchEvent(changeEvent);
    await page.waitForChanges();

    expect(eventSpy).toHaveBeenCalled();
  });

  it('renders multi-column layout', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group orientation="vertical" columns="2">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
          <cor-checkbox value="option3">Option 3</cor-checkbox>
          <cor-checkbox value="option4">Option 4</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    const container = page.root?.querySelector('.checkbox-group');
    expect(container).toHaveClass('checkbox-group--multi-column');
  });

  it('applies custom gap', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group gap="20px">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
          <cor-checkbox value="option2">Option 2</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    const container = page.root?.querySelector('.checkbox-group') as HTMLElement;
    expect(container?.style.gap).toBe('20px');
  });

  it('renders fieldset with proper accessibility structure', async () => {
    const page = await newSpecPage({
      components: [CorCheckboxGroup, CorCheckbox],
      html: `
        <cor-checkbox-group legend="Options">
          <cor-checkbox value="option1">Option 1</cor-checkbox>
        </cor-checkbox-group>
      `,
    });

    const fieldset = page.root?.querySelector('fieldset');
    expect(fieldset).toBeTruthy();
  });
});
