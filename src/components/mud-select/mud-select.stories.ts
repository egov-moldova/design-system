import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SELECT_SIZES, SELECT_VARIANTS } from './mud-select.types';
import type { SelectSize, SelectVariant } from './mud-select.types';

type SelectArgs = {
  variant: SelectVariant;
  size: SelectSize;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  searchable: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

/**
 * The option list the generic stories share, written as the markup a native
 * `<select>` takes. Every story is the markup a consumer would write — there is
 * no data prop to set, so what the docs source shows is what runs.
 */
const OPTIONS = /*html*/ `
  <option value="opt-1">Option 1</option>
  <option value="opt-2">Option 2</option>
  <option value="opt-3">Option 3</option>
  <option value="opt-4">Option 4</option>
  <option value="opt-5">Option 5</option>
`;

/** One select, attributes first and options as children. */
const select = (attrs: string, options: string = OPTIONS) => /*html*/ `<mud-select ${attrs}>${options}</mud-select>`;

/**
 * The shared list, shortened for a source block whose point is the attributes
 * rather than the options.
 */
const OPTIONS_ELIDED = '\n  <option value="opt-1">Option 1</option>\n  <!-- … -->\n';

const sourceFor = (attrs: string, options: string = OPTIONS_ELIDED) => `<mud-select ${attrs}>${options}</mud-select>`;

const renderSelect = (args: SelectArgs) =>
  select(`
      variant="${args.variant}"
      size="${args.size}"
      label="${args.label}"
      placeholder="${args.placeholder}"
      value="${args.value}"
      helper-text="${args.helperText}"
      error-text="${args.errorText}"
      ${args.required ? 'required' : ''}
      ${args.disabled ? 'disabled' : ''}
      ${args.readonly ? 'readonly' : ''}
      ${args.invalid ? 'invalid' : ''}
      ${args.searchable ? 'searchable' : ''}
    `);

const docsSourceDefault = (args: SelectArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'medium' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
    args.searchable ? 'searchable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return sourceFor(attrs, OPTIONS);
};

const meta: Meta<SelectArgs> = {
  title: 'Atoms/Input/Select',
  component: 'mud-select',
  argTypes: {
    variant: {
      control: 'select',
      options: SELECT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: SELECT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'medium' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    searchable: { control: 'boolean', description: 'Lets the user narrow the list by typing into the control.' },
  },
};

export default meta;

type Story = StoryObj<SelectArgs>;

export const Default: Story = {
  render: renderSelect,
  args: {
    variant: 'default',
    size: 'large',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    searchable: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Options are the component’s children, exactly as a native `<select>` takes them: `<option>`, `<optgroup label="…">`, `<hr>`, and `selected` for the starting value.',
      },
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SelectArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 282px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 720px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const AllVariants: Story = {
  name: 'All Variants',
  render: () =>
    wrap(
      SELECT_VARIANTS.map(variant =>
        cell(variant, select(`variant="${variant}" size="large" label="Label" placeholder="Placeholder"`)),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SELECT_VARIANTS.map(v =>
          sourceFor(`variant="${v}" size="large" label="Label" placeholder="Placeholder"`),
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      SELECT_SIZES.map(size => cell(size, select(`size="${size}" label="Label" placeholder="Placeholder"`))).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SELECT_SIZES.map(s => sourceFor(`size="${s}" label="Label" placeholder="Placeholder"`)).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell('default: default', select(`size="large" label="Label" placeholder="Placeholder"`)),
        cell('default: filled', select(`size="large" label="Label" value="opt-2"`)),
        cell('default: disabled', select(`size="large" label="Label" placeholder="Placeholder" disabled`)),
        cell('default: readonly', select(`size="large" label="Label" value="opt-2" readonly`)),
        cell('default: mandatory', select(`size="large" label="Label" placeholder="Placeholder" required`)),
        cell(
          'destructive: default',
          select(`variant="destructive" size="large" label="Label" placeholder="Placeholder"`),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          sourceFor('size="large" label="Label" placeholder="Placeholder"'),
          sourceFor('size="large" label="Label" value="opt-2"'),
          sourceFor('size="large" label="Label" placeholder="Placeholder" disabled'),
          sourceFor('size="large" label="Label" value="opt-2" readonly'),
          sourceFor('size="large" label="Label" placeholder="Placeholder" required'),
          sourceFor('variant="destructive" size="large" label="Label" placeholder="Placeholder"'),
        ].join('\n'),
      },
    },
  },
};

export const WithHelperText: Story = {
  name: 'With Helper Text',
  render: () =>
    wrap(
      [
        cell(
          'default',
          select(`size="large" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"`),
        ),
        cell(
          'mandatory',
          select(`size="large" label="Label" placeholder="Placeholder" helper-text="Required field" required`),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          sourceFor('size="large" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"'),
          sourceFor('size="large" label="Label" placeholder="Placeholder" helper-text="Required field" required'),
        ].join('\n'),
      },
    },
  },
};

export const WithError: Story = {
  name: 'With Error',
  render: () =>
    wrap(
      [
        cell(
          'invalid + error message',
          select(`size="large" label="Label" placeholder="Placeholder" invalid error-text="Please select an option"`),
        ),
        cell(
          'explicit destructive',
          select(
            `size="large" variant="destructive" label="Label" placeholder="Placeholder" error-text="Error message displayed here" invalid`,
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          sourceFor(
            'size="large" label="Label" placeholder="Placeholder" invalid error-text="Please select an option"',
          ),
          sourceFor(
            'size="large" variant="destructive" label="Label" placeholder="Placeholder" error-text="Error message displayed here" invalid',
          ),
        ].join('\n'),
      },
    },
  },
};

const ICON_START = /*html*/ `<mud-icon slot="icon-start" name="house" size="20"></mud-icon>`;
const ICON_SEARCH = /*html*/ `<mud-icon slot="icon-start" name="search" size="20"></mud-icon>`;

export const WithIcons: Story = {
  name: 'With Icons',
  render: () =>
    wrap(
      [
        cell(
          'icon-start',
          select('size="large" label="Country" placeholder="Pick a country"', `${ICON_START}${OPTIONS}`),
        ),
        cell('with selected value', select('size="large" label="Plan" value="opt-1"', `${ICON_SEARCH}${OPTIONS}`)),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'A slotted icon sits alongside the options in the light DOM. Only `<option>`, `<optgroup>` and `<hr>` are read as choices, so anything else in there — an icon, a comment — is left alone.',
      },
      source: {
        code: [
          sourceFor('size="large" label="Country" placeholder="Pick a country"', `\n  ${ICON_START}${OPTIONS_ELIDED}`),
          sourceFor('size="large" label="Plan" value="opt-1"', `\n  ${ICON_SEARCH}${OPTIONS_ELIDED}`),
        ].join('\n'),
      },
    },
  },
};

export const Open: Story = {
  name: 'Open Listbox',
  render: () =>
    wrap(
      [
        cell('open: default (no selection)', select('size="large" label="Label" placeholder="Placeholder" open')),
        cell('open: with selection', select('size="large" label="Label" value="opt-1" open')),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          sourceFor('size="large" label="Label" placeholder="Placeholder" open'),
          sourceFor('size="large" label="Label" value="opt-1" open'),
        ].join('\n'),
      },
    },
  },
};

const COUNTRY_OPTIONS = /*html*/ `
  <option value="opt-1">Moldova (Republica Moldova)</option>
  <option value="opt-2">România</option>
  <option value="opt-3">Ucraina</option>
  <option value="opt-4">A very long option label that should truncate before the trailing chevron icon</option>
  <option value="opt-5">Federația Rusă</option>
`;

export const WithLongOptions: Story = {
  name: 'With Long Options',
  render: () => /*html*/ `
      <div style="padding: var(--spacing-24); max-width: 320px;">
        ${select('size="large" label="Pick a country" value="opt-4"', COUNTRY_OPTIONS)}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: sourceFor('size="large" label="Pick a country" value="opt-4"', COUNTRY_OPTIONS),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrap(
      [
        cell(
          'label truncation (single line)',
          select(
            `size="large" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services" placeholder="Placeholder"`,
          ),
        ),
        cell(
          'helper truncation (two lines)',
          select(
            `size="large" label="Label" placeholder="Placeholder" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."`,
          ),
        ),
        cell('no options at all', select('size="large" label="Label" placeholder="Placeholder" open', '')),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          sourceFor('size="large" label="…long label…" placeholder="Placeholder"'),
          sourceFor('size="large" label="Label" placeholder="Placeholder" helper-text="…long helper text…"'),
          '<mud-select size="large" label="Label" placeholder="Placeholder" open></mud-select>',
        ].join('\n'),
      },
    },
  },
};

const FOOD_OPTIONS = /*html*/ `
  <option value="">Choose a food</option>
  <hr />
  <optgroup label="Fruit">
    <option value="apple">Apples</option>
    <option value="banana">Bananas</option>
    <option value="cherry">Cherries</option>
  </optgroup>
  <hr />
  <optgroup label="Vegetables">
    <option value="artichoke">Artichokes</option>
    <option value="broccoli">Broccoli</option>
  </optgroup>
  <hr />
  <optgroup label="Meat">
    <option value="beef">Beef</option>
    <option value="chicken" selected>Chicken</option>
    <option value="pork" disabled>Pork</option>
  </optgroup>
`;

const CITY_OPTIONS = /*html*/ `
  <optgroup label="Nord">
    <option value="balti">Bălți</option>
    <option value="soroca">Soroca</option>
    <option value="edinet">Edineț</option>
  </optgroup>
  <optgroup label="Centru">
    <option value="chisinau">Chișinău</option>
    <option value="orhei">Orhei</option>
    <option value="ungheni">Ungheni</option>
  </optgroup>
  <optgroup label="Sud">
    <option value="cahul">Cahul</option>
    <option value="comrat">Comrat</option>
  </optgroup>
`;

export const NativeMarkup: Story = {
  name: 'Native Markup',
  render: () =>
    wrap(
      [
        cell('option + optgroup + hr', select('size="large" label="Your favorite food"', FOOD_OPTIONS)),
        cell('open, showing group headings', select('size="large" label="Your favorite food" open', FOOD_OPTIONS)),
        cell(
          'hr between ungrouped options',
          select(
            'size="large" label="Sort by" open',
            /*html*/ `
              <option value="recent" selected>Most recent</option>
              <option value="name">Name</option>
              <hr />
              <option value="clear">Clear sorting</option>
            `,
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Options are written as the markup a native `<select>` takes. `<optgroup>` becomes a named group, `<hr>` a rule, and `selected` sets the starting value — here Chicken. Rules with nothing to divide are dropped, so the three `<hr>`s next to headings do not double the rule each heading draws.',
      },
      source: {
        code: sourceFor('size="large" label="Your favorite food"', FOOD_OPTIONS),
      },
    },
  },
};

/**
 * A list that arrives as data — from an API, a store, a fixture. There is no
 * data prop to hand it to: the consumer renders the options, which is one `map`
 * in any framework and exactly what a native `<select>` asks for.
 */
const CITIES = [
  { value: 'chisinau', label: 'Chișinău' },
  { value: 'balti', label: 'Bălți' },
  { value: 'cahul', label: 'Cahul' },
  { value: 'comrat', label: 'Comrat' },
  { value: 'ungheni', label: 'Ungheni' },
];

const optionsFromData = (rows: { value: string; label: string }[]) =>
  rows.map(row => /*html*/ `<option value="${row.value}">${row.label}</option>`).join('');

export const OptionsFromData: Story = {
  name: 'Options From Data',
  render: () =>
    wrap(
      cell(
        'rendered from an array',
        select('size="large" label="Oraș" placeholder="Alege un oraș"', optionsFromData(CITIES)),
      ),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The component takes no option data — a list held in state becomes markup at the call site, and the select re-reads it whenever the rendered children change. In JSX: `{cities.map(c => <option value={c.id}>{c.name}</option>)}`.',
      },
      source: {
        code: [
          'const cities = [{ value: "chisinau", label: "Chișinău" }, /* … */];',
          '',
          '<mud-select size="large" label="Oraș" placeholder="Alege un oraș">',
          '  {cities.map(city => <option value={city.value}>{city.label}</option>)}',
          '</mud-select>',
        ].join('\n'),
      },
    },
  },
};

const DISABLED_OPTIONS = /*html*/ `
  <option value="pickup">Ridicare personală</option>
  <option value="courier" disabled>Curier (indisponibil azi)</option>
  <optgroup label="Poștă" disabled>
    <option value="post-standard">Standard</option>
    <option value="post-express">Express</option>
  </optgroup>
`;

export const DisabledOptions: Story = {
  name: 'Disabled Options',
  render: () =>
    wrap(
      [
        cell('closed', select('size="large" label="Livrare" placeholder="Alege metoda"', DISABLED_OPTIONS)),
        cell('open', select('size="large" label="Livrare" placeholder="Alege metoda" open', DISABLED_OPTIONS)),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '`disabled` on an `<option>` makes that one choice unselectable; `disabled` on an `<optgroup>` disables every option under it, and an option cannot opt back in — the same rule a native `<select>` applies. Keyboard navigation skips them all.',
      },
      source: {
        code: sourceFor('size="large" label="Livrare" placeholder="Alege metoda"', DISABLED_OPTIONS),
      },
    },
  },
};

/**
 * Appending an `<option>` inside an existing `<optgroup>` is not a slot change —
 * the assigned node, the `optgroup`, did not change — so the component watches
 * the host for mutations instead. This story is where that stays honest.
 */
const ADD_OPTION = `
  const group = document.querySelector('#mud-select-dynamic optgroup');
  const n = group.children.length + 1;
  const option = document.createElement('option');
  option.value = 'oras-' + n;
  option.textContent = 'Oraș ' + n;
  group.appendChild(option);
`;

const REMOVE_OPTION = `
  const group = document.querySelector('#mud-select-dynamic optgroup');
  if (group.children.length > 1) group.lastElementChild.remove();
`;

const TOGGLE_DISABLED = `
  const first = document.querySelector('#mud-select-dynamic option');
  first.toggleAttribute('disabled');
`;

export const DynamicOptions: Story = {
  name: 'Dynamic Options',
  render: () => /*html*/ `
      <div id="mud-select-dynamic" style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); max-width: 360px;">
        <mud-select size="large" label="Oraș" placeholder="Alege un oraș" open>
          <optgroup label="Nord">
            <option value="balti">Bălți</option>
          </optgroup>
        </mud-select>
        <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-12);">
          <mud-button size="sm" variant="secondary" onclick="${ADD_OPTION}">Adaugă opțiune</mud-button>
          <mud-button size="sm" variant="secondary" onclick="${REMOVE_OPTION}">Elimină ultima</mud-button>
          <mud-button size="sm" variant="secondary" onclick="${TOGGLE_DISABLED}">Comută disabled</mud-button>
        </div>
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The listbox follows the markup while the page is running. Adding an `<option>` inside an `<optgroup>`, removing one, or flipping `disabled` all reach the rendered rows — none of which `slotchange` reports, so the component observes the host directly.',
      },
      source: {
        code: [
          '<mud-select size="large" label="Oraș" placeholder="Alege un oraș">',
          '  <optgroup label="Nord">',
          '    <option value="balti">Bălți</option>',
          '  </optgroup>',
          '</mud-select>',
          '',
          '// Anything that changes the children reaches the list.',
          'select.querySelector("optgroup").appendChild(newOption);',
        ].join('\n'),
      },
    },
  },
};

export const Searchable: Story = {
  name: 'Searchable',
  render: () =>
    wrap(
      [
        cell('type to filter', select('size="large" label="Oraș" searchable placeholder="Caută"', CITY_OPTIONS)),
        cell('open', select('size="large" label="Oraș" searchable placeholder="Caută" open', CITY_OPTIONS)),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'With `searchable`, the control itself is the query box. Matching ignores case and diacritics, so `chisinau` finds Chișinău and `balti` finds Bălți; a group disappears when none of its options match. Without `searchable`, the same keystrokes jump the highlight instead, as a native `<select>` does.',
      },
      source: {
        code: sourceFor('size="large" label="Oraș" searchable placeholder="Caută"', CITY_OPTIONS),
      },
    },
  },
};

export const NoResults: Story = {
  name: 'No Results',
  render: () =>
    wrap(
      cell(
        'nothing matches the query',
        select('size="large" label="Oraș" searchable empty-label="Niciun oraș găsit" open', CITY_OPTIONS),
      ),
    ),
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector('mud-select');
    if (!target) return;
    // The shadow root is not there until the component upgrades, and a play
    // function that runs too early would quietly do nothing.
    await customElements.whenDefined('mud-select');
    await (target as HTMLElement & { componentOnReady?: () => Promise<unknown> }).componentOnReady?.();
    const input = target.shadowRoot?.querySelector('input.trigger') as HTMLInputElement | null;
    if (!input) return;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'The empty state is `empty-label`, a prop with the Romanian default `Nicio opțiune`.',
      },
      source: {
        code: sourceFor('size="large" label="Oraș" searchable empty-label="Niciun oraș găsit"', CITY_OPTIONS),
      },
    },
  },
};

const FORM_CITY_OPTIONS = /*html*/ `
  <optgroup label="Nord">
    <option value="balti">Bălți</option>
    <option value="soroca">Soroca</option>
  </optgroup>
  <optgroup label="Centru">
    <option value="chisinau" selected>Chișinău</option>
    <option value="orhei">Orhei</option>
  </optgroup>
`;

const SUBMIT_HANDLER = `
  event.preventDefault();
  const data = new FormData(event.target);
  const out = document.getElementById('mud-select-form-output');
  out.textContent = JSON.stringify(Object.fromEntries(data.entries()), null, 2);
`;

export const InForm: Story = {
  name: 'In Form',
  render: () => /*html*/ `
      <form
        style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); max-width: 420px;"
        onsubmit="${SUBMIT_HANDLER}"
      >
        ${select('name="oras" size="large" label="Oraș" placeholder="Alege un oraș" required', FORM_CITY_OPTIONS)}
        ${select('name="livrare" size="large" label="Livrare" placeholder="Alege metoda"', DISABLED_OPTIONS)}
        <div style="display: flex; gap: var(--spacing-12);">
          <mud-button variant="primary" size="md" type="submit">Trimite</mud-button>
          <mud-button variant="secondary" size="md" type="reset">Resetează</mud-button>
        </div>
        <pre id="mud-select-form-output" style="font-family: var(--font-family-primary); font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0;"></pre>
      </form>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The select participates in a form the way the native element does: `name` carries the value into `FormData`, `required` blocks submission until something is chosen, and Reset returns the field to the `<option selected>` the page shipped with — Chișinău here, not the empty placeholder.',
      },
      source: {
        code: [
          '<form>',
          `  ${sourceFor('name="oras" size="large" label="Oraș" required', '\n    <option value="chisinau" selected>Chișinău</option>\n    <!-- … -->\n  ')}`,
          '  <mud-button variant="primary" type="submit">Trimite</mud-button>',
          '  <mud-button variant="secondary" type="reset">Resetează</mud-button>',
          '</form>',
        ].join('\n'),
      },
    },
  },
};
