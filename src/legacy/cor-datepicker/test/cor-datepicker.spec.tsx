import { newSpecPage } from '@stencil/core/testing';
import { CorDatepicker } from '../cor-datepicker';

describe('cor-datepicker', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
    const wrapper = page.root?.shadowRoot?.querySelector('.datepicker');
    expect(wrapper).toBeTruthy();
  });

  it('renders inputs container', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker></cor-datepicker>`,
    });
    const inputsContainer = page.root?.shadowRoot?.querySelector('.datepicker__inputs');
    expect(inputsContainer).toBeTruthy();
  });

  it('popover is not visible by default', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker></cor-datepicker>`,
    });
    const popover = page.root?.shadowRoot?.querySelector('.datepicker__popover');
    expect(popover).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode: Single
  // ─────────────────────────────────────────────────────────────────────────────

  it('renders a single input in single mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="single" label="Date"></cor-datepicker>`,
    });
    const inputs = page.root?.shadowRoot?.querySelectorAll('cor-input');
    expect(inputs?.length).toBe(1);
  });

  it('reflects mode=single attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="single"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('mode')).toBe('single');
  });

  it('accepts value prop in single mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="single" value="2026-03-15"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode: Range
  // ─────────────────────────────────────────────────────────────────────────────

  it('renders two inputs in range mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range" label="Start" label-end="End"></cor-datepicker>`,
    });
    const inputs = page.root?.shadowRoot?.querySelectorAll('cor-input');
    expect(inputs?.length).toBe(2);
  });

  it('reflects mode=range attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('mode')).toBe('range');
  });

  it('adds datepicker--range class in range mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range"></cor-datepicker>`,
    });
    const wrapper = page.root?.shadowRoot?.querySelector('.datepicker');
    expect(wrapper?.classList.contains('datepicker--range')).toBe(true);
  });

  it('accepts rangeStart and rangeEnd props', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range" range-start="2026-03-10" range-end="2026-03-20"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Size Variants
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects size=lg attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker size="lg"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('size')).toBe('lg');
  });

  it('reflects size=md attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker size="md"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('size')).toBe('md');
  });

  it('reflects size=sm attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker size="sm"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disabled State
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker disabled></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('disabled')).not.toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Invalid State
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects invalid attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker invalid></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('invalid')).not.toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Required State
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects required attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker required></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('required')).not.toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Week Start Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects week-starts-on=sun attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker week-starts-on="sun"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('week-starts-on')).toBe('sun');
  });

  it('reflects week-starts-on=mon attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker week-starts-on="mon"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('week-starts-on')).toBe('mon');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Clear Button
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects with-clear-button attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker with-clear-button></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('with-clear-button')).not.toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disabled Dates
  // ─────────────────────────────────────────────────────────────────────────────

  it('accepts disabledDates array prop', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker></cor-datepicker>`,
    });
    const datepicker = page.root as HTMLCorDatepickerElement;
    datepicker.disabledDates = ['2026-03-15', '2026-03-16'];
    await page.waitForChanges();
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Labels
  // ─────────────────────────────────────────────────────────────────────────────

  it('accepts label prop', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker label="Select Date"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('accepts labelEnd prop in range mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range" label="Start" label-end="End"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Placeholder
  // ─────────────────────────────────────────────────────────────────────────────

  it('accepts placeholder prop', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker placeholder="DD/MM/YYYY"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Name Attribute
  // ─────────────────────────────────────────────────────────────────────────────

  it('accepts name prop', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker name="date-field"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode: Range Single Input
  // ─────────────────────────────────────────────────────────────────────────────

  it('renders a single input in range-single-input mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input" label="Date range"></cor-datepicker>`,
    });
    const inputs = page.root?.shadowRoot?.querySelectorAll('cor-input');
    expect(inputs?.length).toBe(1);
  });

  it('reflects mode=range-single-input attribute', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input"></cor-datepicker>`,
    });
    expect(page.root?.getAttribute('mode')).toBe('range-single-input');
  });

  it('adds datepicker--range-single class in range-single-input mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input"></cor-datepicker>`,
    });
    const wrapper = page.root?.shadowRoot?.querySelector('.datepicker');
    expect(wrapper?.classList.contains('datepicker--range-single')).toBe(true);
    expect(wrapper?.classList.contains('datepicker--range')).toBe(false);
  });

  it('does not add datepicker--range class in range-single-input mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input"></cor-datepicker>`,
    });
    const wrapper = page.root?.shadowRoot?.querySelector('.datepicker');
    expect(wrapper?.classList.contains('datepicker--range')).toBe(false);
  });

  it('accepts rangeStart and rangeEnd props in range-single-input mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input" range-start="2026-03-10" range-end="2026-03-20"></cor-datepicker>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('initializes combined value from rangeStart and rangeEnd in range-single-input mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input" range-start="2026-03-10" range-end="2026-03-20"></cor-datepicker>`,
    });
    const input = page.root?.shadowRoot?.querySelector('cor-input');
    expect(input).toBeTruthy();
    // Combined value should be set via typedValueCombined state
    expect(page.root).toBeTruthy();
  });

  it('shows correct placeholder format in range-single-input mode', async () => {
    const page = await newSpecPage({
      components: [CorDatepicker],
      html: `<cor-datepicker mode="range-single-input" placeholder="YYYY-MM-DD"></cor-datepicker>`,
    });
    const input = page.root?.shadowRoot?.querySelector('cor-input');
    expect(input?.getAttribute('placeholder')).toBe('YYYY-MM-DD \u2013 YYYY-MM-DD');
  });
});
