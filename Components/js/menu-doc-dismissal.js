(() => {
  function setMenuOpen(btn, panel, open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function clickIsInsideStack(event, stack, panel) {
    const path =
      typeof event.composedPath === 'function'
        ? event.composedPath()
        : [];
    const nodes = path.length > 0 ? path : [event.target];
    return nodes.some((node) => {
      if (!(node instanceof Node)) {
        return false;
      }
      return (
        node === stack ||
        node === panel ||
        stack.contains(node) ||
        panel.contains(node)
      );
    });
  }

  function clickIsOtherMenuDocDemo(el) {
    if (!el || !(el instanceof Node)) {
      return false;
    }
    if (el.closest('.menu-doc-variations')) {
      return true;
    }
    const row = el.closest('.menu-doc-row');
    if (row && !row.closest('.menu-doc-dismissal-row')) {
      return true;
    }
    return false;
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
        const dismissalRow = scenario.closest('.menu-doc-dismissal-row');
        const onDocClick = (e) => {
          if (!dismissArmed) return;
          if (panel.hidden) return;
          if (clickIsInsideStack(e, stack, panel)) return;

          const el = e.target instanceof Node ? e.target : null;
          if (clickIsOtherMenuDocDemo(el)) return;

          if (dismissalRow && el) {
            const siblingScenarios = dismissalRow.querySelectorAll(
              ':scope > .menu-doc-dismissal-scenario:not(.menu-doc-dismissal-scenario--outside)'
            );
            for (const s of siblingScenarios) {
              if (s.contains(el)) return;
            }
          }
          setMenuOpen(btn, panel, false);
        };
        document.addEventListener('click', onDocClick);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            dismissArmed = true;
          });
        });
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
