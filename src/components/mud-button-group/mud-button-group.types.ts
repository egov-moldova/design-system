export const BUTTON_GROUP_ORIENTATIONS = ['horizontal', 'vertical'] as const;

export type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number];
