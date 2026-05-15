import { newSpecPage } from '@stencil/core/testing';

import { CorTooltip } from '../cor-tooltip';

describe('cor-tooltip', () => {
  it('renders with current default props', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip></cor-tooltip>`,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.getAttribute('placement')).toBe('top');
    expect(page.root?.getAttribute('trigger')).toBe('hover');
    expect(page.root?.classList.contains('is-visible')).toBe(false);
    expect(page.root?.classList.contains('has-arrow')).toBe(true);
    expect(page.root?.classList.contains('is-interactive')).toBe(false);

    const container = page.root?.shadowRoot?.querySelector('.tooltip-container') as HTMLElement | null;
    expect(container).toBeTruthy();
    expect(container?.getAttribute('role')).toBe('tooltip');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
    expect(container?.style.maxWidth).toBe('280px');
  });

  it('renders trigger slot', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip><button slot="trigger">Click</button></cor-tooltip>`,
    });

    const trigger = page.root?.shadowRoot?.querySelector('.tooltip-trigger');
    expect(trigger).toBeTruthy();
    expect(page.root?.querySelector('[slot="trigger"]')?.textContent).toBe('Click');
  });

  it('renders title, description, and default content slots', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `
        <cor-tooltip>
          <span slot="title">Tooltip title</span>
          <span slot="description">Tooltip description</span>
          Tooltip body
        </cor-tooltip>
      `,
    });

    const header = page.root?.shadowRoot?.querySelector('.tooltip-header');
    const title = page.root?.shadowRoot?.querySelector('.tooltip-title');
    const description = page.root?.shadowRoot?.querySelector('.tooltip-description');
    const content = page.root?.shadowRoot?.querySelector('.tooltip-content');

    expect(header).toBeTruthy();
    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
    expect(content).toBeTruthy();
  });

  it('shows slot validation error for unsupported title element', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `
        <cor-tooltip>
          <div slot="title">Invalid title</div>
        </cor-tooltip>
      `,
    });

    const error = page.root?.shadowRoot?.querySelector('.slot-error');
    expect(error).toBeTruthy();
    expect(error?.textContent).toContain('div is invalid. This component only accepts cor-typography, cor-icon, span');
  });

  it('shows slot validation error for unsupported trigger element', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `
        <cor-tooltip>
          <input slot="trigger" value="Invalid trigger" />
        </cor-tooltip>
      `,
    });

    const error = page.root?.shadowRoot?.querySelector('.slot-error');
    expect(error).toBeTruthy();
    expect(error?.textContent).toContain(
      'input is invalid. This component only accepts button, a, span, div, cor-button, cor-icon, cor-typography',
    );
  });

  it('reflects placement attribute for new placement options', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip placement="right-bottom"></cor-tooltip>`,
    });

    expect(page.root?.getAttribute('placement')).toBe('right-bottom');
  });

  it('reflects trigger attribute for supported trigger options', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip trigger="focus"></cor-tooltip>`,
    });

    expect(page.root?.getAttribute('trigger')).toBe('focus');
  });

  it('reflects interactive and disabled boolean props', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip interactive disabled></cor-tooltip>`,
    });

    expect(page.root?.getAttribute('interactive')).not.toBeNull();
    expect(page.root?.getAttribute('disabled')).not.toBeNull();
    expect(page.root?.classList.contains('is-interactive')).toBe(true);
  });

  it('applies maxWidth style from prop', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip max-width="320px"></cor-tooltip>`,
    });

    const container = page.root?.shadowRoot?.querySelector('.tooltip-container') as HTMLElement | null;
    expect(container?.style.maxWidth).toBe('320px');
  });

  it('stores numeric delay and offset props on the instance', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip show-delay="500" hide-delay="275" offset="12"></cor-tooltip>`,
    });

    expect(page.rootInstance.showDelay).toBe(500);
    expect(page.rootInstance.hideDelay).toBe(275);
    expect(page.rootInstance.offset).toBe(12);
  });

  it('stores flipFallback as false when disabled via attribute', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip flip-fallback="false"></cor-tooltip>`,
    });

    expect(page.rootInstance.flipFallback).toBe(false);
  });

  it('has an id on tooltip container starting with cor-tooltip-', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip></cor-tooltip>`,
    });

    const id = page.root?.shadowRoot?.querySelector('.tooltip-container')?.id;
    expect(id).toBeTruthy();
    expect(id?.startsWith('cor-tooltip-')).toBe(true);
  });

  it('does not render arrow when show-arrow="false"', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip show-arrow="false"></cor-tooltip>`,
    });

    expect(page.root?.classList.contains('has-arrow')).toBe(false);
    const arrow = page.root?.shadowRoot?.querySelector('.tooltip-arrow');
    expect(arrow).toBeNull();
  });

  it('renders arrow by default', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip></cor-tooltip>`,
    });

    const arrow = page.root?.shadowRoot?.querySelector('.tooltip-arrow');
    expect(arrow).toBeTruthy();
  });

  it('is open when open=true and trigger=manual', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip trigger="manual" open></cor-tooltip>`,
    });

    expect(page.root?.classList.contains('is-visible')).toBe(true);
    expect(page.root?.shadowRoot?.querySelector('.tooltip-container')?.getAttribute('aria-hidden')).toBe('false');
  });

  it('keeps manual tooltip closed when disabled even if open=true', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip trigger="manual" open disabled></cor-tooltip>`,
    });

    expect(page.root?.classList.contains('is-visible')).toBe(false);
    expect(page.root?.shadowRoot?.querySelector('.tooltip-container')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not emit duplicate show and hide events when already in the target state', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip></cor-tooltip>`,
    });

    const showSpy = jest.fn();
    const hideSpy = jest.fn();

    page.root?.addEventListener('corTooltipShow', showSpy);
    page.root?.addEventListener('corTooltipHide', hideSpy);

    page.rootInstance['showTooltip']();
    page.rootInstance['showTooltip']();
    page.rootInstance['hideTooltip']();
    page.rootInstance['hideTooltip']();

    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps manual tooltip closed when open is not set', async () => {
    const page = await newSpecPage({
      components: [CorTooltip],
      html: `<cor-tooltip trigger="manual"></cor-tooltip>`,
    });

    expect(page.root?.classList.contains('is-visible')).toBe(false);
    expect(page.root?.shadowRoot?.querySelector('.tooltip-container')?.getAttribute('aria-hidden')).toBe('true');
  });
});
