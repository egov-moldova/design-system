import type { SpecPage } from '@stencil/core/testing';
import { newSpecPage } from '@stencil/core/testing';

import { CorTimeline } from '../cor-timeline';
import { CorTimelineVariant, CorTimelineScaleType, CorTimelineSelectorType } from '../cor-timeline.enums';

describe('cor-timeline', () => {
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const buildPage = async (html: string): Promise<SpecPage> =>
    newSpecPage({
      components: [CorTimeline],
      html,
    });

  const shadowRoot = (page: SpecPage) => page.root!.shadowRoot!;

  const getNeedles = (page: SpecPage) => Array.from(shadowRoot(page).querySelectorAll('.timeline__needle'));

  const getRangeHighlight = (page: SpecPage) =>
    shadowRoot(page).querySelector('.timeline__range') as HTMLElement | null;

  const getTicks = (page: SpecPage) => Array.from(shadowRoot(page).querySelectorAll('.timeline__tick'));

  const getMajorTicks = (page: SpecPage) => Array.from(shadowRoot(page).querySelectorAll('.timeline__tick--major'));

  const getLabels = (page: SpecPage) => Array.from(shadowRoot(page).querySelectorAll('.timeline__label'));

  const getDragControls = (page: SpecPage) => Array.from(shadowRoot(page).querySelectorAll('.timeline__drag-control'));

  const getBottomCircles = (page: SpecPage) =>
    Array.from(shadowRoot(page).querySelectorAll('.timeline__bottom-circle'));

  // ---------------------------------------------------------------------------
  // Rendering — defaults
  // ---------------------------------------------------------------------------

  describe('rendering with default props', () => {
    it('renders the host element', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root).toBeTruthy();
    });

    it('reflects default variant attribute', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.getAttribute('variant')).toBe(CorTimelineVariant.ON_PAGE);
    });

    it('reflects default scale-type attribute', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.getAttribute('scale-type')).toBe(CorTimelineScaleType.YEARS);
    });

    it('reflects default selector-type attribute', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.getAttribute('selector-type')).toBe(CorTimelineSelectorType.SINGLE);
    });

    it('renders a scroll container with role="region"', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      const region = shadowRoot(page).querySelector('[role="region"]');
      expect(region).toBeTruthy();
      expect(region!.getAttribute('aria-label')).toBe('Timeline scale');
    });

    it('renders exactly one needle in single mode', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(getNeedles(page)).toHaveLength(1);
    });

    it('does not render a range highlight in single mode', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(getRangeHighlight(page)).toBeNull();
    });

    it('renders exactly one drag control in single mode', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(getDragControls(page)).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Prop reflection
  // ---------------------------------------------------------------------------

  describe('prop reflection', () => {
    it('reflects variant prop', async () => {
      const page = await buildPage(`<cor-timeline variant="on-map"></cor-timeline>`);
      expect(page.root!.getAttribute('variant')).toBe(CorTimelineVariant.ON_MAP);
    });

    it('reflects scale-type prop', async () => {
      const page = await buildPage(`<cor-timeline scale-type="months"></cor-timeline>`);
      expect(page.root!.getAttribute('scale-type')).toBe(CorTimelineScaleType.MONTHS);
    });

    it('reflects selector-type prop', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range"></cor-timeline>`);
      expect(page.root!.getAttribute('selector-type')).toBe(CorTimelineSelectorType.RANGE);
    });
  });

  // ---------------------------------------------------------------------------
  // Range mode rendering
  // ---------------------------------------------------------------------------

  describe('range selector mode', () => {
    it('renders two needles in range mode', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      expect(getNeedles(page)).toHaveLength(2);
    });

    it('renders start and end needle classes', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      const needles = getNeedles(page);
      expect(needles[0].classList.contains('timeline__needle--start')).toBe(true);
      expect(needles[1].classList.contains('timeline__needle--end')).toBe(true);
    });

    it('renders a range highlight element', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      expect(getRangeHighlight(page)).toBeTruthy();
    });

    it('renders two drag controls in range mode', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      expect(getDragControls(page)).toHaveLength(2);
    });

    it('range highlight has role="slider" and aria attributes', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      const range = getRangeHighlight(page)!;
      expect(range.getAttribute('role')).toBe('slider');
      expect(range.getAttribute('aria-valuemin')).toBe('0');
      expect(range.getAttribute('aria-valuemax')).toBe('100');
      expect(range.getAttribute('aria-label')).toBe('Timeline range');
    });
  });

  // ---------------------------------------------------------------------------
  // Needle ARIA
  // ---------------------------------------------------------------------------

  describe('needle accessibility', () => {
    it('start needle has slider role and correct aria attrs in single mode', async () => {
      const page = await buildPage(`<cor-timeline min="10" max="50"></cor-timeline>`);
      const needle = getNeedles(page)[0] as HTMLElement;
      expect(needle.getAttribute('role')).toBe('slider');
      expect(needle.getAttribute('aria-valuemin')).toBe('10');
      expect(needle.getAttribute('aria-valuemax')).toBe('50');
      expect(needle.getAttribute('aria-label')).toBe('Timeline start');
      expect(needle.getAttribute('tabindex')).toBe('0');
    });

    it('end needle has correct aria-label in range mode', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      const endNeedle = getNeedles(page)[1] as HTMLElement;
      expect(endNeedle.getAttribute('aria-label')).toBe('Timeline end');
    });
  });

  // ---------------------------------------------------------------------------
  // Ticks & labels
  // ---------------------------------------------------------------------------

  describe('ticks and labels', () => {
    it('renders tick elements for each step', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="5" step="1"></cor-timeline>`);
      // 0,1,2,3,4,5 => 6 ticks
      expect(getTicks(page)).toHaveLength(6);
    });

    it('marks first and last ticks', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="5" step="1"></cor-timeline>`);
      const ticks = getTicks(page);
      expect(ticks[0].classList.contains('timeline__tick--first')).toBe(true);
      expect(ticks[ticks.length - 1].classList.contains('timeline__tick--last')).toBe(true);
    });

    it('renders major ticks with labels', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="5" step="1"></cor-timeline>`);
      const majorTicks = getMajorTicks(page);
      expect(majorTicks.length).toBeGreaterThan(0);
      majorTicks.forEach(tick => {
        const label = tick.querySelector('.timeline__label');
        expect(label).toBeTruthy();
      });
    });

    it('renders year labels as integers', async () => {
      const page = await buildPage(`<cor-timeline scale-type="years" min="2010" max="2012" step="1"></cor-timeline>`);
      const labels = getLabels(page).map(l => l.textContent);
      expect(labels).toContain('2010');
      expect(labels).toContain('2012');
    });

    it('renders month labels as abbreviations', async () => {
      const page = await buildPage(`<cor-timeline scale-type="months" min="0" max="11" step="1"></cor-timeline>`);
      const labels = getLabels(page).map(l => l.textContent);
      expect(labels).toContain('Jan');
      expect(labels).toContain('Dec');
    });

    it('renders nothing when total <= 0 or step <= 0', async () => {
      const page = await buildPage(`<cor-timeline min="10" max="5" step="1"></cor-timeline>`);
      expect(getTicks(page)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Variant variants (host CSS classes)
  // ---------------------------------------------------------------------------

  describe('variant variants', () => {
    it('applies timeline--on-page class by default', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--on-page')).toBe(true);
    });

    it('applies timeline--on-card class', async () => {
      const page = await buildPage(`<cor-timeline variant="on-card"></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--on-card')).toBe(true);
    });

    it('applies timeline--on-map class', async () => {
      const page = await buildPage(`<cor-timeline variant="on-map"></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--on-map')).toBe(true);
    });

    it('applies timeline--on-map-small class', async () => {
      const page = await buildPage(`<cor-timeline variant="on-map-small"></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--on-map-small')).toBe(true);
    });

    it('renders bottom-align circle only for on-card variant', async () => {
      const page = await buildPage(`<cor-timeline variant="on-card" selector-type="single"></cor-timeline>`);
      expect(getBottomCircles(page).length).toBeGreaterThan(0);
    });

    it('does not render bottom-align circle for on-page variant', async () => {
      const page = await buildPage(`<cor-timeline variant="on-page" selector-type="single"></cor-timeline>`);
      expect(getBottomCircles(page)).toHaveLength(0);
    });

    it('renders two bottom circles in range + on-card', async () => {
      const page = await buildPage(
        `<cor-timeline variant="on-card" selector-type="range" min="0" max="100"></cor-timeline>`,
      );
      expect(getBottomCircles(page)).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Value initialization
  // ---------------------------------------------------------------------------

  describe('value initialization', () => {
    it('defaults to min value in single mode when no value is set', async () => {
      const page = await buildPage(`<cor-timeline min="2010" max="2020"></cor-timeline>`);
      const needle = getNeedles(page)[0] as HTMLElement;
      // Needle should be at 0% (min value)
      expect(needle.style.left).toBe('0%');
    });

    it('defaults to [min, max] in range mode when no value is set', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range" min="0" max="100"></cor-timeline>`);
      const needles = getNeedles(page);
      expect((needles[0] as HTMLElement).style.left).toBe('0%');
      expect((needles[1] as HTMLElement).style.left).toBe('100%');
    });

    it('parses JSON array value attribute for range mode', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" value="[25,75]"></cor-timeline>`,
      );
      const needles = getNeedles(page);
      expect((needles[0] as HTMLElement).style.left).toBe('25%');
      expect((needles[1] as HTMLElement).style.left).toBe('75%');
    });

    it('parses comma-separated value attribute for range mode', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" value="20,80"></cor-timeline>`,
      );

      // Check internal state first
      const component = page.rootInstance as CorTimeline;

      expect(component.internalValue).toEqual([20, 80]);
      expect(component.getValueStart()).toBe(20);
      expect(component.getValueEnd()).toBe(80);

      const needles = getNeedles(page);
      expect((needles[0] as HTMLElement).style.left).toBe('20%');
      expect((needles[1] as HTMLElement).style.left).toBe('80%');
    });

    it('parses single numeric value attribute', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" value="50"></cor-timeline>`);
      const needle = getNeedles(page)[0] as HTMLElement;
      expect(needle.style.left).toBe('50%');
    });
  });

  // ---------------------------------------------------------------------------
  // Value change via prop mutation
  // ---------------------------------------------------------------------------

  describe('value prop changes', () => {
    it('updates needle position when value prop changes', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" value="0"></cor-timeline>`);
      const component = page.rootInstance as CorTimeline;
      component.value = 50;
      await page.waitForChanges();

      const needle = getNeedles(page)[0] as HTMLElement;
      expect(needle.style.left).toBe('50%');
    });

    it('updates range needles when value prop changes to tuple', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" value="[0,100]"></cor-timeline>`,
      );
      const component = page.rootInstance as CorTimeline;
      component.value = [30, 70];
      await page.waitForChanges();

      const needles = getNeedles(page);
      expect((needles[0] as HTMLElement).style.left).toBe('30%');
      expect((needles[1] as HTMLElement).style.left).toBe('70%');
    });
  });

  // ---------------------------------------------------------------------------
  // corTimelineChange event
  // ---------------------------------------------------------------------------

  describe('corTimelineChange event', () => {
    it('emits event with value, valueStart, valueEnd in single mode', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="1" value="50"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      // Simulate keyboard ArrowRight on the start needle
      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalled();
      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.valueStart).toBe(51);
      expect(detail.valueEnd).toBeNull();
      expect(detail.value).toBe(51);
    });

    it('emits event with valueEnd in range mode', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="1" value="[20,80]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      // Keyboard ArrowRight on end needle
      const endNeedle = getNeedles(page)[1] as HTMLElement;
      endNeedle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy).toHaveBeenCalled();
      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.valueStart).toBe(20);
      expect(detail.valueEnd).toBe(81);
      expect(detail.value).toEqual([20, 81]);
    });
  });

  // ---------------------------------------------------------------------------
  // Needle keyboard navigation
  // ---------------------------------------------------------------------------

  describe('needle keyboard navigation', () => {
    it('ArrowRight increases value by step', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="5" value="50"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(55);
    });

    it('ArrowLeft decreases value by step', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="5" value="50"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(45);
    });

    it('ArrowUp increases value by step', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="10" value="20"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(30);
    });

    it('ArrowDown decreases value by step', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="10" value="30"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(20);
    });

    it('Shift + ArrowRight increases by step * 10', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="1" value="10"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(20);
    });

    it('Home key moves needle to min', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="1" value="50"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(0);
    });

    it('End key moves needle to max', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="1" value="50"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(100);
    });

    it('does not go below min', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="5" value="0"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(0);
    });

    it('does not go above max', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="5" value="100"></cor-timeline>`);
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const needle = getNeedles(page)[0] as HTMLElement;
      needle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      expect(eventSpy.mock.calls[0][0].detail.value).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Range keyboard navigation — start needle
  // ---------------------------------------------------------------------------

  describe('range needle keyboard navigation', () => {
    it('ArrowRight on start needle moves start forward, clamped to end', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="5" value="[40,60]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const startNeedle = getNeedles(page)[0] as HTMLElement;
      startNeedle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value).toEqual([45, 60]);
    });

    it('ArrowLeft on end needle moves end backward, clamped to start', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="5" value="[40,60]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const endNeedle = getNeedles(page)[1] as HTMLElement;
      endNeedle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value).toEqual([40, 55]);
    });

    it('start needle cannot cross end needle', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="10" value="[50,60]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const startNeedle = getNeedles(page)[0] as HTMLElement;
      startNeedle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      // start clamped to end (60)
      expect(detail.value[0]).toBeLessThanOrEqual(60);
    });

    it('end needle cannot cross start needle', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="10" value="[40,50]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const endNeedle = getNeedles(page)[1] as HTMLElement;
      endNeedle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value[1]).toBeGreaterThanOrEqual(40);
    });
  });

  // ---------------------------------------------------------------------------
  // Range bar keyboard navigation
  // ---------------------------------------------------------------------------

  describe('range bar keyboard navigation', () => {
    it('ArrowRight shifts entire range forward', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="5" value="[20,40]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const range = getRangeHighlight(page)!;
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value).toEqual([25, 45]);
    });

    it('ArrowLeft shifts entire range backward', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="5" value="[20,40]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const range = getRangeHighlight(page)!;
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value).toEqual([15, 35]);
    });

    it('Home key moves range to start', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="5" value="[30,50]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const range = getRangeHighlight(page)!;
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value).toEqual([0, 20]);
    });

    it('End key moves range to end', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="5" value="[30,50]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const range = getRangeHighlight(page)!;
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value).toEqual([80, 100]);
    });

    it('range does not exceed min boundary', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="10" value="[5,25]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const range = getRangeHighlight(page)!;
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value[0]).toBeGreaterThanOrEqual(0);
    });

    it('range does not exceed max boundary', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" step="10" value="[75,95]"></cor-timeline>`,
      );
      const eventSpy = jest.fn();
      page.root!.addEventListener('corTimelineChange', eventSpy);

      const range = getRangeHighlight(page)!;
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await page.waitForChanges();

      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.value[1]).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Scale change watchers
  // ---------------------------------------------------------------------------

  describe('watch handlers', () => {
    it('re-initializes when min changes', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="1" value="50"></cor-timeline>`);
      const component = page.rootInstance as CorTimeline;
      component.min = 40;
      await page.waitForChanges();

      const needle = getNeedles(page)[0] as HTMLElement;
      // value 50, new range 40–100, percent = (50-40)/(100-40)*100 ≈ 16.67%
      const left = parseFloat(needle.style.left);
      expect(left).toBeCloseTo(16.67, 0);
    });

    it('re-initializes when max changes', async () => {
      const page = await buildPage(`<cor-timeline min="0" max="100" step="1" value="50"></cor-timeline>`);
      const component = page.rootInstance as CorTimeline;
      component.max = 200;
      await page.waitForChanges();

      const needle = getNeedles(page)[0] as HTMLElement;
      // value 50, range 0–200, percent = 25%
      expect(needle.style.left).toBe('25%');
    });
  });

  // ---------------------------------------------------------------------------
  // Range highlight positioning
  // ---------------------------------------------------------------------------

  describe('range highlight positioning', () => {
    it('range highlight has correct left and width styles', async () => {
      const page = await buildPage(
        `<cor-timeline selector-type="range" min="0" max="100" value="[20,80]"></cor-timeline>`,
      );
      const range = getRangeHighlight(page)!;
      expect(range.style.left).toBe('20%');
      expect(range.style.width).toBe('60%');
    });
  });

  // ---------------------------------------------------------------------------
  // Actions slot
  // ---------------------------------------------------------------------------

  describe('actions slot', () => {
    it('renders actions slot element', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      const actionsSlot = shadowRoot(page).querySelector('slot[name="actions"]');
      expect(actionsSlot).toBeTruthy();
    });

    it('does not have timeline--has-actions class without slotted content', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--has-actions')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Host class composition
  // ---------------------------------------------------------------------------

  describe('host class composition', () => {
    it('applies timeline class always', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.classList.contains('timeline')).toBe(true);
    });

    it('applies selector-type class', async () => {
      const page = await buildPage(`<cor-timeline selector-type="range"></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--range')).toBe(true);
    });

    it('applies single selector class by default', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(page.root!.classList.contains('timeline--single')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Needle label formatting
  // ---------------------------------------------------------------------------

  describe('needle label formatting', () => {
    it('shows integer label for years scale', async () => {
      const page = await buildPage(
        `<cor-timeline scale-type="years" min="2010" max="2020" step="1" value="2015"></cor-timeline>`,
      );
      const needleLabel = shadowRoot(page).querySelector('.timeline__needle-label');
      expect(needleLabel?.textContent).toBe('2015');
    });

    it('shows month abbreviation label for months scale', async () => {
      const page = await buildPage(
        `<cor-timeline scale-type="months" min="0" max="11" step="1" value="3"></cor-timeline>`,
      );
      const needleLabel = shadowRoot(page).querySelector('.timeline__needle-label');
      expect(needleLabel?.textContent).toBe('Apr');
    });
  });

  // ---------------------------------------------------------------------------
  // Centered vs bottom-align tick classes
  // ---------------------------------------------------------------------------

  describe('tick alignment classes', () => {
    it('adds timeline__tick--centered class for on-page variant', async () => {
      const page = await buildPage(`<cor-timeline variant="on-page" min="0" max="5" step="1"></cor-timeline>`);
      const ticks = getTicks(page);
      expect(ticks[0].classList.contains('timeline__tick--centered')).toBe(true);
    });

    it('does not add timeline__tick--centered class for on-card variant', async () => {
      const page = await buildPage(`<cor-timeline variant="on-card" min="0" max="5" step="1"></cor-timeline>`);
      const ticks = getTicks(page);
      expect(ticks[0].classList.contains('timeline__tick--centered')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Disconnected callback
  // ---------------------------------------------------------------------------

  describe('lifecycle', () => {
    it('does not throw when disconnected', async () => {
      const page = await buildPage(`<cor-timeline></cor-timeline>`);
      expect(() => {
        page.root!.remove();
      }).not.toThrow();
    });
  });
});
