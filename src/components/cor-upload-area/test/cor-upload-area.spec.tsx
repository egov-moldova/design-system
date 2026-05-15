import { newSpecPage } from '@stencil/core/testing';

import { CorUploadArea } from '../cor-upload-area';
import { UploadVariant, UploadStyle } from '../cor-upload-area.enums';

describe('cor-upload-area', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });
    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('variant')).toBe(UploadVariant.MULTIPLE);
    expect(page.root?.getAttribute('upload-style')).toBe(UploadStyle.REGULAR);
  });

  it('reflects is-uploading attribute', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area is-uploading></cor-upload-area>`,
    });
    expect(page.root?.getAttribute('is-uploading')).not.toBeNull();
  });

  it('shows drop-zone in default state', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });
    const dropZone = page.root?.shadowRoot?.querySelector('.drop-zone');
    expect(dropZone).toBeTruthy();
  });

  it('shows cor-loading when single uploading', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single" is-uploading progress="50"></cor-upload-area>`,
    });
    const loading = page.root?.shadowRoot?.querySelector('cor-loading');
    expect(loading).toBeTruthy();
  });

  it('shows icon-circle when not uploading single', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });
    const iconCircle = page.root?.shadowRoot?.querySelector('.icon-circle');
    expect(iconCircle).toBeTruthy();
  });

  it('hides file-list when empty', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });
    const fileList = page.root?.shadowRoot?.querySelector('.file-list');
    expect(fileList?.classList.contains('is-empty')).toBe(true);
  });

  it('emits corBrowseClick when browse button clicked', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });
    const handler = jest.fn();
    page.root?.addEventListener('corBrowseClick', handler);

    const btn = page.root?.shadowRoot?.querySelector('.drop-zone button') as HTMLButtonElement;
    btn?.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emits corCancelClick when cancel button clicked in uploading single state', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single" is-uploading></cor-upload-area>`,
    });
    const handler = jest.fn();
    page.root?.addEventListener('corCancelClick', handler);

    const btn = page.root?.shadowRoot?.querySelector('.drop-zone button') as HTMLButtonElement;
    btn?.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('shows progress percent in single uploading state', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single" is-uploading progress="72"></cor-upload-area>`,
    });
    const pct = page.root?.shadowRoot?.querySelector('.progress-percent');
    expect(pct?.textContent?.trim()).toBe('72%');
  });

  it('has tabindex 0 by default', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });
    // Tabindex was removed from the component, so it should be null
    expect(page.root?.getAttribute('tabindex')).toBeNull();
  });

  it('sets multiple on hidden input when variant is multiple', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="multiple"></cor-upload-area>`,
    });
    const input = page.root?.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.multiple).toBe(true);
  });

  it('does not set multiple on hidden input when variant is single', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single"></cor-upload-area>`,
    });
    const input = page.root?.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.multiple).toBe(false);
  });

  it('handles drag events via event listeners', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });

    const dragEnterHandler = jest.fn();
    const dragLeaveHandler = jest.fn();

    page.root?.addEventListener('corDragEnter', dragEnterHandler);
    page.root?.addEventListener('corDragLeave', dragLeaveHandler);

    // Create a mock drag event with minimal required properties
    const mockDragEnterEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: null,
    } as unknown as DragEvent;

    // Simulate drag enter by calling the handler directly
    const component = page.rootInstance as CorUploadArea;
    component['handleDragEnter'](mockDragEnterEvent);

    expect(dragEnterHandler).toHaveBeenCalledTimes(1);
    expect(mockDragEnterEvent.preventDefault).toHaveBeenCalled();
    expect(mockDragEnterEvent.stopPropagation).toHaveBeenCalled();
  });

  it('prevents drag events when uploading single', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single" is-uploading></cor-upload-area>`,
    });

    const dragEnterHandler = jest.fn();
    page.root?.addEventListener('corDragEnter', dragEnterHandler);

    const component = page.rootInstance as CorUploadArea;
    const mockDragEnterEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: null,
    } as unknown as DragEvent;

    // Simulate drag enter by calling the handler directly
    component['handleDragEnter'](mockDragEnterEvent);

    expect(dragEnterHandler).not.toHaveBeenCalled();
    expect(mockDragEnterEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockDragEnterEvent.stopPropagation).not.toHaveBeenCalled();
  });

  it('triggers file input click on keyboard interaction', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area></cor-upload-area>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');

    const keyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    page.root?.dispatchEvent(keyEvent);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('prevents keyboard interaction when uploading single', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single" is-uploading></cor-upload-area>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');

    const keyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    page.root?.dispatchEvent(keyEvent);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('detects label slot content', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area><div slot="label">Custom Label</div></cor-upload-area>`,
    });

    await page.waitForChanges();
    const labelSlot = page.root?.shadowRoot?.querySelector('slot[name="label"]') as HTMLSlotElement;
    expect(labelSlot?.assignedNodes({ flatten: true }).length).toBeGreaterThan(0);
  });

  it('shows custom browse label', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area browse-label="Select Files"></cor-upload-area>`,
    });

    const btn = page.root?.shadowRoot?.querySelector('.drop-zone button') as HTMLButtonElement;
    expect(btn?.textContent?.trim()).toBe('Select Files');
  });

  it('shows custom cancel label', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area variant="single" is-uploading cancel-label="Abort Upload"></cor-upload-area>`,
    });

    const btn = page.root?.shadowRoot?.querySelector('.drop-zone button') as HTMLButtonElement;
    expect(btn?.textContent?.trim()).toBe('Abort Upload');
  });

  it('forwards accept attribute to hidden input', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area accept=".jpg,.png,image/*"></cor-upload-area>`,
    });

    const input = page.root?.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.accept).toBe('.jpg,.png,image/*');
  });

  it('shows file list when default slot has content', async () => {
    const page = await newSpecPage({
      components: [CorUploadArea],
      html: `<cor-upload-area><div>File content</div></cor-upload-area>`,
    });

    await page.waitForChanges();
    const fileList = page.root?.shadowRoot?.querySelector('.file-list');
    expect(fileList?.classList.contains('is-empty')).toBe(false);
  });
});
