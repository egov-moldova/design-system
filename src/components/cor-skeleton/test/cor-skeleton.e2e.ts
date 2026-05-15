import { newE2EPage } from '@stencil/core/testing';

describe('cor-skeleton e2e', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-skeleton></cor-skeleton>');

    const element = await page.find('cor-skeleton');
    expect(element).toBeTruthy();
  });

  it('has correct shadow DOM structure', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-skeleton></cor-skeleton>');

    const skeleton = await page.find('cor-skeleton >>> .skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('applies width property', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-skeleton width="250px"></cor-skeleton>');

    const element = await page.find('cor-skeleton');
    const computedStyle = await element.getComputedStyle();
    expect(computedStyle.width).toBe('250px');
  });

  it('applies height property', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-skeleton height="60px"></cor-skeleton>');

    const element = await page.find('cor-skeleton');
    const computedStyle = await element.getComputedStyle();
    expect(computedStyle.height).toBe('60px');
  });

  it('renders with slotted content', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-skeleton><div id="test-content">Test</div></cor-skeleton>');

    const slottedContent = await page.find('cor-skeleton >>> slot');
    expect(slottedContent).toBeTruthy();
  });
});
