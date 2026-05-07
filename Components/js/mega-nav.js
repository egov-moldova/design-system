/**
 * Desktop nav dropdowns + tablet/mobile slide panels.
 * Menu panels match Figma selection-menu / contextual-menu (same tokens as Select).
 */
document.addEventListener('DOMContentLoaded', () => {
  // Match _menu-desktop.scss: .mainNav visible up to 1075px, .nav from 1076px
  const MAIN_NAV_MAX = 1075;

  // —— Desktop: .nav__item--has-dropdown ——
  const dropdownItems = document.querySelectorAll('.nav__item--has-dropdown');

  const closeAllDropdowns = () => {
    dropdownItems.forEach((item) => {
      const button = item.querySelector('.nav__link');
      const menu = item.querySelector('.nav__menu');
      if (button && menu) {
        button.setAttribute('aria-expanded', 'false');
        item.classList.remove('nav__item--active');
        menu.hidden = true;
      }
    });
  };

  dropdownItems.forEach((item) => {
    const button = item.querySelector('.nav__link');
    const menu = item.querySelector('.nav__menu');
    if (!button || !menu) return;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      closeAllDropdowns();

      if (!isExpanded) {
        item.classList.add('nav__item--active');
        button.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item--has-dropdown')) {
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDropdowns();
  });

  window.addEventListener('resize', closeAllDropdowns);

  // —— Slide panel (tablet header + mobile header) ——
  function initSlidePanel(toggle, panel) {
    if (!toggle || !panel) return;

    const resetSubmenus = () => {
      panel.querySelectorAll('.mainNav__submenu').forEach((sm) => {
        sm.classList.remove('is-active');
        sm.style.transform = '';
        sm.hidden = true;
      });
      panel.querySelectorAll('.mainNav__list').forEach((l) => {
        l.style.transform = '';
      });
      panel.querySelectorAll('[data-submenu]').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'false');
      });
    };

    const openMenu = () => {
      resetSubmenus();
      panel.hidden = false;
      panel.classList.add('is-active');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
    };

    const closeMenu = () => {
      panel.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      resetSubmenus();
      window.setTimeout(() => {
        panel.hidden = true;
      }, 300);
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('is-active')) return;
      if (!e.target.closest(panel) && !e.target.closest(toggle)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-active')) {
        closeMenu();
      }
    });

    // Submenus: only buttons inside this panel
    panel.querySelectorAll('[data-submenu]').forEach((button) => {
      const submenuId = button.getAttribute('data-submenu');
      if (!submenuId) return;
      const submenu = panel.querySelector(`#${CSS.escape(submenuId)}`);
      if (!submenu) return;

      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.innerWidth > MAIN_NAV_MAX) return;

        const isOpen = submenu.classList.contains('is-active');

        panel.querySelectorAll('.mainNav__submenu.is-active').forEach((openSm) => {
          if (openSm !== submenu) {
            openSm.classList.remove('is-active');
            openSm.style.transform = 'translateX(100%)';
            window.setTimeout(() => {
              openSm.hidden = true;
            }, 300);
            const sid = openSm.id;
            const prevBtn = panel.querySelector(`[data-submenu="${CSS.escape(sid)}"]`);
            if (prevBtn) prevBtn.setAttribute('aria-expanded', 'false');
          }
        });

        if (!isOpen) {
          submenu.hidden = false;
          submenu.classList.add('is-active');
          submenu.style.transform = 'translateX(0)';
          const parentList = button.closest('.mainNav__list');
          if (parentList) parentList.style.transform = 'translateX(-100%)';
          button.setAttribute('aria-expanded', 'true');
        } else {
          submenu.style.transform = 'translateX(100%)';
          submenu.classList.remove('is-active');
          window.setTimeout(() => {
            submenu.hidden = true;
          }, 300);
          const parentList = button.closest('.mainNav__list');
          if (parentList) parentList.style.transform = 'translateX(0)';
          button.setAttribute('aria-expanded', 'false');
        }
      });
    });

    panel.querySelectorAll('[data-back]').forEach((backBtn) => {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const submenu = backBtn.closest('.mainNav__submenu');
        if (!submenu) return;

        submenu.style.transform = 'translateX(100%)';
        submenu.classList.remove('is-active');
        window.setTimeout(() => {
          submenu.hidden = true;
        }, 300);

        const rootList = panel.querySelector('.mainNav__content .mainNav__list');
        if (rootList) rootList.style.transform = 'translateX(0)';

        const id = submenu.id;
        const opener = panel.querySelector(`[data-submenu="${CSS.escape(id)}"]`);
        if (opener) opener.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const desktopToggle = document.querySelector(
    'header.header:not(.header__mobile) .mainNav__toggle:not(.mobile)'
  );
  const desktopPanel = document.getElementById('mainNav__panel');
  initSlidePanel(desktopToggle, desktopPanel);

  const mobileHeader = document.querySelector('.header__mobile');
  if (mobileHeader) {
    const mobileToggle = mobileHeader.querySelector('.mainNav__toggle.mobile');
    const mobilePanel = mobileHeader.querySelector('#mainNav__panel-mobile');
    initSlidePanel(mobileToggle, mobilePanel);
  }
});
