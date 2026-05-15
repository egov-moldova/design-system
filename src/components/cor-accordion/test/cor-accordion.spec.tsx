import { newSpecPage } from '@stencil/core/testing';
import { CorAccordion } from '../cor-accordion';

describe('cor-accordion', () => {
  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion></cor-accordion>`,
    });
    expect(root).toBeTruthy();
    const header = root?.shadowRoot?.querySelector('.accordion__header');
    expect(header).toBeTruthy();
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(header?.hasAttribute('disabled')).toBe(false);
  });

  it('reflects size attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion size="sm"></cor-accordion>`,
    });
    expect(root?.getAttribute('size')).toBe('sm');
  });

  it('reflects iconPosition attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion icon-position="right"></cor-accordion>`,
    });
    expect(root?.getAttribute('icon-position')).toBe('right');
  });

  it('renders disabled state', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion disabled></cor-accordion>`,
    });
    const header = root?.shadowRoot?.querySelector('.accordion__header');
    expect(header?.hasAttribute('disabled')).toBe(true);
  });

  it('renders skeleton state', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion skeleton></cor-accordion>`,
    });
    const skeleton = root?.shadowRoot?.querySelector('cor-skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('renders expanded when open prop is set on load', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion open></cor-accordion>`,
    });
    const header = root?.shadowRoot?.querySelector('.accordion__header');
    expect(header?.getAttribute('aria-expanded')).toBe('true');
  });

  it('reflects open prop back after toggle', async () => {
    const { root, rootInstance, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion></cor-accordion>`,
    });
    const header = root?.shadowRoot?.querySelector('.accordion__header') as HTMLButtonElement | null;
    header?.click();
    await waitForChanges();
    expect((rootInstance as CorAccordion).open).toBe(true);
    header?.click();
    await waitForChanges();
    expect((rootInstance as CorAccordion).open).toBe(false);
  });

  it('emits corAccordionToggle on header click', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion></cor-accordion>`,
    });
    const toggleSpy = jest.fn();
    root?.addEventListener('corAccordionToggle', toggleSpy);
    const header = root?.shadowRoot?.querySelector('.accordion__header') as HTMLButtonElement | null;
    header?.click();
    await waitForChanges();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    const event = toggleSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ open: true });
  });

  it('does not emit toggle when disabled', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion disabled></cor-accordion>`,
    });
    const toggleSpy = jest.fn();
    root?.addEventListener('corAccordionToggle', toggleSpy);
    const header = root?.shadowRoot?.querySelector('.accordion__header') as HTMLButtonElement | null;
    header?.click();
    await waitForChanges();
    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it('does not emit toggle when skeleton', async () => {
    const { root, rootInstance, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion skeleton></cor-accordion>`,
    });
    const toggleSpy = jest.fn();
    root?.addEventListener('corAccordionToggle', toggleSpy);
    const instance = rootInstance as CorAccordion;
    (instance as unknown as Record<string, () => void>)['handleToggle']();
    await waitForChanges();
    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it('panel has correct aria attributes', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion></cor-accordion>`,
    });
    const panel = root?.shadowRoot?.querySelector('.accordion__panel');
    expect(panel?.getAttribute('role')).toBe('region');
    expect(panel?.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('opens and closes on repeated clicks', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion></cor-accordion>`,
    });
    const header = root?.shadowRoot?.querySelector('.accordion__header') as HTMLButtonElement | null;
    header?.click();
    await waitForChanges();
    expect(header?.getAttribute('aria-expanded')).toBe('true');

    header?.click();
    await waitForChanges();
    expect(header?.getAttribute('aria-expanded')).toBe('false');
  });

  it('propagates disabled to elements slotted in summary slot on load', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion disabled><cor-badge-interactive slot="summary">3</cor-badge-interactive></cor-accordion>`,
    });
    await waitForChanges();
    const badge = root?.querySelector('cor-badge-interactive');
    expect(badge?.hasAttribute('disabled')).toBe(true);
  });

  it('removes disabled from summary slot children when disabled becomes false', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion disabled><cor-badge-interactive slot="summary">3</cor-badge-interactive></cor-accordion>`,
    });
    await waitForChanges();
    root?.removeAttribute('disabled');
    (root as HTMLElement & { disabled: boolean }).disabled = false;
    await waitForChanges();
    const badge = root?.querySelector('cor-badge-interactive');
    expect(badge?.hasAttribute('disabled')).toBe(false);
  });

  it('always uses chevron--right icon (rotation handled via CSS)', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion icon-position="left"></cor-accordion>`,
    });
    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:chevron--right');
  });

  it('icon name stays chevron--right when icon-position=left and expanded (CSS rotates)', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion icon-position="left" open></cor-accordion>`,
    });
    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:chevron--right');
    const wrapper = root?.shadowRoot?.querySelector('.accordion__icon-wrapper--left');
    expect(wrapper).toBeTruthy();
  });

  it('icon name stays chevron--right when icon-position=right and collapsed (CSS rotates)', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion icon-position="right"></cor-accordion>`,
    });
    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:chevron--right');
    const wrapper = root?.shadowRoot?.querySelector('.accordion__icon-wrapper--right');
    expect(wrapper).toBeTruthy();
  });

  it('icon name stays chevron--right when icon-position=right and expanded (CSS rotates)', async () => {
    const { root } = await newSpecPage({
      components: [CorAccordion],
      html: `<cor-accordion icon-position="right" open></cor-accordion>`,
    });
    const icon = root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:chevron--right');
    const wrapper = root?.shadowRoot?.querySelector('.accordion__icon-wrapper--right');
    expect(wrapper).toBeTruthy();
  });
});
