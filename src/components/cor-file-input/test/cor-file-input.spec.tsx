import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../cor-file-input';

import { FILE_INPUT_SIZES } from '../cor-file-input.types';

const queryDropzone = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.dropzone') ?? null) as HTMLElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryNative = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.native') ?? null) as HTMLInputElement | null;

const queryFileItems = (root: Element | null | undefined): NodeListOf<HTMLElement> | null =>
  (root?.shadowRoot?.querySelectorAll('.file-list-item') ?? null) as NodeListOf<HTMLElement> | null;

const queryLiveRegion = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('[role="status"]') ?? null) as HTMLElement | null;

const queryDropzoneIcon = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.dropzone-icon') ?? null) as HTMLElement | null;

const queryDropzoneText = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.dropzone-text') ?? null) as HTMLElement | null;

const queryCenterIcon = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.dropzone-icon cor-icon') ?? null) as HTMLElement | null;

const queryChooseFilesLink = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('.dropzone-cta__link') ?? null) as HTMLButtonElement | null;

const queryCaptions = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.captions') ?? null) as HTMLElement | null;

const queryCaptionFormats = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.captions__formats') ?? null) as HTMLElement | null;

const queryCaptionMaxSize = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.captions__max-size') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const makeFile = (name: string, size: number, type: string = 'application/pdf'): File => {
  // mock-doc lacks a Blob backbone large enough for `size`; fake the property.
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
};

describe('cor-file-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<cor-file-input label="Docs"></cor-file-input>);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('multiple')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
    });

    it('does NOT expose a variant prop (Figma is state-only — no style axis)', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      // Setting an unknown prop must not surface on the host.
      (root as unknown as Record<string, string>).variant = 'destructive';
      await flush();
      expect(root?.getAttribute('variant')).toBeNull();
    });

    it.each(FILE_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<cor-file-input size={size} label="x"></cor-file-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('reflects invalid attribute to host', async () => {
      const { root } = await render(<cor-file-input label="x" invalid></cor-file-input>);
      expect(root?.hasAttribute('invalid')).toBe(true);
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders a drop zone with role=button', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const dropzone = queryDropzone(root);
      expect(dropzone).toBeTruthy();
      expect(dropzone?.getAttribute('role')).toBe('button');
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<cor-file-input label="Atașează"></cor-file-input>);
      expect(queryLabel(root)?.textContent).toContain('Atașează');
    });

    it('renders the lead-in cta-text and choose-files link', async () => {
      const { root } = await render(
        <cor-file-input label="x" cta-text="Drag and drop or " choose-files-text="choose files"></cor-file-input>,
      );
      const dropzone = queryDropzone(root);
      expect(dropzone?.textContent).toContain('Drag and drop or');
      expect(dropzone?.textContent).toContain('choose files');
    });

    it('renders the cloud-upload center icon by default', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const icon = queryCenterIcon(root);
      expect(icon).toBeTruthy();
      expect(icon?.getAttribute('name')).toBe('cloud-upload');
    });

    it('renders the center icon-circle wrapper', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      expect(queryDropzoneIcon(root)).toBeTruthy();
    });

    it('renders the choose-files link as a real <button> (keyboard-reachable)', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const link = queryChooseFilesLink(root);
      expect(link).toBeTruthy();
      expect(link?.tagName).toBe('BUTTON');
      expect(link?.getAttribute('type')).toBe('button');
      expect(link?.getAttribute('tabindex')).toBe('0');
    });

    it('clicking the choose-files link opens the native file picker', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const native = queryNative(root)!;
      const link = queryChooseFilesLink(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      link.click();
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('clicking the choose-files link does not double-fire the dropzone click', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const native = queryNative(root)!;
      const link = queryChooseFilesLink(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      // Real <button> click bubbles to the dropzone wrapper; the link handler
      // calls stopPropagation, so the dropzone's onClick must NOT also fire.
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('renders the captions row when supported-formats-text is set', async () => {
      const { root } = await render(
        <cor-file-input label="x" supported-formats-text="Formate acceptate: jpg, png"></cor-file-input>,
      );
      const captions = queryCaptions(root);
      expect(captions).toBeTruthy();
      expect(queryCaptionFormats(root)?.textContent).toContain('Formate acceptate: jpg, png');
    });

    it('renders the captions row when max-size-text is set', async () => {
      const { root } = await render(<cor-file-input label="x" max-size-text="Mărime maximă: 100 MB"></cor-file-input>);
      const captions = queryCaptions(root);
      expect(captions).toBeTruthy();
      expect(queryCaptionMaxSize(root)?.textContent).toContain('Mărime maximă: 100 MB');
    });

    it('auto-derives supported-formats-text from accept when explicit prop is unset', async () => {
      const { root } = await render(<cor-file-input label="x" accept=".jpg,.png,.pdf"></cor-file-input>);
      expect(queryCaptionFormats(root)?.textContent).toContain('Formate acceptate: jpg, png, pdf');
    });

    it('auto-derives max-size-text from max-size bytes when explicit prop is unset', async () => {
      const { root } = await render(<cor-file-input label="x" max-size={5242880}></cor-file-input>);
      expect(queryCaptionMaxSize(root)?.textContent).toContain('Mărime maximă: 5 MB');
    });

    it('explicit supported-formats-text wins over accept-derivation', async () => {
      const { root } = await render(
        <cor-file-input label="x" accept=".pdf" supported-formats-text="Custom override"></cor-file-input>,
      );
      expect(queryCaptionFormats(root)?.textContent).toContain('Custom override');
      expect(queryCaptionFormats(root)?.textContent).not.toContain('pdf');
    });

    it('hides the captions row when neither accept nor max-size nor explicit captions are set', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      expect(queryCaptions(root)).toBeNull();
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<cor-file-input label="x" required></cor-file-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders a hidden native input', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('file');
      expect(native?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<cor-file-input label="x" helper-text="hint"></cor-file-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('hint');
    });

    it('renders an error assistive row when invalid + error-text', async () => {
      const { root } = await render(<cor-file-input label="x" invalid error-text="Trebuie"></cor-file-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Trebuie');
    });

    it('error takes priority over helper', async () => {
      const { root } = await render(
        <cor-file-input label="x" invalid helper-text="Hint" error-text="Required"></cor-file-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('exposes a polite live region', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const live = queryLiveRegion(root);
      expect(live).toBeTruthy();
      expect(live?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('files + validation', () => {
    it('starts with empty file list', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      expect((root as unknown as { files: File[] }).files).toEqual([]);
      expect(queryFileItems(root)?.length ?? 0).toBe(0);
    });

    it('renders one cor-file-item per file when files are seeded', async () => {
      const { root } = await render(<cor-file-input label="x" multiple></cor-file-input>);
      (root as unknown as { files: File[] }).files = [makeFile('a.pdf', 100), makeFile('b.pdf', 200)];
      await flush();
      expect(queryFileItems(root)?.length).toBe(2);
    });

    it('accepts dropped files and emits corChange + corDrop', async () => {
      const onChange = vi.fn();
      const onDrop = vi.fn();
      const { root } = await render(
        <cor-file-input label="x" multiple onCorChange={onChange} onCorDrop={onDrop}></cor-file-input>,
      );
      const dropzone = queryDropzone(root)!;
      const file = makeFile('a.pdf', 100);
      // Build a DataTransfer-like object; mock-doc's DragEvent uses our shape.
      const dataTransfer = { files: [file] } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer }) as DragEvent,
      );
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail.files).toHaveLength(1);
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop.mock.calls[0][0].detail.accepted).toHaveLength(1);
      expect(onDrop.mock.calls[0][0].detail.rejected).toHaveLength(0);
    });

    it('rejects files larger than max-size and emits corError with code=size', async () => {
      const onChange = vi.fn();
      const onError = vi.fn();
      const { root } = await render(
        <cor-file-input
          label="x"
          multiple
          max-size={1000}
          onCorChange={onChange}
          onCorError={onError}
        ></cor-file-input>,
      );
      const dropzone = queryDropzone(root)!;
      const big = makeFile('big.pdf', 5000);
      const dataTransfer = { files: [big] } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer }) as DragEvent,
      );
      await flush();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].detail.code).toBe('size');
      expect((root as unknown as { files: File[] }).files).toHaveLength(0);
    });

    it('rejects files not matching accept extension', async () => {
      const onError = vi.fn();
      const { root } = await render(
        <cor-file-input label="x" multiple accept=".pdf" onCorError={onError}></cor-file-input>,
      );
      const dropzone = queryDropzone(root)!;
      const png = makeFile('a.png', 100, 'image/png');
      const dataTransfer = { files: [png] } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer }) as DragEvent,
      );
      await flush();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].detail.code).toBe('type');
    });

    it('accepts MIME-family wildcards (image/*)', async () => {
      const onChange = vi.fn();
      const onError = vi.fn();
      const { root } = await render(
        <cor-file-input
          label="x"
          multiple
          accept="image/*"
          onCorChange={onChange}
          onCorError={onError}
        ></cor-file-input>,
      );
      const dropzone = queryDropzone(root)!;
      const png = makeFile('a.png', 100, 'image/png');
      const dataTransfer = { files: [png] } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer }) as DragEvent,
      );
      await flush();
      expect(onError).not.toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });

    it('enforces max-files', async () => {
      const onError = vi.fn();
      const { root } = await render(
        <cor-file-input label="x" multiple max-files={2} onCorError={onError}></cor-file-input>,
      );
      const dropzone = queryDropzone(root)!;
      const files = [makeFile('a.pdf', 100), makeFile('b.pdf', 100), makeFile('c.pdf', 100)];
      const dataTransfer = { files } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer }) as DragEvent,
      );
      await flush();
      expect((root as unknown as { files: File[] }).files).toHaveLength(2);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].detail.code).toBe('count');
    });

    it('replaces the file when multiple is false', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const dropzone = queryDropzone(root)!;
      const first = { files: [makeFile('a.pdf', 100)] } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer: first }) as DragEvent,
      );
      await flush();
      const second = { files: [makeFile('b.pdf', 200)] } as unknown as DataTransfer;
      dropzone.dispatchEvent(
        Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer: second }) as DragEvent,
      );
      await flush();
      const files = (root as unknown as { files: File[] }).files;
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('b.pdf');
    });
  });

  describe('Active state (drag-over)', () => {
    // Mock-doc's shadow trigger does not surface JSX-bound on{Drag*} handlers
    // via dispatchEvent. Drive the registered handlers directly off the
    // component instance — the contract is identical at runtime.
    type DragInstance = {
      handleDragEnter: (ev: DragEvent) => void;
      handleDragLeave: (ev: DragEvent) => void;
    };
    const drag = (root: Element | null | undefined, type: 'enter' | 'leave') => {
      const instance = root as unknown as DragInstance;
      const ev = new Event(`drag${type}`, { bubbles: true, cancelable: true }) as DragEvent;
      if (type === 'enter') instance.handleDragEnter.call(instance, ev);
      else instance.handleDragLeave.call(instance, ev);
    };

    it('adds is-active on dragenter and removes on dragleave', async () => {
      const onEnter = vi.fn();
      const onLeave = vi.fn();
      const { root } = await render(
        <cor-file-input label="x" onCorDragEnter={onEnter} onCorDragLeave={onLeave}></cor-file-input>,
      );
      drag(root, 'enter');
      await flush();
      expect(root?.classList.contains('is-active')).toBe(true);
      expect(onEnter).toHaveBeenCalledTimes(1);
      drag(root, 'leave');
      await flush();
      expect(root?.classList.contains('is-active')).toBe(false);
      expect(onLeave).toHaveBeenCalledTimes(1);
    });

    it('swaps the CTA row for dropzone-active-text and hides the icon-circle when active', async () => {
      const { root } = await render(
        <cor-file-input
          label="x"
          cta-text="Drag and drop or "
          choose-files-text="choose files"
          dropzone-active-text="Release to upload"
        ></cor-file-input>,
      );
      // Resting: CTA row visible, icon-circle visible, active text absent.
      expect(queryChooseFilesLink(root)).toBeTruthy();
      expect(queryDropzoneIcon(root)).toBeTruthy();
      expect(queryDropzoneText(root)).toBeNull();

      drag(root, 'enter');
      await flush();
      // Active: single line of `dropzone-active-text`, no icon, no CTA link.
      expect(queryDropzoneText(root)?.textContent).toContain('Release to upload');
      expect(queryDropzoneIcon(root)).toBeNull();
      expect(queryChooseFilesLink(root)).toBeNull();
    });

    it('hides the captions row while active (drag-over)', async () => {
      const { root } = await render(
        <cor-file-input label="x" supported-formats-text="Formate acceptate: jpg, png"></cor-file-input>,
      );
      expect(queryCaptions(root)).toBeTruthy();
      drag(root, 'enter');
      await flush();
      expect(queryCaptions(root)).toBeNull();
    });

    it('ignores drag events when disabled', async () => {
      const onEnter = vi.fn();
      const { root } = await render(<cor-file-input label="x" disabled onCorDragEnter={onEnter}></cor-file-input>);
      drag(root, 'enter');
      await flush();
      expect(root?.classList.contains('is-active')).toBe(false);
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe('keyboard activation', () => {
    // Same mock-doc shadow-trigger constraint as drag — drive the registered
    // handler directly off the instance.
    type KbInstance = { handleBrowseKey: (ev: KeyboardEvent) => void };
    const press = (root: Element | null | undefined, key: string) => {
      const instance = root as unknown as KbInstance;
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      instance.handleBrowseKey.call(instance, ev);
    };

    it('Enter on drop zone clicks the native input', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const native = queryNative(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      press(root, 'Enter');
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('Space on drop zone clicks the native input', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      const native = queryNative(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      press(root, ' ');
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('does not open picker when disabled', async () => {
      const { root } = await render(<cor-file-input label="x" disabled></cor-file-input>);
      const native = queryNative(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      press(root, 'Enter');
      await flush();
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('remove behavior', () => {
    it('emits corRemove and updates files when a file-item fires remove', async () => {
      const onRemove = vi.fn();
      const onChange = vi.fn();
      const { root } = await render(
        <cor-file-input label="x" multiple onCorRemove={onRemove} onCorChange={onChange}></cor-file-input>,
      );
      (root as unknown as { files: File[] }).files = [makeFile('a.pdf', 100), makeFile('b.pdf', 200)];
      await flush();
      const items = queryFileItems(root)!;
      const corItem = items[0].querySelector('cor-file-item') as HTMLElement;
      corItem.dispatchEvent(
        new CustomEvent('corRemove', { detail: { filename: 'a.pdf' }, bubbles: true, composed: true }),
      );
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0][0].detail.index).toBe(0);
      const files = (root as unknown as { files: File[] }).files;
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('b.pdf');
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby on the drop zone', async () => {
      const { root } = await render(<cor-file-input label="Documente"></cor-file-input>);
      const dropzone = queryDropzone(root);
      const label = queryLabel(root);
      const id = dropzone?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<cor-file-input label="x" required></cor-file-input>);
      expect(queryDropzone(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<cor-file-input label="x" invalid></cor-file-input>);
      expect(queryDropzone(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<cor-file-input label="x" helper-text="hint"></cor-file-input>);
      const describedBy = queryDropzone(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<cor-file-input label="x" invalid error-text="Required"></cor-file-input>);
      const describedBy = queryDropzone(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label when no visible label is present', async () => {
      const { root } = await render(<cor-file-input aria-label="Atașează"></cor-file-input>);
      const dropzone = queryDropzone(root);
      expect(dropzone?.getAttribute('aria-label')).toBe('Atașează');
      expect(dropzone?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('makes the drop zone untabbable when disabled', async () => {
      const { root } = await render(<cor-file-input label="x" disabled></cor-file-input>);
      expect(queryDropzone(root)?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('form association', () => {
    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<cor-file-input label="x"></cor-file-input>);
      expect(queryDropzone(root)?.getAttribute('aria-disabled')).toBeNull();
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryDropzone(root)?.getAttribute('aria-disabled')).toBe('true');
    });

    it('clears files on formResetCallback', async () => {
      const { root } = await render(<cor-file-input label="x" multiple></cor-file-input>);
      (root as unknown as { files: File[] }).files = [makeFile('a.pdf', 100)];
      await flush();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as unknown as { files: File[] }).files).toEqual([]);
    });
  });
});
