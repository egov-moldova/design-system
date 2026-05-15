import { newE2EPage } from '@stencil/core/testing';

describe('cor-checkbox-group', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const element = await page.find('cor-checkbox-group');
    expect(element).toHaveClass('hydrated');
  });

  it('propagates disabled to child checkboxes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group disabled>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const checkboxes = await page.findAll('cor-checkbox');
    expect(await checkboxes[0].getAttribute('disabled')).not.toBeNull();
    expect(await checkboxes[1].getAttribute('disabled')).not.toBeNull();
  });

  it('propagates invalid to child checkboxes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group invalid>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const checkboxes = await page.findAll('cor-checkbox');
    expect(await checkboxes[0].getAttribute('invalid')).not.toBeNull();
    expect(await checkboxes[1].getAttribute('invalid')).not.toBeNull();
  });

  it('reflects invalid attribute on host for CSS targeting', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group invalid>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const group = await page.find('cor-checkbox-group');
    expect(await group.getAttribute('invalid')).not.toBeNull();
  });

  it('reflects disabled attribute on host for CSS targeting', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group disabled>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const group = await page.find('cor-checkbox-group');
    expect(await group.getAttribute('disabled')).not.toBeNull();
  });

  it('propagates size to child checkboxes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group size="sm">
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const checkboxes = await page.findAll('cor-checkbox');
    expect(await checkboxes[0].getAttribute('size')).toBe('sm');
    expect(await checkboxes[1].getAttribute('size')).toBe('sm');
  });

  it('propagates name to child checkboxes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group name="preferences">
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const checkboxes = await page.findAll('cor-checkbox');
    expect(await checkboxes[0].getAttribute('name')).toBe('preferences');
    expect(await checkboxes[1].getAttribute('name')).toBe('preferences');
  });

  it('does not toggle disabled checkboxes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group disabled>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const checkbox = await page.find('cor-checkbox');
    const corChangeSpy = await checkbox.spyOnEvent('corChange');

    await checkbox.click();
    await page.waitForChanges();

    expect(corChangeSpy).toHaveReceivedEventTimes(0);
    expect(await checkbox.getProperty('checked')).toBe(false);
  });

  it('emits corChange from group in controlled mode', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group value='["option1"]'>
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const group = await page.find('cor-checkbox-group');
    const groupChangeSpy = await group.spyOnEvent('corChange');

    const checkbox2 = await page.find('cor-checkbox[value="option2"]');
    await checkbox2.click();
    await page.waitForChanges();

    expect(groupChangeSpy).toHaveReceivedEventTimes(1);
    expect(groupChangeSpy).toHaveReceivedEventDetail(['option1', 'option2']);
  });

  it('renders legend element when legend prop is set', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group legend="Choose options">
        <cor-checkbox value="option1">Option 1</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const legend = await page.find('cor-checkbox-group .checkbox-group-legend');
    expect(legend).toBeTruthy();
    expect(legend.textContent).toBe('Choose options');
  });

  it('renders helper text when helperText prop is set', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <cor-checkbox-group helper-text="Select all that apply">
        <cor-checkbox value="option1">Option 1</cor-checkbox>
      </cor-checkbox-group>
    `);
    await page.waitForChanges();

    const helper = await page.find('cor-checkbox-group .checkbox-group-helper');
    expect(helper).toBeTruthy();
    expect(helper.textContent).toBe('Select all that apply');
  });
});
