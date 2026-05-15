import { TEXT_COLOR_TOKENS } from './cor-typography.constants';
import { textVariants } from './cor-typography.enums';

export default {
  title: 'Atoms/Typography',
  component: 'cor-typography',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: Object.values(textVariants),
      control: { type: 'select' },
      default: textVariants.BODY_MD,
    },
    color: {
      options: TEXT_COLOR_TOKENS,
      control: { type: 'select' },
      default: 'color-neutral-text-default',
    },
  },
};

export const Typography = {
  render: (args: any) =>
    /*html*/ `<cor-typography variant="${args.variant}" color="${args.color}">${args.content}</cor-typography>`,
  args: {
    variant: textVariants.BODY_MD,
    color: 'color-neutral-text-default',
    content: 'Hello (Raw Text)',
  },
};

export const WithTag = {
  render: (args: any) =>
    /*html*/ `<cor-typography variant="${args.variant}" color="${args.color}"><div>${args.content}</div></cor-typography>`,
  args: {
    variant: textVariants.BODY_MD,
    color: 'color-neutral-text-default',
    content: 'Hello (In <div>)',
  },
};

export const AllVariations = {
  args: {
    color: 'color-neutral-text-default',
  },
  render: (args: any) => {
    const headingVariants = [
      { variant: textVariants.HEADING_4XL, tag: 'h1', label: 'Heading 4XL - The largest heading' },
      { variant: textVariants.HEADING_3XL, tag: 'h1', label: 'Heading 3XL - Extra large heading' },
      { variant: textVariants.HEADING_2XL, tag: 'h1', label: 'Heading 2XL - Very large heading' },
      { variant: textVariants.HEADING_XL, tag: 'h1', label: 'Heading XL - Large heading' },
      { variant: textVariants.HEADING_LG, tag: 'h2', label: 'Heading LG - Medium large heading' },
      { variant: textVariants.HEADING_MD, tag: 'h3', label: 'Heading MD - Medium heading' },
      { variant: textVariants.HEADING_SM, tag: 'h4', label: 'Heading SM - Small heading' },
    ];

    const bodyVariants = [
      { variant: textVariants.BODY_LG, tag: 'p', label: 'Body LG - Large body text for comfortable reading' },
      {
        variant: textVariants.BODY_LG_UNDERLINE,
        tag: 'p',
        label: 'Body LG Underline - Large body text with underline',
      },
      {
        variant: textVariants.BODY_LG_SEMIBOLD,
        tag: 'p',
        label: 'Body LG Semibold - Large body text with semibold weight',
      },
      { variant: textVariants.BODY_MD, tag: 'p', label: 'Body MD - Medium body text for standard content' },
      {
        variant: textVariants.BODY_MD_UNDERLINE,
        tag: 'p',
        label: 'Body MD Underline - Medium body text with underline',
      },
      {
        variant: textVariants.BODY_MD_SEMIBOLD,
        tag: 'p',
        label: 'Body MD Semibold - Medium body text with semibold weight',
      },
      { variant: textVariants.BODY_SM, tag: 'p', label: 'Body SM - Small body text for compact content' },
      {
        variant: textVariants.BODY_SM_SEMIBOLD,
        tag: 'p',
        label: 'Body SM Semibold - Small body text with semibold weight',
      },
      { variant: textVariants.BODY_XS, tag: 'p', label: 'Body XS - Extra small body text for fine print' },
      {
        variant: textVariants.BODY_XS_SEMIBOLD,
        tag: 'p',
        label: 'Body XS Semibold - Extra small body text with semibold weight',
      },
      { variant: textVariants.BODY_XS_UPPERCASE, tag: 'p', label: 'Body XS Uppercase - Extra small uppercase text' },
    ];

    const renderVariant = (item: { variant: string; tag: string; label: string }) =>
      /*html*/ `<cor-typography variant="${item.variant}" color="${args.color}"><${item.tag}>${item.label}</${item.tag}></cor-typography>`;

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px;">
        <h3>Heading Variants</h3>
        ${headingVariants.map(renderVariant).join('\n')}

        <h3>Body Variants</h3>
        ${bodyVariants.map(renderVariant).join('\n')}
      </div>
    `;
  },
};
