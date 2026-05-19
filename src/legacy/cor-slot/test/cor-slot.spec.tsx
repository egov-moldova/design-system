import { newSpecPage } from '@stencil/core/testing';
import { CorSlot } from '../cor-slot';

describe('cor-slot', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('defaults to lg size', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    expect(page.root?.getAttribute('size')).toBe('lg');
  });

  it('renders with sm size', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot size="sm"></cor-slot>`,
    });
    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('reflects size attribute', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot size="sm"></cor-slot>`,
    });
    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('renders slot header', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const header = page.root?.shadowRoot?.querySelector('.slot__header');
    expect(header).toBeTruthy();
  });

  it('renders slot title', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const title = page.root?.shadowRoot?.querySelector('.slot__title');
    expect(title).toBeTruthy();
  });

  it('renders cor-icon in title', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon).toBeTruthy();
  });

  it('renders title typography with body-sm-semibold variant', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const typography = page.root?.shadowRoot?.querySelector('cor-typography[slot="title"]');
    expect(typography?.getAttribute('variant')).toBe('body-sm-semibold');
  });

  it('renders title text "Slot title"', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const typography = page.root?.shadowRoot?.querySelector('cor-typography[slot="title"]');
    expect(typography?.textContent?.trim()).toBe('Slot title');
  });

  it('renders description when size is lg', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot size="lg"></cor-slot>`,
    });
    const description = page.root?.shadowRoot?.querySelector('cor-typography[slot="description"]');
    expect(description).toBeTruthy();
  });

  it('does not render description when size is sm', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot size="sm"></cor-slot>`,
    });
    const description = page.root?.shadowRoot?.querySelector('cor-typography[slot="description"]');
    expect(description).toBeNull();
  });

  it('renders description with body-xs variant when size is lg', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot size="lg"></cor-slot>`,
    });
    const description = page.root?.shadowRoot?.querySelector('cor-typography[slot="description"]');
    expect(description?.getAttribute('variant')).toBe('body-xs');
  });

  it('renders description text when size is lg', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot size="lg"></cor-slot>`,
    });
    const description = page.root?.shadowRoot?.querySelector('cor-typography[slot="description"]');
    expect(description?.textContent).toContain('Optional placeholder component');
  });

  it('renders icon with currentColor', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('color')).toBe('currentColor');
  });

  it('renders icon with CUT_OUT name', async () => {
    const page = await newSpecPage({
      components: [CorSlot],
      html: `<cor-slot></cor-slot>`,
    });
    const icon = page.root?.shadowRoot?.querySelector('cor-icon');
    expect(icon?.getAttribute('name')).toBeTruthy();
  });
});
