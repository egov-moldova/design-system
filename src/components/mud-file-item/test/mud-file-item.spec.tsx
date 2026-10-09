import { describe, expect, h, it, render, vi } from '@stencil/vitest';

import '../mud-file-item';

import { describeLocales } from '../../../utils/locale.test-helpers';
import { FILE_ITEM_MESSAGES } from '../mud-file-item.messages';
import type { FileItemMessages } from '../mud-file-item.messages';
import { FILE_ITEM_STATES } from '../mud-file-item.types';

const queryFilename = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.filename') ?? null) as HTMLElement | null;

const queryMeta = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.meta') ?? null) as HTMLElement | null;

const queryRemove = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.remove') ?? null) as HTMLButtonElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-file-item', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      expect(root?.getAttribute('state')).toBe('uploaded');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('no-remove')).toBeNull();
    });

    it.each(FILE_ITEM_STATES)('reflects state="%s" to host', async state => {
      const { root } = await render(<mud-file-item state={state} filename="x.pdf"></mud-file-item>);
      expect(root?.getAttribute('state')).toBe(state);
    });

    it('warns and falls back when state is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      (root as unknown as { state: string }).state = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('state="bogus"'));
      expect(root?.getAttribute('state')).toBe('uploaded');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders the filename', async () => {
      const { root } = await render(<mud-file-item filename="declaratie.pdf"></mud-file-item>);
      expect(queryFilename(root)?.textContent).toContain('declaratie.pdf');
    });

    it('renders human-readable size in bytes for tiny files', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" size={512}></mud-file-item>);
      expect(queryMeta(root)?.textContent).toBe('512 B');
    });

    it('renders human-readable size in KB', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" size={2048}></mud-file-item>);
      expect(queryMeta(root)?.textContent).toBe('2 KB');
    });

    it('formats a fractional size with the locale decimal separator, not always "."', async () => {
      const { root: ro } = await render(<mud-file-item filename="x.pdf" size={1536} locale="ro-MD"></mud-file-item>);
      expect(queryMeta(ro)?.textContent).toBe('1,5 KB');
      const { root: en } = await render(<mud-file-item filename="x.pdf" size={1536} locale="en-US"></mud-file-item>);
      expect(queryMeta(en)?.textContent).toBe('1.5 KB');
    });

    it('renders human-readable size in MB', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" size={3_500_000}></mud-file-item>);
      expect(queryMeta(root)?.textContent).toContain('MB');
    });

    it('renders human-readable size in GB', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" size={2_147_483_648}></mud-file-item>);
      expect(queryMeta(root)?.textContent).toContain('GB');
    });

    it('omits the meta row when no size and no error', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      expect(queryMeta(root)).toBeNull();
    });

    it('keeps the size in meta and shows the error message on its own line when state="error"', async () => {
      const { root } = await render(
        <mud-file-item state="error" filename="x.pdf" size={2048} error-text="Fișier prea mare"></mud-file-item>,
      );
      // Size stays in the meta line; the message renders below the divider.
      expect(queryMeta(root)?.textContent).toBe('2 KB');
      const msg = root?.shadowRoot?.querySelector('.error-message');
      expect(msg?.textContent).toBe('Fișier prea mare');
    });

    it('renders the size and no message when state="error" but error-text is empty', async () => {
      const { root } = await render(<mud-file-item state="error" filename="x.pdf" size={2048}></mud-file-item>);
      expect(queryMeta(root)?.textContent).toBe('2 KB');
      expect(root?.shadowRoot?.querySelector('.error-message')).toBeNull();
    });

    it('shows the status icon on the right (success ✓ / error !)', async () => {
      const { root: ok } = await render(<mud-file-item state="success" filename="x.pdf"></mud-file-item>);
      expect(ok?.shadowRoot?.querySelector('.trailing .status-success')).toBeTruthy();
      expect(ok?.shadowRoot?.querySelector('button.remove')).toBeNull();
      const { root: err } = await render(<mud-file-item state="error" filename="x.pdf"></mud-file-item>);
      expect(err?.shadowRoot?.querySelector('.trailing .status-error')).toBeTruthy();
      expect(err?.shadowRoot?.querySelector('.trailing button.remove')).toBeTruthy();
    });

    it('drops the leading icon in the error state', async () => {
      const { root } = await render(<mud-file-item state="error" filename="x.pdf"></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('.leading-icon')).toBeNull();
    });
  });

  describe('remove button', () => {
    it('renders a remove button by default', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      const remove = queryRemove(root);
      expect(remove).toBeTruthy();
      expect(remove?.getAttribute('aria-label')).toBe('Elimină fișierul');
    });

    it('names the file too: the button is labelled by itself and the file name', async () => {
      // Every row of a list has the same button. `aria-labelledby` reads the button's own `aria-label` and then
      // the file name, so the accessible name is "Elimină fișierul x.pdf" while `aria-label` stays the plain copy.
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      const remove = queryRemove(root);
      const ids = (remove?.getAttribute('aria-labelledby') ?? '').split(' ');
      expect(ids).toEqual(['remove', 'filename']);
      expect(remove?.id).toBe('remove');
      expect(root?.shadowRoot?.getElementById('filename')?.textContent?.trim()).toBe('x.pdf');
    });

    it('honors a custom remove-label', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" remove-label="Remove attachment"></mud-file-item>);
      expect(queryRemove(root)?.getAttribute('aria-label')).toBe('Remove attachment');
    });

    it('is not labelled by a file name when there is none', async () => {
      const { root } = await render(<mud-file-item remove-label="Remove attachment"></mud-file-item>);
      expect(queryRemove(root)?.getAttribute('aria-label')).toBe('Remove attachment');
      expect(queryRemove(root)?.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('hides the remove button when no-remove is set', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" no-remove></mud-file-item>);
      expect(queryRemove(root)).toBeNull();
    });

    it('emits mudRemove with the filename payload when clicked', async () => {
      const onRemove = vi.fn();
      const { root } = await render(<mud-file-item filename="x.pdf" onMudRemove={onRemove}></mud-file-item>);
      const remove = queryRemove(root)!;
      remove.click();
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0][0].detail).toEqual({ filename: 'x.pdf' });
    });

    it('renders disabled attribute on the remove button when disabled', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" disabled></mud-file-item>);
      const remove = queryRemove(root)!;
      expect(remove.getAttribute('disabled') !== null).toBe(true);
      expect(remove.getAttribute('aria-disabled')).toBe('true');
    });

    it('handles Enter key activation', async () => {
      // Mock-doc does not surface JSX-bound onKeyDown via dispatchEvent —
      // invoke the registered handler directly (contract is the same at runtime).
      const onRemove = vi.fn();
      const { root } = await render(<mud-file-item filename="x.pdf" onMudRemove={onRemove}></mud-file-item>);
      type Instance = { handleRemoveKey: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (root as unknown as Instance).handleRemoveKey.call(root, ev);
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('handles Space key activation', async () => {
      const onRemove = vi.fn();
      const { root } = await render(<mud-file-item filename="x.pdf" onMudRemove={onRemove}></mud-file-item>);
      type Instance = { handleRemoveKey: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      (root as unknown as Instance).handleRemoveKey.call(root, ev);
      await flush();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploading spinner', () => {
    it('renders a spinner (not the remove button) while uploading', async () => {
      const { root } = await render(<mud-file-item state="uploading" filename="x.pdf" size={1000}></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('.spinner mud-spinner')).toBeTruthy();
      expect(root?.shadowRoot?.querySelector('button.remove')).toBeNull();
    });

    it('renders the remove button (no spinner) in the uploaded state', async () => {
      const { root } = await render(<mud-file-item state="uploaded" filename="x.pdf" size={1000}></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('.spinner')).toBeNull();
      expect(root?.shadowRoot?.querySelector('button.remove')).toBeTruthy();
    });
  });

  describe('image-preview thumbnail', () => {
    it('renders a thumbnail <img> in place of the icon when preview-src is set', async () => {
      const { root } = await render(
        <mud-file-item filename="p.jpg" size={1000} preview-src="blob:abc"></mud-file-item>,
      );
      const img = root?.shadowRoot?.querySelector('img.thumbnail');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('blob:abc');
      // Thumbnail replaces the default file glyph.
      expect(root?.shadowRoot?.querySelector('.file-glyph')).toBeNull();
    });

    it('renders the default file glyph when no preview-src is set', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" size={1000}></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('img.thumbnail')).toBeNull();
      const glyph = root?.shadowRoot?.querySelector('img.file-glyph');
      expect(glyph).toBeTruthy();
      expect(glyph?.getAttribute('src')).toContain('data:image/svg+xml');
    });
  });

  describe('filename hover tooltip', () => {
    const longName = 'Government_services_report_final_version_updated.pdf';

    it('keeps the full filename in the DOM (so AT reads it even when visually clipped)', async () => {
      const { root } = await render(<mud-file-item filename={longName} size={1000}></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('.filename')?.textContent).toBe(longName);
    });

    it('does not render the tooltip when the name is not truncated', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf" size={1000}></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('.filename-tooltip')).toBeNull();
    });

    it('renders the full-name tooltip when truncated', async () => {
      const { root } = await render(<mud-file-item filename={longName} size={1000}></mud-file-item>);
      // jsdom has no layout, so stub the measured widths and run the detector.
      const inst = root as unknown as { filenameEl?: HTMLElement; measureTruncation: () => void };
      if (inst.filenameEl) {
        Object.defineProperty(inst.filenameEl, 'scrollWidth', { configurable: true, value: 400 });
        Object.defineProperty(inst.filenameEl, 'clientWidth', { configurable: true, value: 80 });
      }
      inst.measureTruncation();
      await flush();
      const tip = root?.shadowRoot?.querySelector('.filename-tooltip');
      expect(tip).toBeTruthy();
      expect(tip?.textContent).toBe(longName);
    });
  });

  describe('state announcements', () => {
    const region = (root: Element | null | undefined) =>
      root?.shadowRoot?.querySelector('[role="status"]') as HTMLElement | null;
    const setState = async (
      el: Element | null | undefined,
      state: string,
      waitForChanges: () => Promise<void>,
      extra: Record<string, string> = {},
    ) => {
      for (const [k, v] of Object.entries(extra)) (el as unknown as Record<string, string>)[k] = v;
      (el as unknown as { state: string }).state = state;
      await waitForChanges();
    };

    it('has a polite live region that is empty for a resting row', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      const live = region(root);
      expect(live).toBeTruthy();
      expect(live?.getAttribute('aria-live')).toBe('polite');
      expect(live?.textContent?.trim()).toBe('');
    });

    it('says the filename and "uploading" for a row that is created uploading', async () => {
      const { root, waitForChanges } = await render(
        <mud-file-item variant="upload" state="uploading" filename="x.pdf"></mud-file-item>,
      );
      await waitForChanges();
      expect(region(root)?.textContent?.trim()).toBe('x.pdf: Se încarcă');
    });

    it('announces the finish when an uploading row turns to success or to uploaded', async () => {
      const first = await render(<mud-file-item variant="upload" state="uploading" filename="x.pdf"></mud-file-item>);
      await setState(first.root, 'success', first.waitForChanges);
      expect(region(first.root)?.textContent?.trim()).toBe('x.pdf: Încărcat cu succes');

      const second = await render(<mud-file-item state="uploading" filename="y.pdf"></mud-file-item>);
      await setState(second.root, 'uploaded', second.waitForChanges);
      expect(region(second.root)?.textContent?.trim()).toBe('y.pdf: Încărcat cu succes');
    });

    it('does not announce a row that merely changes to uploaded from something else', async () => {
      const { root, waitForChanges } = await render(<mud-file-item state="error" filename="x.pdf"></mud-file-item>);
      await setState(root, 'uploaded', waitForChanges);
      expect(region(root)?.textContent?.trim()).toBe('');
    });

    it('announces an error that has no message of its own, and leaves one with a message to its alert', async () => {
      const bare = await render(<mud-file-item variant="upload" state="uploading" filename="x.pdf"></mud-file-item>);
      await setState(bare.root, 'error', bare.waitForChanges);
      expect(region(bare.root)?.textContent?.trim()).toBe('x.pdf: Eroare la încărcare');

      const withText = await render(
        <mud-file-item variant="upload" state="uploading" filename="y.pdf"></mud-file-item>,
      );
      await setState(withText.root, 'error', withText.waitForChanges, { errorText: 'Fișier prea mare' });
      expect(region(withText.root)?.textContent?.trim()).toBe('');
      const alert = withText.root?.shadowRoot?.querySelector('.error-message');
      expect(alert?.getAttribute('role')).toBe('alert');
      expect(alert?.textContent).toBe('Fișier prea mare');
    });

    it('uses the labels the host gives', async () => {
      const { root, waitForChanges } = await render(
        <mud-file-item
          variant="upload"
          state="uploading"
          filename="x.pdf"
          uploading-label="Uploading"
          success-label="Uploaded"
          error-label="Upload failed"
        ></mud-file-item>,
      );
      await waitForChanges();
      expect(region(root)?.textContent?.trim()).toBe('x.pdf: Uploading');
      await setState(root, 'success', waitForChanges);
      expect(region(root)?.textContent?.trim()).toBe('x.pdf: Uploaded');
    });

    it.each([
      ['en-US', 'Uploading', 'Uploaded successfully', 'Upload failed'],
      ['ru-MD', 'Загрузка', 'Загружено успешно', 'Ошибка загрузки'],
      ['ro-MD', 'Se încarcă', 'Încărcat cu succes', 'Eroare la încărcare'],
    ])('says the copy of the locale %s', async (locale, uploading, success, failed) => {
      const ok = await render(
        <mud-file-item variant="upload" state="uploading" filename="x.pdf" locale={locale}></mud-file-item>,
      );
      await ok.waitForChanges();
      expect(region(ok.root)?.textContent?.trim()).toBe(`x.pdf: ${uploading}`);
      await setState(ok.root, 'success', ok.waitForChanges);
      expect(region(ok.root)?.textContent?.trim()).toBe(`x.pdf: ${success}`);

      const bad = await render(
        <mud-file-item variant="upload" state="uploading" filename="y.pdf" locale={locale}></mud-file-item>,
      );
      await setState(bad.root, 'error', bad.waitForChanges);
      expect(region(bad.root)?.textContent?.trim()).toBe(`y.pdf: ${failed}`);
    });

    it('names the progress bar after the file', async () => {
      const { root } = await render(
        <mud-file-item variant="upload" state="uploading" filename="x.pdf" progress={20}></mud-file-item>,
      );
      expect(root?.shadowRoot?.querySelector('.progress')?.getAttribute('aria-label')).toBe('x.pdf: Se încarcă');
    });
  });

  describe('upload variant', () => {
    const query = (root: Element | null | undefined, selector: string) => root?.shadowRoot?.querySelector(selector);

    it('puts the state before the name and keeps the remove button while uploading', async () => {
      const { root } = await render(
        <mud-file-item variant="upload" state="uploading" filename="x.pdf" size={1887436}></mud-file-item>,
      );
      expect(root?.classList.contains('is-upload')).toBe(true);
      expect(query(root, '.leading-status svg.loader .loader-arc')).toBeTruthy();
      expect(query(root, '.trailing .spinner')).toBeNull();
      expect(queryRemove(root)).toBeTruthy();
      expect(query(root, '.bullet')?.textContent?.trim()).toBe('•');
      expect(queryMeta(root)?.textContent).toBe('1,8 MB');
    });

    it('draws the grey "User Uploaded" document icon, the bullet and the size in the resting state', async () => {
      const { root } = await render(
        <mud-file-item
          variant="upload"
          state="uploaded"
          filename="planul-incaperilor.pdf"
          size={1887436}
        ></mud-file-item>,
      );
      expect(query(root, '.leading-status svg.user-glyph .user-glyph-body')).toBeTruthy();
      expect(query(root, '.leading-status svg.user-glyph .user-glyph-lines')).toBeTruthy();
      expect(query(root, '.leading-status img.file-glyph')).toBeNull();
      expect(query(root, '.bullet')?.textContent?.trim()).toBe('•');
      expect(queryMeta(root)?.textContent).toBe('1,8 MB');
      expect(queryRemove(root)).toBeTruthy();
    });

    it('draws a determinate progress bar from the progress prop, clamped to 0-100', async () => {
      const { root } = await render(
        <mud-file-item variant="upload" state="uploading" filename="x" progress={35}></mud-file-item>,
      );
      expect(query(root, '.progress')?.getAttribute('aria-valuenow')).toBe('35');
      // The fill reads its width from a custom property on the host (no inline style in the template).
      expect((root as HTMLElement).style.getPropertyValue('--_progress')).toBe('35%');
      expect(query(root, '.progress-fill')?.getAttribute('style')).toBeNull();

      const over = await render(
        <mud-file-item variant="upload" state="uploading" filename="x" progress={250}></mud-file-item>,
      );
      expect((over.root as HTMLElement).style.getPropertyValue('--_progress')).toBe('100%');
    });

    it('follows later progress updates and drops the property when the progress is unset', async () => {
      const { root, waitForChanges } = await render(
        <mud-file-item variant="upload" state="uploading" filename="x" progress={10}></mud-file-item>,
      );
      (root as unknown as { progress?: number }).progress = 60;
      await waitForChanges();
      expect((root as HTMLElement).style.getPropertyValue('--_progress')).toBe('60%');

      (root as unknown as { progress?: number }).progress = undefined;
      await waitForChanges();
      expect((root as HTMLElement).style.getPropertyValue('--_progress')).toBe('');
    });

    it('is indeterminate without progress', async () => {
      const { root } = await render(<mud-file-item variant="upload" state="uploading" filename="x"></mud-file-item>);
      expect(query(root, '.progress-fill')?.classList.contains('is-indeterminate')).toBe(true);
      expect(query(root, '.progress')?.getAttribute('aria-valuenow')).toBeNull();
    });

    it('shows the success icon first, with no progress bar, and still a remove button', async () => {
      const { root } = await render(<mud-file-item variant="upload" state="success" filename="x"></mud-file-item>);
      expect(query(root, '.leading-status mud-icon')?.getAttribute('name')).toBe('circle-checkmark');
      expect(query(root, '.progress')).toBeNull();
      expect(queryRemove(root)).toBeTruthy();
    });

    it('has no progress bar in the default variant', async () => {
      const { root } = await render(<mud-file-item state="uploading" filename="x" progress={50}></mud-file-item>);
      expect(query(root, '.progress')).toBeNull();
      expect(query(root, '.trailing .spinner')).toBeTruthy();
    });
  });

  describe('system variant', () => {
    it('defaults to the default variant', async () => {
      const { root } = await render(<mud-file-item filename="x.pdf"></mud-file-item>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.classList.contains('is-system')).toBe(false);
      expect(root?.shadowRoot?.querySelector('.system-glyph')).toBeNull();
    });

    it('renders the document glyph and the issued / issuer info row', async () => {
      const { root } = await render(
        <mud-file-item
          variant="system"
          filename="Certificat"
          issuedLabel="Emis"
          issuedOn="12.03.2026"
          issuer="EVO"
        ></mud-file-item>,
      );
      const sr = root?.shadowRoot;
      expect(root?.classList.contains('is-system')).toBe(true);
      expect(sr?.querySelector('.system-glyph')).toBeTruthy();
      expect(sr?.querySelector('.file-glyph')).toBeNull();
      expect(sr?.querySelector('.info')?.textContent).toContain('Emis');
      expect(sr?.querySelector('.info-value')?.textContent).toBe('12.03.2026');
      expect(sr?.querySelector('.info-dot')).toBeTruthy();
      expect(sr?.querySelector('.info')?.textContent).toContain('EVO');
    });

    it('omits the size meta and the separator when only the issuer is set', async () => {
      const { root } = await render(
        <mud-file-item variant="system" filename="x" size={1000} issuer="EVO"></mud-file-item>,
      );
      const sr = root?.shadowRoot;
      expect(sr?.querySelector('.meta')).toBeNull();
      expect(sr?.querySelector('.info-dot')).toBeNull();
      expect(sr?.querySelector('.info-label')?.textContent).toBe('EVO');
    });

    it('shows a check mark instead of the remove button only on the selected option', async () => {
      const idle = await render(<mud-file-item variant="system" selectable filename="x"></mud-file-item>);
      expect(idle.root?.shadowRoot?.querySelector('.status-selected')).toBeNull();
      expect(queryRemove(idle.root)).toBeNull();

      const picked = await render(<mud-file-item variant="system" selectable selected filename="x"></mud-file-item>);
      const check = picked.root?.shadowRoot?.querySelector('mud-icon.status-selected');
      expect(check?.getAttribute('name')).toBe('circle-checkmark');
      expect(picked.root?.classList.contains('is-selected')).toBe(true);
      expect(queryRemove(picked.root)).toBeNull();
    });

    it('does not show the check mark when not selectable, even if selected is set', async () => {
      const { root } = await render(<mud-file-item variant="system" selected filename="x"></mud-file-item>);
      expect(root?.shadowRoot?.querySelector('.status-selected')).toBeNull();
    });

    it('keeps the remove button working', async () => {
      const onRemove = vi.fn();
      const { root } = await render(
        <mud-file-item variant="system" filename="x" onMudRemove={onRemove}></mud-file-item>,
      );
      (queryRemove(root) as HTMLButtonElement).click();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });
});

describeLocales<FileItemMessages>('mud-file-item', FILE_ITEM_MESSAGES, {
  render: async (props, ancestorLang) => {
    // An uploading upload-row: it has the remove button and the progress bar, which carries the uploading copy.
    const attrs: Record<string, string> = { filename: 'x.pdf', variant: 'upload', state: 'uploading' };
    if (props.locale !== undefined) attrs.locale = String(props.locale);
    if (props.removeLabel !== undefined) attrs['remove-label'] = String(props.removeLabel);
    if (props.uploadingLabel !== undefined) attrs['uploading-label'] = String(props.uploadingLabel);
    const { root } = await render(
      <mud-file-item {...attrs}></mud-file-item>,
      ancestorLang ? { stageAttrs: { lang: ancestorLang } } : undefined,
    );
    return root as Element;
  },
  read: (host, key) => {
    if (key === 'removeLabel')
      return host.shadowRoot?.querySelector('button.remove')?.getAttribute('aria-label') ?? null;
    // The progress bar is named "<file name>: <uploading copy>".
    if (key === 'uploadingLabel')
      return (
        host.shadowRoot
          ?.querySelector('.progress')
          ?.getAttribute('aria-label')
          ?.replace(/^x\.pdf: /, '') ?? null
      );
    return null;
  },
  overrides: { removeLabel: 'removeLabel', uploadingLabel: 'uploadingLabel' },
  unreachable: {
    successLabel:
      'said in the live region only after a state change (uploading to success) — covered by the "state announcements" tests, per locale',
    errorLabel:
      'said in the live region only after a state change (to error without a message) — covered by the "state announcements" tests, per locale',
    sizeUnitBytes:
      'the unit renders merged with the formatted number ("512 B"), never isolated — covered by the component’s own size-formatting tests',
    sizeUnitKB:
      'the unit renders merged with the formatted number ("2.0 KB"), never isolated — covered by the component’s own size-formatting tests',
    sizeUnitMB:
      'the unit renders merged with the formatted number, never isolated — covered by the component’s own size-formatting tests',
    sizeUnitGB:
      'the unit renders merged with the formatted number, never isolated — covered by the component’s own size-formatting tests',
  },
});
