import { newE2EPage } from '@stencil/core/testing';

describe('cor-textarea', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');

    expect(element).toHaveClass('hydrated');
  });

  it('should render with label and placeholder', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test Label" placeholder="Test Placeholder"></cor-textarea>');
    await page.waitForChanges();

    const textarea = await page.find('cor-textarea >>> textarea');

    expect(textarea).not.toBeNull();
    expect(await textarea.getProperty('placeholder')).toBe('Test Placeholder');
  });

  it('should update value on input', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" name="test-textarea"></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');
    const textarea = await page.find('cor-textarea >>> textarea');
    const corInputSpy = await element.spyOnEvent('corInput');

    await textarea.press('KeyH');
    await textarea.press('KeyI');
    await page.waitForChanges();

    expect(corInputSpy).toHaveReceivedEventTimes(2);
    expect(await element.getProperty('value')).toContain('h');
  });

  it('should emit corFocus event on focus', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test"></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');
    const corFocusSpy = await element.spyOnEvent('corFocus');

    await page.evaluate(() => {
      const el = document.querySelector('cor-textarea');
      const textarea = el?.shadowRoot?.querySelector('textarea');
      textarea?.focus();
    });
    await page.waitForChanges();

    expect(corFocusSpy).toHaveReceivedEventTimes(1);
  });

  it('should emit corBlur event on blur', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test"></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');
    const corBlurSpy = await element.spyOnEvent('corBlur');

    await page.evaluate(() => {
      const el = document.querySelector('cor-textarea');
      const textarea = el?.shadowRoot?.querySelector('textarea');
      textarea?.focus();
    });
    await page.waitForChanges();
    await page.evaluate(() => {
      const el = document.querySelector('cor-textarea');
      const textarea = el?.shadowRoot?.querySelector('textarea');
      textarea?.blur();
    });
    await page.waitForChanges();

    expect(corBlurSpy).toHaveReceivedEventTimes(1);
  });

  it('should be disabled when disabled prop is set', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" disabled></cor-textarea>');
    await page.waitForChanges();

    const textarea = await page.find('cor-textarea >>> textarea');

    expect(await textarea.getProperty('disabled')).toBe(true);
  });

  it('should show helper text when provided', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-textarea label="Test">
        <span slot="helper-text">Helper message</span>
      </cor-textarea>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-textarea');
    const helperSlot = await element.find('[slot="helper-text"]');

    expect(helperSlot).not.toBeNull();
    expect(helperSlot.textContent).toBe('Helper message');
  });

  it('should apply invalid state', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" invalid></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');

    expect(element).toHaveAttribute('invalid');
  });

  it('should render skeleton state', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" skeleton></cor-textarea>');
    await page.waitForChanges();

    const skeletons = await page.findAll('cor-textarea >>> cor-skeleton');

    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should support label-position="outside"', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" label-position="outside"></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');

    expect(element).toHaveAttribute('label-position');
    expect(await element.getAttribute('label-position')).toBe('outside');
  });

  it('should show required asterisk when required', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" label-position="outside" required></cor-textarea>');
    await page.waitForChanges();

    const textarea = await page.find('cor-textarea >>> textarea');

    expect(await textarea.getProperty('required')).toBe(true);
  });

  it('should participate in form submission', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-textarea name="test-textarea" value="Test Value"></cor-textarea>
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

    expect(formData['test-textarea']).toBe('Test Value');
  });

  it('should reset value on form reset', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="test-form">
        <cor-textarea name="test-textarea" value="Initial"></cor-textarea>
      </form>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-textarea');
    const textarea = await page.find('cor-textarea >>> textarea');

    await textarea.press('KeyA');
    await page.waitForChanges();

    await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      form.reset();
    });
    await page.waitForChanges();

    expect(await element.getProperty('value')).toBe('');
  });

  it('should validate slot content', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-textarea label="Test">
        <button slot="helper-text">Invalid element</button>
      </cor-textarea>
    `);
    await page.waitForChanges();

    const errorMessage = await page.evaluate(() => {
      const el = document.querySelector('cor-textarea');
      return el?.shadowRoot?.textContent || '';
    });

    expect(errorMessage).toContain('button is invalid');
  });

  it('should support resize attribute', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" resize="none"></cor-textarea>');
    await page.waitForChanges();

    const element = await page.find('cor-textarea');

    expect(await element.getAttribute('resize')).toBe('none');
  });

  it('should respect rows attribute', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" rows="6"></cor-textarea>');
    await page.waitForChanges();

    const textarea = await page.find('cor-textarea >>> textarea');

    expect(await textarea.getProperty('rows')).toBe(6);
  });

  it('should respect maxlength attribute', async () => {
    const page = await newE2EPage();
    await page.setContent('<cor-textarea label="Test" maxlength="10"></cor-textarea>');
    await page.waitForChanges();

    const textarea = await page.find('cor-textarea >>> textarea');

    expect(await textarea.getAttribute('maxlength')).toBe('10');
  });
});
