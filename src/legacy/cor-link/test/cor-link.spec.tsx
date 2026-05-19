import { newSpecPage } from '@stencil/core/testing';

import { CorLink } from '../cor-link';
import { LinkSize, LinkState } from '../cor-link.enums';

describe('cor-link', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link></cor-link>`,
    });
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('#');
    expect(anchor?.getAttribute('target')).toBe('_self');
    expect(anchor?.getAttribute('aria-disabled')).toBeNull();
  });

  it('reflects size and state attributes', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link size="sm" state="disabled"></cor-link>`,
    });
    expect(page.root?.getAttribute('size')).toBe(LinkSize.SM);
    expect(page.root?.getAttribute('state')).toBe(LinkState.DISABLED);
  });

  it('renders slotted label text', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link>Click me</cor-link>`,
    });
    const label = page.root?.shadowRoot?.querySelector('.link__label');
    expect(label).not.toBeNull();
    const slot = label?.querySelector('slot:not([name])');
    expect(slot).not.toBeNull();
  });

  it('disabled state removes href and target, sets aria-disabled', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link state="disabled" href="/go" target="_blank"></cor-link>`,
    });
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor?.getAttribute('href')).toBeNull();
    expect(anchor?.getAttribute('target')).toBeNull();
    expect(anchor?.getAttribute('aria-disabled')).toBe('true');
    expect(anchor?.tabIndex).toBe(-1);
  });

  it('adds rel=noopener noreferrer for target=_blank', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link target="_blank" href="/external"></cor-link>`,
    });
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not add rel for target=_self', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link target="_self" href="/internal"></cor-link>`,
    });
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor?.getAttribute('rel')).toBeNull();
  });

  it('icon-only mode renders icon slot and no label when no default slot content', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link aria-label="Go to page"><span slot="icon">Icon</span></cor-link>`,
    });
    await page.waitForChanges();
    const label = page.root?.shadowRoot?.querySelector('.link__label');
    const iconOnly = page.root?.shadowRoot?.querySelector('.link__icon--only');
    expect(label).toBeNull();
    expect(iconOnly).not.toBeNull();
  });

  it('icon-only mode applies aria-label to anchor when no default slot content', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link aria-label="External link"><span slot="icon">Icon</span></cor-link>`,
    });
    await page.waitForChanges();
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor?.getAttribute('aria-label')).toBe('External link');
  });

  it('renders skeleton with skeleton prop', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link skeleton></cor-link>`,
    });
    const skeleton = page.root?.shadowRoot?.querySelector('cor-skeleton');
    expect(skeleton).not.toBeNull();
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor).toBeNull();
  });

  it('icon-only skeleton applies is-icon-only-skeleton class when iconOnly prop is true', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link skeleton icon-only></cor-link>`,
    });
    await page.waitForChanges();
    expect(page.root?.classList.contains('is-icon-only-skeleton')).toBe(true);
    const skeleton = page.root?.shadowRoot?.querySelector('cor-skeleton');
    expect(skeleton).not.toBeNull();
  });

  it('renders icon-only slot when icon slot has content and no default content', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link aria-label="Icon only"><span slot="icon">Icon</span></cor-link>`,
    });
    await page.waitForChanges();
    const iconOnly = page.root?.shadowRoot?.querySelector('.link__icon--only');
    const leftIcon = page.root?.shadowRoot?.querySelector('.link__icon--left');
    const rightIcon = page.root?.shadowRoot?.querySelector('.link__icon--right');
    expect(iconOnly).not.toBeNull();
    expect(leftIcon).toBeNull();
    expect(rightIcon).toBeNull();
  });

  it('icon slots render when icon content is provided with default slot content', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link>
        <span slot="icon-left">←</span>
        Label text
        <span slot="icon-right">→</span>
      </cor-link>`,
    });
    await page.waitForChanges();
    const leftSlot = page.root?.shadowRoot?.querySelector('.link__icon--left slot');
    const rightSlot = page.root?.shadowRoot?.querySelector('.link__icon--right slot');
    expect(leftSlot).not.toBeNull();
    expect(rightSlot).not.toBeNull();
    expect(leftSlot?.getAttribute('name')).toBe('icon-left');
    expect(rightSlot?.getAttribute('name')).toBe('icon-right');
  });

  it('text skeleton does not apply is-icon-only-skeleton class when iconOnly is false', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link skeleton></cor-link>`,
    });
    await page.waitForChanges();
    expect(page.root?.classList.contains('is-icon-only-skeleton')).toBe(false);
  });

  it('reflects skeleton attribute', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link skeleton></cor-link>`,
    });
    expect(page.root?.getAttribute('skeleton')).toBe('');
  });

  it('reflects iconOnly attribute', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link icon-only></cor-link>`,
    });
    expect(page.root?.getAttribute('icon-only')).toBe('');
  });

  it('iconOnly prop forces icon-only mode even with default slot content', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link icon-only aria-label="Icon only"><span slot="icon">Icon</span>Label text</cor-link>`,
    });
    await page.waitForChanges();
    const iconOnly = page.root?.shadowRoot?.querySelector('.link__icon--only');
    const label = page.root?.shadowRoot?.querySelector('.link__label');
    expect(iconOnly).not.toBeNull();
    expect(label).toBeNull();
  });

  it('disabled prop reflects as [disabled] attribute', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link disabled></cor-link>`,
    });
    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('disabled=true sets state to disabled and isDisabled is true', async () => {
    const page = await newSpecPage({
      components: [CorLink],
      html: `<cor-link disabled href="/go"></cor-link>`,
    });
    await page.waitForChanges();
    expect(page.root?.getAttribute('state')).toBe(LinkState.DISABLED);
    const anchor = page.root?.shadowRoot?.querySelector('a');
    expect(anchor?.getAttribute('aria-disabled')).toBe('true');
    expect(anchor?.getAttribute('href')).toBeNull();
  });
});
