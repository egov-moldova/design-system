import { newSpecPage } from '@stencil/core/testing';
import { CorCalendar } from '../cor-calendar';
import { CorDatepickerDay } from '../../cor-datepicker-day/cor-datepicker-day';

describe('cor-calendar', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    expect(page.root).toBeTruthy();
    const panel = page.root?.shadowRoot?.querySelector('.panel');
    expect(panel).toBeTruthy();
  });

  it('renders header with month/year label', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const label = page.root?.shadowRoot?.querySelector('.header-label');
    expect(label?.textContent).toContain('March');
    expect(label?.textContent).toContain('2026');
  });

  it('renders 7 weekday columns', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const weekdays = page.root?.shadowRoot?.querySelectorAll('.weekday');
    expect(weekdays?.length).toBe(7);
  });

  it('renders day cells in grid', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const grid = page.root?.shadowRoot?.querySelector('.grid');
    expect(grid).toBeTruthy();
    const dayCells = page.root?.shadowRoot?.querySelectorAll('cor-datepicker-day');
    expect(dayCells?.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Week Start Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  it('first weekday is Su when weekStartsOn=sun', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" week-starts-on="sun"></cor-calendar>`,
    });
    const weekdays = page.root?.shadowRoot?.querySelectorAll('.weekday');
    expect(weekdays?.[0]?.textContent?.trim()).toBe('Su');
  });

  it('first weekday is Mo when weekStartsOn=mon', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" week-starts-on="mon"></cor-calendar>`,
    });
    const weekdays = page.root?.shadowRoot?.querySelectorAll('.weekday');
    expect(weekdays?.[0]?.textContent?.trim()).toBe('Mo');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode: Single Selection
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects mode=single attribute', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" mode="single"></cor-calendar>`,
    });
    expect(page.root?.getAttribute('mode')).toBe('single');
  });

  it('accepts value prop in single mode', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" mode="single" value="2026-03-15"></cor-calendar>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode: Range Selection
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects mode=range attribute', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" mode="range"></cor-calendar>`,
    });
    expect(page.root?.getAttribute('mode')).toBe('range');
  });

  it('accepts rangeStart and rangeEnd props', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" mode="range" range-start="2026-03-10" range-end="2026-03-20"></cor-calendar>`,
    });
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Header Styles
  // ─────────────────────────────────────────────────────────────────────────────

  it('renders header style 1 by default', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const header = page.root?.shadowRoot?.querySelector('.header');
    expect(header?.classList.contains('header--style-2')).toBe(false);
  });

  it('renders header style 2 when specified', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" header-style="2"></cor-calendar>`,
    });
    const header = page.root?.shadowRoot?.querySelector('.header--style-2');
    expect(header).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Events
  // ─────────────────────────────────────────────────────────────────────────────

  it('emits corMonthChange when prev nav is clicked', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corMonthChange', spy);
    const prevBtn = page.root?.shadowRoot?.querySelector('.nav-btn--prev button');
    (prevBtn as HTMLElement)?.click();
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ month: 2, year: 2026 });
  });

  it('emits corMonthChange when next nav is clicked', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="12" year="2026"></cor-calendar>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corMonthChange', spy);
    const nextBtn = page.root?.shadowRoot?.querySelector('.nav-btn--next button');
    (nextBtn as HTMLElement)?.click();
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ month: 1, year: 2027 });
  });

  it('wraps to previous year when navigating before January', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="1" year="2026"></cor-calendar>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corMonthChange', spy);
    const prevBtn = page.root?.shadowRoot?.querySelector('.nav-btn--prev button');
    (prevBtn as HTMLElement)?.click();
    await page.waitForChanges();
    expect(spy.mock.calls[0][0].detail).toEqual({ month: 12, year: 2025 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disabled State
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" disabled></cor-calendar>`,
    });
    expect(page.root?.getAttribute('disabled')).not.toBeNull();
  });

  it('does not emit events when disabled', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" disabled></cor-calendar>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corMonthChange', spy);
    const nextBtn = page.root?.shadowRoot?.querySelector('.nav-btn--next button');
    (nextBtn as HTMLElement)?.click();
    await page.waitForChanges();
    expect(spy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Skeleton State
  // ─────────────────────────────────────────────────────────────────────────────

  it('reflects skeleton attribute', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" skeleton></cor-calendar>`,
    });
    expect(page.root?.getAttribute('skeleton')).not.toBeNull();
  });

  it('does not emit events when skeleton', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026" skeleton></cor-calendar>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corMonthChange', spy);
    const nextBtn = page.root?.shadowRoot?.querySelector('.nav-btn--next button');
    (nextBtn as HTMLElement)?.click();
    await page.waitForChanges();
    expect(spy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disabled Dates
  // ─────────────────────────────────────────────────────────────────────────────

  it('accepts disabledDates array prop', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const calendar = page.root as HTMLCorCalendarElement;
    calendar.disabledDates = ['2026-03-15', '2026-03-16'];
    await page.waitForChanges();
    expect(page.root).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Events Array
  // ─────────────────────────────────────────────────────────────────────────────

  it('accepts events array prop', async () => {
    const page = await newSpecPage({
      components: [CorCalendar, CorDatepickerDay],
      html: `<cor-calendar month="3" year="2026"></cor-calendar>`,
    });
    const calendar = page.root as HTMLCorCalendarElement;
    calendar.events = [{ date: '2026-03-15', color: 'primary' }];
    await page.waitForChanges();
    expect(page.root).toBeTruthy();
  });
});
