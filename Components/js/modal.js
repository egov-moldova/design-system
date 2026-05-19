
(function () {
  const FOCUSABLE = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])'
  ].join(',');

  
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  
  function openModal(overlay) {
    if (!overlay) return;
    const modal = qs('.modal', overlay);
    if (!modal) return;

    if (!modal.hasAttribute('tabindex')) {
      modal.setAttribute('tabindex', '-1');
    }

    
    overlay.__lastFocused = document.activeElement;

    
    overlay.classList.add('is-active');
    modal.classList.add('is-active');

    overlay.setAttribute('aria-hidden', 'false');

    
    document.body.classList.add('modal-open');

    
    const first = qsa(FOCUSABLE, overlay)[0];
    (first || modal).focus();

    
    overlay.__keydownHandler = (e) => handleKeydown(e, overlay);
    document.addEventListener('keydown', overlay.__keydownHandler, true);
  }

  
  function closeModal(overlay) {
    if (!overlay) return;
    const modal = qs('.modal', overlay);
    overlay.classList.remove('is-active');
    modal?.classList.remove('is-active');

    overlay.setAttribute('aria-hidden', 'true');

    
    setTimeout(() => {
      if (!document.querySelector('.modal-overlay.is-active')) {
        document.body.classList.remove('modal-open');
      }
    }, 0);

    
    const last = overlay.__lastFocused;
    try { last?.focus(); } catch (e) {  }

    
    if (overlay.__keydownHandler) {
      document.removeEventListener('keydown', overlay.__keydownHandler, true);
      overlay.__keydownHandler = null;
    }
  }

  
  function toggleModal(overlay) {
    if (!overlay) return;
    if (overlay.classList.contains('is-active')) closeModal(overlay);
    else openModal(overlay);
  }

  
  function handleKeydown(e, overlay) {
    const modal = qs('.modal', overlay);
    if (!modal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal(overlay);
      return;
    }

    if (e.key === 'Tab') {
      
      const focusables = qsa(FOCUSABLE, overlay).filter(el => el.offsetParent !== null);
      if (focusables.length === 0) {
        
        e.preventDefault();
        modal.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        
        if (document.activeElement === first || document.activeElement === modal) {
          e.preventDefault();
          last.focus();
        }
      } else {
        
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  
  function resolveOverlay(selectorOrId) {
    if (!selectorOrId) return null;
    
    if (selectorOrId.trim().startsWith('#') || selectorOrId.trim().startsWith('.')) {
      return document.querySelector(selectorOrId.trim());
    }
    
    return document.getElementById(selectorOrId.trim());
  }

  const SEARCH_MODAL_IDS = ['#search-modal', '#search-modal-mobile'];

  
  const DOC_SEARCH_MODALS_HTML = `
<div class="modal-overlay" id="search-modal" aria-hidden="true">
  <div class="modal modal--md modal--simple mud-py-40 mud-px-32" tabindex="-1" role="dialog" aria-modal="true"
    aria-labelledby="doc-search-title-desktop">
    <div class="mud-flex mud-items-start mud-justify-between mud-gap-16 mud-mb-16">
      <h2 class="mud-desktop-heading-sm mud-my-0" id="doc-search-title-desktop">Căutare în documentație</h2>
      <button type="button" class="mud-btn-icon" data-close aria-label="Închide">
        <svg class="icon small" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-cross-small"></use>
        </svg>
      </button>
    </div>
    <p class="mud-my-0 mud-mb-16" style="font-size: 14px; color: var(--gray-600, #666);">
      Tastează o clasă utilitară (ex. <code class="mud-text-gray-800">mud-container</code>) — vei fi dus la pagina
      unde este documentată.
    </p>
    <div class="doc-search" data-doc-search-root>
      <div class="search-input medium">
        <span class="mud-p-2 mud-radius-8 mud-inline-flex icon-search" aria-hidden="true">
          <svg class="icon medium" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-search"></use>
          </svg>
        </span>
        <input type="search" class="input" data-doc-search id="doc-search-input-desktop"
          list="doc-search-datalist-desktop" placeholder="Caută clasă (ex. mud-container)" autocomplete="off"
          autocorrect="off" spellcheck="false" aria-label="Căutare clasă în documentație"
          aria-controls="doc-search-hits-desktop" aria-autocomplete="list" />
        <button type="button" class="mud-btn-icon clear" aria-label="Șterge căutarea">
          <svg class="icon small" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-cross-small"></use>
          </svg>
        </button>
      </div>
      <p class="doc-search__empty" data-doc-search-empty hidden>Nu s-au găsit rezultate.</p>
      <ul class="doc-search__hits" id="doc-search-hits-desktop" data-doc-search-hits role="listbox" hidden></ul>
    </div>
    <datalist id="doc-search-datalist-desktop"></datalist>
  </div>
</div>

<div class="modal-overlay" id="search-modal-mobile" aria-hidden="true">
  <div class="modal modal--md modal--simple mud-py-32 mud-px-24" tabindex="-1" role="dialog" aria-modal="true"
    aria-labelledby="doc-search-title-mobile">
    <div class="mud-flex mud-items-start mud-justify-between mud-gap-16 mud-mb-16">
      <h2 class="mud-mobile-heading-sm mud-my-0" id="doc-search-title-mobile">Căutare</h2>
      <button type="button" class="mud-btn-icon" data-close aria-label="Închide">
        <svg class="icon small" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-cross-small"></use>
        </svg>
      </button>
    </div>
    <div class="doc-search" data-doc-search-root>
      <div class="search-input medium">
        <span class="mud-p-2 mud-radius-8 mud-inline-flex icon-search" aria-hidden="true">
          <svg class="icon medium" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-search"></use>
          </svg>
        </span>
        <input type="search" class="input" data-doc-search id="doc-search-input-mobile"
          list="doc-search-datalist-mobile" placeholder="Clasă (ex. mud-p-16)" autocomplete="off" autocorrect="off"
          spellcheck="false" aria-label="Căutare clasă în documentație" aria-controls="doc-search-hits-mobile"
          aria-autocomplete="list" />
        <button type="button" class="mud-btn-icon clear" aria-label="Șterge căutarea">
          <svg class="icon small" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-cross-small"></use>
          </svg>
        </button>
      </div>
      <p class="doc-search__empty" data-doc-search-empty hidden>Nu s-au găsit rezultate.</p>
      <ul class="doc-search__hits" id="doc-search-hits-mobile" data-doc-search-hits role="listbox" hidden></ul>
    </div>
    <datalist id="doc-search-datalist-mobile"></datalist>
  </div>
</div>`.trim();

  function appendDocSearchScriptOnce() {
    if (window.__docSearchScriptRequested) return;
    window.__docSearchScriptRequested = true;
    const s = document.createElement('script');
    s.src = 'js/doc-search.js';
    s.async = true;
    document.body.appendChild(s);
  }

  function wireSearchModalOverlays() {
    qsa('#search-modal, #search-modal-mobile').forEach((overlay) => {
      if (!overlay.hasAttribute('aria-hidden')) overlay.setAttribute('aria-hidden', 'true');
      const modalEl = qs('.modal', overlay);
      if (modalEl && !modalEl.hasAttribute('tabindex')) modalEl.setAttribute('tabindex', '-1');
    });
  }

  function tryEnsureSearchModals() {
    if (document.getElementById('search-modal')) return true;
    try {
      document.body.insertAdjacentHTML('beforeend', DOC_SEARCH_MODALS_HTML);
      appendDocSearchScriptOnce();
      wireSearchModalOverlays();
      return true;
    } catch (e) {
      console.error('Search modals bootstrap failed:', e);
      return false;
    }
  }

  function resolveOverlayWithSearchFallback(selectorOrId) {
    const trimmed = String(selectorOrId || '').trim();
    let overlay = resolveOverlay(trimmed);
    if (!overlay && SEARCH_MODAL_IDS.indexOf(trimmed) !== -1) {
      tryEnsureSearchModals();
      overlay = resolveOverlay(trimmed);
    }
    return overlay;
  }

  
  function init() {
    
    document.addEventListener('click', (ev) => {
      const opener = ev.target.closest('[data-open]');
      if (opener) {
        const targetSel = opener.getAttribute('data-open');
        if (targetSel) {
          const overlay = resolveOverlayWithSearchFallback(targetSel);
          if (!overlay) {
            console.warn('Modal target not found for', targetSel);
            return;
          }
          if (opener.tagName === 'A') ev.preventDefault();
          openModal(overlay);
        }
        return;
      }

      const closer = ev.target.closest('[data-close], .modal-close');
      if (closer) {
        const overlay = closer.closest('.modal-overlay');
        if (overlay) closeModal(overlay);
        return;
      }

      const overlayHit = ev.target.closest('.modal-overlay');
      if (overlayHit && ev.target === overlayHit) {
        closeModal(overlayHit);
      }
    });

    qsa('.modal-overlay').forEach((overlay) => {
      if (!overlay.hasAttribute('aria-hidden')) overlay.setAttribute('aria-hidden', 'true');

      const modalEl = qs('.modal', overlay);
      if (modalEl && !modalEl.hasAttribute('tabindex')) {
        modalEl.setAttribute('tabindex', '-1');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  
  window.__modal = {
    open: (sel) => {
      const overlay = resolveOverlayWithSearchFallback(sel);
      openModal(overlay);
    },
    close: (sel) => {
      const overlay = resolveOverlay(sel);
      closeModal(overlay);
    },
    toggle: (sel) => {
      const overlay = resolveOverlayWithSearchFallback(sel);
      toggleModal(overlay);
    }
  };
})();
