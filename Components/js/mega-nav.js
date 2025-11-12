document.addEventListener('DOMContentLoaded', () => {
  const dropdownItems = document.querySelectorAll('.nav__item--has-dropdown');

  // Funcție pentru închiderea tuturor meniurilor
  const closeAllDropdowns = () => {
    dropdownItems.forEach(item => {
      const button = item.querySelector('.nav__link');
      const menu = item.querySelector('.nav__menu');
      if (button && menu) {
        button.setAttribute('aria-expanded', 'false');
        item.classList.remove('nav__item--active');
        menu.hidden = true;
      }
    });
  };

  // Eveniment click pe fiecare dropdown button
  dropdownItems.forEach(item => {
    const button = item.querySelector('.nav__link');
    const menu = item.querySelector('.nav__menu');

    if (!button || !menu) return;

    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      // Închidem toate dropdown-urile
      closeAllDropdowns();

      // Dacă cel curent era închis → îl deschidem
      if (!isExpanded) {
        item.classList.add('nav__item--active');
        button.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
      }
    });
  });

  // Click în afară → închide toate dropdown-urile
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav__item--has-dropdown')) {
      closeAllDropdowns();
    }
  });

  // Închidere la tasta Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
    }
  });

  // Închidere la resize (ex. trecere desktop ↔ mobil)
  window.addEventListener('resize', closeAllDropdowns);
});


document.addEventListener('DOMContentLoaded', () => {
  // MENIUL PRINCIPAL MOBILE
  const toggleBtn = document.querySelector('.mainNav__toggle');
  const panel = document.querySelector('.mainNav__panel');

  const openMenu = () => {
    panel.hidden = false;
    panel.classList.add('is-active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  };

  const closeMenu = () => {
    panel.classList.remove('is-active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    setTimeout(() => panel.hidden = true, 300);
    
    // Reset slide submeniuri
    const submenus = panel.querySelectorAll('.mainNav__submenu');
    submenus.forEach(sm => {
      sm.style.transform = '';
      sm.hidden = true;
    });
    const lists = panel.querySelectorAll('.mainNav__list');
    lists.forEach(l => l.style.transform = '');
  };

  toggleBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleBtn.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.mainNav__panel') && !e.target.closest('.mainNav__toggle')) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });

  // SUBMENIU SLIDE LATERAL MOBILE
  const panelLists = panel.querySelectorAll('.mainNav__list');

  panelLists.forEach(list => {
    list.addEventListener('click', e => {
      const btn = e.target.closest('[data-submenu]');
      if (!btn) return;

      e.preventDefault();
      const submenuId = btn.getAttribute('data-submenu');
      const submenu = panel.querySelector(`#${submenuId}`);


    });

    const backBtns = list.querySelectorAll('.submenu-back');
    backBtns.forEach(back => {
      back.addEventListener('click', e => {
        e.preventDefault();
        const submenu = back.closest('.mainNav__submenu');
        submenu.style.transform = 'translateX(100%)';
        setTimeout(() => submenu.hidden = true, 300);

        const parentList = submenu.parentElement.closest('.mainNav__list');
        if (parentList) parentList.style.transform = 'translateX(0%)';
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const MOBILE_BREAKPOINT = 992;

  function initMobileNav() {
    const menuButtons = document.querySelectorAll("[data-submenu]");
    const backButtons = document.querySelectorAll("[data-back]");

    if (!menuButtons.length) return; // Nicio acțiune dacă nu există submeniuri

    menuButtons.forEach(button => {
      const submenuSelector = button.dataset.submenu;
      const submenu = document.querySelector(`#${submenuSelector}`);
      if (!submenu) return;

      button.addEventListener("click", (e) => {
        e.preventDefault();

        // Închide alte submeniuri deschise
        document.querySelectorAll(".mainNav__submenu.is-active").forEach(openSubmenu => {
          if (openSubmenu !== submenu) {
            openSubmenu.classList.remove("is-active");
            openSubmenu.style.transform = "translateX(100%)";
            setTimeout(() => openSubmenu.hidden = true, 300);
          }
        });

        const isOpen = submenu.classList.contains("is-active");

        if (!isOpen) {
          submenu.hidden = false;
          submenu.classList.add("is-active");
          submenu.style.transform = "translateX(0)";
          // Mutăm lista principală spre stânga
          const parentList = button.closest(".mainNav__list");
          if (parentList) parentList.style.transform = "translateX(-100%)";
        } else {
          submenu.style.transform = "translateX(100%)";
          submenu.classList.remove("is-active");
          setTimeout(() => submenu.hidden = true, 300);
        }
      });
    });

    backButtons.forEach(backBtn => {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const submenu = backBtn.closest(".mainNav__submenu");
        const parentList = submenu.closest(".mainNav__panel").querySelector(".mainNav__list");

        submenu.style.transform = "translateX(100%)";
        submenu.classList.remove("is-active");
        setTimeout(() => submenu.hidden = true, 300);

        // readucem lista principală înapoi
        if (parentList) parentList.style.transform = "translateX(0)";
      });
    });
  }

  // Inițializare doar pe mobile
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    initMobileNav();
  }

  // Reinițializare când se schimbă dimensiunea ecranului
  window.addEventListener("resize", () => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      initMobileNav();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const mobileHeader = document.querySelector('.header__mobile');
  if (!mobileHeader) return;

  const toggleBtn = mobileHeader.querySelector('.mainNav__toggle');
  const panel = mobileHeader.querySelector('.mainNav__panel');

  const openMenu = () => {
    panel.hidden = false;
    panel.classList.add('is-active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  };

  const closeMenu = () => {
    panel.classList.remove('is-active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    setTimeout(() => (panel.hidden = true), 300);
  };

  toggleBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleBtn.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.mainNav__panel') && !e.target.closest('.mainNav__toggle')) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });

  // Submeniu: deschidere cu slide din dreapta spre stânga
  const submenuButtons = panel.querySelectorAll('[data-submenu]');
  submenuButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const submenuId = btn.getAttribute('data-submenu');
      const submenu = panel.querySelector(`#${submenuId}`);
      if (!submenu) return;

      const isOpen = !submenu.hidden;

      // Închide toate submeniurile (cu animație resetată)
      panel.querySelectorAll('.mainNav__submenu').forEach(sm => {
        sm.classList.remove('is-active');
        sm.style.transform = 'translateX(100%)';
        sm.hidden = true;
      });

      if (!isOpen) {
        submenu.hidden = false;
        // Forțează repaint pentru a activa tranziția
        submenu.offsetHeight; 
        submenu.classList.add('is-active');
        submenu.style.transform = 'translateX(0)';
        btn.setAttribute('aria-expanded', 'true');
      } else {
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Butoane “Înapoi” — animare slide înapoi (dreapta) și ascundere
  const backButtons = panel.querySelectorAll('[data-back]');
  backButtons.forEach(back => {
    back.addEventListener('click', e => {
      e.preventDefault();
      const submenu = back.closest('.mainNav__submenu');
      if (!submenu) return;

      submenu.classList.remove('is-active');
      submenu.style.transform = 'translateX(100%)';

      setTimeout(() => {
        submenu.hidden = true;
        submenu.style.transform = '';
      }, 350); // egal cu durata CSS tranziției

      // Resetează aria-expanded pentru butonul care a deschis submeniul
      const btn = panel.querySelector(`[data-submenu="${submenu.id}"]`);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });
});



document.addEventListener("DOMContentLoaded", () => {
  const submenuButtons = document.querySelectorAll("[data-submenu]");
  const backButtons = document.querySelectorAll("[data-back]");

  submenuButtons.forEach((btn) => {
    const submenuSelector = btn.getAttribute("data-submenu");
    const submenu = document.querySelector(submenuSelector);

    if (!submenu) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      // Închide orice submeniu activ
      document.querySelectorAll(".mainNav__submenu.is-active").forEach((openSub) => {
        openSub.classList.remove("is-active");
        openSub.classList.add("is-leaving");
        setTimeout(() => {
          openSub.hidden = true;
          openSub.classList.remove("is-leaving");
        }, 350);
      });

      // Deschide submenu curent
      submenu.hidden = false;
      requestAnimationFrame(() => submenu.classList.add("is-active"));
      btn.setAttribute("aria-expanded", "true");
    });
  });

  backButtons.forEach((backBtn) => {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const submenu = backBtn.closest(".mainNav__submenu");
      if (!submenu) return;

      submenu.classList.remove("is-active");
      submenu.classList.add("is-leaving");

      setTimeout(() => {
        submenu.hidden = true;
        submenu.classList.remove("is-leaving");
      }, 350);

      document
        .querySelectorAll("[data-submenu]")
        .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
    });
  });
});


