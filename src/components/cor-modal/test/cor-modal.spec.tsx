import { newSpecPage } from '@stencil/core/testing';

import { CorButton } from '../../cor-button/cor-button';
import { CorIcon } from '../../cor-icon/cor-icon';
import { CorModal } from '../cor-modal';

describe('cor-modal', () => {
  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal></cor-modal>',
    });

    expect(root).toBeTruthy();
    expect(root?.getAttribute('placement')).toBe('center');
    expect(root?.getAttribute('size')).toBe('md');
    expect(root?.getAttribute('open')).toBeNull();
  });

  it('reflects placement and size attributes', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal placement="right" size="sm"></cor-modal>',
    });

    expect(root?.getAttribute('placement')).toBe('right');
    expect(root?.getAttribute('size')).toBe('sm');
  });

  it('renders default header when not hidden and no header slot is provided', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open><span slot="title">Title</span></cor-modal>',
    });

    const header = root?.shadowRoot?.querySelector('.modal-header');
    const defaultHeader = root?.shadowRoot?.querySelector('.modal-header-default');

    expect(header).toBeTruthy();
    expect(defaultHeader).toBeTruthy();

    // Check that the title slot exists in the shadow DOM
    const titleSlot = root?.shadowRoot?.querySelector('slot[name="title"]');
    expect(titleSlot).toBeTruthy();
  });

  it('renders header slot when provided', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open><div slot="header">Custom Header</div></cor-modal>',
    });

    const header = root?.shadowRoot?.querySelector('.modal-header');
    expect(header).toBeTruthy();

    const headerSlot = root?.shadowRoot?.querySelector('slot[name="header"]');
    expect(headerSlot).toBeTruthy();

    const defaultHeader = root?.shadowRoot?.querySelector('.modal-header-default');
    expect(defaultHeader).toBeFalsy();
  });

  it('omits the header entirely when hideHeader is true', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open hide-header><span slot="title">Title</span></cor-modal>',
    });

    expect(root?.getAttribute('hide-header')).toBe('');
    expect(root?.shadowRoot?.querySelector('.modal-header')).toBeFalsy();
  });

  it('renders footer container only when footer slot content is provided', async () => {
    const page = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open></cor-modal>',
    });

    expect(page.root?.shadowRoot?.querySelector('.modal-footer')).toBeFalsy();

    // Re-render with footer slot content
    const pageWithFooter = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open><div slot="footer">Footer</div></cor-modal>',
    });

    // Manually trigger slot detection since slotchange doesn't fire in test environment
    await pageWithFooter.rootInstance.checkSlots();
    await pageWithFooter.waitForChanges();

    expect(pageWithFooter.root?.shadowRoot?.querySelector('.modal-footer')).toBeTruthy();
  });

  it('sets aria-labelledby when title slot is present (and header is not hidden)', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open><span slot="title">Title</span></cor-modal>',
    });

    const container = root?.shadowRoot?.querySelector('.modal-container');
    expect(container?.getAttribute('aria-labelledby')).toBeTruthy();

    const titleContainer = root?.shadowRoot?.querySelector('.modal-title-container');
    expect(titleContainer?.getAttribute('id')).toBe(container?.getAttribute('aria-labelledby'));
  });

  it('does not set aria-labelledby when hideHeader is true', async () => {
    const { root } = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open hide-header><span slot="title">Title</span></cor-modal>',
    });

    const container = root?.shadowRoot?.querySelector('.modal-container');
    expect(container?.getAttribute('aria-labelledby')).toBeNull();
  });

  it('show() opens the modal and emits corModalOpen', async () => {
    const page = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal></cor-modal>',
    });

    const events: Event[] = [];
    page.root?.addEventListener('corModalOpen', e => events.push(e));

    await (page.rootInstance as CorModal).show();
    await page.waitForChanges();

    expect(page.root?.open).toBe(true);
    expect(events.length).toBe(1);
  });

  it('close() closes the modal and emits corModalClose', async () => {
    const page = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open></cor-modal>',
    });

    const events: Event[] = [];
    page.root?.addEventListener('corModalClose', e => events.push(e));

    await (page.rootInstance as CorModal).close();
    await page.waitForChanges();

    expect(page.root?.open).toBe(false);
    expect(events.length).toBe(1);
  });

  it('closes on Escape when closeOnEscape is true', async () => {
    const page = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal></cor-modal>',
    });

    // Open the modal programmatically to ensure event listeners are attached
    await page.rootInstance.show();
    await page.waitForChanges();
    expect(page.root?.open).toBe(true);

    // Dispatch on document since the handler listens on document, not the component
    page.doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await page.waitForChanges();

    expect(page.root?.open).toBe(false);
  });

  it('closes on backdrop click when closeOnBackdrop is true', async () => {
    const page = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open></cor-modal>',
    });

    const backdrop = page.root?.shadowRoot?.querySelector<HTMLElement>('.modal-backdrop');
    backdrop?.click();
    await page.waitForChanges();

    expect(page.root?.open).toBe(false);
  });

  it('closes when an element with data-modal-close is clicked', async () => {
    const page = await newSpecPage({
      components: [CorModal, CorButton, CorIcon],
      html: '<cor-modal open><button type="button" data-modal-close>Close</button></cor-modal>',
    });

    const closeButton = page.root?.querySelector<HTMLButtonElement>('[data-modal-close]');
    closeButton?.click();
    await page.waitForChanges();

    expect(page.root?.open).toBe(false);
  });
});
