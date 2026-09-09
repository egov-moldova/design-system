import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';

import '../mud-stepper';
import '../../mud-icon/mud-icon';

import type { StepperStep } from '../mud-stepper.types';

// Romanian voice — onboarding flow used across the spec suite.
const ROMANIAN_STEPS: StepperStep[] = [
  { label: 'Pasul 1: Date personale', status: 'completed' },
  { label: 'Pasul 2: Documente', status: 'current' },
  { label: 'Pasul 3: Confirmare', status: 'pending' },
];

const ALL_STATES: StepperStep[] = [
  { label: 'Finalizat', status: 'completed' },
  { label: 'Curent', status: 'current' },
  { label: 'În așteptare', status: 'pending' },
  { label: 'Eroare', status: 'error' },
];

// ---------------------------------------------------------------------------
// Shadow DOM query helpers
// ---------------------------------------------------------------------------

const queryRoot = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('ol.root') ?? null) as HTMLElement | null;

const querySteps = (root: Element | null | undefined): HTMLLIElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('li.step') ?? []) as HTMLLIElement[];

const queryTriggers = (root: Element | null | undefined): HTMLButtonElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('button.step-trigger') ?? []) as HTMLButtonElement[];

const queryConnectors = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('.connector') ?? []) as HTMLElement[];

describe('mud-stepper', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // mud-icon resolves assets via `getAssetPath()` which requires a base URL.
    setAssetPath('http://localhost/');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // mud-icon lazy-fetches the SVG sprite; stub it so tests stay deterministic.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('<svg></svg>', {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Default rendering — host reflection and ARIA scaffold
  // -------------------------------------------------------------------------
  describe('default rendering', () => {
    it('renders the list landmark with a default aria-label', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      // List semantics live on the HOST (a roleless host carrying aria-label trips
      // axe `aria-prohibited-attr`); the inner <ol> is presentational.
      expect(root?.getAttribute('role')).toBe('list');
      expect(root?.getAttribute('aria-label')).toBe('Progress tracker');
      expect(queryRoot(root)?.getAttribute('role')).toBe('none');
    });

    it('honors a custom aria-label (Romanian)', async () => {
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} aria-label="Pași"></mud-stepper>,
      );
      expect(root?.getAttribute('role')).toBe('list');
      expect(root?.getAttribute('aria-label')).toBe('Pași');
    });

    it('reflects orientation on the host', async () => {
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} orientation="vertical"></mud-stepper>,
      );
      expect(root?.getAttribute('orientation')).toBe('vertical');
    });

    it('reflects interactive on the host when true', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS} interactive></mud-stepper>);
      expect(root?.hasAttribute('interactive')).toBe(true);
    });

    it('defaults orientation to horizontal and interactive to false', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      expect(root?.getAttribute('orientation')).toBe('horizontal');
      expect(root?.hasAttribute('interactive')).toBe(false);
      expect(root?.hasAttribute('compact')).toBe(false);
    });

    it('reflects compact on the host when true', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS} compact></mud-stepper>);
      expect(root?.hasAttribute('compact')).toBe(true);
    });

    it('renders one <li role="listitem"> per step', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      const items = querySteps(root);
      expect(items.length).toBe(ROMANIAN_STEPS.length);
      items.forEach(li => expect(li.getAttribute('role')).toBe('listitem'));
    });

    it('renders n-1 connectors for n steps', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      expect(queryConnectors(root).length).toBe(ROMANIAN_STEPS.length - 1);
    });

    it('renders the Romanian labels verbatim', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      const labels = Array.from(root?.shadowRoot?.querySelectorAll('.label') ?? []).map(el => el.textContent?.trim());
      expect(labels).toEqual(['Pasul 1: Date personale', 'Pasul 2: Documente', 'Pasul 3: Confirmare']);
    });

    it('renders the supporting text line when provided', async () => {
      const stepsWithSupport: StepperStep[] = [
        { label: 'Pasul 1', supportingText: 'Detalii', status: 'current' },
      ];
      const { root } = await render(<mud-stepper steps={stepsWithSupport}></mud-stepper>);
      const support = root?.shadowRoot?.querySelector('.supporting-text');
      expect(support?.textContent?.trim()).toBe('Detalii');
    });
  });

  // -------------------------------------------------------------------------
  // Status → ARIA / class mirroring
  // -------------------------------------------------------------------------
  describe('status mirroring to ARIA + class', () => {
    it('applies step--{status} modifier classes', async () => {
      const { root } = await render(<mud-stepper steps={ALL_STATES}></mud-stepper>);
      const items = querySteps(root);
      expect(items[0].classList.contains('step--completed')).toBe(true);
      expect(items[1].classList.contains('step--current')).toBe(true);
      expect(items[2].classList.contains('step--pending')).toBe(true);
      expect(items[3].classList.contains('step--error')).toBe(true);
    });

    it('marks the current step with aria-current="step"', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      const current = root?.shadowRoot?.querySelector('[aria-current="step"]');
      expect(current?.textContent).toContain('Pasul 2: Documente');
    });

    it('only one step carries aria-current="step" at a time', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      const currents = root?.shadowRoot?.querySelectorAll('[aria-current="step"]') ?? [];
      expect(currents.length).toBe(1);
    });

    it('marks error steps with aria-invalid="true"', async () => {
      const { root } = await render(<mud-stepper steps={ALL_STATES}></mud-stepper>);
      const errorItem = querySteps(root)[3];
      expect(errorItem.getAttribute('aria-invalid')).toBe('true');
    });

    it('does NOT set aria-invalid on non-error steps', async () => {
      const { root } = await render(<mud-stepper steps={ALL_STATES}></mud-stepper>);
      const items = querySteps(root);
      [items[0], items[1], items[2]].forEach(li => expect(li.getAttribute('aria-invalid')).toBeNull());
    });

    it('renders a checkmark icon for completed steps', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      const firstStep = querySteps(root)[0];
      const icon = firstStep.querySelector('mud-icon');
      // mud-icon's `name` prop is non-reflecting — read via property, not attribute.
      expect((icon as unknown as { name: string }).name).toBe('checkmark-large');
    });

    it('renders an exclamation icon for error steps', async () => {
      const { root } = await render(<mud-stepper steps={ALL_STATES}></mud-stepper>);
      const errorStep = querySteps(root)[3];
      const icon = errorStep.querySelector('mud-icon');
      expect((icon as unknown as { name: string }).name).toBe('exclamation');
    });

    it('renders the 1-based number for pending and current steps', async () => {
      const { root } = await render(<mud-stepper steps={ALL_STATES}></mud-stepper>);
      const currentNum = querySteps(root)[1].querySelector('.indicator-number');
      const pendingNum = querySteps(root)[2].querySelector('.indicator-number');
      expect(currentNum?.textContent?.trim()).toBe('2');
      expect(pendingNum?.textContent?.trim()).toBe('3');
    });

    it('honours a custom iconName override on the step', async () => {
      const stepsWithIcon: StepperStep[] = [{ label: 'Pasul 1', status: 'current', iconName: 'warning' }];
      const { root } = await render(<mud-stepper steps={stepsWithIcon}></mud-stepper>);
      const icon = querySteps(root)[0].querySelector('mud-icon');
      // mud-icon's `name` prop is non-reflecting — read via property, not attribute.
      expect((icon as unknown as { name: string }).name).toBe('warning');
    });
  });

  // -------------------------------------------------------------------------
  // currentStep override
  // -------------------------------------------------------------------------
  describe('currentStep override', () => {
    const statusOf = (li: HTMLLIElement): string =>
      ['completed', 'current', 'pending', 'error', 'available'].find(s => li.classList.contains(`step--${s}`)) ?? '';

    it('derives every step status from the index: before=completed, at=current, after=pending', async () => {
      const allPending: StepperStep[] = [
        { label: 'A', status: 'pending' },
        { label: 'B', status: 'pending' },
        { label: 'C', status: 'pending' },
        { label: 'D', status: 'pending' },
      ];
      const { root } = await render(<mud-stepper steps={allPending} currentStep={2}></mud-stepper>);
      expect(querySteps(root).map(statusOf)).toEqual(['completed', 'completed', 'current', 'pending']);
      expect(querySteps(root)[2].getAttribute('aria-current')).toBe('step');
    });

    it('overrides the per-item status entirely (a declared `current`/`available` step is remapped)', async () => {
      const steps: StepperStep[] = [
        { label: 'A', status: 'current' },
        { label: 'B', status: 'available' },
        { label: 'C', status: 'completed' },
      ];
      // currentStep=2 → A,B are before the target, C is the target
      const { root } = await render(<mud-stepper steps={steps} currentStep={2}></mud-stepper>);
      expect(querySteps(root).map(statusOf)).toEqual(['completed', 'completed', 'current']);
      expect(root?.shadowRoot?.querySelectorAll('.step--current')).toHaveLength(1);
    });

    it('keeps an `error` step as error whatever its position', async () => {
      const steps: StepperStep[] = [
        { label: 'A', status: 'pending' },
        { label: 'B', status: 'error' },
        { label: 'C', status: 'pending' },
      ];
      const { root } = await render(<mud-stepper steps={steps} currentStep={2}></mud-stepper>);
      // A is before → completed; B stays error even though it's "before"; C is current
      expect(querySteps(root).map(statusOf)).toEqual(['completed', 'error', 'current']);
      expect(querySteps(root)[1].getAttribute('aria-invalid')).toBe('true');
    });

    it('marks every step completed when currentStep is past the last index (flow finished)', async () => {
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} currentStep={ROMANIAN_STEPS.length}></mud-stepper>,
      );
      expect(querySteps(root).every(li => li.classList.contains('step--completed'))).toBe(true);
      expect(root?.shadowRoot?.querySelectorAll('.step--current')).toHaveLength(0);
    });

    it('works for any step count — currentStep=0 makes only the first step current', async () => {
      const many: StepperStep[] = Array.from({ length: 12 }, (_, i) => ({
        label: `Step ${String(i + 1)}`,
        status: 'pending' as const,
      }));
      const { root } = await render(<mud-stepper steps={many} currentStep={0}></mud-stepper>);
      const statuses = querySteps(root).map(statusOf);
      expect(statuses[0]).toBe('current');
      expect(statuses.slice(1).every(s => s === 'pending')).toBe(true);
    });

    it('ignores a negative or non-integer currentStep', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS} currentStep={-1}></mud-stepper>);
      // untouched: the array's own statuses stand
      expect(querySteps(root).map(statusOf)).toEqual(['completed', 'current', 'pending']);
    });
  });

  // -------------------------------------------------------------------------
  // Interactive mode + mudStepClick
  // -------------------------------------------------------------------------
  describe('interactive mode', () => {
    it('renders completed/current steps as <button> when interactive', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS} interactive></mud-stepper>);
      const buttons = queryTriggers(root);
      // 1 completed + 1 current = 2 actionable buttons; pending stays a passive li.
      expect(buttons.length).toBe(2);
    });

    it('does NOT render <button> elements when not interactive', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      expect(queryTriggers(root).length).toBe(0);
    });

    it('emits mudStepClick with { index, step } when a step is clicked', async () => {
      const onClick = vi.fn();
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} interactive onMudStepClick={onClick}></mud-stepper>,
      );
      const buttons = queryTriggers(root);
      // first button = completed step at index 0
      buttons[0]?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].detail).toEqual({
        index: 0,
        step: ROMANIAN_STEPS[0],
      });
    });

    it('does NOT emit mudStepClick when interactive is false', async () => {
      const onClick = vi.fn();
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} onMudStepClick={onClick}></mud-stepper>,
      );
      // Triggers are not rendered, but the underlying step content also must not
      // emit; we click the first list item to be thorough.
      querySteps(root)[0].click();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does NOT emit mudStepClick for pending steps even in interactive mode', async () => {
      const onClick = vi.fn();
      const stepsWithPending: StepperStep[] = [
        { label: 'A', status: 'completed' },
        { label: 'B', status: 'pending' },
      ];
      const { root } = await render(
        <mud-stepper steps={stepsWithPending} interactive onMudStepClick={onClick}></mud-stepper>,
      );
      // Pending step renders as a passive li — clicking it doesn't dispatch.
      querySteps(root)[1].click();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('emits mudStepClick via the Enter key on a focusable trigger', async () => {
      const onClick = vi.fn();
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} interactive onMudStepClick={onClick}></mud-stepper>,
      );
      // JSX-bound onKeyDown handlers are class methods; invoke directly per the
      // Stencil vitest convention (see mud-chip spec for the same pattern).
      type Instance = {
        handleKeyDown: (ev: KeyboardEvent, step: StepperStep, index: number) => void;
      };
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (root as unknown as Instance).handleKeyDown.call(root, ev, ROMANIAN_STEPS[0], 0);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('emits mudStepClick via the Space key on a focusable trigger', async () => {
      const onClick = vi.fn();
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} interactive onMudStepClick={onClick}></mud-stepper>,
      );
      type Instance = {
        handleKeyDown: (ev: KeyboardEvent, step: StepperStep, index: number) => void;
      };
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      (root as unknown as Instance).handleKeyDown.call(root, ev, ROMANIAN_STEPS[1], 1);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('ignores keys other than Enter/Space', async () => {
      const onClick = vi.fn();
      const { root } = await render(
        <mud-stepper steps={ROMANIAN_STEPS} interactive onMudStepClick={onClick}></mud-stepper>,
      );
      type Instance = {
        handleKeyDown: (ev: KeyboardEvent, step: StepperStep, index: number) => void;
      };
      ['Tab', 'Escape', 'ArrowRight', 'a'].forEach(key => {
        const ev = new KeyboardEvent('keydown', { key, bubbles: true });
        (root as unknown as Instance).handleKeyDown.call(root, ev, ROMANIAN_STEPS[0], 0);
      });
      expect(onClick).not.toHaveBeenCalled();
    });

    it('exposes aria-disabled on non-actionable steps when interactive', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS} interactive></mud-stepper>);
      const items = querySteps(root);
      // Pending step (index 2) must be aria-disabled in interactive mode.
      expect(items[2].getAttribute('aria-disabled')).toBe('true');
      // Completed/current steps render as buttons — the li itself drops aria-disabled.
      expect(items[0].getAttribute('aria-disabled')).toBeNull();
      expect(items[1].getAttribute('aria-disabled')).toBeNull();
    });

    it('honours per-step disabled flag even when status would be actionable', async () => {
      const steps: StepperStep[] = [
        { label: 'A', status: 'completed', disabled: true },
        { label: 'B', status: 'current' },
      ];
      const { root } = await render(<mud-stepper steps={steps} interactive></mud-stepper>);
      const buttons = queryTriggers(root);
      // Only the current step renders as a button — disabled completed step falls back to li.
      expect(buttons.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Accessible names — Romanian status suffix
  // -------------------------------------------------------------------------
  describe('accessible names', () => {
    it("appends the Romanian status suffix to each step's aria-label", async () => {
      const { root } = await render(<mud-stepper steps={ALL_STATES}></mud-stepper>);
      const items = querySteps(root);
      expect(items[0].getAttribute('aria-label')).toBe('Finalizat, finalizat');
      expect(items[1].getAttribute('aria-label')).toBe('Curent, curent');
      expect(items[2].getAttribute('aria-label')).toBe('În așteptare, în așteptare');
      expect(items[3].getAttribute('aria-label')).toBe('Eroare, eroare');
    });

    it('includes supportingText in the accessible name when provided', async () => {
      const steps: StepperStep[] = [{ label: 'Pasul 1', supportingText: 'Detalii', status: 'current' }];
      const { root } = await render(<mud-stepper steps={steps}></mud-stepper>);
      const item = querySteps(root)[0];
      expect(item.getAttribute('aria-label')).toBe('Pasul 1 — Detalii, curent');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    it('renders an empty list when steps is undefined', async () => {
      const { root } = await render(<mud-stepper></mud-stepper>);
      expect(querySteps(root).length).toBe(0);
      expect(queryRoot(root)).toBeTruthy();
    });

    it('renders no connector for a single-step tracker', async () => {
      const { root } = await render(
        <mud-stepper steps={[{ label: 'Singur', status: 'current' }]}></mud-stepper>,
      );
      expect(queryConnectors(root).length).toBe(0);
    });

    it('renders the last step with the step--last modifier', async () => {
      const { root } = await render(<mud-stepper steps={ROMANIAN_STEPS}></mud-stepper>);
      const items = querySteps(root);
      expect(items[items.length - 1].classList.contains('step--last')).toBe(true);
      // Earlier steps must not carry the modifier.
      items.slice(0, -1).forEach(li => expect(li.classList.contains('step--last')).toBe(false));
    });
  });
});
