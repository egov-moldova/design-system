// Fixture: rule must NOT fire — uses a Map called "cache" but for a
// synchronous registry, with no network call. The rule's gate requires a
// network-fetch usage in the same file, so this file should be ignored.
const registryCache = new Map<string, number>();

export function trackUse(key: string): number {
  const next = (registryCache.get(key) ?? 0) + 1;
  registryCache.set(key, next);
  return next;
}
