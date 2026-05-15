import { newE2EPage } from '@stencil/core/testing';

describe('cor-toggle', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');
    expect(element).toHaveClass('hydrated');
  });

  it('toggles checked state on click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');

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
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');
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

  it('responds to Space key press', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');
    const input = await page.find('cor-toggle >>> input[type="checkbox"]');

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
    await page.setContent('<cor-toggle disabled>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');
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
        <cor-toggle name="notifications" value="enabled" checked>Enable notifications</cor-toggle>
      </form>
    `);
    await page.waitForChanges();

    const formData = await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const data = new FormData(form);
      const entries: [string, FormDataEntryValue][] = [];
      data.forEach((value, key) => entries.push([key, value]));
      return entries.reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string | File>,
      );
    });

    expect(formData['notifications']).toBe('enabled');
  });

  it('does not submit when unchecked', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-toggle name="notifications" value="enabled">Enable notifications</cor-toggle>
      </form>
    `);
    await page.waitForChanges();

    const formData = await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const data = new FormData(form);
      const entries: [string, FormDataEntryValue][] = [];
      data.forEach((value, key) => entries.push([key, value]));
      return entries.reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string | File>,
      );
    });

    expect(formData['notifications']).toBeUndefined();
  });

  it('resets to unchecked on form reset', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-toggle name="notifications" checked>Enable notifications</cor-toggle>
      </form>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-toggle');

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
    await page.setContent('<cor-toggle invalid>Label</cor-toggle>');
    await page.waitForChanges();

    const input = await page.find('cor-toggle >>> input[type="checkbox"]');
    const ariaInvalid = await input.getAttribute('aria-invalid');

    expect(ariaInvalid).toBe('true');
  });

  it('has role="switch" for accessibility', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const input = await page.find('cor-toggle >>> input[type="checkbox"]');
    const role = await input.getAttribute('role');

    expect(role).toBe('switch');
  });

  it('updates aria-checked on toggle', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');

    // Get aria-checked from shadow DOM input
    let ariaChecked = await page.evaluate(() => {
      const toggle = document.querySelector('cor-toggle');
      const input = toggle?.shadowRoot?.querySelector('input[type="checkbox"]');
      return input?.getAttribute('aria-checked');
    });
    expect(ariaChecked).toBe('false');

    await element.click();
    await page.waitForChanges();

    ariaChecked = await page.evaluate(() => {
      const toggle = document.querySelector('cor-toggle');
      const input = toggle?.shadowRoot?.querySelector('input[type="checkbox"]');
      return input?.getAttribute('aria-checked');
    });
    expect(ariaChecked).toBe('true');
  });

  it('toggles via label click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Click me</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');
    const label = await page.find('cor-toggle >>> label');

    expect(await element.getProperty('checked')).toBe(false);

    await label.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);
  });

  it('maintains checked state after prop change', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-toggle>Label</cor-toggle>');
    await page.waitForChanges();

    const element = await page.find('cor-toggle');

    element.setProperty('checked', true);
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);

    const input = await page.find('cor-toggle >>> input[type="checkbox"]');
    expect(await input.getProperty('checked')).toBe(true);
  });
});
