import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-select';

import { SELECT_SIZES, SELECT_VARIANTS } from '../mud-select.types';

const baseOptions = [
  { value: 'opt-1', label: 'Option 1' },
  { value: 'opt-2', label: 'Option 2' },
  { value: 'opt-3', label: 'Option 3', disabled: true },
  { value: 'opt-4', label: 'Option 4' },
];

/** `baseOptions` as children, which is the only way to give the component a list. */
const baseMarkup = () =>
  baseOptions.map(option => (
    <option value={option.value} disabled={option.disabled}>
      {option.label}
    </option>
  ));

const queryTrigger = (root: Element | null | undefined): HTMLInputElement | null =>
  (root?.shadowRoot?.querySelector('input.trigger') ?? null) as HTMLInputElement | null;

const queryListbox = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.listbox') ?? null) as HTMLElement | null;

const queryLabel = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('label.label') ?? null) as HTMLElement | null;

const queryAssistive = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.assistive') ?? null) as HTMLElement | null;

const queryOptions = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];

const queryGroups = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('[role="group"]') ?? []) as HTMLElement[];

const querySeparators = (root: Element | null | undefined): HTMLElement[] =>
  Array.from(root?.shadowRoot?.querySelectorAll('[role="separator"]') ?? []) as HTMLElement[];

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-select', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-select label="Country"></mud-select>);
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('size')).toBe('medium');
      expect(root?.getAttribute('disabled')).toBeNull();
      expect(root?.getAttribute('required')).toBeNull();
      expect(root?.getAttribute('readonly')).toBeNull();
      expect(root?.getAttribute('invalid')).toBeNull();
      expect(root?.getAttribute('open')).toBeNull();
    });

    it.each(SELECT_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-select variant={variant} label="x"></mud-select>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(SELECT_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-select size={size} label="x"></mud-select>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it('warns and falls back when variant is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-select label="x"></mud-select>);
      (root as unknown as { variant: string }).variant = 'bogus';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="bogus"'));
      expect(root?.getAttribute('variant')).toBe('default');
      warn.mockRestore();
    });

    it('warns and falls back when size is invalid', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { root } = await render(<mud-select label="x"></mud-select>);
      (root as unknown as { size: string }).size = 'huge';
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('size="huge"'));
      expect(root?.getAttribute('size')).toBe('medium');
      warn.mockRestore();
    });
  });

  describe('shadow structure', () => {
    it('renders a combobox trigger inside shadow DOM', async () => {
      const { root } = await render(<mud-select label="x"></mud-select>);
      const trigger = queryTrigger(root);
      expect(trigger).toBeTruthy();
      expect(trigger?.getAttribute('role')).toBe('combobox');
      // ARIA 1.2 implies `aria-haspopup="listbox"` for a combobox, so it is left off.
      expect(trigger?.hasAttribute('aria-haspopup')).toBe(false);
    });

    it('renders the label text via `label` prop', async () => {
      const { root } = await render(<mud-select label="Country code"></mud-select>);
      const label = queryLabel(root);
      expect(label?.textContent).toContain('Country code');
    });

    it('adds a required mark when `required` is set', async () => {
      const { root } = await render(<mud-select label="x" required></mud-select>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeTruthy();
      expect(mark?.textContent?.trim()).toBe('*');
    });

    it('omits the required mark when `required` is unset', async () => {
      const { root } = await render(<mud-select label="x"></mud-select>);
      const mark = root?.shadowRoot?.querySelector('.required-mark');
      expect(mark).toBeNull();
    });

    it('shows the placeholder when no value is selected', async () => {
      const { root } = await render(
        <mud-select label="x" placeholder="Pick one">
          {baseMarkup()}
        </mud-select>,
      );
      const trigger = queryTrigger(root);
      expect(trigger?.getAttribute('placeholder')).toBe('Pick one');
      expect(trigger?.getAttribute('value')).toBe('');
      expect(root?.classList.contains('is-placeholder')).toBe(true);
    });

    it('shows the selected option label when value is set', async () => {
      const { root } = await render(
        <mud-select label="x" value="opt-2">
          {baseMarkup()}
        </mud-select>,
      );
      const trigger = queryTrigger(root);
      expect(trigger?.getAttribute('value')).toBe('Option 2');
      expect(root?.classList.contains('is-placeholder')).toBe(false);
    });

    it('renders a helper assistive row when `helper-text` is set', async () => {
      const { root } = await render(<mud-select label="x" helper-text="Helpful tip"></mud-select>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-helper')).toBe(true);
      expect(assistive?.textContent).toContain('Helpful tip');
    });

    it('renders an error assistive row with the error icon when invalid + error-text', async () => {
      const { root } = await render(<mud-select label="x" invalid error-text="Required"></mud-select>);
      const assistive = queryAssistive(root);
      expect(assistive?.classList.contains('assistive-error')).toBe(true);
      expect(assistive?.textContent).toContain('Required');
      const icon = assistive?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error');
    });

    it('error message takes priority over helper text', async () => {
      const { root } = await render(
        <mud-select label="x" invalid helper-text="Hint" error-text="Required"></mud-select>,
      );
      const assistive = queryAssistive(root);
      expect(assistive?.textContent).toContain('Required');
      expect(assistive?.textContent).not.toContain('Hint');
    });

    it('renders a trailing chevron icon', async () => {
      const { root } = await render(<mud-select label="x"></mud-select>);
      const chevron = root?.shadowRoot?.querySelector('.chevron');
      expect(chevron?.getAttribute('name')).toBe('chevron-bottom');
    });
  });

  describe('listbox behaviour', () => {
    it('keeps the listbox hidden by default', async () => {
      const { root } = await render(<mud-select label="x">{baseMarkup()}</mud-select>);
      const listbox = queryListbox(root);
      expect(listbox?.hasAttribute('hidden')).toBe(true);
      expect(queryTrigger(root)?.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens the listbox when the trigger is clicked', async () => {
      const { root } = await render(<mud-select label="x">{baseMarkup()}</mud-select>);
      const trigger = queryTrigger(root)!;
      trigger.click();
      await flush();
      const listbox = queryListbox(root);
      expect(listbox?.hasAttribute('hidden')).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('opens the listbox when the trailing chevron (outside the button) is clicked', async () => {
      const { root } = await render(<mud-select label="x">{baseMarkup()}</mud-select>);
      const chevronWrap = root?.shadowRoot?.querySelector('.control-icon-end') as HTMLElement;
      chevronWrap.click();
      await flush();
      expect(queryListbox(root)?.hasAttribute('hidden')).toBe(false);
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('does not open on chevron click when disabled', async () => {
      const { root } = await render(
        <mud-select label="x" disabled>
          {baseMarkup()}
        </mud-select>,
      );
      (root?.shadowRoot?.querySelector('.control-icon-end') as HTMLElement)?.click();
      await flush();
      expect(queryListbox(root)?.hasAttribute('hidden')).toBe(true);
    });

    it('emits mudOpen / mudClose when toggling', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { root } = await render(
        <mud-select label="x" onMudOpen={onOpen} onMudClose={onClose}>
          {baseMarkup()}
        </mud-select>,
      );
      const trigger = queryTrigger(root)!;
      trigger.click();
      await flush();
      expect(onOpen).toHaveBeenCalledTimes(1);
      trigger.click();
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders one role="option" per resolved option', async () => {
      const { root } = await render(
        <mud-select label="x" open>
          {baseMarkup()}
        </mud-select>,
      );
      const options = queryOptions(root);
      expect(options.length).toBe(baseOptions.length);
      options.forEach((opt, i) => {
        expect(opt.getAttribute('role')).toBe('option');
        expect(opt.getAttribute('data-value')).toBe(baseOptions[i].value);
      });
    });

    it('marks the matching option as selected', async () => {
      const { root } = await render(
        <mud-select label="x" value="opt-2" open>
          {baseMarkup()}
        </mud-select>,
      );
      const selected = queryOptions(root).find(o => o.getAttribute('aria-selected') === 'true');
      expect(selected?.getAttribute('data-value')).toBe('opt-2');
    });

    it('selects an option on click and emits mudChange', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select label="x" open onMudChange={onChange}>
          {baseMarkup()}
        </mud-select>,
      );
      const second = queryOptions(root)[1];
      second.click();
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-2' });
      expect(root?.getAttribute('value')).toBe('opt-2');
      expect(root?.classList.contains('is-open')).toBe(false);
    });

    it('does not select disabled options', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select label="x" open onMudChange={onChange}>
          {baseMarkup()}
        </mud-select>,
      );
      const disabled = queryOptions(root).find(o => o.classList.contains('is-disabled'))!;
      disabled.click();
      await flush();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard contract', () => {
    // Mock-doc's shadow trigger does not surface JSX-bound onKeyDown via
    // dispatchEvent. The contract is the same once we drive the registered
    // handler directly off the component instance.
    type Instance = { handleTriggerKeyDown: (ev: KeyboardEvent) => void };
    const press = (root: Element | null | undefined, key: string) => {
      const instance = root as unknown as Instance;
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      instance.handleTriggerKeyDown.call(instance, ev);
    };

    it('opens the listbox on ArrowDown when closed', async () => {
      const { root } = await render(<mud-select label="x">{baseMarkup()}</mud-select>);
      press(root, 'ArrowDown');
      await flush();
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('opens the listbox on Enter when closed', async () => {
      const { root } = await render(<mud-select label="x">{baseMarkup()}</mud-select>);
      press(root, 'Enter');
      await flush();
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('closes the listbox on Escape', async () => {
      const { root } = await render(
        <mud-select label="x" open>
          {baseMarkup()}
        </mud-select>,
      );
      press(root, 'Escape');
      await flush();
      expect(root?.classList.contains('is-open')).toBe(false);
    });

    it('selects the highlighted option on Enter', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select label="x" open onMudChange={onChange}>
          {baseMarkup()}
        </mud-select>,
      );
      press(root, 'ArrowDown'); // highlight idx 1
      await flush();
      press(root, 'Enter');
      await flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-2' });
    });

    it('Home / End jump to the first / last enabled option', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select label="x" open onMudChange={onChange}>
          {baseMarkup()}
        </mud-select>,
      );
      press(root, 'End');
      await flush();
      press(root, 'Enter');
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-4' });
    });

    it('ArrowUp / ArrowDown skip disabled options', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select label="x" open value="opt-2" onMudChange={onChange}>
          {baseMarkup()}
        </mud-select>,
      );
      // highlight starts at opt-2 (index 1); ArrowDown should skip opt-3 (disabled) to opt-4.
      press(root, 'ArrowDown');
      await flush();
      press(root, 'Enter');
      await flush();
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'opt-4' });
    });

    it('jumps the highlight to what was typed, as a native select does', async () => {
      const { root } = await render(
        <mud-select label="Food" open>
          <option value="apple">Apples</option>
          <option value="beef">Beef</option>
        </mud-select>,
      );
      await flush();
      press(root, 'b');
      await flush();
      expect(queryOptions(root)[1]?.classList.contains('is-highlighted')).toBe(true);
    });

    it('folds diacritics in type-ahead too', async () => {
      const { root } = await render(
        <mud-select label="Oraș" open>
          <option value="orhei">Orhei</option>
          <option value="balti">Bălți</option>
        </mud-select>,
      );
      await flush();
      press(root, 'b');
      press(root, 'a');
      await flush();
      expect(queryOptions(root)[1]?.classList.contains('is-highlighted')).toBe(true);
    });

    it('lets space continue a type-ahead buffer instead of selecting', async () => {
      const onChange = vi.fn();
      const { root } = await render(
        <mud-select label="City" open onMudChange={onChange}>
          <option value="ny">New York</option>
          <option value="other">Other</option>
        </mud-select>,
      );
      await flush();
      for (const key of ['n', 'e', 'w', ' ', 'y']) press(root, key);
      await flush();
      // Space belongs to "New York", so nothing was committed by pressing it.
      expect(onChange).not.toHaveBeenCalled();
      expect(queryOptions(root)[0]?.classList.contains('is-highlighted')).toBe(true);
    });

    it('commits the highlighted option on Tab', async () => {
      const { root } = await render(
        <mud-select label="Food" open>
          <option value="apple">Apples</option>
          <option value="beef">Beef</option>
        </mud-select>,
      );
      await flush();
      // Opening primes the highlight on the first option, so one ArrowDown
      // moves it to the second — which is what Tab must commit.
      press(root, 'ArrowDown');
      await flush();
      press(root, 'Tab');
      await flush();
      expect((root as unknown as { value: string }).value).toBe('beef');
      expect(root?.classList.contains('is-open')).toBe(false);
    });
  });

  describe('disabled + readonly behaviour', () => {
    it('keeps the trigger disabled when `disabled`', async () => {
      const { root } = await render(<mud-select label="x" disabled></mud-select>);
      const trigger = queryTrigger(root);
      // Native `disabled` is the source of truth; ARIA duplication is dropped.
      expect(trigger?.hasAttribute('disabled')).toBe(true);
      expect(trigger?.getAttribute('aria-disabled')).toBeNull();
    });

    it('does not open on click when disabled', async () => {
      const { root } = await render(
        <mud-select label="x" disabled>
          {baseMarkup()}
        </mud-select>,
      );
      queryTrigger(root)?.click();
      await flush();
      expect(root?.classList.contains('is-open')).toBe(false);
    });

    it('does not open on click when readonly', async () => {
      const { root } = await render(
        <mud-select label="x" readonly>
          {baseMarkup()}
        </mud-select>,
      );
      queryTrigger(root)?.click();
      await flush();
      expect(root?.classList.contains('is-open')).toBe(false);
      expect(queryTrigger(root)?.getAttribute('aria-readonly')).toBe('true');
    });

    it('responds to fieldset disabled via formDisabledCallback', async () => {
      const { root } = await render(<mud-select label="x"></mud-select>);
      expect(queryTrigger(root)?.hasAttribute('disabled')).toBe(false);
      (root as unknown as { formDisabledCallback: (d: boolean) => void }).formDisabledCallback(true);
      await flush();
      expect(queryTrigger(root)?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('ARIA contract', () => {
    it('links the label via aria-labelledby', async () => {
      const { root } = await render(<mud-select label="Country"></mud-select>);
      const trigger = queryTrigger(root);
      const label = queryLabel(root);
      const id = trigger?.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(label?.id).toBe(id);
    });

    it('exposes aria-required when required', async () => {
      const { root } = await render(<mud-select label="x" required></mud-select>);
      expect(queryTrigger(root)?.getAttribute('aria-required')).toBe('true');
    });

    it('exposes aria-invalid when invalid', async () => {
      const { root } = await render(<mud-select label="x" invalid></mud-select>);
      expect(queryTrigger(root)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby to the helper id when helper-text present', async () => {
      const { root } = await render(<mud-select label="x" helper-text="hint"></mud-select>);
      const describedBy = queryTrigger(root)?.getAttribute('aria-describedby');
      const helper = root?.shadowRoot?.querySelector('.assistive-helper');
      expect(describedBy).toBeTruthy();
      expect(helper?.id).toBe(describedBy);
    });

    it('wires aria-describedby to the error id when invalid + error-text present', async () => {
      const { root } = await render(<mud-select label="x" invalid error-text="Required"></mud-select>);
      const describedBy = queryTrigger(root)?.getAttribute('aria-describedby');
      const error = root?.shadowRoot?.querySelector('.assistive-error');
      expect(describedBy).toBeTruthy();
      expect(error?.id).toBe(describedBy);
    });

    it('uses aria-label as the accessible name when no visible label is present', async () => {
      const { root } = await render(<mud-select aria-label="Filter"></mud-select>);
      const trigger = queryTrigger(root);
      expect(trigger?.getAttribute('aria-label')).toBe('Filter');
      expect(trigger?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('wires aria-controls to the listbox id', async () => {
      const { root } = await render(
        <mud-select label="x" open>
          {baseMarkup()}
        </mud-select>,
      );
      const trigger = queryTrigger(root);
      const listbox = queryListbox(root);
      expect(trigger?.getAttribute('aria-controls')).toBe(listbox?.id);
    });

    it('sets aria-activedescendant when an option is highlighted', async () => {
      const { root } = await render(
        <mud-select label="x" open>
          {baseMarkup()}
        </mud-select>,
      );
      const trigger = queryTrigger(root);
      const desc = trigger?.getAttribute('aria-activedescendant');
      expect(desc).toBeTruthy();
      expect(root?.shadowRoot?.getElementById(desc!)).toBeTruthy();
    });
  });

  describe('native markup composition', () => {
    it('reads flat <option> children as rows', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option value="apple">Apples</option>
          <option value="banana">Bananas</option>
        </mud-select>,
      );
      await flush();
      expect(queryOptions(root).map(el => el.textContent?.trim())).toEqual(['Apples', 'Bananas']);
    });

    it('falls back to the text as the value when <option> has none', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option>Apples</option>
        </mud-select>,
      );
      await flush();
      expect(queryOptions(root)[0]?.getAttribute('data-value')).toBe('Apples');
    });

    it('reads options nested inside <optgroup>', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option value="none">Choose</option>
          <optgroup label="Fruit">
            <option value="apple">Apples</option>
            <option value="banana">Bananas</option>
          </optgroup>
          <optgroup label="Meat">
            <option value="beef">Beef</option>
          </optgroup>
        </mud-select>,
      );
      await flush();
      expect(queryOptions(root).map(el => el.getAttribute('data-value'))).toEqual(['none', 'apple', 'banana', 'beef']);
    });

    it('disables every option of a disabled <optgroup>', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <optgroup label="Fruit" disabled>
            <option value="apple">Apples</option>
          </optgroup>
          <optgroup label="Meat">
            <option value="beef">Beef</option>
          </optgroup>
        </mud-select>,
      );
      await flush();
      const [apple, beef] = queryOptions(root);
      expect(apple?.getAttribute('aria-disabled')).toBe('true');
      expect(beef?.getAttribute('aria-disabled')).toBeNull();
    });

    it('keeps an <optgroup> without a label as a plain run of options', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <optgroup>
            <option value="apple">Apples</option>
          </optgroup>
        </mud-select>,
      );
      await flush();
      expect(queryOptions(root).map(el => el.getAttribute('data-value'))).toEqual(['apple']);
    });

    it('starts on the option marked selected', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option value="apple">Apples</option>
          <option value="banana" selected>
            Bananas
          </option>
        </mud-select>,
      );
      await flush();
      expect((root as unknown as { value: string }).value).toBe('banana');
    });

    it('finds a selected option nested in an optgroup', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option value="none">Choose</option>
          <optgroup label="Fruit">
            <option value="banana" selected>
              Bananas
            </option>
          </optgroup>
        </mud-select>,
      );
      await flush();
      expect((root as unknown as { value: string }).value).toBe('banana');
    });

    it('lets an explicit value beat selected, set as a property', async () => {
      const { root } = await render(
        <mud-select label="Food" value="apple">
          <option value="apple">Apples</option>
          <option value="banana" selected>
            Bananas
          </option>
        </mud-select>,
      );
      await flush();
      expect((root as unknown as { value: string }).value).toBe('apple');
    });

    it('ignores selected on a disabled option', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option value="apple">Apples</option>
          <option value="banana" selected disabled>
            Bananas
          </option>
        </mud-select>,
      );
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
    });

    it('leaves value empty when no option is marked selected', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <option value="apple">Apples</option>
        </mud-select>,
      );
      await flush();
      expect((root as unknown as { value: string }).value).toBe('');
    });
  });

  describe('groups and separators', () => {
    const grouped = (
      <mud-select label="Food">
        <option value="none">Choose</option>
        <hr />
        <optgroup label="Fruit">
          <option value="apple">Apples</option>
          <option value="banana">Bananas</option>
        </optgroup>
        <hr />
        <optgroup label="Meat">
          <option value="beef">Beef</option>
        </optgroup>
      </mud-select>
    );

    it('wraps each optgroup in a named role="group"', async () => {
      const { root } = await render(grouped);
      await flush();
      const groups = queryGroups(root);
      expect(groups).toHaveLength(2);

      const names = groups.map(group => {
        const id = group.getAttribute('aria-labelledby');
        return root?.shadowRoot?.querySelector(`#${id}`)?.textContent?.trim();
      });
      expect(names).toEqual(['Fruit', 'Meat']);
    });

    it('keeps a group heading out of the option list', async () => {
      const { root } = await render(grouped);
      await flush();
      expect(queryOptions(root)).toHaveLength(4);
    });

    it('puts each group option inside its own group', async () => {
      const { root } = await render(grouped);
      await flush();
      const [fruit, meat] = queryGroups(root);
      const values = (el: HTMLElement) =>
        Array.from(el.querySelectorAll('.option')).map(o => o.getAttribute('data-value'));
      expect(values(fruit)).toEqual(['apple', 'banana']);
      expect(values(meat)).toEqual(['beef']);
    });

    it('numbers options across groups in document order', async () => {
      const { root } = await render(grouped);
      await flush();
      expect(queryOptions(root).map(el => el.getAttribute('data-option-index'))).toEqual(['0', '1', '2', '3']);
    });

    it('drops rules that divide nothing', async () => {
      const { root } = await render(
        <mud-select label="Food">
          <hr />
          <option value="apple">Apples</option>
          <hr />
          <hr />
          <option value="beef">Beef</option>
          <hr />
        </mud-select>,
      );
      await flush();
      // Leading, doubled and trailing rules go; the one real divider stays.
      expect(querySeparators(root)).toHaveLength(1);
    });

    it('drops a rule that would double a group heading rule', async () => {
      const { root } = await render(grouped);
      await flush();
      // Both <hr>s here sit against a heading, which draws its own rule.
      expect(querySeparators(root)).toHaveLength(0);
    });
  });

  describe('filtering', () => {
    const type = async (root: Element | null | undefined, text: string) => {
      const input = queryTrigger(root);
      if (!input) throw new Error('no trigger');
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
    };

    const cities = (
      <mud-select label="Oraș" searchable placeholder="Caută">
        <option value="chisinau">Chișinău</option>
        <option value="balti">Bălți</option>
        <option value="tandarei">Țăndărei</option>
        <option value="orhei">Orhei</option>
      </mud-select>
    );

    it('narrows the list to what matches', async () => {
      const { root } = await render(cities);
      await flush();
      await type(root, 'orhei');
      expect(queryOptions(root).map(el => el.getAttribute('data-value'))).toEqual(['orhei']);
    });

    it('matches Romanian text typed without diacritics', async () => {
      const { root } = await render(cities);
      await flush();
      await type(root, 'chisinau');
      expect(queryOptions(root).map(el => el.getAttribute('data-value'))).toEqual(['chisinau']);
    });

    it('matches comma-below and cedilla spellings alike', async () => {
      const { root } = await render(
        <mud-select label="Oraș" searchable>
          <option value="comma">Țăndărei</option>
          {/* The legacy cedilla spelling of the same name. */}
          <option value="cedilla">Ţăndărei</option>
        </mud-select>,
      );
      await flush();
      await type(root, 'tandarei');
      expect(queryOptions(root)).toHaveLength(2);
    });

    it('ignores case and surrounding space', async () => {
      const { root } = await render(cities);
      await flush();
      await type(root, '  BĂLȚI  ');
      expect(queryOptions(root).map(el => el.getAttribute('data-value'))).toEqual(['balti']);
    });

    it('matches the value as well as the label', async () => {
      const { root } = await render(cities);
      await flush();
      await type(root, 'balti');
      expect(queryOptions(root).map(el => el.getAttribute('data-value'))).toEqual(['balti']);
    });

    it('drops a group whose options all fail the filter', async () => {
      const { root } = await render(
        <mud-select label="Food" searchable>
          <optgroup label="Fruit">
            <option value="apple">Apples</option>
          </optgroup>
          <optgroup label="Meat">
            <option value="beef">Beef</option>
          </optgroup>
        </mud-select>,
      );
      await flush();
      await type(root, 'apple');
      const groups = queryGroups(root);
      expect(groups).toHaveLength(1);
      const id = groups[0]?.getAttribute('aria-labelledby');
      expect(root?.shadowRoot?.querySelector(`#${id}`)?.textContent?.trim()).toBe('Fruit');
    });

    it('shows the empty state when nothing matches', async () => {
      const { root } = await render(cities);
      await flush();
      await type(root, 'zzz');
      expect(queryOptions(root)).toHaveLength(0);
      expect(root?.shadowRoot?.querySelector('.listbox-empty')).toBeTruthy();
    });

    it('opens the listbox as soon as the user types', async () => {
      const { root } = await render(cities);
      await flush();
      expect(queryTrigger(root)?.getAttribute('aria-expanded')).toBe('false');
      await type(root, 'or');
      expect(queryTrigger(root)?.getAttribute('aria-expanded')).toBe('true');
    });

    it('does not filter when searchable is off', async () => {
      const { root } = await render(
        <mud-select label="Oraș">
          <option value="orhei">Orhei</option>
          <option value="balti">Bălți</option>
        </mud-select>,
      );
      await flush();
      await type(root, 'orhei');
      expect(queryOptions(root)).toHaveLength(2);
    });

    it('opens on an empty field so typing starts a query, not an edit', async () => {
      const { root } = await render(
        <mud-select label="Oraș" searchable value="orhei" open>
          <option value="orhei">Orhei</option>
          <option value="balti">Bălți</option>
        </mud-select>,
      );
      await flush();
      const input = queryTrigger(root);
      // Were the label still in the field, the first keystroke would append to it.
      expect(input?.getAttribute('value')).toBe('');
      expect(input?.getAttribute('placeholder')).toBe('Orhei');
    });

    it('keeps showing the selection when the query matches nothing', async () => {
      const { root } = await render(
        <mud-select label="Oraș" searchable value="orhei" open>
          <option value="orhei">Orhei</option>
        </mud-select>,
      );
      await flush();
      await type(root, 'zzz');
      expect(queryOptions(root)).toHaveLength(0);
      // The selection is looked up in the whole model, so an empty result does
      // not make the field look cleared.
      expect(queryTrigger(root)?.getAttribute('placeholder')).toBe('Orhei');
    });

    it('clears the query on selection so the label is what shows', async () => {
      const { root } = await render(cities);
      await flush();
      await type(root, 'orhei');
      (queryOptions(root)[0] as HTMLElement).click();
      await flush();
      expect(queryTrigger(root)?.getAttribute('value')).toBe('Orhei');
      expect(queryOptions(root)).toHaveLength(4);
    });
  });

  describe('slots', () => {
    it('forwards content into the icon-start slot', async () => {
      const { root } = await render(
        <mud-select label="Country">
          <mud-icon slot="icon-start" name="house" size={20}></mud-icon>
        </mud-select>,
      );
      const slotted = root?.querySelector('[slot="icon-start"]');
      expect(slotted?.tagName.toLowerCase()).toBe('mud-icon');
    });
  });

  describe('aria-label capture', () => {
    it('captures the host aria-label into a state field and strips the attribute', async () => {
      const { root } = await render(<mud-select aria-label="Filter"></mud-select>);
      await flush();
      expect(root?.hasAttribute('aria-label')).toBe(false);
      const trigger = queryTrigger(root);
      expect(trigger?.getAttribute('aria-label')).toBe('Filter');
    });

    it('keeps using the captured value after the host attribute is gone', async () => {
      const { root } = await render(<mud-select aria-label="Filter"></mud-select>);
      await flush();
      // Re-render via prop change; aria-label must persist.
      (root as unknown as { variant: string }).variant = 'destructive';
      await flush();
      expect(queryTrigger(root)?.getAttribute('aria-label')).toBe('Filter');
    });
  });

  describe('form validity', () => {
    type InstanceWithInternals = { internals: ElementInternals };

    it('sets valueMissing on transition from filled to empty when required', async () => {
      const { root } = await render(<mud-select label="x" required value="opt-2"></mud-select>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = '';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('clears validity when value is set and required is true', async () => {
      const { root } = await render(<mud-select label="x" required></mud-select>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { value: string }).value = 'opt-2';
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });

    it('re-syncs validity when required toggles', async () => {
      const { root } = await render(<mud-select label="x"></mud-select>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { required: boolean }).required = true;
      await flush();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({ valueMissing: true });
      spy.mockRestore();
    });

    it('resets validity on formResetCallback', async () => {
      const { root } = await render(<mud-select label="x" required value="opt-2"></mud-select>);
      const internals = (root as unknown as InstanceWithInternals).internals;
      const spy = vi.spyOn(internals, 'setValidity');
      (root as unknown as { formResetCallback: () => void }).formResetCallback();
      await flush();
      // initialValue was 'opt-2' so reset keeps the value → no valueMissing.
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toEqual({});
      spy.mockRestore();
    });
  });
});
