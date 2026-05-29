import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { AVATAR_SIZES, AVATAR_TYPES } from './mud-avatar.types';
import type { AvatarSize, AvatarType } from './mud-avatar.types';

type AvatarArgs = {
  type: AvatarType;
  size: AvatarSize;
  src: string;
  alt: string;
  name: string;
  initials: string;
  iconName: string;
  ariaLabel: string;
  badge: 'none' | 'dot' | 'count';
};

// ---------------------------------------------------------------------------
// Romanian sample data — Ion Popescu, Maria Pop, etc.
// Photos are sourced from Unsplash's free portrait collection; they reliably
// load over HTTPS and are licensed for documentation use.
// ---------------------------------------------------------------------------

const SAMPLE_PHOTO_ION = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80';
const SAMPLE_PHOTO_MARIA = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80';
const SAMPLE_PHOTO_ANDREI = 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80';
const SAMPLE_PHOTO_ELENA = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80';
const SAMPLE_PHOTO_VLAD = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&q=80';

const ROMANIAN_TEAM: Array<{ name: string; photo?: string }> = [
  { name: 'Ion Popescu', photo: SAMPLE_PHOTO_ION },
  { name: 'Maria Pop', photo: SAMPLE_PHOTO_MARIA },
  { name: 'Andrei Ionescu', photo: SAMPLE_PHOTO_ANDREI },
  { name: 'Elena Dumitrescu', photo: SAMPLE_PHOTO_ELENA },
  { name: 'Vlad Georgescu', photo: SAMPLE_PHOTO_VLAD },
];

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

const renderBadgeChild = (kind: AvatarArgs['badge']): string => {
  if (kind === 'count') {
    return /*html*/ `<span slot="badge" class="demo-badge demo-badge--count" aria-label="3 notificări noi">3</span>`;
  }
  if (kind === 'dot') {
    return /*html*/ `<span slot="badge" class="demo-badge demo-badge--dot" aria-label="Online"></span>`;
  }
  return '';
};

const renderAvatar = (args: AvatarArgs) => /*html*/ `
  <style>
    .demo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border-radius: 9999px;
      background: var(--color-background-danger-default);
      color: var(--color-text-base-inverse-on-color);
      font-family: var(--font-family-primary);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-12);
      line-height: var(--line-height-16);
      box-shadow: 0 0 0 2px var(--color-background-base-default);
    }
    .demo-badge--count {
      min-inline-size: 16px;
      block-size: 16px;
      padding-inline: var(--spacing-4);
    }
    .demo-badge--dot {
      inline-size: 10px;
      block-size: 10px;
    }
  </style>
  <mud-avatar
    type="${args.type}"
    size="${args.size}"
    ${args.src ? `src="${args.src}"` : ''}
    ${args.alt ? `alt="${args.alt}"` : ''}
    ${args.name ? `name="${args.name}"` : ''}
    ${args.initials ? `initials="${args.initials}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
  >${renderBadgeChild(args.badge)}</mud-avatar>
`;

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center; margin-top: var(--spacing-4);';
const wrapStyle =
  'display: flex; align-items: flex-end; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;';
const cellWrapStyle = 'display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);';

// ---------------------------------------------------------------------------
// Grid renderers
// ---------------------------------------------------------------------------

const renderAllVariants = () => /*html*/ `
  <div style="${wrapStyle}">
    <div style="${cellWrapStyle}">
      <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ION}" name="Ion Popescu"></mud-avatar>
      <span style="${cellLabelStyle}">photo</span>
    </div>
    <div style="${cellWrapStyle}">
      <mud-avatar type="initials" size="md" name="Maria Pop"></mud-avatar>
      <span style="${cellLabelStyle}">initials</span>
    </div>
    <div style="${cellWrapStyle}">
      <mud-avatar type="icon" size="md" aria-label="User"></mud-avatar>
      <span style="${cellLabelStyle}">icon</span>
    </div>
  </div>
`;

const renderAllSizes = () => /*html*/ `
  <div style="display: grid; gap: var(--spacing-24); padding: var(--spacing-24);">
    ${AVATAR_TYPES.map(
      type => /*html*/ `
      <div style="${wrapStyle}">
        ${AVATAR_SIZES.map(
          size => /*html*/ `
          <div style="${cellWrapStyle}">
            ${
              type === 'photo'
                ? /*html*/ `<mud-avatar type="photo" size="${size}" src="${SAMPLE_PHOTO_MARIA}" name="Maria Pop"></mud-avatar>`
                : type === 'initials'
                  ? /*html*/ `<mud-avatar type="initials" size="${size}" name="Ion Popescu"></mud-avatar>`
                  : /*html*/ `<mud-avatar type="icon" size="${size}" aria-label="User"></mud-avatar>`
            }
            <span style="${cellLabelStyle}">${type} · ${size}</span>
          </div>`,
        ).join('')}
      </div>`,
    ).join('')}
  </div>
`;

const renderStates = () => /*html*/ `
  <style>
    .state-grid {
      display: grid;
      grid-template-columns: 80px repeat(3, auto);
      align-items: center;
      gap: var(--spacing-16) var(--spacing-24);
      padding: var(--spacing-24);
    }
    .state-grid .row-label,
    .state-grid .col-label {
      font-size: var(--font-size-12);
      color: var(--color-text-base-tertiary);
      font-style: italic;
    }
    .state-grid .row-label { text-align: right; }
    .state-grid .col-label { text-align: center; }
  </style>
  <div class="state-grid">
    <span></span>
    <span class="col-label">photo</span>
    <span class="col-label">initials</span>
    <span class="col-label">icon</span>

    <span class="row-label">default</span>
    <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ION}" name="Ion Popescu"></mud-avatar>
    <mud-avatar type="initials" size="md" name="Maria Pop"></mud-avatar>
    <mud-avatar type="icon" size="md" aria-label="User"></mud-avatar>

    <span class="row-label">focus</span>
    <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ION}" name="Ion Popescu" class="is-focus-demo" tabindex="0"></mud-avatar>
    <mud-avatar type="initials" size="md" name="Maria Pop" class="is-focus-demo" tabindex="0"></mud-avatar>
    <mud-avatar type="icon" size="md" aria-label="User" class="is-focus-demo" tabindex="0"></mud-avatar>
  </div>
  <p style="font-size: var(--font-size-12); color: var(--color-text-base-tertiary); padding: 0 var(--spacing-24);">
    The <code>focus</code> row uses a demo helper class so the ring is visible in the static screenshot.
    In real usage the ring appears only on keyboard <code>:focus-visible</code>.
  </p>
`;

const renderWithBadge = () => /*html*/ `
  <style>
    .demo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border-radius: 9999px;
      background: var(--color-background-danger-default);
      color: var(--color-text-base-inverse-on-color);
      font-family: var(--font-family-primary);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-12);
      line-height: var(--line-height-16);
      box-shadow: 0 0 0 2px var(--color-background-base-default);
    }
    .demo-badge--count { min-inline-size: 16px; block-size: 16px; padding-inline: var(--spacing-4); }
    .demo-badge--dot { inline-size: 10px; block-size: 10px; }
  </style>
  <div style="${wrapStyle}">
    <div style="${cellWrapStyle}">
      <mud-avatar type="initials" size="md" name="Ion Popescu">
        <span slot="badge" class="demo-badge demo-badge--count" aria-label="3 notificări noi">3</span>
      </mud-avatar>
      <span style="${cellLabelStyle}">count badge</span>
    </div>
    <div style="${cellWrapStyle}">
      <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_MARIA}" name="Maria Pop">
        <span slot="badge" class="demo-badge demo-badge--dot" aria-label="Online"></span>
      </mud-avatar>
      <span style="${cellLabelStyle}">dot badge</span>
    </div>
    <div style="${cellWrapStyle}">
      <mud-avatar type="icon" size="lg" aria-label="System notifications">
        <span slot="badge" class="demo-badge demo-badge--count" aria-label="12 notificări noi">12</span>
      </mud-avatar>
      <span style="${cellLabelStyle}">large + count</span>
    </div>
  </div>
`;

const renderStack = () => /*html*/ `
  <style>
    .avatar-stack {
      display: inline-flex;
      align-items: center;
      padding: var(--spacing-24);
    }
    .avatar-stack > mud-avatar {
      box-shadow: 0 0 0 var(--avatar-stack-border-width) var(--avatar-stack-border-color);
      border-radius: 9999px;
    }
    .avatar-stack > mud-avatar + mud-avatar {
      margin-inline-start: var(--avatar-stack-overlap-md);
    }
    .avatar-stack--xl > mud-avatar + mud-avatar {
      margin-inline-start: var(--avatar-stack-overlap-xl);
    }
    .stack-more {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: var(--avatar-container-size-md);
      block-size: var(--avatar-container-size-md);
      border-radius: 9999px;
      background: var(--color-background-base-tertiary);
      color: var(--color-text-base-secondary);
      font-family: var(--font-family-primary);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-12);
      line-height: var(--line-height-16);
      box-shadow: 0 0 0 var(--avatar-stack-border-width) var(--avatar-stack-border-color);
      margin-inline-start: var(--avatar-stack-overlap-md);
    }
  </style>

  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24);">
    <div>
      <p style="${cellLabelStyle} text-align: start; margin-top: 0;">3 collaborators (no overflow)</p>
      <div class="avatar-stack">
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ION}" name="Ion Popescu"></mud-avatar>
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_MARIA}" name="Maria Pop"></mud-avatar>
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ANDREI}" name="Andrei Ionescu"></mud-avatar>
      </div>
    </div>

    <div>
      <p style="${cellLabelStyle} text-align: start; margin-top: 0;">5 collaborators with overflow indicator</p>
      <div class="avatar-stack" aria-label="5 colegi: Ion Popescu, Maria Pop, Andrei Ionescu și încă 2">
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ION}" name="Ion Popescu"></mud-avatar>
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_MARIA}" name="Maria Pop"></mud-avatar>
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ANDREI}" name="Andrei Ionescu"></mud-avatar>
        <span class="stack-more" aria-hidden="true">+2</span>
      </div>
    </div>

    <div>
      <p style="${cellLabelStyle} text-align: start; margin-top: 0;">Mixed types (photo · initials · icon)</p>
      <div class="avatar-stack">
        <mud-avatar type="photo" size="md" src="${SAMPLE_PHOTO_ELENA}" name="Elena Dumitrescu"></mud-avatar>
        <mud-avatar type="initials" size="md" name="Vlad Georgescu"></mud-avatar>
        <mud-avatar type="icon" size="md" aria-label="Invitație în așteptare"></mud-avatar>
      </div>
    </div>
  </div>
`;

const renderRomanianNames = () => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--spacing-16); padding: var(--spacing-24);">
    ${ROMANIAN_TEAM.map(
      person => /*html*/ `
      <div style="display: flex; align-items: center; gap: var(--spacing-12); padding: var(--spacing-12); background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-8);">
        <mud-avatar type="photo" size="md" src="${person.photo}" name="${person.name}"></mud-avatar>
        <div style="display: flex; flex-direction: column;">
          <span style="font-family: var(--font-family-primary); font-weight: var(--font-weight-medium); font-size: var(--font-size-14); color: var(--color-text-base-default);">${person.name}</span>
          <span style="font-family: var(--font-family-primary); font-size: var(--font-size-12); color: var(--color-text-base-tertiary);">Colaborator</span>
        </div>
      </div>`,
    ).join('')}

    ${ROMANIAN_TEAM.map(
      person => /*html*/ `
      <div style="display: flex; align-items: center; gap: var(--spacing-12); padding: var(--spacing-12); background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-8);">
        <mud-avatar type="initials" size="md" name="${person.name}"></mud-avatar>
        <div style="display: flex; flex-direction: column;">
          <span style="font-family: var(--font-family-primary); font-weight: var(--font-weight-medium); font-size: var(--font-size-14); color: var(--color-text-base-default);">${person.name}</span>
          <span style="font-family: var(--font-family-primary); font-size: var(--font-size-12); color: var(--color-text-base-tertiary);">Fără fotografie</span>
        </div>
      </div>`,
    ).join('')}
  </div>
`;

// ---------------------------------------------------------------------------
// Docs-source helpers — clean snippets in the "Show code" panel
// ---------------------------------------------------------------------------

const docsSourceDefault = (args: AvatarArgs) => {
  const attrs = [
    args.type !== 'initials' ? `type="${args.type}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.src ? `src="${args.src}"` : '',
    args.alt ? `alt="${args.alt}"` : '',
    args.name ? `name="${args.name}"` : '',
    args.initials ? `initials="${args.initials}"` : '',
    args.iconName ? `icon-name="${args.iconName}"` : '',
    args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-avatar ${attrs}>` : '<mud-avatar>';
  return `${open}${renderBadgeChild(args.badge)}</mud-avatar>`;
};

const docsSourceAllVariants = /*html*/ `<mud-avatar type="photo" src="…" name="Ion Popescu"></mud-avatar>
<mud-avatar type="initials" name="Maria Pop"></mud-avatar>
<mud-avatar type="icon" aria-label="User"></mud-avatar>`;

const docsSourceAllSizes = AVATAR_SIZES.map(s => `<mud-avatar size="${s}" name="Ion Popescu"></mud-avatar>`).join('\n');

const docsSourceWithBadge = /*html*/ `<mud-avatar type="initials" name="Ion Popescu">
  <span slot="badge" class="demo-badge demo-badge--count" aria-label="3 notificări noi">3</span>
</mud-avatar>

<mud-avatar type="photo" src="…" name="Maria Pop">
  <span slot="badge" class="demo-badge demo-badge--dot" aria-label="Online"></span>
</mud-avatar>`;

const docsSourceStack = /*html*/ `<!-- Avatar stack composition (no dedicated component) -->
<div class="avatar-stack">
  <mud-avatar type="photo" src="…" name="Ion Popescu"></mud-avatar>
  <mud-avatar type="photo" src="…" name="Maria Pop"></mud-avatar>
  <mud-avatar type="photo" src="…" name="Andrei Ionescu"></mud-avatar>
  <span class="stack-more" aria-hidden="true">+2</span>
</div>

<style>
  .avatar-stack { display: inline-flex; align-items: center; }
  .avatar-stack > mud-avatar {
    box-shadow: 0 0 0 var(--avatar-stack-border-width) var(--avatar-stack-border-color);
    border-radius: 9999px;
  }
  .avatar-stack > mud-avatar + mud-avatar,
  .avatar-stack > .stack-more {
    margin-inline-start: var(--avatar-stack-overlap-md);
  }
</style>`;

const docsSourceRomanianNames = /*html*/ `<mud-avatar type="photo" src="…" name="Ion Popescu"></mud-avatar>
<mud-avatar type="initials" name="Maria Pop"></mud-avatar>
<mud-avatar type="initials" name="Andrei Ionescu"></mud-avatar>
<mud-avatar type="initials" name="Elena Dumitrescu"></mud-avatar>
<mud-avatar type="initials" name="Vlad Georgescu"></mud-avatar>`;

// ---------------------------------------------------------------------------
// Meta + Stories
// ---------------------------------------------------------------------------

const meta: Meta<AvatarArgs> = {
  title: 'Atoms/Avatar',
  component: 'mud-avatar',
  argTypes: {
    type: {
      control: 'select',
      options: AVATAR_TYPES,
      description: 'Visual mode: photo, initials, or generic icon.',
      table: { defaultValue: { summary: 'initials' } },
    },
    size: {
      control: 'select',
      options: AVATAR_SIZES,
      description: 'Visual size rung (xs=24, sm=32, md=40, lg=48, xl=72).',
      table: { defaultValue: { summary: 'md' } },
    },
    src: {
      control: 'text',
      description: 'Source URL for `type="photo"`. Ignored otherwise.',
    },
    alt: {
      control: 'text',
      description: 'Alt text for the photo. Defaults to `name`. Empty string marks it decorative.',
    },
    name: {
      control: 'text',
      description: 'Full name. Seeds initials and screen-reader label.',
    },
    initials: {
      control: 'text',
      description: 'Override the auto-derived initials.',
    },
    iconName: {
      control: 'text',
      description: 'Glyph for `type="icon"`.',
      name: 'icon-name',
      table: { defaultValue: { summary: 'person' } },
    },
    ariaLabel: {
      control: 'text',
      description: "Override the host's `aria-label`.",
      name: 'aria-label',
    },
    badge: {
      control: 'select',
      options: ['none', 'dot', 'count'],
      description: 'Demo helper — slots a notification badge child.',
      table: { defaultValue: { summary: 'none' } },
    },
  },
};
export default meta;

type Story = StoryObj<AvatarArgs>;

// ---------------------------------------------------------------------------
// Default — single avatar with full argTypes controls
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderAvatar,
  args: {
    type: 'initials',
    size: 'md',
    src: '',
    alt: '',
    name: 'Ion Popescu',
    initials: '',
    iconName: 'person',
    ariaLabel: '',
    badge: 'none',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: AvatarArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllVariants — photo / initials / icon side by side
// ---------------------------------------------------------------------------
export const AllVariants: Story = {
  render: renderAllVariants,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllVariants } },
  },
};

// ---------------------------------------------------------------------------
// AllSizes — every size × every type grid
// ---------------------------------------------------------------------------
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllSizes } },
  },
};

// ---------------------------------------------------------------------------
// States — default vs focus, all three types
// ---------------------------------------------------------------------------
export const States: Story = {
  render: renderStates,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Two-row matrix mirroring Figma 203:2111. Avatars are non-interactive by default; the `focus` row demonstrates the ring that appears when a consumer makes the avatar focusable (e.g. wraps it in a `<mud-button>`).',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// WithBadge — composed notification badges via the `badge` slot
// ---------------------------------------------------------------------------
export const WithBadge: Story = {
  render: renderWithBadge,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceWithBadge },
      description: {
        story:
          'The `badge` slot accepts any child — a number, an icon, a status dot. The avatar reserves the top-right corner and does not constrain the badge size; consumers control the badge visuals.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Stack — composition story (no dedicated stack component)
// ---------------------------------------------------------------------------
export const Stack: Story = {
  render: renderStack,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceStack },
      description: {
        story:
          'Stacked / overlapping avatar groups are achieved by laying multiple `<mud-avatar>` elements in a flex row with a negative `margin-inline-start` (token `--avatar-stack-overlap-{size}`) and a 2-px solid ring (`--avatar-stack-border-width` / `-color`) that separates adjacent circles. The "+N" overflow indicator is a sibling element styled to match the avatar dimensions.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// WithRomanianNames — initials derivation in Romanian
// ---------------------------------------------------------------------------
export const WithRomanianNames: Story = {
  render: renderRomanianNames,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceRomanianNames },
      description: {
        story:
          'Derived initials for a Romanian team — Ion Popescu, Maria Pop, Andrei Ionescu, Elena Dumitrescu, Vlad Georgescu. The first row shows photo avatars; the second row shows the deterministic initials fallback for users without a photo.',
      },
    },
  },
};
