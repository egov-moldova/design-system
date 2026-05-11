(function () {
  'use strict';

  var root = document.querySelector('.menu-doc-breakpoints');
  if (!root) {
    return;
  }

  var SYNC_ATTR = 'data-selection-menu-sync';
  var SYNC_VALUE = 'bp';

  var panels = root.querySelectorAll(
    '.selection-menu[' + SYNC_ATTR + '="' + SYNC_VALUE + '"]'
  );
  if (!panels.length) {
    return;
  }

  function itemsIn(panel) {
    return panel.querySelectorAll('.selection-menu__item[role="option"]');
  }

  function selectedIndexIn(panel) {
    var nodes = itemsIn(panel);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].classList.contains('selection-menu__item--selected')) {
        return i;
      }
    }
    return 0;
  }

  function setSelectedIndex(index) {
    var n = panels[0] ? itemsIn(panels[0]).length : 0;
    if (n === 0) {
      return;
    }
    var idx = Math.max(0, Math.min(n - 1, index));

    for (var p = 0; p < panels.length; p++) {
      var nodes = itemsIn(panels[p]);
      nodes.forEach(function (node, i) {
        var on = i === idx;
        node.classList.toggle('selection-menu__item--selected', on);
        node.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
  }

  function isDisabledOption(el) {
    if (!el) {
      return true;
    }
    if (el.getAttribute('aria-disabled') === 'true') {
      return true;
    }
    if (el.classList.contains('menu__item--disabled')) {
      return true;
    }
    if (el.classList.contains('selection-menu__item--disabled')) {
      return true;
    }
    if (el.querySelector('[disabled], [aria-disabled="true"]')) {
      return true;
    }
    return false;
  }

  root.addEventListener('click', function (e) {
    var item = e.target.closest('.selection-menu__item[role="option"]');
    if (!item || !root.contains(item)) {
      return;
    }
    if (isDisabledOption(item)) {
      return;
    }
    var panel = item.closest('.selection-menu[' + SYNC_ATTR + '="' + SYNC_VALUE + '"]');
    if (!panel) {
      return;
    }
    var nodes = itemsIn(panel);
    var idx = Array.prototype.indexOf.call(nodes, item);
    if (idx === -1) {
      return;
    }
    setSelectedIndex(idx);
  });

  root.addEventListener('keydown', function (e) {
    var list = e.target.closest('.selection-menu__list[role="listbox"]');
    if (!list || !root.contains(list)) {
      return;
    }
    var panel = list.closest('.selection-menu[' + SYNC_ATTR + '="' + SYNC_VALUE + '"]');
    if (!panel) {
      return;
    }

    var nodes = itemsIn(panel);
    var len = nodes.length;
    if (!len) {
      return;
    }

    var current = selectedIndexIn(panel);
    var next = current;

    if (e.key === 'ArrowDown') {
      next = Math.min(len - 1, current + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      next = Math.max(0, current - 1);
      e.preventDefault();
    } else if (e.key === 'Home') {
      next = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      next = len - 1;
      e.preventDefault();
    } else {
      return;
    }

    if (next !== current) {
      setSelectedIndex(next);
    }
  });
})();

(function () {
  'use strict';

  var page = document.querySelector('.menu-doc-page');
  if (!page) {
    return;
  }

  function isDisabledOption(el) {
    if (!el) {
      return true;
    }
    if (el.getAttribute('aria-disabled') === 'true') {
      return true;
    }
    if (el.classList.contains('menu__item--disabled')) {
      return true;
    }
    if (el.querySelector('[disabled], [aria-disabled="true"]')) {
      return true;
    }
    return false;
  }

  function menuItems(menu) {
    return menu.querySelectorAll(
      ':scope > li[role="none"] > button.menu__item[role="menuitem"], ' +
        ':scope > li[role="none"] > a.menu__item[role="menuitem"]'
    );
  }

  function menuItemDisabled(node) {
    if (!node) {
      return true;
    }
    if (node.disabled || node.getAttribute('aria-disabled') === 'true') {
      return true;
    }
    return isDisabledOption(node);
  }

  page.addEventListener('click', function (e) {
    var menuBtn = e.target.closest(
      'ul[role="menu"] button.menu__item[role="menuitem"], ul[role="menu"] a.menu__item[role="menuitem"]'
    );
    if (menuBtn && page.contains(menuBtn)) {
      var menu = menuBtn.closest('ul[role="menu"]');
      if (!menu || !page.contains(menu)) {
        return;
      }
      if (menuItemDisabled(menuBtn)) {
        return;
      }
      if (menuBtn.tagName === 'A' && menuBtn.getAttribute('href') === '#') {
        e.preventDefault();
      }
      var triggers = menuItems(menu);
      triggers.forEach(function (node) {
        var on = node === menuBtn;
        node.classList.toggle('menu__item--current', on);
      });
      return;
    }

    var opt = e.target.closest(
      'button.menu__item[role="option"], li.menu__item[role="option"]'
    );
    if (!opt || !page.contains(opt)) {
      return;
    }
    var list = opt.closest('ul[role="listbox"]');
    if (!list || !page.contains(list)) {
      return;
    }
    if (opt.closest('.menu-doc-state-demo--hover')) {
      return;
    }
    if (isDisabledOption(opt)) {
      return;
    }
    var options = list.querySelectorAll(
      ':scope > li[role="none"] > button.menu__item[role="option"], ' +
        ':scope > li.menu__item[role="option"]'
    );
    if (!options.length) {
      return;
    }
    options.forEach(function (node) {
      var on = node === opt;
      node.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  });
})();
