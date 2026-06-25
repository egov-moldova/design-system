import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../mud-file-input';

import { FILE_INPUT_SIZES } from '../mud-file-input.types';

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
  (root?.shadowRoot?.querySelector('.dropzone-icon mud-icon') ?? null) as HTMLElement | null;

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

describe('mud-file-input', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-file-input label="Docs"></mud-file-input>);
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('multiple')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
    });

    it('defaults variant to "dropzone" and renders the dashed drop zone', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      expect(root?.getAttribute('variant')).toBe('dropzone');
      expect(root?.shadowRoot?.querySelector('.dropzone')).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('.upload-button')).toBeNull();
    });

    it('variant="button" renders a Choose-file button instead of the drop zone', async () => {
      const { root } = await render(
        <mud-file-input label="x" variant="button" choose-files-text="Choose file"></mud-file-input>,
      );
      expect(root?.getAttribute('variant')).toBe('button');
      expect(root?.shadowRoot?.querySelector('.dropzone')).toBeNull();
      const button = root?.shadowRoot?.querySelector('.upload-button');
      expect(button).toBeTruthy();
      expect(button?.textContent).toContain('Choose file');
    });

    it.each(FILE_INPUT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-file-input size={size} label="x"></mud-file-input>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('reflects invalid attribute to host', async () => {
      const { root } = await render(<mud-file-input label="x" invalid></mud-file-input>);
      expect(root?.hasAttribute('invalid')).toBe(true);
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('md');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders the drop zone as a passive container — the inner "choose files" button is the keyboard activator', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const dropzone = queryDropzone(root);
      expect(dropzone).toBeTruthy();
      // No `role="button"` on the outer dropzone (nested-interactive axe rule):
      // it contains the inner choose-files <button> which carries the semantics.
      expect(dropzone?.getAttribute('role')).toBe(null);
      expect(dropzone?.getAttribute('tabindex')).toBe(null);
      const innerBtn = root?.shadowRoot?.querySelector('button.dropzone-cta__link');
      expect(innerBtn).toBeTruthy();
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-file-input label="Atașează"></mud-file-input>);
      expect(queryLabel(root)?.textContent).toContain('Atașează');
    });

    it('renders the lead-in cta-text and choose-files link', async () => {
      const { root } = await render(
        <mud-file-input label="x" cta-text="Drag and drop or " choose-files-text="choose files"></mud-file-input>,
      );
      const dropzone = queryDropzone(root);
      expect(dropzone?.textContent).toContain('Drag and drop or');
      expect(dropzone?.textContent).toContain('choose files');
    });

    it('renders the cloud-upload center icon by default', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const icon = queryCenterIcon(root);
      expect(icon).toBeTruthy();
      expect(icon?.getAttribute('name')).toBe('cloud-upload');
    });

    it('renders the center icon-circle wrapper', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      expect(queryDropzoneIcon(root)).toBeTruthy();
    });

    it('renders the choose-files link as a real <button> (keyboard-reachable)', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const link = queryChooseFilesLink(root);
      expect(link).toBeTruthy();
      expect(link?.tagName).toBe('BUTTON');
      expect(link?.getAttribute('type')).toBe('button');
      expect(link?.getAttribute('tabindex')).toBe('0');
    });

    it('clicking the choose-files link opens the native file picker', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const native = queryNative(root)!;
      const link = queryChooseFilesLink(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      link.click();
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('clicking the choose-files link does not double-fire the dropzone click', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
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
        <mud-file-input label="x" supported-formats-text="Formate acceptate: jpg, png"></mud-file-input>,
      );
      const captions = queryCaptions(root);
      expect(captions).toBeTruthy();
      expect(queryCaptionFormats(root)?.textContent).toContain('Formate acceptate: jpg, png');
    });

    it('renders the captions row when max-size-text is set', async () => {
      const { root } = await render(<mud-file-input label="x" max-size-text="Mărime maximă: 100 MB"></mud-file-input>);
      const captions = queryCaptions(root);
      expect(captions).toBeTruthy();
      expect(queryCaptionMaxSize(root)?.textContent).toContain('Mărime maximă: 100 MB');
    });

    it('auto-derives supported-formats-text from accept when explicit prop is unset', async () => {
      const { root } = await render(<mud-file-input label="x" accept=".jpg,.png,.pdf"></mud-file-input>);
      expect(queryCaptionFormats(root)?.textContent).toContain('Formate acceptate: jpg, png, pdf');
    });

    it('auto-derives max-size-text from max-size bytes when explicit prop is unset', async () => {
      const { root } = await render(<mud-file-input label="x" max-size={5242880}></mud-file-input>);
      expect(queryCaptionMaxSize(root)?.textContent).toContain('Mărime maximă: 5 MB');
    });

    it('explicit supported-formats-text wins over accept-derivation', async () => {
      const { root } = await render(
        <mud-file-input label="x" accept=".pdf" supported-formats-text="Custom override"></mud-file-input>,
      );
      expect(queryCaptionFormats(root)?.textContent).toContain('Custom override');
      expect(queryCaptionFormats(root)?.textContent).not.toContain('pdf');
    });

    it('hides the captions row when neither accept nor max-size nor explicit captions are set', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      expect(queryCaptions(root)).toBeNull();
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-file-input label="x" required></mud-file-input>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('renders a hidden native input', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const native = queryNative(root);
      expect(native).toBeTruthy();
      expect(native?.getAttribute('type')).toBe('file');
      expect(native?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-file-input label="x" helper-text="hint"></mud-file-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('hint');
    });

    it('renders an error assistive row when invalid + error-text', async () => {
      const { root } = await render(<mud-file-input label="x" invalid error-text="Trebuie"></mud-file-input>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Trebuie');
    });

    it('error takes priority over helper', async () => {
      const { root } = await render(
        <mud-file-input label="x" invalid helper-text="Hint" error-text="Required"></mud-file-input>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('exposes a polite live region', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const live = queryLiveRegion(root);
      expect(live).toBeTruthy();
      expect(live?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('files + validation', () => {
    it('starts with empty file list', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      expect((root as unknown as { files: File[] }).files).toEqual([]);
      expect(queryFileItems(root)?.length ?? 0).toBe(0);
    });

    it('renders one mud-file-item per file when files are seeded', async () => {
      const { root } = await render(<mud-file-input label="x" multiple></mud-file-input>);
      (root as unknown as { files: File[] }).files = [makeFile('a.pdf', 100), makeFile('b.pdf', 200)];
      await flush();
      expect(queryFileItems(root)?.length).toBe(2);
    });

    it('accepts dropped files and emits mudChange + mudDrop', async () => {
      const onChange = vi.fn();
      const onDrop = vi.fn();
      const { root } = await render(
        <mud-file-input label="x" multiple onMudChange={onChange} onMudDrop={onDrop}></mud-file-input>,
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

    it('rejects files larger than max-size and emits mudError with code=size', async () => {
      const onChange = vi.fn();
      const onError = vi.fn();
      const { root } = await render(
        <mud-file-input
          label="x"
          multiple
          max-size={1000}
          onMudChange={onChange}
          onMudError={onError}
        ></mud-file-input>,
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
        <mud-file-input label="x" multiple accept=".pdf" onMudError={onError}></mud-file-input>,
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
        <mud-file-input
          label="x"
          multiple
          accept="image/*"
          onMudChange={onChange}
          onMudError={onError}
        ></mud-file-input>,
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
        <mud-file-input label="x" multiple max-files={2} onMudError={onError}></mud-file-input>,
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
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
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
        <mud-file-input label="x" onMudDragEnter={onEnter} onMudDragLeave={onLeave}></mud-file-input>,
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
        <mud-file-input
          label="x"
          cta-text="Drag and drop or "
          choose-files-text="choose files"
          dropzone-active-text="Release to upload"
        ></mud-file-input>,
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
        <mud-file-input label="x" supported-formats-text="Formate acceptate: jpg, png"></mud-file-input>,
      );
      expect(queryCaptions(root)).toBeTruthy();
      drag(root, 'enter');
      await flush();
      expect(queryCaptions(root)).toBeNull();
    });

    it('ignores drag events when disabled', async () => {
      const onEnter = vi.fn();
      const { root } = await render(<mud-file-input label="x" disabled onMudDragEnter={onEnter}></mud-file-input>);
      drag(root, 'enter');
      await flush();
      expect(root?.classList.contains('is-active')).toBe(false);
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe('keyboard activation', () => {
    it('clicking the inner "choose files" button opens the native picker', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const native = queryNative(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      const innerBtn = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.dropzone-cta__link');
      innerBtn?.click();
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('clicking the dropzone container (drop-target area) also opens the picker (event bubbles)', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const native = queryNative(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      const dropzone = queryDropzone(root);
      dropzone?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('does not open picker when disabled', async () => {
      const { root } = await render(<mud-file-input label="x" disabled></mud-file-input>);
      const native = queryNative(root)!;
      const clickSpy = vi.spyOn(native, 'click');
      const innerBtn = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.dropzone-cta__link');
      innerBtn?.click();
      await flush();
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('remove behavior', () => {
    it('emits mudRemove and updates files when a file-item fires remove', async () => {
      const onRemove = vi.fn();
      const onChange = vi.fn();
      const { root } = await render(
        <mud-file-input label="x" multiple onMudRemove={onRemove} onMudChange={onChange}></mud-file-input>,
      );
      (root as unknown as { files: File[] }).files = [makeFile('a.pdf', 100), makeFile('b.pdf', 200)];
      await flush();
      const items = queryFileItems(root)!;
      const mudItem = items[0].querySelector('mud-file-item') as HTMLElement;
      mudItem.dispatchEvent(
        new CustomEvent('mudRemove', { detail: { filename: 'a.pdf' }, bubbles: true, composed: true }),
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
    /* All ARIA associations (labelledby / label / describedby / invalid) now
       live on the inner "Alege fișiere" <button>. The outer dropzone div has
       no role, so ARIA's aria-prohibited-attr rule forbids those attrs on it. */
    const innerBtn = (root: Element | null | undefined) =>
      root?.shadowRoot?.querySelector<HTMLButtonElement>('button.dropzone-cta__link') ?? null;

    it('links the label via aria-labelledby on the inner choose-files button', async () => {
      const { root } = await render(<mud-file-input label="Documente"></mud-file-input>);
      const btn = innerBtn(root);
      const label = queryLabel(root);
      const id = btn?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('reflects required via internals.validity (no aria-required on the role-less dropzone)', async () => {
      const { root } = await render(<mud-file-input label="x" required name="doc"></mud-file-input>);
      // aria-required on the dropzone violates aria-allowed-attr; the validity
      // contract is enforced via ElementInternals instead so native form
      // submission still blocks on an empty required mud-file-input.
      expect(queryDropzone(root)?.getAttribute('aria-required')).toBe(null);
      expect(root?.hasAttribute('required')).toBe(true);
    });

    it('exposes aria-invalid on the inner button when invalid', async () => {
      const { root } = await render(<mud-file-input label="x" invalid></mud-file-input>);
      expect(innerBtn(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby on the inner button to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-file-input label="x" helper-text="hint"></mud-file-input>);
      const describedBy = innerBtn(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby on the inner button to the error id when invalid + error-text present', async () => {
      const { root } = await render(<mud-file-input label="x" invalid error-text="Required"></mud-file-input>);
      const describedBy = innerBtn(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label on the inner button when no visible label is present', async () => {
      const { root } = await render(<mud-file-input aria-label="Atașează"></mud-file-input>);
      const btn = innerBtn(root);
      expect(btn?.getAttribute('aria-label')).toBe('Atașează');
      expect(btn?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('makes the inner choose-files button untabbable when disabled', async () => {
      const { root } = await render(<mud-file-input label="x" disabled></mud-file-input>);
      // The dropzone itself is no longer focusable (no role, no tabindex);
      // the inner button is the keyboard activator and it carries tabIndex=-1 when disabled.
      const innerBtn = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.dropzone-cta__link');
      expect(innerBtn?.getAttribute('tabindex')).toBe('-1');
      expect(innerBtn?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('form association', () => {
    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-file-input label="x"></mud-file-input>);
      const btn = () => root?.shadowRoot?.querySelector<HTMLButtonElement>('button.dropzone-cta__link');
      expect(btn()?.getAttribute('aria-disabled')).toBeNull();
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      // aria-disabled is now exposed on the interactive inner button, not the
      // role-less dropzone div (ARIA aria-prohibited-attr rule).
      expect(btn()?.getAttribute('aria-disabled')).toBe('true');
    });

    it('clears files on formResetCallback', async () => {
      const { root } = await render(<mud-file-input label="x" multiple></mud-file-input>);
      (root as unknown as { files: File[] }).files = [makeFile('a.pdf', 100)];
      await flush();
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      expect((root as unknown as { files: File[] }).files).toEqual([]);
    });
  });
});
