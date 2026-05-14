function extractMudBgUtilityClass(element) {
  const cn = element.className;
  if (typeof cn !== 'string') return null;
  const m = cn.match(/\bmud-bg-[a-z0-9-]+\b/);
  return m ? m[0] : null;
}

/**
 * Icons / flags: copy ready-to-paste markup instead of only `#icon-*` or `flag-xx`.
 */
function resolveTokenCopyText(token) {
  const explicitCopy =
    token.dataset && token.dataset.copyText != null ? String(token.dataset.copyText).trim() : '';
  if (explicitCopy) return explicitCopy;

  const fromDataset = token.dataset && token.dataset.token != null ? String(token.dataset.token) : '';
  const raw = fromDataset.trim() || token.textContent.trim();

  if (token.closest('[data-doc="icons"]')) {
    const useEl = token.querySelector('svg use');
    if (useEl) {
      const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
      if (href) {
        const svgEl = useEl.closest('svg');
        const cls = (svgEl && svgEl.getAttribute('class') && svgEl.getAttribute('class').trim()) || 'icon';
        return `<svg class="${cls}"><use href="${href}"/></svg>`;
      }
    }
    if (raw.startsWith('#icon-')) {
      return `<svg class="icon"><use href="assets/icons/sprite.svg${raw}"/></svg>`;
    }
  }

  if (token.closest('[data-doc="cursors"]')) {
    const css = token.dataset && token.dataset.cssCursor != null ? String(token.dataset.cssCursor).trim() : '';
    if (css) return `cursor: ${css};`;
  }

  if (token.closest('[data-doc="flags"]')) {
    const cell = token.closest('.flags-doc-item');
    const img =
      (cell && cell.querySelector('.flags-doc-item__flag img[src]')) || token.querySelector('img[src]');
    if (img) {
      const src = img.getAttribute('src') || '';
      const cls = (img.getAttribute('class') && img.getAttribute('class').trim()) || 'mud-size-24 mud-block';
      const alt = img.getAttribute('alt');
      const altPart = alt == null || alt === '' ? '' : ` alt="${String(alt).replace(/"/g, '&quot;')}"`;
      return `<img class="${cls}" src="${src}"${altPart} loading="lazy" decoding="async" />`;
    }
  }

  return raw;
}

function copyTextToClipboard(text, onDone) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(text, onDone));
  }
  return Promise.resolve(fallbackCopy(text, onDone));
}

function fallbackCopy(text, onDone) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (typeof onDone === 'function') onDone();
    return true;
  } catch {
    return false;
  }
}

function handleTokenCopyInteraction(token) {
  const value = resolveTokenCopyText(token);

  copyTextToClipboard(value, () => {
    token.classList.add('is-copied');

    setTimeout(() => {
      token.classList.remove('is-copied');
    }, 1200);
  });
}

document.addEventListener('click', (e) => {
  const token = e.target.closest('.token-name');
  if (token) {
    e.preventDefault();
    handleTokenCopyInteraction(token);
    return;
  }

  const paletteColumn = e.target.closest('[data-doc="colors"] .mud-doc-main .mud-col-12');
  if (!paletteColumn) return;

  if (e.target.closest('.mud-doc-section-head')) return;

  const swatch = e.target.closest('.mud-color-swatch');
  if (!swatch || !paletteColumn.contains(swatch)) return;

  const bgClass = extractMudBgUtilityClass(swatch);
  if (!bgClass) return;

  navigator.clipboard.writeText(bgClass).then(() => {
    swatch.classList.add('is-copied');

    setTimeout(() => {
      swatch.classList.remove('is-copied');
    }, 1200);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const token = e.target.closest('.token-name');
  if (!token) return;
  e.preventDefault();
  handleTokenCopyInteraction(token);
});
