import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { RADIO_SIZES } from './mud-radio.types';
import type { RadioSize } from './mud-radio.types';

type RadioArgs = {
  size: RadioSize;
  checked: boolean;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  readonly: boolean;
  label: string;
  supportingText: string;
  errorText: string;
  name: string;
  value: string;
};

const ERROR_TEXT = 'Select an option to continue.';

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

// ---------- Slot-first markup helper ----------
//
// The `label` / `supporting-text` props render visible text; the slots of the
// same names replace them for rich content. This helper uses the slots so every
// story renders the same structure, rich or plain.

type CbOpts = {
  size?: RadioSize;
  label?: string;
  supporting?: string;
  /** Space-separated boolean attribute list. */
  flags?: string;
  /** Form-control name (used by the Group story). */
  name?: string;
  /** Submitted value when this radio is checked. */
  value?: string;
  /** Native aria-label: overrides the accessible name; the visible label stays. */
  ariaLabel?: string;
  /** Error message shown under the text while `invalid` is set. */
  errorText?: string;
};

const cb = (opts: CbOpts = {}): string => {
  const attrs = [
    opts.size && opts.size !== 'md' ? `size="${opts.size}"` : '',
    opts.name ? `name="${opts.name}"` : '',
    opts.value ? `value="${opts.value}"` : '',
    opts.ariaLabel ? `aria-label="${opts.ariaLabel}"` : '',
    opts.errorText ? `error-text="${opts.errorText}"` : '',
    opts.flags ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const opener = attrs ? `<mud-radio ${attrs}>` : '<mud-radio>';
  const slots = [
    opts.label ? `<span slot="label">${opts.label}</span>` : '',
    opts.supporting ? `<span slot="supporting-text">${opts.supporting}</span>` : '',
  ]
    .filter(Boolean)
    .join('');
  return `${opener}${slots}</mud-radio>`;
};

const renderRadio = (args: RadioArgs) =>
  cb({
    size: args.size,
    label: args.label,
    supporting: args.supportingText,
    errorText: args.errorText || undefined,
    name: args.name || undefined,
    value: args.value || undefined,
    flags: [
      args.checked && 'checked',
      args.disabled && 'disabled',
      args.invalid && 'invalid',
      args.required && 'required',
      args.readonly && 'readonly',
    ]
      .filter(Boolean)
      .join(' '),
  });

const docsSourceDefault = (args: RadioArgs) =>
  renderRadio(args)
    .replace(/<\/mud-radio>/, '\n</mud-radio>')
    .replace(/<span slot=/g, '\n  <span slot=');

const meta: Meta<RadioArgs> = {
  title: 'Components/Radio',
  component: 'mud-radio',
  argTypes: {
    size: {
      control: 'select',
      options: RADIO_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    checked: { control: 'boolean', description: 'Whether the radio is currently selected.' },
    disabled: { control: 'boolean', description: 'Disables interactivity.' },
    invalid: { control: 'boolean', description: 'Maps to Figma "Error" state — border + dot turn red.' },
    required: { control: 'boolean', description: 'Marks the field as mandatory.' },
    readonly: { control: 'boolean', description: 'Renders the control read-only.' },
    label: {
      control: 'text',
      description:
        'Visible label. The story slots it (`<span slot="label">…</span>`); the `label` prop renders the same text.',
    },
    supportingText: {
      control: 'text',
      description: 'Slotted supporting text (rendered as `<span slot="supporting-text">…</span>`).',
    },
    errorText: {
      control: 'text',
      description: 'Error message shown under the text while `invalid` is set (`error-text`).',
    },
    name: { control: 'text', description: 'Form-control `name`.' },
    value: { control: 'text', description: 'Value submitted with the form when checked.' },
  },
};

export default meta;

type Story = StoryObj<RadioArgs>;

export const Default: Story = {
  render: renderRadio,
  args: {
    size: 'md',
    checked: false,
    disabled: false,
    invalid: false,
    required: false,
    readonly: false,
    label: 'Acord',
    supportingText: '',
    errorText: '',
    name: '',
    value: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: RadioArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const Selected: Story = {
  render: renderRadio,
  args: { ...Default.args, checked: true, label: 'Consent' } as RadioArgs,
  parameters: Default.parameters,
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 240px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 600px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

const docsCode = (...lines: string[]) => lines.join('\n');

export const AllStates: Story = {
  name: 'All States',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 560px;">
        ${[
          cell('default', cb({ label: 'Consent' })),
          cell('selected', cb({ label: 'Consent', flags: 'checked' })),
          cell('disabled', cb({ label: 'Consent', flags: 'disabled' })),
          cell('selected + disabled', cb({ label: 'Consent', flags: 'checked disabled' })),
          cell('error', cb({ label: 'Consent', flags: 'invalid' })),
          cell('selected + error', cb({ label: 'Consent', flags: 'checked invalid' })),
          cell('focus (use Tab)', cb({ label: 'Consent' })),
          cell('readonly', cb({ label: 'Consent', flags: 'checked readonly' })),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Consent' }),
          cb({ label: 'Consent', flags: 'checked' }),
          cb({ label: 'Consent', flags: 'disabled' }),
          cb({ label: 'Consent', flags: 'checked disabled' }),
          cb({ label: 'Consent', flags: 'invalid' }),
          cb({ label: 'Consent', flags: 'checked invalid' }),
          cb({ label: 'Consent', flags: 'checked readonly' }),
        ),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      RADIO_SIZES.map(size =>
        cell(
          size,
          /*html*/ `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-12);">
              ${cb({ size, label: 'Consent' })}
              ${cb({ size, label: 'Consent', flags: 'checked' })}
            </div>
          `,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          ...RADIO_SIZES.flatMap(s => [
            cb({ size: s, label: 'Consent' }),
            cb({ size: s, label: 'Consent', flags: 'checked' }),
          ]),
        ),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () =>
    wrap(
      [
        cell('default', cb({ label: 'I want to receive updates' })),
        cell('selected', cb({ label: 'I want to receive updates', flags: 'checked' })),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'I want to receive updates' }),
          cb({ label: 'I want to receive updates', flags: 'checked' }),
        ),
      },
    },
  },
};

export const WithSupportingText: Story = {
  name: 'With Supporting Text',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
        ${[
          cell('default (md)', cb({ label: 'Consent', supporting: 'I agree to the service terms and conditions.' })),
          cell(
            'selected (md)',
            cb({
              label: 'Consent',
              supporting: 'I agree to the service terms and conditions.',
              flags: 'checked',
            }),
          ),
          cell(
            'default (sm)',
            cb({
              size: 'sm',
              label: 'Consent',
              supporting: 'I agree to the service terms and conditions.',
            }),
          ),
          cell(
            'selected (sm)',
            cb({
              size: 'sm',
              label: 'Consent',
              supporting: 'I agree to the service terms and conditions.',
              flags: 'checked',
            }),
          ),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Consent', supporting: 'I agree to the service terms and conditions.' }),
          cb({
            label: 'Consent',
            supporting: 'I agree to the service terms and conditions.',
            flags: 'checked',
          }),
        ),
      },
    },
  },
};

export const Error: Story = {
  name: 'Error',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
        ${[
          cell('error + message', cb({ label: 'Decline', errorText: ERROR_TEXT, flags: 'invalid' })),
          cell('error (selected), no message', cb({ label: 'Decline', flags: 'invalid checked' })),
          cell(
            'error + supporting + message',
            cb({
              label: 'Decline',
              supporting: 'This option blocks the request.',
              errorText: ERROR_TEXT,
              flags: 'invalid',
            }),
          ),
          cell(
            'error (sm) + message',
            cb({ size: 'sm', label: 'Decline', errorText: ERROR_TEXT, flags: 'invalid checked' }),
          ),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '`invalid` turns the radio red. With `error-text` it also shows the message under the label and supporting text, linked to the control through `aria-describedby`.',
      },
      source: {
        code: docsCode(
          cb({ label: 'Decline', errorText: ERROR_TEXT, flags: 'invalid' }),
          cb({ label: 'Decline', flags: 'invalid checked' }),
          cb({
            label: 'Decline',
            supporting: 'This option blocks the request.',
            errorText: ERROR_TEXT,
            flags: 'invalid',
          }),
        ),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrap(
      [
        cell('disabled (unselected)', cb({ label: 'Consent', flags: 'disabled' })),
        cell('disabled (selected)', cb({ label: 'Consent', flags: 'disabled checked' })),
        cell(
          'disabled + supporting',
          cb({ label: 'Consent', supporting: 'This option cannot be changed.', flags: 'disabled' }),
        ),
        cell('disabled (sm)', cb({ size: 'sm', label: 'Consent', flags: 'disabled checked' })),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Consent', flags: 'disabled' }),
          cb({ label: 'Consent', flags: 'disabled checked' }),
          cb({ label: 'Consent', supporting: 'This option cannot be changed.', flags: 'disabled' }),
        ),
      },
    },
  },
};

export const Group: Story = {
  name: 'Group (without mud-radio-group)',
  render: () => /*html*/ `
      <fieldset style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); max-width: 360px;">
        <legend style="font-family: var(--font-family-primary); font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-text-base-default); padding: 0 var(--spacing-4);">Select an option</legend>
        ${cb({ name: 'consimtamant', value: 'acord', label: 'Consent', flags: 'checked' })}
        ${cb({ name: 'consimtamant', value: 'refuz', label: 'Decline' })}
        ${cb({ name: 'consimtamant', value: 'indecis', label: 'I want to decide later' })}
      </fieldset>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Multiple `mud-radio` siblings sharing a `name` form an implicit group, but each radio is its own Tab stop and the arrow keys do nothing. Wrap them in `mud-radio-group` (Components/Radio Group) for one Tab stop, arrow-key selection and a group label.',
      },
      source: {
        code: docsCode(
          cb({ name: 'consimtamant', value: 'acord', label: 'Consent', flags: 'checked' }),
          cb({ name: 'consimtamant', value: 'refuz', label: 'Decline' }),
          cb({ name: 'consimtamant', value: 'indecis', label: 'I want to decide later' }),
        ),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 360px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 800px;">
        ${[
          cell(
            'long label wraps',
            cb({
              label:
                'I agree that my personal data may be processed by the Electronic Governance Agency so that I can receive the selected services.',
            }),
          ),
          cell(
            'long supporting text wraps',
            cb({
              label: 'Consent',
              supporting:
                'Your data will be processed in accordance with Law No. 133 on personal data protection and will be kept for a maximum of 36 months.',
            }),
          ),
          cell(
            'long label + long supporting',
            cb({
              label: 'I agree to the full terms of the electronic service',
              supporting:
                'This includes the terms of use, the privacy policy and the cookie agreement for all .gov.md subdomains.',
              flags: 'checked',
            }),
          ),
          cell('no label (aria-label only)', cb({ ariaLabel: 'Option A' })),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: '…long Romanian label…' }),
          cb({ label: 'Consent', supporting: '…long supporting text…' }),
          cb({ ariaLabel: 'Option A' }),
        ),
      },
    },
  },
};

// Shared by the two hidden grouping regression stories below. They were one
// copy each until a third would have made three — the same helper drifting in
// parallel is how one of them silently stopped guarding anything.
type RadioHandle = HTMLElement & {
  name?: string;
  checked?: boolean;
  componentOnReady?: () => Promise<unknown>;
};

// `globalThis.Error` because the local `Error: Story` export shadows the global class in this module.
const readyRadio = async (canvasElement: HTMLElement, id: string): Promise<RadioHandle> => {
  // This is what guarantees the upgrade: `define` upgrades every connected
  // element synchronously. `componentOnReady` is then optional on purpose — the
  // browser test lane compiles components as custom elements, a build that
  // carries no such method, so REQUIRING it fails every story in this project.
  await customElements.whenDefined('mud-radio');
  const el = canvasElement.querySelector<HTMLElement>(`#${id}`) as RadioHandle | null;
  if (!el) throw new globalThis.Error(`#${id} did not render`);
  await el.componentOnReady?.();
  return el;
};

// Stencil publishes reflected attributes and the form value on the next render
// tick, not on assignment, so assertions poll to a deadline rather than sleeping
// a fixed amount — a fixed sleep is either flaky or slow.
const waitForRadio = async (predicate: () => boolean, describe: () => string, timeoutMs = 2000) => {
  const startedAt = performance.now();
  for (;;) {
    if (predicate()) return;
    if (performance.now() - startedAt > timeoutMs) {
      throw new globalThis.Error(`timed out after ${timeoutMs}ms waiting for ${describe()}`);
    }
    await new Promise(resolve => setTimeout(resolve, 16));
  }
};

// Regression test, not documentation — hidden from the sidebar and autodocs.
// A group whose `name` comes from a property assignment was never mutually
// exclusive: `uncheckSiblings()` found its siblings through an attribute, and
// the attribute was never written. `name` and `checked` are assigned in ONE
// synchronous commit below, the way a framework applies a render — reflection
// lands a tick later, so an implementation that reads the attribute still
// fails here even after `reflect: true`.
// Only observable in a real browser: under mock-doc the ElementInternals stub's
// `form` getter always returns null (`vitest-setup.ts:44`), so the query would
// fall back to document scope and never exercise the form-scoped path.
export const PropertyNamedGrouping: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <form>
      <mud-radio id="first" label="First" value="1"></mud-radio>
      <mud-radio id="second" label="Second" value="2"></mud-radio>
    </form>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const form = canvasElement.querySelector('form');
    if (!form) throw new globalThis.Error('form did not render');

    const first = await readyRadio(canvasElement, 'first');
    const second = await readyRadio(canvasElement, 'second');

    // Grouped by property assignment only — no `name` attribute in the markup,
    // and deliberately NO wait between naming and checking. Waiting for the
    // reflected attribute to land first is what a test written around the
    // implementation would do, and it hides the ordering this exists to pin.
    first.name = 'grouped';
    first.checked = true;
    second.name = 'grouped';
    second.checked = true;

    // `getAll` rather than iterating `entries()`: the Stencil program compiles
    // without `DOM.Iterable`, so the iterator form does not type-check here. It
    // also carries the assertion this needs — a group that failed to unselect
    // its sibling submits two values under the same name.
    const submitted = () => new FormData(form).getAll('grouped').map(String);
    await waitForRadio(
      () => !first.checked && submitted().join(',') === '2',
      () =>
        `the group to be mutually exclusive — first.checked=${String(first.checked)}, FormData "grouped"=[${submitted().join(',')}], expected [2]`,
    );
  },
};

// The companion to PropertyNamedGrouping, and the reason it is a separate story
// rather than more assignments inside that one: this covers the ordering that
// markup plus a user click produces — every radio named BEFORE any is checked —
// which the interleaved story deliberately does not reach. A timeout here names
// the attribute path; a timeout there names the same-tick property path.
// It also pins the half of native grouping that is about NOT acting: a radio
// carrying a different name must survive its neighbour being selected.
export const AttributeNamedGrouping: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <form>
      <mud-radio id="a" name="grouped" value="1" label="A"></mud-radio>
      <mud-radio id="b" name="grouped" value="2" label="B"></mud-radio>
      <mud-radio id="unrelated" name="other" value="3" label="Unrelated"></mud-radio>
    </form>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const form = canvasElement.querySelector('form');
    if (!form) throw new globalThis.Error('form did not render');

    const a = await readyRadio(canvasElement, 'a');
    const b = await readyRadio(canvasElement, 'b');
    const unrelated = await readyRadio(canvasElement, 'unrelated');

    unrelated.checked = true;
    a.checked = true;
    b.checked = true;

    const grouped = () => new FormData(form).getAll('grouped').map(String);
    const other = () => new FormData(form).getAll('other').map(String);
    await waitForRadio(
      () =>
        !a.checked &&
        b.checked === true &&
        unrelated.checked === true &&
        grouped().join(',') === '2' &&
        other().join(',') === '3',
      () =>
        `only the last radio of the group to survive and the differently-named one to be untouched — ` +
        `a.checked=${String(a.checked)}, b.checked=${String(b.checked)}, unrelated.checked=${String(unrelated.checked)}, ` +
        `FormData "grouped"=[${grouped().join(',')}] expected [2], "other"=[${other().join(',')}] expected [3]`,
    );
  },
};
