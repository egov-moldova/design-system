import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { INPUT_CHIP_SIZES, INPUT_CHIP_VARIANTS } from './mud-input-chip.types';
import type { InputChipSize, InputChipVariant } from './mud-input-chip.types';

type InputChipArgs = {
  variant: InputChipVariant;
  size: InputChipSize;
  label: string;
  placeholder: string;
  helperText: string;
  errorText: string;
  chips: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  maxChips: number;
  validatePattern: string;
  separators: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const docsSourceDefault = (args: InputChipArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.separators !== ',' ? `separators="${args.separators}"` : '',
    args.maxChips ? `max-chips="${args.maxChips}"` : '',
    args.validatePattern ? `validate-pattern="${args.validatePattern}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-input-chip ${attrs}></mud-input-chip>`;
};

const meta: Meta<InputChipArgs> = {
  title: 'Atoms/Input/Chip',
  component: 'mud-input-chip',
  argTypes: {
    variant: {
      control: 'select',
      options: INPUT_CHIP_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: INPUT_CHIP_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    chips: {
      control: 'text',
      description: 'Pipe-separated initial chip values (e.g. `a@b.md|c@d.md`).',
    },
    separators: { control: 'text', description: 'Characters that confirm a chip (plus Enter).' },
    maxChips: { control: 'number', description: 'Max chips allowed.' },
    validatePattern: { control: 'text', description: 'Regex pattern each chip must match.' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<InputChipArgs>;

/**
 * Storybook renders HTML statically and cannot pass arrays as DOM
 * attributes. The `preloadChips` helper hydrates the `chips` property
 * after mount so the rendered list reflects the demo state.
 */
const preloadChips = (selector: string, chips: string[]) => /*html*/ `
  <script>
    (() => {
      const tries = 60;
      let n = 0;
      const tick = () => {
        const el = document.querySelector('${selector}');
        if (el) {
          el.chips = ${JSON.stringify(chips)};
        } else if (n++ < tries) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    })();
  </script>
`;

export const Default: Story = {
  render: (args: InputChipArgs) => /*html*/ `
    <mud-input-chip
      id="story-default"
      variant="${args.variant}"
      size="${args.size}"
      label="${args.label}"
      placeholder="${args.placeholder}"
      helper-text="${args.helperText}"
      error-text="${args.errorText}"
      separators="${args.separators}"
      ${args.maxChips ? `max-chips="${args.maxChips}"` : ''}
      ${args.validatePattern ? `validate-pattern="${args.validatePattern}"` : ''}
      ${args.required ? 'required' : ''}
      ${args.disabled ? 'disabled' : ''}
      ${args.readonly ? 'readonly' : ''}
      ${args.invalid ? 'invalid' : ''}
    ></mud-input-chip>
  `,
  args: {
    variant: 'default',
    size: 'lg',
    label: 'Destinatari',
    placeholder: 'Adaugă o adresă și apasă Enter',
    helperText: 'Apasă Enter sau virgulă după fiecare adresă.',
    errorText: '',
    chips: '',
    separators: ',',
    maxChips: 0,
    validatePattern: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: InputChipArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 360px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 800px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const WithChips: Story = {
  name: 'With Chips',
  render: () => /*html*/ `
      <div style="padding: var(--spacing-24); max-width: 480px;">
        <mud-input-chip
          id="story-with-chips"
          size="lg"
          label="Destinatari"
          placeholder="Adaugă altă adresă"
          helper-text="Apasă Enter pentru a confirma."
        ></mud-input-chip>
        ${preloadChips('#story-with-chips', ['ana@gov.md', 'ion@gov.md', 'maria@gov.md'])}
      </div>
    `,
  parameters: { controls: { disable: true } },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () =>
    wrap(
      INPUT_CHIP_VARIANTS.map((variant, i) => {
        const id = `iv-variant-${variant}-${i}`;
        return cell(
          variant,
          /*html*/ `
            <mud-input-chip id="${id}" variant="${variant}" size="lg" label="Destinatari" placeholder="Adaugă adresă"></mud-input-chip>
            ${preloadChips(`#${id}`, ['ana@gov.md', 'ion@gov.md'])}
          `,
        );
      }).join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      INPUT_CHIP_SIZES.map((size, i) => {
        const id = `iv-size-${size}-${i}`;
        return cell(
          size,
          /*html*/ `
            <mud-input-chip id="${id}" size="${size}" label="Destinatari" placeholder="Adaugă adresă"></mud-input-chip>
            ${preloadChips(`#${id}`, ['ana@gov.md', 'ion@gov.md'])}
          `,
        );
      }).join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell(
          'default (empty)',
          /*html*/ `<mud-input-chip size="lg" label="Destinatari" placeholder="Adaugă adresă"></mud-input-chip>`,
        ),
        (() => {
          const id = 'iv-state-filled';
          return cell(
            'filled (3 chips)',
            /*html*/ `
              <mud-input-chip id="${id}" size="lg" label="Destinatari" placeholder="Adaugă altă adresă"></mud-input-chip>
              ${preloadChips(`#${id}`, ['ana@gov.md', 'ion@gov.md', 'maria@gov.md'])}
            `,
          );
        })(),
        cell(
          'mandatory',
          /*html*/ `<mud-input-chip size="lg" label="Destinatari" required placeholder="Câmp obligatoriu"></mud-input-chip>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-input-chip size="lg" label="Destinatari" disabled placeholder="Adaugă adresă"></mud-input-chip>`,
        ),
        (() => {
          const id = 'iv-state-disabled-filled';
          return cell(
            'disabled (with chips)',
            /*html*/ `
              <mud-input-chip id="${id}" size="lg" label="Destinatari" disabled></mud-input-chip>
              ${preloadChips(`#${id}`, ['ana@gov.md', 'ion@gov.md'])}
            `,
          );
        })(),
        cell(
          'destructive',
          /*html*/ `<mud-input-chip variant="destructive" size="lg" label="Destinatari" placeholder="Adaugă adresă"></mud-input-chip>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithEmailValidation: Story = {
  name: 'With Email Validation',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 480px;">
      <mud-input-chip
        id="story-email"
        size="lg"
        label="Destinatari (e-mail)"
        placeholder="ex: ana@gov.md, ion@gov.md"
        helper-text="Doar adrese valide sunt acceptate."
        validate-pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
      ></mud-input-chip>
      ${preloadChips('#story-email', ['ana@gov.md'])}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const WithMaxChips: Story = {
  name: 'With Max Chips',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 480px; display: flex; flex-direction: column; gap: var(--spacing-24);">
      <mud-input-chip
        id="story-max"
        size="lg"
        label="Destinatari (max 3)"
        placeholder="Apasă Enter pentru a adăuga"
        helper-text="Maximum 3 destinatari."
        max-chips="3"
      ></mud-input-chip>
      ${preloadChips('#story-max', ['ana@gov.md', 'ion@gov.md'])}
      <mud-input-chip
        id="story-max-reached"
        size="lg"
        label="Destinatari (limita atinsă)"
        helper-text="Limita de 3 destinatari atinsă — câmpul este blocat."
        max-chips="3"
      ></mud-input-chip>
      ${preloadChips('#story-max-reached', ['ana@gov.md', 'ion@gov.md', 'maria@gov.md'])}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const WithSeparators: Story = {
  name: 'With Separators',
  render: () =>
    wrap(
      [
        cell(
          'separators=",;"',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Etichete"
            placeholder="Apasă , sau ; sau Enter"
            helper-text="Acceptă virgulă și punct-virgulă."
            separators=",;"
          ></mud-input-chip>`,
        ),
        cell(
          'separators=" "',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Cuvinte cheie"
            placeholder="Apasă Spațiu între cuvinte"
            helper-text="Apasă Spațiu sau Enter."
            separators=" "
          ></mud-input-chip>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const DuplicateRejection: Story = {
  name: 'Duplicate Rejection',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 480px;">
      <mud-input-chip
        id="story-dup"
        size="lg"
        label="Etichete unice"
        placeholder="Încearcă să adaugi ‘moldova’ din nou"
        helper-text="Valorile duplicate sunt ignorate."
      ></mud-input-chip>
      ${preloadChips('#story-dup', ['moldova', 'cetățenie', 'identitate'])}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const WithHelperText: Story = {
  name: 'With Helper Text',
  render: () =>
    wrap(
      [
        cell(
          'default',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Destinatari"
            helper-text="Apasă Enter după fiecare adresă."
            placeholder="Adresă"
          ></mud-input-chip>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Destinatari"
            required
            helper-text="Câmp obligatoriu — cel puțin un destinatar."
            placeholder="Adresă"
          ></mud-input-chip>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithError: Story = {
  name: 'With Error',
  render: () =>
    wrap(
      [
        cell(
          'invalid + error',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Destinatari"
            invalid
            error-text="Trebuie să adăugați cel puțin un destinatar"
            placeholder="Adresă"
          ></mud-input-chip>`,
        ),
        (() => {
          const id = 'iv-error-destructive';
          return cell(
            'destructive variant',
            /*html*/ `
              <mud-input-chip
                id="${id}"
                variant="destructive"
                size="lg"
                label="Destinatari"
                invalid
                error-text="Formatul nu este corect"
              ></mud-input-chip>
              ${preloadChips(`#${id}`, ['ana@gov.md'])}
            `,
          );
        })(),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const Wrapping: Story = {
  name: 'Wrapping',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 480px;">
      <mud-input-chip
        id="story-wrap"
        size="lg"
        label="Destinatari (mulți)"
        helper-text="Chip-urile se aliniază pe mai multe rânduri."
        placeholder="Adaugă altă adresă"
      ></mud-input-chip>
      ${preloadChips('#story-wrap', [
        'ana@gov.md',
        'ion.popescu@minfin.md',
        'maria.dumitru@miop.md',
        'andrei.ciobanu@mai.md',
        'elena.rusu@minfin.md',
        'victor.gurzu@mfa.md',
        'cristina.lupu@msmps.md',
      ])}
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrap(
      [
        (() => {
          const id = 'iv-edge-long-chip';
          return cell(
            'very long chip (truncates)',
            /*html*/ `
              <mud-input-chip id="${id}" size="lg" label="Etichetă lungă" placeholder="Adaugă altă valoare"></mud-input-chip>
              ${preloadChips(`#${id}`, ['moldova-digital-transformation-strategy-2025-2030-final-version-approved'])}
            `,
          );
        })(),
        cell(
          'long label truncation',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Moldova's digital evolution requires that you list every authorised representative in this submission"
            placeholder="Adaugă"
          ></mud-input-chip>`,
        ),
        cell(
          'long helper truncation (two lines)',
          /*html*/ `<mud-input-chip
            size="lg"
            label="Destinatari"
            helper-text="Acceptăm doar adrese de e-mail valide, cu domeniu instituțional moldovenesc; introduceți câte o adresă, apoi apăsați Enter sau virgulă pentru confirmare; valorile duplicate sunt ignorate"
            placeholder="Adresă"
          ></mud-input-chip>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

// Regression test, not documentation — hidden from the sidebar and autodocs.
// `syncFormValue` publishes nothing while `name` is unset, so a consumer that
// assigns `chips` first and `name` second — the order a framework applies props
// in — used to leave the control out of the submission permanently: the chips
// watcher had already run, and nothing ran again when the name arrived.
// Reflecting `name` did not fix this; the host carried the attribute and the
// FormData carried nothing. Only observable in a real browser: the `spec`
// project's ElementInternals stub makes `setFormValue` a no-op.
export const LateNameSubmission: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <form>
      <mud-input-chip id="late"></mud-input-chip>
    </form>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    type Chip = HTMLElement & {
      name?: string;
      chips?: string[];
      componentOnReady?: () => Promise<unknown>;
    };
    const form = canvasElement.querySelector('form');
    if (!form) throw new Error('form did not render');

    await customElements.whenDefined('mud-input-chip');
    const el = canvasElement.querySelector<HTMLElement>('#late') as Chip | null;
    if (!el) throw new Error('#late did not render');
    // `customElements.whenDefined` above is what guarantees the upgrade —
    // `define` upgrades every connected element synchronously. `componentOnReady`
    // is optional on purpose: the browser test lane compiles components as custom
    // elements, a build that carries no such method.
    await el.componentOnReady?.();

    // Data first, name second.
    el.chips = ['a', 'b'];
    await new Promise(resolve => setTimeout(resolve, 0));
    el.name = 'lateChips';

    const submitted = () => new FormData(form).getAll('lateChips').map(String);
    const startedAt = performance.now();
    for (;;) {
      if (submitted().join(',') === JSON.stringify(['a', 'b'])) break;
      if (performance.now() - startedAt > 2000) {
        throw new Error(
          `timed out waiting for FormData "lateChips" to carry the chips — it was [${submitted().join(
            ',',
          )}], with the host rendered as ${el.outerHTML.slice(0, 120)}`,
        );
      }
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  },
};
