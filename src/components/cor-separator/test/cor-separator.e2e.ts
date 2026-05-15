import { newE2EPage } from '@stencil/core/testing';

describe('cor-separator', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-separator></cor-separator>');

    const element = await page.find('cor-separator');
    expect(element).toHaveClass('hydrated');
  });
});
