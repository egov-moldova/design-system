import { newSpecPage } from '@stencil/core/testing';

import { CorUploadFileItem } from '../cor-upload-file-item';
import { FileItemState } from '../cor-upload-file-item.enums';

describe('cor-upload-file-item', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf"></cor-upload-file-item>`,
    });
    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('file-state')).toBe(FileItemState.UPLOADING);
  });

  it('reflects with-frame attribute', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" with-frame></cor-upload-file-item>`,
    });
    expect(page.root?.getAttribute('with-frame')).not.toBeNull();
  });

  it('reflects card attribute', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" card></cor-upload-file-item>`,
    });
    expect(page.root?.getAttribute('card')).not.toBeNull();
  });

  it('shows percentage when uploading', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploading" progress="55"></cor-upload-file-item>`,
    });
    const percentage = page.root?.shadowRoot?.querySelector('.percentage');
    expect(percentage?.textContent).toBe('55%');
  });

  it('does not show percentage when uploaded', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploaded" progress="100"></cor-upload-file-item>`,
    });
    const percentage = page.root?.shadowRoot?.querySelector('.percentage');
    expect(percentage).toBeNull();
  });

  it('shows error tooltip in error state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="error" error-message="Too large"></cor-upload-file-item>`,
    });
    const tooltip = page.root?.shadowRoot?.querySelector('cor-tooltip');
    expect(tooltip).toBeTruthy();
  });

  it('does not show error tooltip when message empty', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="error"></cor-upload-file-item>`,
    });
    const tooltip = page.root?.shadowRoot?.querySelector('cor-tooltip');
    expect(tooltip).toBeNull();
  });

  it('emits corRemoveFile event on remove button click', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf"></cor-upload-file-item>`,
    });
    const handler = jest.fn();
    page.root?.addEventListener('corRemoveFile', handler);

    const btn = page.root?.shadowRoot?.querySelector('.remove-btn') as HTMLButtonElement;
    btn?.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ fileName: 'test.pdf' });
  });

  it('clamps progress to 0–100', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploading" progress="150"></cor-upload-file-item>`,
    });
    const percentage = page.root?.shadowRoot?.querySelector('.percentage');
    expect(percentage?.textContent).toBe('100%');
  });

  it('shows progress bar in uploading state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploading"></cor-upload-file-item>`,
    });
    const progressBar = page.root?.shadowRoot?.querySelector('cor-progress-bar');
    expect(progressBar).toBeTruthy();
  });

  it('hides progress bar in uploaded state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploaded"></cor-upload-file-item>`,
    });
    const progressBar = page.root?.shadowRoot?.querySelector('cor-progress-bar');
    expect(progressBar).toBeNull();
  });

  it('renders file icon for image file without previewUrl', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.jpg" file-state="uploaded"></cor-upload-file-item>`,
    });
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:attachment');
  });

  it('shows file icon when previewUrl provided for non-image file', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" previewUrl="https://example.com/preview.jpg" file-state="uploaded"></cor-upload-file-item>`,
    });
    const previewImg = page.root?.shadowRoot?.querySelector('.preview-img');
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(previewImg).toBeNull();
    expect(icon).toBeTruthy();
  });

  it('shows correct icon for different file extensions', async () => {
    const testCases = [
      { file: 'document.pdf', expectedIcon: 'carbon:PDF' },
      { file: 'spreadsheet.xlsx', expectedIcon: 'carbon:CSV' },
      { file: 'presentation.pptx', expectedIcon: 'carbon:attachment' },
      { file: 'archive.zip', expectedIcon: 'carbon:ZIP' },
      { file: 'audio.mp3', expectedIcon: 'carbon:audio-console' },
      { file: 'video.mp4', expectedIcon: 'carbon:video' },
      { file: 'unknown.xyz', expectedIcon: 'carbon:attachment' },
    ];

    for (const testCase of testCases) {
      const page = await newSpecPage({
        components: [CorUploadFileItem],
        html: `<cor-upload-file-item file-name="${testCase.file}" file-state="uploaded"></cor-upload-file-item>`,
      });
      const icon = page.root?.shadowRoot?.querySelector('cor-icon');
      expect(icon?.getAttribute('name')).toBe(testCase.expectedIcon);
    }
  });

  it('shows default icon for file without extension', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="filename" file-state="uploaded"></cor-upload-file-item>`,
    });
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:attachment');
  });

  it('positions remove button absolutely in card mode', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" card></cor-upload-file-item>`,
    });
    const host = page.root;
    const removeBtn = page.root?.shadowRoot?.querySelector('.remove-btn') as HTMLElement;

    expect(host?.classList.contains('card')).toBe(true);
    expect(removeBtn).toBeTruthy();
    expect(host?.classList.contains('card')).toBe(true);
  });

  it('shows remove button on hover in card mode', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" card></cor-upload-file-item>`,
    });
    const removeBtn = page.root?.shadowRoot?.querySelector('.remove-btn') as HTMLElement;

    // Simulate hover
    page.root?.dispatchEvent(new Event('mouseover'));
    await page.waitForChanges();

    expect(removeBtn).toBeTruthy();
    expect(page.root?.classList.contains('card')).toBe(true);
  });

  it('has correct aria-label on remove button', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf"></cor-upload-file-item>`,
    });
    const removeBtn = page.root?.shadowRoot?.querySelector('.remove-btn') as HTMLButtonElement;
    expect(removeBtn?.getAttribute('aria-label')).toBe('Remove test.pdf');
  });

  it('has title attribute on filename for overflow', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="very-long-filename-that-might-overflow.pdf"></cor-upload-file-item>`,
    });
    const filename = page.root?.shadowRoot?.querySelector('.filename') as HTMLSpanElement;
    expect(filename?.getAttribute('title')).toBe('very-long-filename-that-might-overflow.pdf');
  });

  it('handles empty filename gracefully', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name=""></cor-upload-file-item>`,
    });
    const filename = page.root?.shadowRoot?.querySelector('.filename') as HTMLSpanElement;
    expect(filename?.textContent).toBe('');
    expect(filename?.getAttribute('title')).toBe('');
  });

  it('clamps negative progress values to 0', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploading" progress="-50"></cor-upload-file-item>`,
    });
    const percentage = page.root?.shadowRoot?.querySelector('.percentage');
    expect(percentage?.textContent).toBe('0%');
  });

  it('does not show error tooltip when errorMessage provided but not in error state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploaded" error-message="This is an error"></cor-upload-file-item>`,
    });
    const tooltip = page.root?.shadowRoot?.querySelector('cor-tooltip');
    expect(tooltip).toBeNull();
  });

  it('shows loading dots in uploading state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="uploading"></cor-upload-file-item>`,
    });
    const loadingDots = page.root?.shadowRoot?.querySelector('cor-loading-dots');
    expect(loadingDots).toBeTruthy();
  });

  it('shows warning icon in error state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="error"></cor-upload-file-item>`,
    });
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBe('carbon:warning--filled');
    expect(icon?.getAttribute('color')).toBe('system-error-icon');
  });

  it('applies correct CSS classes for different states', async () => {
    const testCases = [
      { state: 'uploading', expectedClass: 'is-uploading' },
      { state: 'uploaded', expectedClass: 'is-uploaded' },
      { state: 'error', expectedClass: 'is-error' },
    ];

    for (const testCase of testCases) {
      const page = await newSpecPage({
        components: [CorUploadFileItem],
        html: `<cor-upload-file-item file-name="test.pdf" file-state="${testCase.state}"></cor-upload-file-item>`,
      });
      const host = page.root;
      expect(host?.classList.contains(testCase.expectedClass)).toBe(true);
    }
  });

  it('applies card-icon-bg styling in card mode for uploaded state', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.jpg" previewUrl="https://example.com/preview.jpg" file-state="uploaded" card></cor-upload-file-item>`,
    });
    const cardIconBg = page.root?.shadowRoot?.querySelector('.card-icon-bg');
    expect(cardIconBg).toBeTruthy();
  });

  it('applies error styling to card-icon-bg in error state with card mode', async () => {
    const page = await newSpecPage({
      components: [CorUploadFileItem],
      html: `<cor-upload-file-item file-name="test.pdf" file-state="error" card></cor-upload-file-item>`,
    });
    const host = page.root;
    const cardIconBg = page.root?.shadowRoot?.querySelector('.card-icon-bg');

    expect(host?.classList.contains('is-error')).toBe(true);
    expect(cardIconBg).toBeTruthy();
  });
});
