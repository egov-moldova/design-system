import { newE2EPage } from '@stencil/core/testing';

describe('cor-input', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(element).toHaveClass('hydrated');
  });

  it('should render with label and placeholder', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test Label" placeholder="Test Placeholder"></cor-input>');
    await page.waitForChanges();

    const input = await page.find('cor-input >>> input');

    expect(input).not.toBeNull();
    expect(await input.getProperty('placeholder')).toBe('Test Placeholder');
  });

  it('should update value on input', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" name="test-input"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const input = await page.find('cor-input >>> input');
    const corInputSpy = await element.spyOnEvent('corInput');

    await input.press('KeyH');
    await input.press('KeyI');
    await page.waitForChanges();

    expect(corInputSpy).toHaveReceivedEventTimes(2);
    expect(await element.getProperty('value')).toContain('h');
  });

  it('should emit corFocus event on focus', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const corFocusSpy = await element.spyOnEvent('corFocus');

    await page.evaluate(() => {
      const el = document.querySelector('cor-input');
      const input = el?.shadowRoot?.querySelector('input');
      input?.focus();
    });
    await page.waitForChanges();

    expect(corFocusSpy).toHaveReceivedEventTimes(1);
  });

  it('should emit corBlur event on blur', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const corBlurSpy = await element.spyOnEvent('corBlur');

    await page.evaluate(() => {
      const el = document.querySelector('cor-input');
      const input = el?.shadowRoot?.querySelector('input');
      input?.focus();
    });
    await page.waitForChanges();
    await page.evaluate(() => {
      const el = document.querySelector('cor-input');
      const input = el?.shadowRoot?.querySelector('input');
      input?.blur();
    });
    await page.waitForChanges();

    expect(corBlurSpy).toHaveReceivedEventTimes(1);
  });

  it('should be disabled when disabled prop is set', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" disabled></cor-input>');
    await page.waitForChanges();

    const input = await page.find('cor-input >>> input');

    expect(await input.getProperty('disabled')).toBe(true);
  });

  it('should show clear button when input has value', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" value="Test Value"></cor-input>');
    await page.waitForChanges();

    const clearButton = await page.find('cor-input >>> .clear-button');

    expect(clearButton).not.toBeNull();
  });

  it('should clear value when clear button is clicked', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" value="Test Value"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const clearButton = await page.find('cor-input >>> .clear-button');
    const corInputSpy = await element.spyOnEvent('corInput');

    await clearButton.click();
    await page.waitForChanges();

    expect(await element.getProperty('value')).toBe('');
    expect(corInputSpy).toHaveReceivedEventTimes(1);
  });

  it('should show helper text when provided', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-input label="Test">
        <span slot="helper-text">Helper message</span>
      </cor-input>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const helperSlot = await element.find('[slot="helper-text"]');

    expect(helperSlot).not.toBeNull();
    expect(helperSlot.textContent).toBe('Helper message');
  });

  it('should apply invalid state', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" invalid></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(element).toHaveAttribute('invalid');
  });

  it('should render skeleton state', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" skeleton></cor-input>');
    await page.waitForChanges();

    const skeletons = await page.findAll('cor-input >>> cor-skeleton');

    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should support size variants', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" size="sm"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(await element.getAttribute('size')).toBe('sm');
  });

  it('should support label-position="outside"', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" label-position="outside"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(element).toHaveAttribute('label-position');
    expect(await element.getAttribute('label-position')).toBe('outside');
  });

  it('should show required asterisk when required', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" label-position="outside" required></cor-input>');
    await page.waitForChanges();

    const input = await page.find('cor-input >>> input');

    expect(await input.getProperty('required')).toBe(true);
  });

  it('should support showLine prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" show-line></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(element).toHaveAttribute('show-line');
  });

  it('should participate in form submission', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-input name="test-input" value="Test Value"></cor-input>
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

    expect(formData['test-input']).toBe('Test Value');
  });

  it('should reset value on form reset', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-input name="test-input" value="Initial"></cor-input>
      </form>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const input = await page.find('cor-input >>> input');

    await input.press('KeyA');
    await page.waitForChanges();

    await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      form.reset();
    });
    await page.waitForChanges();

    expect(await element.getProperty('value')).toBe('');
  });

  it('should validate slot content for icon-left', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-input label="Test">
        <div slot="icon-left">Invalid element</div>
      </cor-input>
    `);
    await page.waitForChanges();

    const errorMessage = await page.evaluate(() => {
      const el = document.querySelector('cor-input');
      return el?.shadowRoot?.textContent || '';
    });

    expect(errorMessage).toContain('div is invalid');
  });

  it('should validate slot content for icon-right', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-input label="Test">
        <div slot="icon-right">Invalid element</div>
      </cor-input>
    `);
    await page.waitForChanges();

    const errorMessage = await page.evaluate(() => {
      const el = document.querySelector('cor-input');
      return el?.shadowRoot?.textContent || '';
    });

    expect(errorMessage).toContain('div is invalid');
  });

  it('should validate slot content for helper-text', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-input label="Test">
        <button slot="helper-text">Invalid element</button>
      </cor-input>
    `);
    await page.waitForChanges();

    const errorMessage = await page.evaluate(() => {
      const el = document.querySelector('cor-input');
      return el?.shadowRoot?.textContent || '';
    });

    expect(errorMessage).toContain('button is invalid');
  });

  it('should support type attribute', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" type="email"></cor-input>');
    await page.waitForChanges();

    const input = await page.find('cor-input >>> input');

    expect(await input.getProperty('type')).toBe('email');
  });

  it('should apply floating label on focus for label-position="inside"', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" label-position="inside"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const input = await page.find('cor-input >>> input');

    await input.focus();
    await page.waitForChanges();

    expect(element).toHaveClass('is-focused');
  });

  it('should apply floating label when has value for label-position="inside"', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" label-position="inside" value="Test"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(element).toHaveClass('has-value');
  });

  it('should support labelInfo prop with info icon', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-input label="Test" label-position="outside" label-info="Additional info"></cor-input>');
    await page.waitForChanges();

    const element = await page.find('cor-input');

    expect(await element.getAttribute('label-info')).toBe('Additional info');
  });

  it('should render icons in slots', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-input label="Test">
        <cor-icon slot="icon-left" name="carbon:search"></cor-icon>
        <cor-icon slot="icon-right" name="carbon:chevron--down"></cor-icon>
      </cor-input>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-input');
    const leftIcon = await element.find('[slot="icon-left"]');
    const rightIcon = await element.find('[slot="icon-right"]');

    expect(leftIcon).not.toBeNull();
    expect(rightIcon).not.toBeNull();
  });
});
