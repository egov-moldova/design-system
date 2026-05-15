import { newE2EPage } from '@stencil/core/testing';

describe('cor-select-item', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item 1"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    expect(element).toHaveClass('hydrated');
  });

  it('toggles selected state on click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item 1"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    const container = await page.find('cor-select-item >>> .container');

    expect(await element.getProperty('selected')).toBe(false);

    await container.click();
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(true);

    await container.click();
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(false);
  });

  it('emits corSelectionChange event on selection', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item 1"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    const container = await page.find('cor-select-item >>> .container');
    const corSelectionChangeSpy = await element.spyOnEvent('corSelectionChange');

    await container.click();
    await page.waitForChanges();

    expect(corSelectionChangeSpy).toHaveReceivedEventTimes(1);
    expect(corSelectionChangeSpy).toHaveReceivedEventDetail(true);

    await container.click();
    await page.waitForChanges();

    expect(corSelectionChangeSpy).toHaveReceivedEventTimes(2);
    expect(corSelectionChangeSpy).toHaveReceivedEventDetail(false);
  });

  it('does not toggle when disabled', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item 1" disabled></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    const container = await page.find('cor-select-item >>> .container');
    const corSelectionChangeSpy = await element.spyOnEvent('corSelectionChange');

    await container.click();
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(false);
    expect(corSelectionChangeSpy).toHaveReceivedEventTimes(0);
  });

  it('responds to Enter key press', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item 1"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    const container = await page.find('cor-select-item >>> .container');

    await container.focus();
    await page.keyboard.press('Enter');
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(true);
  });

  it('responds to Space key press', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item 1"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    const container = await page.find('cor-select-item >>> .container');

    await container.focus();
    await page.keyboard.press('Space');
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(true);
  });

  it('displays label text', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Test Label"></cor-select-item>');
    await page.waitForChanges();

    const text = await page.find('cor-select-item >>> .label');

    expect(await text.innerText).toBe('Test Label');
  });

  it('displays description text', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item" description="Description text"></cor-select-item>');
    await page.waitForChanges();

    const description = await page.find('cor-select-item >>> .description');

    expect(await description.innerText).toBe('Description text');
  });

  it('syncs checkbox state on click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');
    const checkbox = await page.find('cor-select-item >>> cor-checkbox');

    await checkbox.click();
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(true);
  });

  it('maintains selected state after prop change', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item label="Item"></cor-select-item>');
    await page.waitForChanges();

    const element = await page.find('cor-select-item');

    element.setProperty('selected', true);
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(true);
  });

  it('updates avatar active state when selected', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-select-item label="Item">
        <cor-avatar slot="pre-content" initials="AB"></cor-avatar>
      </cor-select-item>
    `);
    await page.waitForChanges();

    const avatar = await page.find('cor-avatar');
    const container = await page.find('cor-select-item >>> .container');

    expect(await avatar.getAttribute('active')).toBeNull();

    await container.click();
    await page.waitForChanges();

    expect(await avatar.getAttribute('active')).toBe('');
  });

  it('removes avatar active state when deselected', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-select-item label="Item" selected>
        <cor-avatar slot="pre-content" initials="AB"></cor-avatar>
      </cor-select-item>
    `);
    await page.waitForChanges();

    const avatar = await page.find('cor-avatar');
    const container = await page.find('cor-select-item >>> .container');

    expect(await avatar.getAttribute('active')).toBe('');

    await container.click();
    await page.waitForChanges();

    expect(await avatar.getAttribute('active')).toBeNull();
  });

  it('displays timestamp variant layout', async () => {
    const page = await newE2EPage();
    await page.setContent(
      '<cor-select-item variant="timestamp" label="Item" description="2 hours ago"></cor-select-item>',
    );
    await page.waitForChanges();

    const timestampContainer = await page.find('cor-select-item >>> .text-timestamp');
    expect(timestampContainer).toBeTruthy();
  });

  it('displays basic variant layout', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-select-item variant="basic" label="Item" description="Description"></cor-select-item>');
    await page.waitForChanges();

    const basicContainer = await page.find('cor-select-item >>> .text-basic');
    expect(basicContainer).toBeTruthy();
  });
});
