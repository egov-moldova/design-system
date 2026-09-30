import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { MODAL_SIZES, MODAL_VARIANTS } from './mud-modal.types';
import type { ModalSize, ModalVariant } from './mud-modal.types';
import { attr, text } from '../../utils/story-docs-source';

type ModalArgs = {
  open: boolean;
  size: ModalSize;
  variant: ModalVariant;
  titleText: string;
  imageSrc: string;
  imageAlt: string;
  closable: boolean;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  destructive: boolean;
  body: string;
  locale: string;
  closeLabel: string;
};

const stageStyle =
  'position: relative; min-block-size: 520px; padding: var(--spacing-24); background: var(--color-background-base-secondary, #f7f7f7); border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden;';

const triggerRowStyle = 'display: flex; gap: var(--spacing-12); flex-wrap: wrap; align-items: center;';

// Inline script attached to each story that wires the trigger buttons to the
// modals via id. We use plain HTML/DOM so Storybook's "Show code" matches what
// a consumer would actually paste into a project.
const wireTriggersScript = /*html*/ `
  <script>
    (function () {
      const root = document.currentScript.parentElement;
      root.querySelectorAll('[data-modal-open]').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          const id = trigger.getAttribute('data-modal-open');
          const modal = root.querySelector('#' + id);
          if (modal) modal.setAttribute('open', '');
        });
      });
      root.addEventListener('click', function (e) {
        const target = e.target;
        if (!target) return;
        const closer = target.closest && target.closest('[data-modal-close]');
        if (!closer) return;
        const mudBtn = closer.closest && closer.closest('mud-button');
        const modal = (mudBtn || closer).closest('mud-modal');
        if (modal) modal.removeAttribute('open');
      });
    })();
  </script>
`;

const renderModal = (args: ModalArgs) => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-default">Deschide modal</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-default"
      ${args.open ? 'open' : ''}
      size="${args.size}"
      variant="${args.variant}"
      ${args.titleText ? `title-text="${args.titleText}"` : ''}
      ${args.imageSrc ? `image-src="${args.imageSrc}"` : ''}
      ${args.imageAlt ? `image-alt="${args.imageAlt}"` : ''}
      ${args.closable ? '' : 'closable="false"'}
      ${args.closeOnBackdrop ? '' : 'close-on-backdrop="false"'}
      ${args.closeOnEscape ? '' : 'close-on-escape="false"'}
      ${args.destructive ? 'destructive' : ''}
      ${args.locale ? `locale="${args.locale}"` : ''}
      ${args.closeLabel ? `close-label="${args.closeLabel}"` : ''}
    >
      ${args.body}
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</mud-button>
        <mud-button variant="${args.destructive ? 'destructive' : 'primary'}" shape="circular" data-modal-close>Confirmă</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;

// ---------------------------------------------------------------------------
// Docs-source helpers — consumer markup for the "Show code" panel: no stage
// wrapper, no inline styles, footer buttons slotted directly into `actions`.
// ---------------------------------------------------------------------------

// Opens each modal from its trigger and closes it from any footer button. Every story names
// its own trigger and modal ids and the script binds nothing at the top level, so snippets
// pasted onto one page do not collide.
const docsSourceScript = (pairs: [trigger: string, modal: string][]) => /*html*/ `<script>
${pairs
  .map(
    ([
      trigger,
      id,
    ]) => `  document.getElementById('${trigger}').addEventListener('click', () => (document.getElementById('${id}').open = true));
  document.querySelectorAll('#${id} [slot="actions"]').forEach(button =>
    button.addEventListener('click', () => document.getElementById('${id}').closeModal()),
  );`,
  )
  .join('\n')}
</script>`;

const docsSourceDefault = (args: ModalArgs) => {
  const attrs = [
    'id="default-modal"',
    args.open ? 'open' : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.titleText ? `title-text="${attr(args.titleText)}"` : '',
    args.imageSrc ? `image-src="${attr(args.imageSrc)}"` : '',
    args.imageAlt ? `image-alt="${attr(args.imageAlt)}"` : '',
    args.closable ? '' : 'closable="false"',
    args.closeOnBackdrop ? '' : 'close-on-backdrop="false"',
    args.closeOnEscape ? '' : 'close-on-escape="false"',
    args.destructive ? 'destructive' : '',
    args.locale ? `locale="${attr(args.locale)}"` : '',
    args.closeLabel ? `close-label="${attr(args.closeLabel)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return /*html*/ `<mud-button id="open-default-modal">Deschide modal</mud-button>
<mud-modal ${attrs}>
  ${text(args.body)}
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Anulează</mud-button>
  <mud-button slot="actions" variant="${args.destructive ? 'destructive' : 'primary'}" shape="circular">Confirmă</mud-button>
</mud-modal>
${docsSourceScript([['open-default-modal', 'default-modal']])}`;
};

const meta: Meta<ModalArgs> = {
  title: 'Components/Modal',
  component: 'mud-modal',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Modal** — overlay dialog for focused decisions and confirmations.

Renders a centered dialog card on a dimmed backdrop using the native
\`<dialog>\` element internally. The native element handles top-layer
rendering, focus trap, and ESC dismissal, so accessibility behavior matches
the platform contract without manual focus juggling.

Three variants control the header treatment:
- \`default\` — title bar + close button (text-only header)
- \`with-image\` — full-bleed hero image header with overlaid close button
- \`with-icon\` — leading 48px icon above the body (no top bar)

Dismissals route through \`mudClose\` with a \`reason\` payload — backdrop,
escape, close-button, or action — so consumers can branch on the dismissal
source (e.g. ignore backdrop dismiss for required confirmations).

Set \`destructive\` to add a red top-border accent and pair with a destructive
primary \`mud-button\` in the actions slot for irreversible flows.

Romanian voice: defaults use **Confirmă** / **Anulează** / **Continuă** /
**Închide** — verbs, second-person formal, no exclamation marks.
        `.trim(),
      },
    },
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is shown. Two-way bound — flips back on internal dismiss.',
      table: { defaultValue: { summary: 'false' } },
    },
    size: {
      control: 'inline-radio',
      options: MODAL_SIZES,
      description: 'Visual size rung. Drives max-width and typography scale.',
      table: { defaultValue: { summary: 'md' } },
    },
    variant: {
      control: 'inline-radio',
      options: MODAL_VARIANTS,
      description: 'Header treatment.',
      table: { defaultValue: { summary: 'default' } },
    },
    titleText: {
      name: 'title-text',
      control: 'text',
      description: 'Title text rendered in the header. The `title` slot overrides this when filled.',
    },
    imageSrc: {
      name: 'image-src',
      control: 'text',
      description: 'Hero image URL for `variant="with-image"`. Slot fallback — the `image` slot wins when filled.',
    },
    imageAlt: {
      name: 'image-alt',
      control: 'text',
      description: 'Alt text for the prop-driven hero image. Empty for decorative.',
      table: { defaultValue: { summary: '' } },
    },
    closable: {
      control: 'boolean',
      description: 'Renders the trailing × button.',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnBackdrop: {
      name: 'close-on-backdrop',
      control: 'boolean',
      description: 'Whether clicking the backdrop dismisses the modal.',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnEscape: {
      name: 'close-on-escape',
      control: 'boolean',
      description: 'Whether ESC dismisses the modal.',
      table: { defaultValue: { summary: 'true' } },
    },
    destructive: {
      control: 'boolean',
      description: 'Styles the dialog frame for an irreversible action.',
      table: { defaultValue: { summary: 'false' } },
    },
    body: { control: 'text', description: 'Default-slot text content (body copy).' },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description: 'Language of the built-in copy. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: "Accessible label for the × button. Overrides the locale's copy.",
      table: { defaultValue: { summary: 'Închide' } },
    },
  },
  args: {
    open: false,
    size: 'md',
    variant: 'default',
    titleText: 'Confirm the action',
    imageSrc: '',
    imageAlt: '',
    closable: true,
    closeOnBackdrop: true,
    closeOnEscape: true,
    destructive: false,
    body: 'This action will save the changes made in the form. Continue?',
    locale: '',
    closeLabel: '',
  },
};
export default meta;

type Story = StoryObj<ModalArgs>;

// ---------------------------------------------------------------------------
// Default — md size, default variant, with title + body + actions
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderModal,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: ModalArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllSizes — three triggers, one modal per size selector
//
// Native `<dialog>` in modal mode can only place ONE dialog in the top layer
// at a time. To showcase all three sizes side-by-side we render three trigger
// buttons; clicking each opens the matching-sized modal. The Default story
// already shows the md baseline; this story is the per-size deep-dive.
// ---------------------------------------------------------------------------
const docsSourceAllSizes = /*html*/ `<mud-button id="open-sm-size-modal" shape="circular" size="sm">Open Small</mud-button>
<mud-button id="open-md-size-modal" shape="circular">Open Medium</mud-button>
<mud-button id="open-lg-size-modal" shape="circular">Open Large</mud-button>

<mud-modal id="sm-size-modal" size="sm" title-text="Confirm payment">
  The amount of 250.00 MDL will be charged to the card ending in ****4521.
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular" size="sm">Cancel</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular" size="sm">Confirm</mud-button>
</mud-modal>
<mud-modal id="md-size-modal" size="md" title-text="Confirm payment">
  The amount of 250.00 MDL will be charged to the card ending in ****4521. You will receive a confirmation by email within a few minutes.
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Cancel</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular">Confirm</mud-button>
</mud-modal>
<mud-modal id="lg-size-modal" size="lg" title-text="Confirm the combined payment">
  You are about to confirm payment for 4 combined invoices totalling 1,250.00 MDL. The transaction is final and cannot be cancelled after confirmation.
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Cancel</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular">Confirm</mud-button>
</mud-modal>
${docsSourceScript([
  ['open-sm-size-modal', 'sm-size-modal'],
  ['open-md-size-modal', 'md-size-modal'],
  ['open-lg-size-modal', 'lg-size-modal'],
])}`;

const renderAllSizes = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button shape="circular" size="sm" data-modal-open="storybook-modal-size-sm">Open Small</mud-button>
      <mud-button shape="circular" data-modal-open="storybook-modal-size-md">Open Medium</mud-button>
      <mud-button shape="circular" data-modal-open="storybook-modal-size-lg">Open Large</mud-button>
    </div>
    <mud-modal id="storybook-modal-size-sm" size="sm" title-text="Confirm payment">
      The amount of 250.00 MDL will be charged to the card ending in ****4521.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" size="sm" data-modal-close>Cancel</mud-button>
        <mud-button variant="primary" shape="circular" size="sm" data-modal-close>Confirm</mud-button>
      </div>
    </mud-modal>
    <mud-modal id="storybook-modal-size-md" size="md" title-text="Confirm payment">
      The amount of 250.00 MDL will be charged to the card ending in ****4521. You will receive a confirmation by email within a few minutes.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Cancel</mud-button>
        <mud-button variant="primary" shape="circular" data-modal-close>Confirm</mud-button>
      </div>
    </mud-modal>
    <mud-modal id="storybook-modal-size-lg" size="lg" title-text="Confirm the combined payment">
      You are about to confirm payment for 4 combined invoices totalling 1,250.00 MDL. The transaction is final and cannot be cancelled after confirmation.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Cancel</mud-button>
        <mud-button variant="primary" shape="circular" data-modal-close>Confirm</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllSizes } } },
};

// ---------------------------------------------------------------------------
// WithImage — full-bleed hero image header
// ---------------------------------------------------------------------------
const docsSourceWithImage = /*html*/ `<mud-button id="open-image-modal">Open modal with image</mud-button>
<mud-modal id="image-modal" variant="with-image" title-text="Congratulations">
  <img
    slot="image"
    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80"
    alt=""
  />
  Your account has been confirmed. You can now access the state electronic services.
  <mud-button slot="actions" variant="primary" shape="circular">Continue</mud-button>
</mud-modal>
${docsSourceScript([['open-image-modal', 'image-modal']])}`;

const renderWithImage = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-with-image">Open modal with image</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-with-image"
      size="md"
      variant="with-image"
      title-text="Congratulations"
    >
      <img
        slot="image"
        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80"
        alt=""
      />
      Your account has been confirmed. You can now access the state electronic services.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="primary" shape="circular" data-modal-close>Continue</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const WithImage: Story = {
  render: renderWithImage,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithImage } } },
};

// ---------------------------------------------------------------------------
// WithIcon — leading 48px icon variant
// ---------------------------------------------------------------------------
const docsSourceWithIcon = /*html*/ `<mud-button id="open-icon-modal">Open modal with icon</mud-button>
<mud-modal id="icon-modal" variant="with-icon" title-text="Session expired">
  <mud-icon slot="icon" name="circle-info" variant="filled" size="32"></mud-icon>
  Sign in again to continue. Unsaved changes were lost.
  <mud-button slot="actions" variant="primary" shape="circular">Sign in again</mud-button>
</mud-modal>
${docsSourceScript([['open-icon-modal', 'icon-modal']])}`;

const renderWithIcon = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-with-icon">Open modal with icon</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-with-icon"
      size="md"
      variant="with-icon"
      title-text="Session expired"
    >
      <mud-icon slot="icon" name="circle-info" variant="filled" size="32"></mud-icon>
      Sign in again to continue. Unsaved changes were lost.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="primary" shape="circular" data-modal-close>Sign in again</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const WithIcon: Story = {
  render: renderWithIcon,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithIcon } } },
};

// ---------------------------------------------------------------------------
// Confirmation — typical two-action confirmation modal
// ---------------------------------------------------------------------------
const docsSourceConfirmation = /*html*/ `<mud-button id="open-confirmation-modal">Save changes</mud-button>
<mud-modal id="confirmation-modal" title-text="Save changes">
  The changes will be saved and applied immediately. Do you want to continue?
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Cancel</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular">Save</mud-button>
</mud-modal>
${docsSourceScript([['open-confirmation-modal', 'confirmation-modal']])}`;

const renderConfirmation = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-confirmation">Save changes</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-confirmation"
      size="md"
      title-text="Save changes"
    >
      The changes will be saved and applied immediately. Do you want to continue?
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Cancel</mud-button>
        <mud-button variant="primary" shape="circular" data-modal-close>Save</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const Confirmation: Story = {
  render: renderConfirmation,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceConfirmation } } },
};

// ---------------------------------------------------------------------------
// Destructive — irreversible action confirmation
// ---------------------------------------------------------------------------
const docsSourceDestructive = /*html*/ `<mud-button id="open-destructive-modal" variant="destructive">Delete account</mud-button>
<mud-modal id="destructive-modal" destructive title-text="Delete account permanently" close-on-backdrop="false">
  This action cannot be undone. All data associated with the account will be permanently deleted and cannot be recovered.
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Cancel</mud-button>
  <mud-button slot="actions" variant="destructive" shape="circular">Delete permanently</mud-button>
</mud-modal>
${docsSourceScript([['open-destructive-modal', 'destructive-modal']])}`;

const renderDestructive = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button variant="destructive" data-modal-open="storybook-modal-destructive">Delete account</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-destructive"
      size="md"
      destructive
      title-text="Delete account permanently"
      close-on-backdrop="false"
    >
      This action cannot be undone. All data associated with the account will be permanently deleted and cannot be recovered.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Cancel</mud-button>
        <mud-button variant="destructive" shape="circular" data-modal-close>Delete permanently</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const Destructive: Story = {
  render: renderDestructive,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceDestructive } } },
};

// ---------------------------------------------------------------------------
// DisableEscape — required confirmation flow (no backdrop / ESC dismissal)
// ---------------------------------------------------------------------------
const docsSourceDisableEscape = /*html*/ `<mud-button id="open-mandatory-modal">Mandatory confirmation</mud-button>
<mud-modal
  id="mandatory-modal"
  title-text="Accept the terms and conditions"
  close-on-backdrop="false"
  close-on-escape="false"
  closable="false"
>
  To continue, you must accept the updated terms and conditions. This confirmation is mandatory.
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Decline</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular">Accept</mud-button>
</mud-modal>
${docsSourceScript([['open-mandatory-modal', 'mandatory-modal']])}`;

const renderDisableEscape = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-required">Mandatory confirmation</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-required"
      size="md"
      title-text="Accept the terms and conditions"
      close-on-backdrop="false"
      close-on-escape="false"
      closable="false"
    >
      To continue, you must accept the updated terms and conditions. This confirmation is mandatory.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Decline</mud-button>
        <mud-button variant="primary" shape="circular" data-modal-close>Accept</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const DisableEscape: Story = {
  render: renderDisableEscape,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceDisableEscape } } },
};

// ---------------------------------------------------------------------------
// CustomContent — rich body content (form fields, lists)
// ---------------------------------------------------------------------------
const docsSourceCustomContent = /*html*/ `<mud-button id="open-profile-modal">Edit profile</mud-button>
<mud-modal id="profile-modal" title-text="Edit profile">
  <p>Update your personal information before continuing.</p>
  <ul>
    <li>Full name</li>
    <li>Validated email address</li>
    <li>Phone number</li>
    <li>Postal address</li>
  </ul>
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Cancel</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular">Save</mud-button>
</mud-modal>
${docsSourceScript([['open-profile-modal', 'profile-modal']])}`;

const renderCustomContent = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-custom">Edit profile</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-custom"
      size="md"
      title-text="Edit profile"
    >
      <p style="margin: 0 0 var(--spacing-16) 0;">Update your personal information before continuing.</p>
      <ul style="margin: 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: var(--spacing-8);">
        <li>Full name</li>
        <li>Validated email address</li>
        <li>Phone number</li>
        <li>Postal address</li>
      </ul>
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Cancel</mud-button>
        <mud-button variant="primary" shape="circular" data-modal-close>Save</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const CustomContent: Story = {
  render: renderCustomContent,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceCustomContent } } },
};

// ---------------------------------------------------------------------------
// Mobile — narrow viewport (350px stage simulates mobile)
// ---------------------------------------------------------------------------
const docsSourceMobile = /*html*/ `<mud-button id="open-mobile-modal" size="sm">Confirm payment</mud-button>
<mud-modal id="mobile-modal" size="sm" title-text="Confirm payment" actions-layout="stacked">
  The amount of 125.00 MDL will be charged now. Confirm the transaction?
  <mud-button slot="actions" variant="primary" shape="circular" size="sm" full-width>Confirm</mud-button>
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular" size="sm" full-width>Cancel</mud-button>
</mud-modal>
${docsSourceScript([['open-mobile-modal', 'mobile-modal']])}`;

const renderMobile = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button size="sm" data-modal-open="storybook-modal-mobile">Confirm payment</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-mobile"
      size="sm"
      title-text="Confirm payment"
      actions-layout="stacked"
    >
      The amount of 125.00 MDL will be charged now. Confirm the transaction?
      <mud-button slot="actions" variant="primary" shape="circular" size="sm" full-width data-modal-close>Confirm</mud-button>
      <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular" size="sm" full-width data-modal-close>Cancel</mud-button>
    </mud-modal>
  </div>
`;
export const Mobile: Story = {
  render: renderMobile,
  parameters: {
    controls: { disable: true },
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story:
          'Mobile flow with `actions-layout="stacked"` and full-width buttons. ' +
          'Preview via the Storybook **Viewport** toolbar at a mobile width (this story defaults to `mobile1`) — ' +
          'at ≤ 480px the dialog fills the available inline size minus the container margin, ' +
          'and the footer buttons stack vertically with the primary button on top.',
      },
      source: { code: docsSourceMobile },
    },
  },
};

// ---------------------------------------------------------------------------
// MobileWithImage — image variant on a mobile viewport
//
// Mirrors Figma 358:16247 "image: mobile" — hero image at top, title below the
// image, stacked full-width buttons. Same actions-layout="stacked" pattern as
// the plain Mobile story but with variant="with-image".
// ---------------------------------------------------------------------------
const docsSourceMobileWithImage = /*html*/ `<mud-button id="open-mobile-image-modal" size="sm">Open</mud-button>
<mud-modal
  id="mobile-image-modal"
  size="sm"
  variant="with-image"
  title-text="Congratulations"
  actions-layout="stacked"
  image-src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80"
>
  Your account has been confirmed. You can now access the state electronic services.
  <mud-button slot="actions" variant="primary" shape="circular" size="sm" full-width>Continue</mud-button>
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular" size="sm" full-width>Later</mud-button>
</mud-modal>
${docsSourceScript([['open-mobile-image-modal', 'mobile-image-modal']])}`;

const renderMobileWithImage = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <mud-button size="sm" data-modal-open="storybook-modal-mobile-image">Open</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-mobile-image"
      size="sm"
      variant="with-image"
      title-text="Congratulations"
      actions-layout="stacked"
      image-src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80"
      image-alt=""
    >
      Your account has been confirmed. You can now access the state electronic services.
      <mud-button slot="actions" variant="primary" shape="circular" size="sm" full-width data-modal-close>Continue</mud-button>
      <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular" size="sm" full-width data-modal-close>Later</mud-button>
    </mud-modal>
  </div>
`;
export const MobileWithImage: Story = {
  render: renderMobileWithImage,
  parameters: {
    controls: { disable: true },
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story:
          'Image-led mobile flow combining `variant="with-image"` with `actions-layout="stacked"`. ' +
          'The hero image fills the top of the dialog; the title renders below the image and the ' +
          'footer buttons stack full-width. Preview via the Storybook **Viewport** toolbar at a ' +
          'mobile width.',
      },
      source: { code: docsSourceMobileWithImage },
    },
  },
};

// ---------------------------------------------------------------------------
// EdgeCases — very long content scrolls inside modal, diacritics preserved
// ---------------------------------------------------------------------------
const docsSourceEdgeCases = /*html*/ `<mud-button id="open-terms-modal">Long content — internal scroll</mud-button>
<mud-modal id="terms-modal" title-text="Updated terms and conditions">
  <p>We have updated the platform terms and conditions. The changes take effect on 1 June 2026 and include the following:</p>
  <ol>
    <li>Updates on the processing of electronic payments and refunds.</li>
    <li>User rights regarding the portability of personal data between services.</li>
    <li>Revised privacy policy — minimal collection, limited retention.</li>
    <li>How we collect and use personal data for federated sign-in.</li>
    <li>The account deletion procedure and its deadlines.</li>
    <li>New identity validation requirements for transactions over 5,000 MDL.</li>
    <li>Rules on concurrent sessions and automatic sign-out.</li>
    <li>Updates on accepting cookies and similar technologies.</li>
    <li>The mechanism for notifying future changes to the terms.</li>
    <li>User rights in the Republic of Moldova regarding data protection.</li>
  </ol>
  <p>Accented characters (é ü ñ) are fully supported in titles and body text. The modal height is capped to the viewport so the body scrolls internally without pushing the action buttons below the fold.</p>
  <p>Confirm you have read this to continue.</p>
  <mud-button slot="actions" variant="strict" appearance="outlined" shape="circular">Decline</mud-button>
  <mud-button slot="actions" variant="primary" shape="circular">Accept the terms</mud-button>
</mud-modal>
${docsSourceScript([['open-terms-modal', 'terms-modal']])}`;

const renderEdgeCases = () => /*html*/ `
  <div style="${stageStyle} min-block-size: 720px;">
    <div style="${triggerRowStyle}">
      <mud-button data-modal-open="storybook-modal-long">Long content — internal scroll</mud-button>
    </div>
    <mud-modal
      id="storybook-modal-long"
      size="md"
      title-text="Updated terms and conditions"
    >
      <p style="margin: 0 0 var(--spacing-12) 0;">We have updated the platform terms and conditions. The changes take effect on 1 June 2026 and include the following:</p>
      <ol style="margin: 0 0 var(--spacing-12) 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: var(--spacing-8);">
        <li>Updates on the processing of electronic payments and refunds.</li>
        <li>User rights regarding the portability of personal data between services.</li>
        <li>Revised privacy policy — minimal collection, limited retention.</li>
        <li>How we collect and use personal data for federated sign-in.</li>
        <li>The account deletion procedure and its deadlines.</li>
        <li>New identity validation requirements for transactions over 5,000 MDL.</li>
        <li>Rules on concurrent sessions and automatic sign-out.</li>
        <li>Updates on accepting cookies and similar technologies.</li>
        <li>The mechanism for notifying future changes to the terms.</li>
        <li>User rights in the Republic of Moldova regarding data protection.</li>
      </ol>
      <p style="margin: 0 0 var(--spacing-12) 0;">Accented characters (é ü ñ) are fully supported in titles and body text. The modal height is capped to the viewport so the body scrolls internally without pushing the action buttons below the fold.</p>
      <p style="margin: 0;">Confirm you have read this to continue.</p>
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <mud-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Decline</mud-button>
        <mud-button variant="primary" shape="circular" data-modal-close>Accept the terms</mud-button>
      </div>
    </mud-modal>
    ${wireTriggersScript}
  </div>
`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-modal>Coverage</mud-modal>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-modal') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-modal constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
