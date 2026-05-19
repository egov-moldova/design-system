import localIcons from './assets/local-icons.json';
import { carbonIcons } from './assets/carbon-icons';
import { carbonDataToSvg } from './cor-icon.utils';

export type IconProvider = 'local' | 'carbon';

export function resolveIcon(name: string): string | undefined {
  if (name.startsWith('carbon:')) {
    const carbonName = name.replace('carbon:', '');
    const data = carbonIcons[carbonName as keyof typeof carbonIcons];

    return data ? carbonDataToSvg(data) : undefined;
  }

  return (localIcons as Record<string, string>)[name];
}
