function extractMudBgUtilityClass(element) {
  const cn = element.className;
  if (typeof cn !== 'string') return null;
  const m = cn.match(/\bmud-bg-[a-z0-9-]+\b/);
  return m ? m[0] : null;
}

document.addEventListener('click', (e) => {
  const token = e.target.closest('.token-name');
  if (token) {
    const value = (token.dataset && token.dataset.token) || token.textContent.trim();

    navigator.clipboard.writeText(value).then(() => {
      token.classList.add('is-copied');

      setTimeout(() => {
        token.classList.remove('is-copied');
      }, 1200);
    });
    return;
  }

  const palette = e.target.closest('[data-doc="colors"] .mud-doc-palette');
  if (!palette) return;

  if (e.target.closest('.mud-doc-section-head')) return;

  const swatch =
    e.target.closest('.mud-doc-palette > .mud-row > .mud-col') ||
    e.target.closest('.mud-doc-palette .colors-doc-alpha-grid .mud-tile--alpha') ||
    e.target.closest('.mud-doc-palette .alpha-white-strip .mud-tile--alpha');

  if (!swatch) return;

  const bgClass = extractMudBgUtilityClass(swatch);
  if (!bgClass) return;

  navigator.clipboard.writeText(bgClass).then(() => {
    swatch.classList.add('is-copied');

    setTimeout(() => {
      swatch.classList.remove('is-copied');
    }, 1200);
  });
});
