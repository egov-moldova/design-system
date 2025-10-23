// modal.js — Lightweight, accessible modal controller
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

  // Helpers
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Open modal overlay element
  function openModal(overlay) {
    if (!overlay) return;
    const modal = qs('.modal', overlay);
    if (!modal) return;

    // Save last focused element to restore later
    overlay.__lastFocused = document.activeElement;

    // show
    overlay.classList.add('is-active');
    modal.classList.add('is-active');

    overlay.setAttribute('aria-hidden', 'false');

    // prevent body scroll
    document.body.classList.add('modal-open');

    // focus first focusable inside modal, or the modal itself
    const first = qsa(FOCUSABLE, overlay)[0];
    (first || modal).focus();

    // attach focus trap + ESC handler
    overlay.__keydownHandler = (e) => handleKeydown(e, overlay);
    document.addEventListener('keydown', overlay.__keydownHandler, true);
  }

  // Close modal overlay element
  function closeModal(overlay) {
    if (!overlay) return;
    const modal = qs('.modal', overlay);
    overlay.classList.remove('is-active');
    modal?.classList.remove('is-active');

    overlay.setAttribute('aria-hidden', 'true');

    // restore body scroll (only if no other modals open)
    setTimeout(() => {
      if (!document.querySelector('.modal-overlay.is-active')) {
        document.body.classList.remove('modal-open');
      }
    }, 0);

    // restore focus
    const last = overlay.__lastFocused;
    try { last?.focus(); } catch (e) { /* noop */ }

    // remove keydown handler
    if (overlay.__keydownHandler) {
      document.removeEventListener('keydown', overlay.__keydownHandler, true);
      overlay.__keydownHandler = null;
    }
  }

  // Toggle if needed
  function toggleModal(overlay) {
    if (!overlay) return;
    if (overlay.classList.contains('is-active')) closeModal(overlay);
    else openModal(overlay);
  }

  // Key handling: Esc + Tab trap
  function handleKeydown(e, overlay) {
    const modal = qs('.modal', overlay);
    if (!modal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal(overlay);
      return;
    }

    if (e.key === 'Tab') {
      // focus trap
      const focusables = qsa(FOCUSABLE, overlay).filter(el => el.offsetParent !== null);
      if (focusables.length === 0) {
        // if nothing focusable, keep focus on modal
        e.preventDefault();
        modal.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        // shift+tab
        if (document.activeElement === first || document.activeElement === modal) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // tab
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  // Resolve target from data-open attribute value
  function resolveOverlay(selectorOrId) {
    if (!selectorOrId) return null;
    // if selector string like "#modalSm" or ".myModal"
    if (selectorOrId.trim().startsWith('#') || selectorOrId.trim().startsWith('.')) {
      return document.querySelector(selectorOrId.trim());
    }
    // otherwise treat as id (without #)
    return document.getElementById(selectorOrId.trim());
  }

  // Init on DOM ready
  function init() {
    // Open triggers: data-open value can be "#modalId" or "modalId"
    qsa('[data-open]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const targetSel = btn.getAttribute('data-open');
        const overlay = resolveOverlay(targetSel);
        if (!overlay) {
          console.warn('Modal target not found for', targetSel);
          return;
        }
        openModal(overlay);
      });
    });

    // Close triggers: elements inside modal with [data-close] or .modal-close
    qsa('[data-close], .modal-close').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) closeModal(overlay);
      });
    });

    // Click outside modal content (overlay click)
    qsa('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        // close only when clicking directly on overlay, not on modal children
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });

      // set initial aria-hidden
      if (!overlay.hasAttribute('aria-hidden')) overlay.setAttribute('aria-hidden', 'true');

      // ensure modal element is focusable for trapping fallback
      const modalEl = qs('.modal', overlay);
      if (modalEl && !modalEl.hasAttribute('tabindex')) {
        modalEl.setAttribute('tabindex', '-1');
      }
    });

    // Optional: allow opening by [data-open-id] or other custom patterns in future
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose some methods for debugging if needed
  window.__modal = {
    open: (sel) => {
      const overlay = resolveOverlay(sel);
      openModal(overlay);
    },
    close: (sel) => {
      const overlay = resolveOverlay(sel);
      closeModal(overlay);
    },
    toggle: (sel) => {
      const overlay = resolveOverlay(sel);
      toggleModal(overlay);
    }
  };
})();
