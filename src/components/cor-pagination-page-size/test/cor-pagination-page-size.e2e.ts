import { newE2EPage } from '@stencil/core/testing';

describe('cor-pagination-page-size e2e', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent(`<cor-pagination-page-size></cor-pagination-page-size>`);
    const element = await page.find('cor-pagination-page-size');
    expect(element).toHaveClass('hydrated');
  });

  it('renders a nested cor-select with the provided options', async () => {
    const page = await newE2EPage();
    await page.setContent(`<cor-pagination-page-size page-size="12" page-sizes="9,12,24"></cor-pagination-page-size>`);
    const nestedSelect = await page.find('cor-pagination-page-size >>> cor-select');
    const options = await page.findAll('cor-pagination-page-size >>> cor-select >>> option');

    expect(nestedSelect).not.toBeNull();
    expect(options.length).toBe(3);
  });
});
