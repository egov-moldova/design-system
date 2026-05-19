import { newE2EPage } from '@stencil/core/testing';

describe('cor-tabs', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent(
      '<cor-tabs tab-style="style-1" size="md" value="tab-1">' +
        '<cor-tab-button value="tab-1">Tab 1</cor-tab-button>' +
        '<cor-tab-button value="tab-2">Tab 2</cor-tab-button>' +
        '<cor-tab-button value="tab-3">Tab 3</cor-tab-button>' +
        '</cor-tabs>',
    );
    await page.waitForChanges();

    const element = await page.find('cor-tabs');
    expect(element).toHaveClass('hydrated');
  });

  it('emits corTabChange when a child tab is clicked', async () => {
    const page = await newE2EPage();
    await page.setContent(
      '<cor-tabs tab-style="style-1" size="md" value="tab-1">' +
        '<cor-tab-button value="tab-1">Tab 1</cor-tab-button>' +
        '<cor-tab-button value="tab-2">Tab 2</cor-tab-button>' +
        '<cor-tab-button value="tab-3">Tab 3</cor-tab-button>' +
        '</cor-tabs>',
    );
    await page.waitForChanges();

    const tabs = await page.find('cor-tabs');
    const changeEventSpy = await tabs.spyOnEvent('corTabChange');

    const buttons = await page.findAll('cor-tab-button');
    await buttons[1].click();
    await page.waitForChanges();

    expect(changeEventSpy).toHaveReceivedEventDetail({ value: 'tab-2' });
  });
});
