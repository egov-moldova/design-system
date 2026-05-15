import { newE2EPage } from '@stencil/core/testing';

import { TEXT_TAGS } from '../cor-typography.constants';

describe('cor-typography', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-typography></cor-typography>');
    await page.waitForChanges();

    const element = await page.find('cor-typography');

    expect(element).toHaveClass('hydrated');
  });

  describe('should render allowed elements', () => {
    test.each(TEXT_TAGS)('should render element %s', async tag => {
      const page = await newE2EPage();
      await page.setContent(`<cor-typography><${tag}>Hello world</${tag}></cor-typography>`);
      await page.waitForChanges();

      const element = await page.find('cor-typography');

      expect(element.shadowRoot).toBeTruthy();
      expect(element.shadowRoot.innerHTML).toEqual('<slot></slot>');
    });
  });

  it('should not render invalid tag text', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-typography><a>Hello world</a></cor-typography>');
    await page.waitForChanges();

    const element = await page.find('cor-typography');

    expect(element).toHaveClass('hydrated');
    expect(element.shadowRoot).toBeTruthy();
    expect(element.shadowRoot.innerHTML).toEqual(
      'a is invalid. This component only accepts p, div, span, h1, h2, h3, h4, h5, h6',
    );
  });
});
