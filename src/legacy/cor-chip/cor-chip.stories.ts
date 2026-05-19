/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { ChipSize } from './cor-chip.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

type ChipArgs = {
  size: ChipSize;
  state: 'default' | 'active' | 'disabled' | 'skeleton' | 'error';
  ariaLabel?: string;
  text: string;
  label: string;
  showIconLeft: boolean;
  showIconRight: boolean;
  showAvatar: boolean;
};

const defaultArgs: ChipArgs = {
  size: ChipSize.LG,
  state: 'default',
  ariaLabel: 'Chip',
  label: 'Label',
  text: 'Label',
  showIconLeft: true,
  showIconRight: true,
  showAvatar: true,
};

const meta: Meta = {
  title: 'Molecules/Chip',
  component: 'cor-chip',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(ChipSize),
      description: 'Size of the chip',
      table: { defaultValue: { summary: ChipSize.LG } },
    },
    state: {
      control: 'select',
      options: ['default', 'active', 'disabled', 'skeleton', 'error'],
      description: 'State of the chip',
      table: { defaultValue: { summary: 'default' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label for the chip button',
    },
  },
  parameters: {
    actions: { handles: ['corChipClick'] },
  },
};

export default meta;
type Story = StoryObj;

const render = (args: Partial<ChipArgs>) => {
  const getAttributes = () => {
    const attrs = [];
    if (args.size) attrs.push(`size="${args.size}"`);
    if (args.ariaLabel) attrs.push(`aria-label="${args.ariaLabel}"`);

    // Handle state-based attributes
    switch (args.state) {
      case 'active':
        attrs.push('active');
        break;
      case 'disabled':
        attrs.push('disabled');
        break;
      case 'skeleton':
        attrs.push('skeleton');
        break;
      case 'error':
        attrs.push('error');
        break;
      // 'default' case - no additional attributes
    }

    return attrs.join(' ');
  };

  const avatarSize: Record<string, string> = { lg: 'xs', md: '2xs', sm: '2xs' };

  return /*html*/ `
  <cor-chip ${getAttributes()}>
    <!-- Icon Left -->
    ${args.showIconLeft ? `<cor-icon slot="icon-left" size="${args.size === 'lg' ? 'md' : args.size === 'md' ? 'sm' : '2xs'}" name="${ICON_NAMES.ADD__LARGE}" color="currentColor"></cor-icon>` : ''}

    <!-- Avatar -->
    ${args.showAvatar && args.size !== 'sm' ? `<cor-avatar slot="pre-content" size="${avatarSize[args.size ?? 'lg']}" initials="AZ"></cor-avatar>` : ''}

    <!-- Label -->
    ${args.label ? `<span slot="label">${args.label}</span>` : ''}

    <!-- Default Slot (Main Text) -->
    ${args.text}

    <!-- Icon Right -->
    ${args.showIconRight ? `<cor-icon slot="icon-right" size="${args.size === 'lg' ? 'md' : args.size === 'md' ? 'sm' : '2xs'}" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>` : ''}
  </cor-chip>
  `;
};

export const Default: Story = {
  args: defaultArgs,
  argTypes: {
    text: {
      control: 'text',
      description: 'Main text content (default slot)',
      table: { defaultValue: { summary: 'Label' } },
    },
    label: {
      control: 'text',
      description: 'Muted label prefix (label slot)',
    },
    showIconLeft: {
      control: 'boolean',
      description: 'Show left icon (cor-icon in icon-left slot)',
      table: { defaultValue: { summary: 'false' } },
    },
    showIconRight: {
      control: 'boolean',
      description: 'Show right icon (cor-icon in icon-right slot)',
      table: { defaultValue: { summary: 'false' } },
    },
    showAvatar: {
      control: 'boolean',
      description: 'Show avatar (cor-avatar in pre-content slot)',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render,
};

export const AllSizes: Story = {
  argTypes: {
    size: {
      control: false,
    },
  },
  args: { ...defaultArgs },
  render: (args: Partial<ChipArgs>) => {
    const iconSize: Record<string, string> = { lg: 'md', md: 'sm', sm: '2xs' };

    const chip = (size: string) => {
      const avatar =
        size === 'lg'
          ? `<cor-avatar slot="pre-content" size="xs" initials="AZ"></cor-avatar>`
          : size === 'md'
            ? `<cor-avatar slot="pre-content" size="2xs" initials="AZ"></cor-avatar>`
            : '';
      return `
      <cor-chip size="${size}">
        ${args.showIconLeft ? `<cor-icon slot="icon-left" size="${iconSize[size]}" name="${ICON_NAMES.ADD__LARGE}" color="currentColor"></cor-icon>` : ''}
        ${args.showAvatar ? avatar : ''}
        ${args.label ? `<span slot="label">${args.label}</span>` : ''}
        ${args.text}
        ${args.showIconRight ? `<cor-icon slot="icon-right" size="${iconSize[size]}" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>` : ''}
      </cor-chip>`;
    };

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="width: 48px; font-size: 12px; color: var(--color-text-base-secondary);">lg (32px)</span>
          ${chip('lg')}
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="width: 48px; font-size: 12px; color: var(--color-text-base-secondary);">md (24px)</span>
          ${chip('md')}
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="width: 48px; font-size: 12px; color: var(--color-text-base-secondary);">sm (20px)</span>
          ${chip('sm')}
        </div>
      </div>
    `;
  },
};

export const AllStates: Story = {
  argTypes: {
    size: {
      control: false,
    },
    state: {
      control: false,
    },
  },
  args: { ...defaultArgs },
  render: (args: Partial<ChipArgs>) => {
    const iconSize: Record<string, string> = { lg: 'md', md: 'sm', sm: '2xs' };

    const chip = (size: string, stateAttr: string) => {
      const ariaAttr = args.ariaLabel ? ` aria-label="${args.ariaLabel}"` : '';
      const iconLeft = args.showIconLeft
        ? `<cor-icon slot="icon-left" size="${iconSize[size]}" name="${ICON_NAMES.ADD__LARGE}" color="currentColor"></cor-icon>`
        : '';
      const avatar =
        size === 'lg'
          ? `<cor-avatar slot="pre-content" size="xs" initials="AZ"></cor-avatar>`
          : size === 'md'
            ? `<cor-avatar slot="pre-content" size="2xs" initials="AZ"></cor-avatar>`
            : '';
      const label = args.label ? `<span slot="label">${args.label}</span>` : '';
      const iconRight = args.showIconRight
        ? `<cor-icon slot="icon-right" size="${iconSize[size]}" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>`
        : '';
      return `<cor-chip size="${size}"${stateAttr}${ariaAttr}>${iconLeft}${args.showAvatar ? avatar : ''}${label}${args.text}${iconRight}</cor-chip>`;
    };

    const headerCell = (text: string) =>
      `<div style="font-weight: 600; font-size: 12px; padding: 4px 0;">${text}</div>`;
    const stateCell = (text: string) =>
      `<div style="font-size: 12px; color: var(--color-text-base-secondary); white-space: nowrap;">${text}</div>`;

    const rows: Array<{ label: string; attr: string }> = [
      { label: 'Default', attr: '' },
      { label: 'Active', attr: ' active' },
      { label: 'Disabled', attr: ' disabled' },
      { label: 'Skeleton', attr: ' skeleton' },
      { label: 'Error', attr: ' error' },
    ];

    const gridRows = rows
      .map(
        row => `
      ${stateCell(row.label)}
      <div>${chip('lg', row.attr)}</div>
      <div>${chip('md', row.attr)}</div>
      <div>${chip('sm', row.attr)}</div>`,
      )
      .join('');

    return /*html*/ `
      <div style="display: grid; grid-template-columns: 80px repeat(3, auto); gap: 12px 24px; align-items: center;">
        ${headerCell('State')}
        ${headerCell('lg')}
        ${headerCell('md')}
        ${headerCell('sm')}
        ${gridRows}
      </div>
    `;
  },
};

export const FullFeatured: Story = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  args: { ...defaultArgs },
  render: (args: Partial<ChipArgs>) => /*html*/ `
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <cor-chip size="lg">${args.text}</cor-chip>
      <cor-chip size="lg">
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.ADD__LARGE}" color="currentColor"></cor-icon>
        ${args.text}
      </cor-chip>
      <cor-chip size="lg">
        ${args.text}
        <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg">
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.FILTER}" color="currentColor"></cor-icon>
        ${args.text}
        <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg">
        <cor-avatar slot="pre-content" size="xs" initials="AZ"></cor-avatar>
        ${args.text}
      </cor-chip>
      <cor-chip size="lg">
        <span slot="label">Filter:</span>
        ${args.text}
      </cor-chip>
      <cor-chip size="lg" active>
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.CHECKMARK}" color="currentColor"></cor-icon>
        ${args.text}
      </cor-chip>
      <cor-chip size="lg" error>${args.text}</cor-chip>
      <cor-chip size="lg" disabled>${args.text}</cor-chip>
      <cor-chip size="lg" skeleton>${args.text}</cor-chip>
      <cor-chip size="lg">
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.ADD__LARGE}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg">
        <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg">
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.FILTER}" color="currentColor"></cor-icon>
        <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg" active>
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.CHECKMARK}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg" error>
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
      </cor-chip>
      <cor-chip size="lg" disabled>
        <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.SETTINGS}" color="currentColor"></cor-icon>
      </cor-chip>
    </div>
  `,
};

export const Interactive: Story = {
  args: { ...defaultArgs },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const logId = 'chip-log-content';
    const appendLog = (msg: string) => {
      const log = canvasElement.querySelector<HTMLElement>(`#${logId}`);
      if (log) log.innerHTML = `${msg}<br>${log.innerHTML}`;
    };

    canvasElement.querySelectorAll<HTMLElement>('cor-chip[data-label]').forEach(chip => {
      const chipLabel = chip.getAttribute('data-label') ?? '';

      chip.addEventListener('corChipClick', ((e: CustomEvent) => {
        const ts = new Date().toLocaleTimeString();
        appendLog(`[${ts}] <strong>corChipClick</strong> [${chipLabel}] — label: "${e.detail?.label ?? ''}"`);
      }) as EventListener);

      chip.addEventListener('click', (e: MouseEvent) => {
        const path = e.composedPath() as Element[];
        const isLeft = path.some(el => el.classList?.contains('chip__icon-wrap--left'));
        const isRight = path.some(el => el.classList?.contains('chip__icon-wrap--right'));
        if (!isLeft && !isRight) return;
        const slot = isLeft ? 'icon-left' : 'icon-right';
        const icon = chip.querySelector<HTMLElement>(`[slot="${slot}"]`);
        const ts = new Date().toLocaleTimeString();
        appendLog(`[${ts}] <strong>${slot}</strong> [${chipLabel}] — name: "${icon?.getAttribute('name') ?? ''}"`);
      });
    });
  },
  render: (args: Partial<ChipArgs>) => {
    return /*html*/ `
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 24px;">
        <!-- Full-featured: all slots + both clickable icons -->
        <cor-chip size="${args.size}" data-label="full">
          <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.ADD__LARGE}" color="currentColor" onclick="" data-icon-label="Add"></cor-icon>
          ${args.size !== 'sm' ? `<cor-avatar slot="pre-content" size="${args.size === 'lg' ? 'xs' : '2xs'}" initials="AZ"></cor-avatar>` : ''}
          <span slot="label">${args.label}</span>
          ${args.text}
          <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor" onclick="" data-icon-label="Remove"></cor-icon>
        </cor-chip>

        <!-- Active: left icon non-clickable, right clickable (remove) -->
        <cor-chip size="${args.size}" active data-label="active">
          <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.CHECKMARK}" color="currentColor"></cor-icon>
          ${args.size !== 'sm' ? `<cor-avatar slot="pre-content" size="${args.size === 'lg' ? 'xs' : '2xs'}" initials="AZ"></cor-avatar>` : ''}
          <span slot="label">${args.label}</span>
          ${args.text}
          <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor" onclick="" data-icon-label="Remove"></cor-icon>
        </cor-chip>

        <!-- With avatar + label + clickable right icon -->
        <cor-chip size="${args.size}" data-label="avatar">
          ${args.size !== 'sm' ? `<cor-avatar slot="pre-content" size="${args.size === 'lg' ? 'xs' : '2xs'}" initials="AZ"></cor-avatar>` : ''}
          <span slot="label">${args.label}</span>
          ${args.text}
          <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor" onclick="" data-icon-label="Remove"></cor-icon>
        </cor-chip>

        <!-- Error: both clickable icons -->
        <cor-chip size="${args.size}" error data-label="error">
          <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.ADD__LARGE}" color="currentColor" onclick="" data-icon-label="Add"></cor-icon>
          ${args.text}
          <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor" onclick="" data-icon-label="Remove"></cor-icon>
        </cor-chip>

        <!-- Disabled: icon buttons disabled automatically -->
        <cor-chip size="${args.size}" disabled data-label="disabled">
          <cor-icon slot="icon-left" size="md" name="${ICON_NAMES.ADD__LARGE}" color="currentColor" onclick="" data-icon-label="Add"></cor-icon>
          ${args.text}
          <cor-icon slot="icon-right" size="md" name="${ICON_NAMES.CLOSE}" color="currentColor" onclick="" data-icon-label="Remove"></cor-icon>
        </cor-chip>

      </div>
      <div style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; max-height: 160px; overflow-y: auto;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log (chip body · icon-left · icon-right):</div>
        <div id="chip-log-content">Interact with chips to see events...</div>
      </div>
    `;
  },
};
