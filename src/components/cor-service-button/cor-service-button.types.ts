export const SERVICE_BUTTON_APPEARANCES = ['primary', 'neutral'] as const;
export type ServiceButtonAppearance = (typeof SERVICE_BUTTON_APPEARANCES)[number];

export const SERVICE_BUTTON_TYPES = ['button', 'submit', 'reset'] as const;
export type ServiceButtonType = (typeof SERVICE_BUTTON_TYPES)[number];
