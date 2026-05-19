import { newE2EPage } from '@stencil/core/testing';

describe('cor-badge-interactive', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Test Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    expect(element).toHaveClass('hydrated');
  });

  it('renders with different sizes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-badge-interactive size="md">MD Badge</cor-badge-interactive>
      <cor-badge-interactive size="sm">SM Badge</cor-badge-interactive>
      <cor-badge-interactive size="xs">XS Badge</cor-badge-interactive>
    `);
    await page.waitForChanges();

    const badges = await page.findAll('cor-badge-interactive');
    expect(badges).toHaveLength(3);

    expect(await badges[0].getAttribute('size')).toBe('md');
    expect(await badges[1].getAttribute('size')).toBe('sm');
    expect(await badges[2].getAttribute('size')).toBe('xs');
  });

  it('renders with icon slot', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-badge-interactive>
        <cor-icon slot="icon" name="carbon:warning"></cor-icon>
        Badge with icon
      </cor-badge-interactive>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    expect(element).toBeTruthy();
    expect(await element.getProperty('text')).toBe('Badge with icon');
  });

  it('handles click interaction', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Clickable Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    const corClickSpy = await element.spyOnEvent('corClick');

    await element.click();
    await page.waitForChanges();

    expect(corClickSpy).toHaveReceivedEventTimes(1);
  });

  it('does not fire click event when disabled', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive disabled>Disabled Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    const corClickSpy = await element.spyOnEvent('corClick');

    await element.click();
    await page.waitForChanges();

    expect(corClickSpy).not.toHaveReceivedEvent();
    expect(await element.getProperty('disabled')).toBe(true);
  });

  it('does not fire click event when skeleton', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive skeleton>Skeleton Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    const corClickSpy = await element.spyOnEvent('corClick');

    await element.click();
    await page.waitForChanges();

    expect(corClickSpy).not.toHaveReceivedEvent();
    expect(await element.getProperty('skeleton')).toBe(true);
  });

  it('handles keyboard interaction - Enter key', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Keyboard Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    const corClickSpy = await element.spyOnEvent('corClick');

    await element.press('Enter');
    await page.waitForChanges();

    expect(corClickSpy).toHaveReceivedEventTimes(1);
  });

  it('handles keyboard interaction - Space key', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Keyboard Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    const corClickSpy = await element.spyOnEvent('corClick');

    await element.press('Space');
    await page.waitForChanges();

    expect(corClickSpy).toHaveReceivedEventTimes(1);
  });

  it('updates selected state', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Selectable Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');

    expect(await element.getProperty('selected')).toBe(false);

    await element.setProperty('selected', true);
    await page.waitForChanges();

    expect(await element.getProperty('selected')).toBe(true);
    expect(await element.getAttribute('aria-pressed')).toBe('true');
  });

  it('has correct accessibility attributes', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Accessible Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const badge = await page.find('.badge');

    expect(await badge.getAttribute('role')).toBe('button');
    expect(await badge.getAttribute('tabindex')).toBe('0');
    expect(await badge.getAttribute('aria-pressed')).toBe('false');
    expect(await badge.getAttribute('aria-disabled')).toBeNull();
  });

  it('has correct accessibility attributes when disabled', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive disabled>Disabled Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const badge = await page.find('.badge');

    expect(await badge.getAttribute('aria-disabled')).toBe('true');
    expect(await badge.getAttribute('tabindex')).toBe('-1');
  });

  it('has correct accessibility attributes when selected', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive selected>Selected Badge</cor-badge-interactive>');
    await page.waitForChanges();

    const badge = await page.find('.badge');

    expect(await badge.getAttribute('aria-pressed')).toBe('true');
  });

  it('hides icon slot for xs size', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-badge-interactive size="xs">
        <cor-icon slot="icon" name="carbon:warning"></cor-icon>
        XS Badge
      </cor-badge-interactive>
    `);
    await page.waitForChanges();

    // Icon should not be visible for xs size
    const iconSlot = await page.find('cor-badge-interactive >>> slot[name="icon"]');
    expect(iconSlot).toBeFalsy();
  });

  it('hides icon slot for skeleton state', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-badge-interactive skeleton>
        <cor-icon slot="icon" name="carbon:warning"></cor-icon>
        Skeleton Badge
      </cor-badge-interactive>
    `);
    await page.waitForChanges();

    // Icon should not be visible for skeleton state
    const iconSlot = await page.find('cor-badge-interactive >>> slot[name="icon"]');
    expect(iconSlot).toBeFalsy();
  });

  it('displays text content correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive>Hello World</cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');
    const textElement = await element.find('.text');

    expect(await textElement.textContent).toBe('Hello World');
  });

  it('updates text content dynamically', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive text="Original Text"></cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');

    await element.setProperty('text', 'Updated Text');
    await page.waitForChanges();

    const textElement = await element.find('.text');
    expect(await textElement.textContent).toBe('Updated Text');
  });

  it('handles multiple state combinations', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-badge-interactive text="Complex Badge"></cor-badge-interactive>');
    await page.waitForChanges();

    const element = await page.find('cor-badge-interactive');

    // Set multiple properties
    await element.setProperty('disabled', true);
    await element.setProperty('selected', true);
    await element.setProperty('skeleton', true);
    await page.waitForChanges();

    expect(await element.getProperty('disabled')).toBe(true);
    expect(await element.getProperty('selected')).toBe(true);
    expect(await element.getProperty('skeleton')).toBe(true);

    const badge = await element.find('.badge');
    expect(await badge.getAttribute('aria-disabled')).toBe('true');
    expect(await badge.getAttribute('aria-pressed')).toBe('true');
    expect(await badge.getAttribute('tabindex')).toBe('-1');
  });
});
