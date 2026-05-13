
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

  
  function init() {
    
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

    
    qsa('[data-close], .modal-close').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) closeModal(overlay);
      });
    });

    
    qsa('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });

      
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
