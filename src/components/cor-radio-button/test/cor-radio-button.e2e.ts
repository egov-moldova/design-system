import { newE2EPage } from '@stencil/core/testing';

describe('cor-radio-button', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button name="option" value="1">Label</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');
    expect(element).toHaveClass('hydrated');
  });

  it('selects on click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button name="option" value="1">Option 1</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');

    expect(await element.getProperty('checked')).toBe(false);

    await element.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);
  });

  it('emits corChange event on selection', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button name="option" value="1">Option 1</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');
    const corChangeSpy = await element.spyOnEvent('corChange');

    await element.click();
    await page.waitForChanges();

    expect(corChangeSpy).toHaveReceivedEventTimes(1);
    expect(corChangeSpy).toHaveReceivedEventDetail(true);
  });

  it('responds to Space key press', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button name="option" value="1">Label</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');

    // Focus the native input inside shadow DOM — keyboard events are handled there
    await page.evaluate(() => {
      const radio = document.querySelector('cor-radio-button');
      const input = radio?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
      input?.focus();
    });
    await page.keyboard.press('Space');
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);
  });

  it('does not change when disabled', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button disabled name="option" value="1">Option 1</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');
    const corChangeSpy = await element.spyOnEvent('corChange');

    await element.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(false);
    expect(corChangeSpy).toHaveReceivedEventTimes(0);
  });

  it('enforces mutual exclusivity within same name group', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-radio-button-group name="group1">
        <cor-radio-button name="group1" value="option1">Option 1</cor-radio-button>
        <cor-radio-button name="group1" value="option2">Option 2</cor-radio-button>
      </cor-radio-button-group>
    `);
    await page.waitForChanges();

    const radio1 = await page.find('cor-radio-button[value="option1"]');
    const radio2 = await page.find('cor-radio-button[value="option2"]');

    // Click via native input inside shadow DOM for reliable event propagation
    await page.evaluate(() => {
      const radio = document.querySelector('cor-radio-button[value="option1"]');
      const input = radio?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
      input?.click();
    });
    await page.waitForChanges();

    expect(await radio1.getProperty('checked')).toBe(true);
    expect(await radio2.getProperty('checked')).toBe(false);

    await page.evaluate(() => {
      const radio = document.querySelector('cor-radio-button[value="option2"]');
      const input = radio?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
      input?.click();
    });
    await page.waitForChanges();

    expect(await radio1.getProperty('checked')).toBe(false);
    expect(await radio2.getProperty('checked')).toBe(true);
  });

  it('submits with form using name and value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-radio-button name="choice" value="option1" checked>Option 1</cor-radio-button>
        <cor-radio-button name="choice" value="option2">Option 2</cor-radio-button>
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

    expect(formData['choice']).toBe('option1');
  });

  it('does not submit when no radio is checked', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-radio-button name="choice" value="option1">Option 1</cor-radio-button>
        <cor-radio-button name="choice" value="option2">Option 2</cor-radio-button>
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

    expect(formData['choice']).toBeUndefined();
  });

  it('resets to unchecked on form reset', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-radio-button name="choice" value="option1" checked>Option 1</cor-radio-button>
      </form>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');

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
    await page.setContent('<cor-radio-button name="option" value="1" invalid>Label</cor-radio-button>');
    await page.waitForChanges();

    const input = await page.find('cor-radio-button >>> input[type="radio"]');
    const ariaInvalid = await input.getAttribute('aria-invalid');

    expect(ariaInvalid).toBe('true');
  });

  it('toggles via label click', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button name="option" value="1">Click me</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');
    const label = await page.find('cor-radio-button >>> label');

    expect(await element.getProperty('checked')).toBe(false);

    await label.click();
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);
  });

  it('maintains checked state after prop change', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-radio-button name="option" value="1">Label</cor-radio-button>');
    await page.waitForChanges();

    const element = await page.find('cor-radio-button');

    element.setProperty('checked', true);
    await page.waitForChanges();

    expect(await element.getProperty('checked')).toBe(true);

    const input = await page.find('cor-radio-button >>> input[type="radio"]');
    expect(await input.getProperty('checked')).toBe(true);
  });

  it('supports keyboard navigation with Arrow keys in group', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-radio-button-group name="group1">
        <cor-radio-button name="group1" value="option1" checked>Option 1</cor-radio-button>
        <cor-radio-button name="group1" value="option2">Option 2</cor-radio-button>
        <cor-radio-button name="group1" value="option3">Option 3</cor-radio-button>
      </cor-radio-button-group>
    `);
    await page.waitForChanges();

    // Focus the native input inside the first radio's shadow DOM
    await page.evaluate(() => {
      const radio = document.querySelector('cor-radio-button[value="option1"]');
      const input = radio?.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
      input?.focus();
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();

    const radio2 = await page.find('cor-radio-button[value="option2"]');
    expect(await radio2.getProperty('checked')).toBe(true);
  });
});
