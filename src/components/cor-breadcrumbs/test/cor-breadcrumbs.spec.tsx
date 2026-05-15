import { newSpecPage } from '@stencil/core/testing';

import { CorBreadcrumbs } from '../cor-breadcrumbs';
import { CorLink } from '../../cor-link/cor-link';
import { CorBreadcrumbsEllipsis } from '../../cor-breadcrumbs-ellipsis/cor-breadcrumbs-ellipsis';

describe('cor-breadcrumbs', () => {
  it('renders nav with default aria-label', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs></cor-breadcrumbs>`,
    });
    const nav = page.root?.shadowRoot?.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumbs');
  });

  it('renders ol inside nav', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs></cor-breadcrumbs>`,
    });
    const ol = page.root?.shadowRoot?.querySelector('ol');
    expect(ol).not.toBeNull();
  });

  it('applies custom nav-label via navLabel prop', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs nav-label="Site navigation"></cor-breadcrumbs>`,
    });
    const nav = page.root?.shadowRoot?.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Site navigation');
  });

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs disabled></cor-breadcrumbs>`,
    });
    expect(page.root?.getAttribute('disabled')).toBe('');
  });

  it('propagates disabled only to cor-link and cor-breadcrumbs-ellipsis, not plain elements', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs disabled><cor-link href="/home">Home</cor-link><cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis><span>Current</span></cor-breadcrumbs>`,
    });
    await page.waitForChanges();
    const children = Array.from(page.root?.children ?? []) as HTMLElement[];
    expect(children[0].hasAttribute('disabled')).toBe(true);
    expect(children[1].hasAttribute('disabled')).toBe(true);
    expect(children[2].hasAttribute('disabled')).toBe(false);
  });

  it('removes disabled from interactive children when disabled is false', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs><cor-link href="/home">Home</cor-link></cor-breadcrumbs>`,
    });
    await page.waitForChanges();
    const child = page.root?.children[0] as HTMLElement;
    expect(child.hasAttribute('disabled')).toBe(false);
  });

  it('contains a slot element', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs></cor-breadcrumbs>`,
    });
    const slot = page.root?.shadowRoot?.querySelector('slot');
    expect(slot).not.toBeNull();
  });

  it('applies aria-current="page" only to the last cor-link, not plain elements', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs>
          <cor-link href="/home">Home</cor-link>
          <cor-link href="/docs">Docs</cor-link>
          <span>Current</span>
        </cor-breadcrumbs>
      `,
    });
    await page.waitForChanges();

    const children = page.root?.children;
    expect(children?.[0].hasAttribute('aria-current')).toBe(false);
    expect(children?.[1].getAttribute('aria-current')).toBe('page');
    expect(children?.[2].hasAttribute('aria-current')).toBe(false);
  });

  it('does not set aria-current when there are no cor-link children', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs>
          <span>Only</span>
        </cor-breadcrumbs>
      `,
    });
    await page.waitForChanges();
    const child = page.root?.children[0] as HTMLElement;
    expect(child.hasAttribute('aria-current')).toBe(false);
  });

  it('emits corBreadcrumbItemClick when a link is clicked', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs>
          <cor-link href="/home" value="home-val">Home</cor-link>
          <span>Current</span>
        </cor-breadcrumbs>
      `,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corBreadcrumbItemClick', spy);

    const link = page.root?.querySelector('cor-link');
    link?.click();
    await page.waitForChanges();

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'home-val' });
  });

  it('emits corBreadcrumbItemClick when cor-breadcrumbs-ellipsis emits corEllipsisItemClick', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs>
          <cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>
        </cor-breadcrumbs>
      `,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corBreadcrumbItemClick', spy);

    const ellipsis = page.root?.querySelector('cor-breadcrumbs-ellipsis');
    ellipsis?.dispatchEvent(
      new CustomEvent('corEllipsisItemClick', {
        detail: { value: 'ellipsis-val' },
        bubbles: true,
        composed: true,
      }),
    );
    await page.waitForChanges();

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'ellipsis-val' });
  });

  it('does not emit corBreadcrumbItemClick for clicks outside the component', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbs, CorLink, CorBreadcrumbsEllipsis],
      html: `
        <div>
          <cor-breadcrumbs>
            <cor-link href="/home" value="home-val">Home</cor-link>
          </cor-breadcrumbs>
          <cor-link href="/other" value="other-val">Other</cor-link>
        </div>
      `,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corBreadcrumbItemClick', spy);

    const outsideLink = page.body?.querySelector('div > cor-link') as HTMLElement;
    outsideLink?.click();
    await page.waitForChanges();

    expect(spy).not.toHaveBeenCalled();
  });
});
