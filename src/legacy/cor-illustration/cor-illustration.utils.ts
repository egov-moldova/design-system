import { ILLUSTRATION_NAMES } from './cor-illustration.types';
import type { IllustrationName } from './cor-illustration.types';

export function isValidIllustrationName(name: string): name is IllustrationName {
  return (ILLUSTRATION_NAMES as readonly string[]).includes(name);
}
