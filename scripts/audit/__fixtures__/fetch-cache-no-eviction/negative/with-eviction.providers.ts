// Fixture: rule must NOT fire — caches fetch promises but ALSO evicts null
// results so transient failures don't block future retries.
const assetCache = new Map<string, Promise<string | null>>();

export function fetchAsset(url: string): Promise<string | null> {
  if (assetCache.has(url)) return assetCache.get(url)!;
  const p = fetch(url)
    .then(r => (r.ok ? r.text() : null))
    .catch(() => null);
  assetCache.set(url, p);
  p.then(result => {
    if (result === null) assetCache.delete(url);
  });
  return p;
}
