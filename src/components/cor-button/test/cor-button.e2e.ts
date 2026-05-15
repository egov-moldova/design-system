import { newE2EPage } from '@stencil/core/testing';

import { BUTTON_TAGS } from '../cor-button.constants';

describe('cor-button', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-button><button>Button</button></cor-button>');
    await page.waitForChanges();

    const element = await page.find('cor-button');

    expect(element).toHaveClass('hydrated');
  });

  describe('should render allowed elements', () => {
    test.each(BUTTON_TAGS)('should render element %s', async tag => {
      if (tag !== 'input') {
        const page = await newE2EPage();
        await page.setContent(`<cor-button><${tag}>Hello world</${tag}></cor-button>`);
        await page.waitForChanges();

        const element = await page.find('cor-button');

        expect(element.shadowRoot).toBeTruthy();
        expect(element.shadowRoot.innerHTML).toEqual('<slot></slot>');
      }
    });
  });

  it('should render not allowed elements', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-button><p>Button</p></cor-button>');
    await page.waitForChanges();

    const element = await page.find('cor-button');

    expect(element.shadowRoot).toBeTruthy();
    expect(element.shadowRoot.innerHTML).toEqual('p is invalid. This component only accepts button, a');
  });

  it('should render with icon element', async () => {
    const page = await newE2EPage();
    await page.setContent(
      '<cor-button name="arrow-down"><button><cor-icon name="arrow-down"></cor-icon>Button</button></cor-button>',
    );
    await page.waitForChanges();

    const element = await page.find('cor-button');
    const icon = await element.find('cor-icon');

    expect(icon).toBeTruthy();
    expect(icon.getAttribute('name')).toBe('arrow-down');
    expect(element.textContent).toContain('Button');
  });
});
