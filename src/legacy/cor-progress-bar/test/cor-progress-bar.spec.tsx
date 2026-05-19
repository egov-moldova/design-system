import { newSpecPage } from '@stencil/core/testing';
import { CorProgressBar } from '../cor-progress-bar';
import { ProgressBarSize, ProgressBarType } from '../cor-progress-bar.enums';

describe('cor-progress-bar', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders with default props', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    expect(root).toBeTruthy();
    expect(root?.shadowRoot).toBeTruthy();
  });

  it('renders the track element', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track).toBeTruthy();
  });

  it('renders the fill element inside the track', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const fill = root?.shadowRoot?.querySelector('.track .fill');
    expect(fill).toBeTruthy();
  });

  // ─── Default prop values ──────────────────────────────────────────────────

  it('defaults to type="default"', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    expect(root?.getAttribute('type')).toBe(ProgressBarType.DEFAULT);
  });

  it('defaults to size="lg"', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    expect(root?.getAttribute('size')).toBe(ProgressBarSize.LG);
  });

  it('defaults value to 0', async () => {
    const page = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const fill = page.root?.shadowRoot?.querySelector<HTMLElement>('.fill');
    expect(fill?.style.width).toBe('0%');
  });

  // ─── Prop reflection ──────────────────────────────────────────────────────
  it('reflects type attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar type="${ProgressBarType.ERROR}"></cor-progress-bar>`,
    });

    expect(root?.getAttribute('type')).toBe('error');
  });

  it('reflects size attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar size="${ProgressBarSize.SM}"></cor-progress-bar>`,
    });

    expect(root?.getAttribute('size')).toBe('sm');
  });

  it('reflects show-percentage attribute', async () => {
    const page = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar show-percentage></cor-progress-bar>`,
    });

    expect(page.root?.hasAttribute('show-percentage')).toBe(true);
  });

  // ─── Fill width (value prop) ──────────────────────────────────────────────

  it('sets fill width to match value', async () => {
    const page = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="60"></cor-progress-bar>',
    });

    const fill = page.root?.shadowRoot?.querySelector<HTMLElement>('.fill');
    expect(fill?.style.width).toBe('60%');
  });

  it('clamps value below 0 to 0%', async () => {
    const page = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="-20"></cor-progress-bar>',
    });

    const fill = page.root?.shadowRoot?.querySelector<HTMLElement>('.fill');
    expect(fill?.style.width).toBe('0%');
  });

  it('clamps value above 100 to 100%', async () => {
    const page = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="150"></cor-progress-bar>',
    });

    const fill = page.root?.shadowRoot?.querySelector<HTMLElement>('.fill');
    expect(fill?.style.width).toBe('100%');
  });

  it('updates fill width when value prop changes', async () => {
    const page = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="20"></cor-progress-bar>',
    });

    const fill = page.root?.shadowRoot?.querySelector<HTMLElement>('.fill');
    expect(fill?.style.width).toBe('20%');

    page.root!.value = 80;
    await page.waitForChanges();

    expect(fill?.style.width).toBe('80%');
  });

  // ─── Label row ────────────────────────────────────────────────────────────

  it('hides label-row when label slot is empty', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const labelRow = root?.shadowRoot?.querySelector('.label-row');
    expect(labelRow?.classList.contains('label-row--hidden')).toBe(true);
  });

  // ─── Percentage display ───────────────────────────────────────────────────

  it('does not render percentage when showPercentage is false', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="50"></cor-progress-bar>',
    });

    const percentage = root?.shadowRoot?.querySelector('.percentage');
    expect(percentage?.classList.contains('percentage')).toBe(undefined);
  });

  it('renders percentage with correct value when showPercentage is true and label slot is filled', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="42" show-percentage><span slot="label">Test</span></cor-progress-bar>',
    });

    const percentage = root?.shadowRoot?.querySelector('.percentage');
    expect(percentage).toBeTruthy();
    expect(percentage?.textContent).toBe('42%');
  });

  it('shows clamped percentage when value is out of range', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="200" show-percentage><span slot="label">Test</span></cor-progress-bar>',
    });

    const percentage = root?.shadowRoot?.querySelector('.percentage');
    expect(percentage?.textContent).toBe('100%');
  });

  it('renders percentage even when label slot is empty if showPercentage is true', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="50" show-percentage></cor-progress-bar>',
    });

    const percentage = root?.shadowRoot?.querySelector('.percentage');
    expect(percentage).toBeTruthy();
    expect(percentage?.textContent).toBe('50%');
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  it('sets role="progressbar" on the track', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('role')).toBe('progressbar');
  });

  it('sets aria-valuenow to the clamped value', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar value="55"></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('aria-valuenow')).toBe('55');
  });

  it('sets aria-valuemin to 0', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('aria-valuemin')).toBe('0');
  });

  it('sets aria-valuemax to 100', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('aria-valuemax')).toBe('100');
  });

  it('uses label slot text content as aria-label when label slot is filled', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar><span slot="label">Uploading files</span></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('aria-label')).toBe('Uploading files');
  });

  it('uses "Progress" for aria-label when label slot is empty', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('aria-label')).toBe('Progress');
  });

  it('uses ariaLabel prop over slot text when both are present', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar aria-label="Custom label"><span slot="label">Slot text</span></cor-progress-bar>',
    });

    const track = root?.shadowRoot?.querySelector('.track');
    expect(track?.getAttribute('aria-label')).toBe('Custom label');
  });

  // ─── Message slot ────────────────────────────────────────────────────────

  it('hides message-wrapper when message slot is empty', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar></cor-progress-bar>',
    });

    const wrapper = root?.shadowRoot?.querySelector('.message-wrapper');
    expect(wrapper?.classList.contains('message-wrapper--hidden')).toBe(true);
  });

  it('renders cor-system-message inside message-wrapper when message slot is filled', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar><span slot="message">Upload failed</span></cor-progress-bar>',
    });

    const wrapper = root?.shadowRoot?.querySelector('.message-wrapper');
    expect(wrapper?.classList.contains('message-wrapper--hidden')).toBe(false);
    const systemMessage = wrapper?.querySelector('cor-system-message');
    expect(systemMessage).toBeTruthy();
  });

  it('passes state="info" to cor-system-message for default type', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar type="${ProgressBarType.DEFAULT}"><span slot="message">Info text</span></cor-progress-bar>`,
    });

    const systemMessage = root?.shadowRoot?.querySelector('.message-wrapper cor-system-message');
    expect(systemMessage?.getAttribute('state')).toBe('info');
  });

  it('passes state="alert" to cor-system-message for error type', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar type="${ProgressBarType.ERROR}"><span slot="message">Error text</span></cor-progress-bar>`,
    });

    const systemMessage = root?.shadowRoot?.querySelector('.message-wrapper cor-system-message');
    expect(systemMessage?.getAttribute('state')).toBe('alert');
  });

  // ─── All sizes ────────────────────────────────────────────────────────────

  it.each([ProgressBarSize.LG, ProgressBarSize.MD, ProgressBarSize.SM])('reflects size="%s" attribute', async size => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar size="${size}"></cor-progress-bar>`,
    });

    expect(root?.getAttribute('size')).toBe(size);
  });

  // ─── All types ────────────────────────────────────────────────────────────

  it.each([ProgressBarType.DEFAULT, ProgressBarType.ERROR])('reflects type="%s" attribute', async type => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: `<cor-progress-bar type="${type}"></cor-progress-bar>`,
    });

    expect(root?.getAttribute('type')).toBe(type);
  });

  // ─── Hidden attribute ─────────────────────────────────────────────────────

  it('respects [hidden] attribute', async () => {
    const { root } = await newSpecPage({
      components: [CorProgressBar],
      html: '<cor-progress-bar hidden></cor-progress-bar>',
    });

    expect(root?.hasAttribute('hidden')).toBe(true);
  });
});
