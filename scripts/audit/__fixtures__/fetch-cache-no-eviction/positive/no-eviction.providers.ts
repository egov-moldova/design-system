// Fixture: rule MUST fire — caches fetch promises in a Map, no .delete() call
// to evict null results. A transient 404 will lock future consumers out.
const assetCache = new Map<string, Promise<string | null>>();

export function fetchAsset(url: string): Promise<string | null> {
  if (assetCache.has(url)) return assetCache.get(url)!;
  const p = fetch(url)
    .then(r => (r.ok ? r.text() : null))
    .catch(() => null);
  assetCache.set(url, p);
  return p;
}
