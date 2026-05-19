import { newE2EPage } from '@stencil/core/testing';

describe('cor-checkbox', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');
    expect(element).toHaveClass('hydrated');
  });

  it('toggles checked state on click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');

    expect(await element.getProperty('checked')).toBe(false);

    await element.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);

    await element.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(false);
  });

  it('emits corChange event on state change', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');
    const corChangeSpy = await element.spyOnEvent('corChange');

    await element.click();
    await page.waitForChanges();

    expect(corChangeSpy).toHaveReceivedEventTimes(1);
    expect(corChangeSpy).toHaveReceivedEventDetail(true);

    await element.click();
    await page.waitForChanges();

    expect(corChangeSpy).toHaveReceivedEventTimes(2);
    expect(corChangeSpy).toHaveReceivedEventDetail(false);
  });

  it('clears indeterminate state on user interaction', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox indeterminate>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');

    expect(await element.getProperty('indeterminate')).toBe(true);

    await element.click();
    await page.waitForChanges();

    expect(await element.getProperty('indeterminate')).toBe(false);
    expect(await element.getProperty('checked')).toBe(true);
  });

  it('responds to Space key press', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');
    const input = await page.find('cor-checkbox >>> input[type="checkbox"]');

    await input.focus();
    await page.keyboard.press('Space');
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);

    await page.keyboard.press('Space');
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(false);
  });

  it('does not toggle when disabled', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox disabled>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');
    const corChangeSpy = await element.spyOnEvent('corChange');

    await element.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(false);
    expect(corChangeSpy).toHaveReceivedEventTimes(0);
  });

  it('submits with form using name and value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-checkbox name="terms" value="accepted" checked>Accept terms</cor-checkbox>
      </form>
    `);
    await page.waitForChanges();

    const formData = await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const data = new FormData(form);
      const result: Record<string, string> = {};
      data.forEach((value, key) => {
        result[key] = value as string;
      });
      return result;
    });

    expect((formData as Record<string, string>)['terms']).toBe('accepted');
  });

  it('does not submit when unchecked', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-checkbox name="terms" value="accepted">Accept terms</cor-checkbox>
      </form>
    `);
    await page.waitForChanges();

    const formData = await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const data = new FormData(form);
      const result: Record<string, string> = {};
      data.forEach((value, key) => {
        result[key] = value as string;
      });
      return result;
    });

    expect((formData as Record<string, string>)['terms']).toBeUndefined();
  });

  it('resets to unchecked on form reset', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-checkbox name="terms" checked>Accept terms</cor-checkbox>
      </form>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');

    expect(await element.getProperty('checked')).toBe(true);

    await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      form.reset();
    });
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(false);
  });

  it('displays invalid state with aria-invalid', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox invalid>Label</cor-checkbox>');
    await page.waitForChanges();

    const input = await page.find('cor-checkbox >>> input[type="checkbox"]');
    const ariaInvalid = await input.getAttribute('aria-invalid');

    expect(ariaInvalid).toBe('true');
  });

  it('toggles via label click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox>Click me</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');
    const label = await page.find('cor-checkbox >>> label');

    expect(await element.getProperty('checked')).toBe(false);

    await label.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);
  });

  it('maintains checked state after prop change', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-checkbox>Label</cor-checkbox>');
    await page.waitForChanges();

    const element = await page.find('cor-checkbox');

    element.setProperty('checked', true);
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);

    const input = await page.find('cor-checkbox >>> input[type="checkbox"]');
    expect(await input.getProperty('checked')).toBe(true);
  });
});
