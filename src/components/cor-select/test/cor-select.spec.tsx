import { newSpecPage } from '@stencil/core/testing';

import { CorSelect } from '../cor-select';
import { CorSelectItem } from '../../cor-select-item/cor-select-item';
import { CorIcon } from '../../cor-icon/cor-icon';

const createMockInternals = () => ({
  setFormValue: jest.fn(),
  setValidity: jest.fn(),
  checkValidity: jest.fn(() => true),
  reportValidity: jest.fn(() => true),
});

const attachTestMocks = (page: Awaited<ReturnType<typeof newSpecPage>>) => {
  const internals = createMockInternals();
  const trigger = page.root?.shadowRoot?.querySelector('.trigger') as HTMLButtonElement;

  Object.defineProperty(page.rootInstance, 'internals', {
    value: internals,
    configurable: true,
  });

  return { internals, trigger };
};

describe('cor-select', () => {
  it('renders with default size', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `<cor-select><cor-select-item variant="label-only" value="12" label="12"></cor-select-item></cor-select>`,
    });

    const { trigger } = attachTestMocks(page);

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('size')).toBe('lg');
    expect(trigger).toBeTruthy();
  });

  it('syncs initial value to component state', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select name="page-size" value="24">
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    const { internals } = attachTestMocks(page);
    await page.waitForChanges();

    expect(page.root?.getAttribute('name')).toBe('page-size');
    expect(page.rootInstance.value).toBe('24');
    expect(internals.setFormValue).not.toHaveBeenCalled();
  });

  it('renders placeholder text when placeholder is provided', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select placeholder="Select one">
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        </cor-select>
      `,
    });

    attachTestMocks(page);

    const triggerLabel = page.root?.shadowRoot?.querySelector('.trigger-label');
    expect(triggerLabel?.textContent?.trim()).toBe('Select one');
  });

  it('syncs selected state on slotted items', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select value="12">
          <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    attachTestMocks(page);
    await page.waitForChanges();

    const items = page.root?.querySelectorAll('cor-select-item');
    expect(items?.length).toBe(3);
    expect(items?.[1]?.hasAttribute('selected')).toBe(true);
    expect(items?.[0]?.hasAttribute('selected')).toBe(false);
    expect(items?.[2]?.hasAttribute('selected')).toBe(false);
  });

  it('updates value when set programmatically', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    attachTestMocks(page);

    page.rootInstance.value = '24';
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('24');
    const items = page.root?.querySelectorAll('cor-select-item');
    expect(items?.[1]?.hasAttribute('selected')).toBe(true);
  });

  it('emits focus event when dropdown opens', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        </cor-select>
      `,
    });

    const { trigger } = attachTestMocks(page);

    const corFocus = jest.fn();
    page.root?.addEventListener('corFocus', corFocus);

    // Trigger click opens dropdown and emits corFocus
    trigger?.click();
    await page.waitForChanges();

    expect(corFocus).toHaveBeenCalled();
  });

  it('navigates to first and last options with Home and End keys when closed', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select value="12">
          <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    const { trigger } = attachTestMocks(page);
    const corChange = jest.fn();
    page.root?.addEventListener('corChange', corChange);

    // Focus trigger and press Home - should go to first option (9)
    trigger?.focus();
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('9');
    expect(corChange).toHaveBeenCalledTimes(1);
    expect(corChange.mock.calls[0][0].detail).toEqual({ value: '9' });

    // Press End - should go to last option (24)
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('24');
    expect(corChange).toHaveBeenCalledTimes(2);
    expect(corChange.mock.calls[1][0].detail).toEqual({ value: '24' });
  });

  it('opens dropdown on enter key', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `<cor-select><cor-select-item variant="label-only" value="12" label="12"></cor-select-item></cor-select>`,
    });

    const { trigger } = attachTestMocks(page);

    // Focus trigger and press Enter
    trigger?.focus();
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.isOpen).toBe(true);
  });

  it('navigates and changes value with arrow keys when dropdown is closed', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select value="12">
          <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    const { trigger } = attachTestMocks(page);
    const corChange = jest.fn();
    page.root?.addEventListener('corChange', corChange);

    // Focus trigger and press ArrowDown - should change value to 24
    trigger?.focus();
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await page.waitForChanges();

    // Value should now be 24 and event should be emitted
    expect(page.rootInstance.value).toBe('24');
    expect(corChange).toHaveBeenCalledTimes(1);
    expect(corChange.mock.calls[0][0].detail).toEqual({ value: '24' });

    // Press ArrowUp - should change value back to 12
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('12');
    expect(corChange).toHaveBeenCalledTimes(2);
    expect(corChange.mock.calls[1][0].detail).toEqual({ value: '12' });
  });

  it('closes dropdown when option is selected', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    const { trigger } = attachTestMocks(page);
    await page.waitForChanges();

    // Open dropdown
    trigger?.click();
    await page.waitForChanges();
    expect(page.rootInstance.isOpen).toBe(true);

    // Select an option (simulate by setting value and closing)
    page.rootInstance.value = '24';
    page.rootInstance.isOpen = false;
    await page.waitForChanges();

    expect(page.rootInstance.isOpen).toBe(false);
  });

  it('toggles open state on trigger click', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        </cor-select>
      `,
    });

    const { trigger } = attachTestMocks(page);
    await page.waitForChanges();

    trigger?.click();
    await page.waitForChanges();
    expect(page.rootInstance.isOpen).toBe(true);

    trigger?.click();
    await page.waitForChanges();
    expect(page.rootInstance.isOpen).toBe(false);
  });

  it('opens dropdown on space key', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `<cor-select><cor-select-item variant="label-only" value="12" label="12"></cor-select-item></cor-select>`,
    });

    const { trigger } = attachTestMocks(page);

    // Focus trigger and press Space
    trigger?.focus();
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.isOpen).toBe(true);
  });

  it('closes dropdown on escape key', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `<cor-select><cor-select-item variant="label-only" value="12" label="12"></cor-select-item></cor-select>`,
    });

    const { trigger } = attachTestMocks(page);

    // Open dropdown
    trigger.click();
    await page.waitForChanges();
    expect(page.rootInstance.isOpen).toBe(true);

    // Dispatch Escape on document (the handler uses @Listen with target: document when open)
    page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await page.waitForChanges();
    expect(page.rootInstance.isOpen).toBe(false);
  });

  it('navigates with arrow keys when dropdown is open without changing value', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select value="12">
          <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    const { trigger } = attachTestMocks(page);
    const corChange = jest.fn();
    page.root?.addEventListener('corChange', corChange);

    // Open dropdown
    trigger?.click();
    await page.waitForChanges();
    expect(page.rootInstance.isOpen).toBe(true);

    // Press ArrowDown on document (dropdown is open, so events are captured at document level)
    page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await page.waitForChanges();

    // Value should still be 12 (not changed yet)
    expect(page.rootInstance.value).toBe('12');
    expect(corChange).not.toHaveBeenCalled();

    // Press Enter to select the focused option
    page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await page.waitForChanges();

    // Now value should be 24 and dropdown closed
    expect(page.rootInstance.value).toBe('24');
    expect(page.rootInstance.isOpen).toBe(false);
    expect(corChange).toHaveBeenCalledTimes(1);
    expect(corChange.mock.calls[0][0].detail).toEqual({ value: '24' });
  });

  it('does not emit change event when selecting the current value again', async () => {
    const page = await newSpecPage({
      components: [CorSelect, CorSelectItem, CorIcon],
      html: `
        <cor-select value="12">
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        </cor-select>
      `,
    });

    attachTestMocks(page);
    await page.waitForChanges();

    const corChange = jest.fn();
    page.root?.addEventListener('corChange', corChange);

    // Ensure current value is set
    page.rootInstance.value = '12';
    await page.waitForChanges();

    // Simulate selecting the same value again via updateValueIfChanged
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- access private helper for targeted regression coverage
    const valueChanged = (page.rootInstance as any).updateValueIfChanged('12');
    await page.waitForChanges();

    expect(valueChanged).toBe(false);
    expect(corChange).not.toHaveBeenCalled();
  });

  describe('Focused state behavior', () => {
    it('applies focused attribute to items when navigating with arrow keys in open dropdown', async () => {
      const page = await newSpecPage({
        components: [CorSelect, CorSelectItem, CorIcon],
        html: `
          <cor-select value="12">
            <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
            <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
            <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
            <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
          </cor-select>
        `,
      });

      const { trigger } = attachTestMocks(page);
      await page.waitForChanges();

      // Open dropdown
      trigger?.click();
      await page.waitForChanges();
      expect(page.rootInstance.isOpen).toBe(true);

      const items = page.root?.querySelectorAll('cor-select-item');

      // Initially, the selected item (12) should be focused when dropdown opens
      expect(items?.[0]?.hasAttribute('focused')).toBe(false);
      expect(items?.[1]?.hasAttribute('focused')).toBe(true);
      expect(items?.[2]?.hasAttribute('focused')).toBe(false);
      expect(items?.[3]?.hasAttribute('focused')).toBe(false);

      // Press ArrowDown - should focus next item (24)
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();

      expect(items?.[0]?.hasAttribute('focused')).toBe(false);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(true);
      expect(items?.[3]?.hasAttribute('focused')).toBe(false);

      // Press ArrowDown again - should focus next item (36)
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();

      expect(items?.[2]?.hasAttribute('focused')).toBe(false);
      expect(items?.[3]?.hasAttribute('focused')).toBe(true);

      // Press ArrowUp - should focus previous item (24)
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await page.waitForChanges();

      expect(items?.[2]?.hasAttribute('focused')).toBe(true);
      expect(items?.[3]?.hasAttribute('focused')).toBe(false);
    });

    it('sets focused index to selected item when opening dropdown', async () => {
      const page = await newSpecPage({
        components: [CorSelect, CorSelectItem, CorIcon],
        html: `
          <cor-select value="24">
            <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
            <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
            <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
            <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
          </cor-select>
        `,
      });

      const { trigger } = attachTestMocks(page);
      await page.waitForChanges();

      // Open dropdown
      trigger?.click();
      await page.waitForChanges();

      const items = page.root?.querySelectorAll('cor-select-item');

      // The selected item (24) should be focused when dropdown opens
      expect(items?.[0]?.hasAttribute('focused')).toBe(false);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(true);
      expect(items?.[3]?.hasAttribute('focused')).toBe(false);
    });

    it('navigates to first and last items with Home and End keys in open dropdown', async () => {
      const page = await newSpecPage({
        components: [CorSelect, CorSelectItem, CorIcon],
        html: `
          <cor-select value="12">
            <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
            <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
            <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
            <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
          </cor-select>
        `,
      });

      const { trigger } = attachTestMocks(page);
      await page.waitForChanges();

      // Open dropdown
      trigger?.click();
      await page.waitForChanges();

      const items = page.root?.querySelectorAll('cor-select-item');

      // Press Home - should focus first item (9)
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await page.waitForChanges();

      expect(items?.[0]?.hasAttribute('focused')).toBe(true);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(false);
      expect(items?.[3]?.hasAttribute('focused')).toBe(false);

      // Press End - should focus last item (36)
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await page.waitForChanges();

      expect(items?.[0]?.hasAttribute('focused')).toBe(false);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(false);
      expect(items?.[3]?.hasAttribute('focused')).toBe(true);
    });

    it('clears focused state when dropdown closes', async () => {
      const page = await newSpecPage({
        components: [CorSelect, CorSelectItem, CorIcon],
        html: `
          <cor-select value="12">
            <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
            <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
            <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
          </cor-select>
        `,
      });

      const { trigger } = attachTestMocks(page);
      await page.waitForChanges();

      // Open dropdown and navigate
      trigger?.click();
      await page.waitForChanges();

      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();

      const items = page.root?.querySelectorAll('cor-select-item');
      expect(items?.[2]?.hasAttribute('focused')).toBe(true);

      // Close dropdown with Escape
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await page.waitForChanges();

      // All focused attributes should be cleared
      expect(items?.[0]?.hasAttribute('focused')).toBe(false);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(false);

      expect(page.rootInstance.isOpen).toBe(false);
    });

    it('clears focused state when Tab key is pressed', async () => {
      const page = await newSpecPage({
        components: [CorSelect, CorSelectItem, CorIcon],
        html: `
          <cor-select value="12">
            <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
            <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
            <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
          </cor-select>
        `,
      });

      const { trigger } = attachTestMocks(page);
      await page.waitForChanges();

      // Open dropdown and navigate
      trigger?.click();
      await page.waitForChanges();

      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();

      const items = page.root?.querySelectorAll('cor-select-item');
      expect(items?.[2]?.hasAttribute('focused')).toBe(true);

      // Press Tab - should close dropdown and clear focus
      page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await page.waitForChanges();

      // All focused attributes should be cleared and dropdown closed
      expect(items?.[0]?.hasAttribute('focused')).toBe(false);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(false);

      expect(page.rootInstance.isOpen).toBe(false);
    });

    it('starts with first item focused when no value is selected', async () => {
      const page = await newSpecPage({
        components: [CorSelect, CorSelectItem, CorIcon],
        html: `
          <cor-select>
            <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
            <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
            <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
          </cor-select>
        `,
      });

      const { trigger } = attachTestMocks(page);
      await page.waitForChanges();

      // Open dropdown
      trigger?.click();
      await page.waitForChanges();

      const items = page.root?.querySelectorAll('cor-select-item');

      // First item should be focused when no value is selected
      expect(items?.[0]?.hasAttribute('focused')).toBe(true);
      expect(items?.[1]?.hasAttribute('focused')).toBe(false);
      expect(items?.[2]?.hasAttribute('focused')).toBe(false);
    });
  });
});
