import { newE2EPage } from '@stencil/core/testing';

describe('cor-icon', () => {
  it('renders cor-icon', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-icon></cor-icon>');

    const element = await page.find('cor-icon');
    expect(element).toHaveClass('hydrated');
  });

  it('renders interactive attributes', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-icon interactive="true"></cor-icon>');

    const element = await page.find('cor-icon');
    expect(element).toHaveClass('hydrated');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.getAttribute('role')).toBe('button');
  });
});
