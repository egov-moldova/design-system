(() => {
  function setMenuOpen(btn, panel, open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setupDismissalStacks() {
    document.querySelectorAll('.menu-doc-dismissal-stack').forEach((stack) => {
      const btn = stack.querySelector('.menu-doc-dismissal-trigger');
      const panel = stack.querySelector('.menu__panel');
      if (!btn || !panel) return;

      const scenario = stack.closest('.menu-doc-dismissal-scenario');
      const outsideScenario =
        scenario?.classList.contains('menu-doc-dismissal-scenario--outside');

      setMenuOpen(btn, panel, true);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        setMenuOpen(btn, panel, panel.hidden);
      });

      if (outsideScenario) {
        let dismissArmed = false;
        const onDocClick = (e) => {
          if (!dismissArmed) return;
          if (panel.hidden) return;
          if (stack.contains(e.target)) return;
          setMenuOpen(btn, panel, false);
        };
        document.addEventListener('click', onDocClick);
        window.setTimeout(() => {
          dismissArmed = true;
          setMenuOpen(btn, panel, true);
        }, 200);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    const focusedStack = document.activeElement?.closest?.(
      '.menu-doc-dismissal-stack'
    );
    if (focusedStack) {
      const panel = focusedStack.querySelector('.menu__panel');
      const btn = focusedStack.querySelector('.menu-doc-dismissal-trigger');
      if (panel && !panel.hidden && btn) {
        setMenuOpen(btn, panel, false);
        e.preventDefault();
        btn.focus();
      }
      return;
    }

    const openPanels = [
      ...document.querySelectorAll('.menu-doc-dismissal-stack .menu__panel'),
    ].filter((p) => !p.hidden);
    const lastOpen = openPanels[openPanels.length - 1];
    if (!lastOpen) return;
    const stack = lastOpen.closest('.menu-doc-dismissal-stack');
    const btn = stack?.querySelector('.menu-doc-dismissal-trigger');
    if (!stack || !btn) return;
    setMenuOpen(btn, lastOpen, false);
    e.preventDefault();
    btn.focus();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDismissalStacks);
  } else {
    setupDismissalStacks();
  }
})();
