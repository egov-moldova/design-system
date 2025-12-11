/* custom-select.js — unificat: single, multi, searchable */
(function () {
  const KEY = {
    DOWN: 'ArrowDown',
    UP: 'ArrowUp',
    ENTER: 'Enter',
    ESC: 'Escape',
    HOME: 'Home',
    END: 'End',
    TAB: 'Tab'
  };

  class CustomSelect {
    constructor(root) {
      this.root = root;
      this.control = root.querySelector('.select-control');
      this.dropdown = root.querySelector('.select-dropdown');
      this.list = root.querySelector('.select-list');
      this.searchInput = root.querySelector('.select-search');
      this.clearBtn = root.querySelector('.select-clear');
      this.valueNode = root.querySelector('.select-value');
      this.options = Array.from(root.querySelectorAll('.select-option'));
      this.open = false;
      this.activeIndex = -1;
      this.filterText = '';

      // Detect options
      this.isMultiple = root.dataset.multiple === "true";
      this.isSearchable = root.dataset.searchable === "true";

      this.init();
    }

    init() {
      // ARIA wiring
      this.control.setAttribute('aria-haspopup', 'listbox');
      this.control.setAttribute('aria-expanded', 'false');
      this.list.setAttribute('role', 'listbox');
      this.options.forEach((opt, i) => {
        opt.setAttribute('role', 'option');
        opt.setAttribute('aria-selected', 'false');
        opt.dataset.index = i;
      });

      // Toggle dropdown
      this.control.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });

      // Keyboard navigation on control
      this.control.addEventListener('keydown', (e) => {
        if ([KEY.DOWN, KEY.UP].includes(e.key)) {
          e.preventDefault();
          this.openDropdown();
          this.focusOption(e.key === KEY.DOWN ? 0 : this.options.length - 1);
        } else if (e.key === KEY.ENTER) {
          e.preventDefault();
          this.toggle();
        }
      });

      // Keyboard on list
      this.list.addEventListener('keydown', (e) => {
        if ([KEY.DOWN, KEY.UP, KEY.ENTER, KEY.ESC, KEY.HOME, KEY.END].includes(e.key)) {
          e.preventDefault();
        }
        switch (e.key) {
          case KEY.DOWN: this.focusNext(); break;
          case KEY.UP: this.focusPrev(); break;
          case KEY.ENTER: this.chooseActive(); break;
          case KEY.ESC: this.closeDropdown(true); break;
          case KEY.HOME: this.focusOption(0); break;
          case KEY.END: this.focusOption(this.options.length - 1); break;
        }
      });

      // Click option
      this.list.addEventListener('click', (e) => {
        const li = e.target.closest('.select-option');
        if (!li) return;
        this.selectIndex(Number(li.dataset.index));
        if (!this.isMultiple) this.closeDropdown();
        this.control.focus();
      });

      // Search input
      if (this.isSearchable && this.searchInput) {
        this.searchInput.addEventListener('input', (e) => {
          this.filterText = e.target.value.trim().toLowerCase();
          this.applyFilter();
        });
        this.clearBtn && this.clearBtn.addEventListener('click', () => {
          this.searchInput.value = '';
          this.filterText = '';
          this.applyFilter();
          this.searchInput.focus();
        });
      }

      // Click outside
      document.addEventListener('click', (e) => {
        if (!this.open) return;
        if (!this.root.contains(e.target)) this.closeDropdown();
      });

      // Resize/scroll
      window.addEventListener('resize', () => { if (this.open) this.reposition(); });
      window.addEventListener('scroll', () => { if (this.open) this.reposition(); }, true);

      // Initial pre-selected value
      const pre = this.options.findIndex(o => o.classList.contains('is-selected') || o.getAttribute('aria-selected') === 'true');
      if (pre >= 0) this.updateValue();
    }

    toggle() { this.open ? this.closeDropdown() : this.openDropdown(); }

    openDropdown() {
      if (this.open) return;
      this.dropdown.hidden = false;
      this.control.setAttribute('aria-expanded', 'true');
      this.open = true;
      if (this.isSearchable && this.searchInput) {
        this.searchInput.focus();
        this.searchInput.select();
      } else {
        this.list.focus();
      }
      this.reposition();
    }

    closeDropdown(keepFocus = false) {
      if (!this.open) return;
      this.dropdown.hidden = true;
      this.control.setAttribute('aria-expanded', 'false');
      this.open = false;
      this.activeIndex = -1;
      this.clearActive();
      if (!keepFocus) this.control.focus();
    }

    selectIndex(idx) {
      const opt = this.options[idx];
      if (!opt) return;

      if (this.isMultiple) {
        opt.classList.toggle('is-selected');
        opt.setAttribute('aria-selected', opt.classList.contains('is-selected'));
        this.updateValue();
      } else {
        this.options.forEach(o => { o.classList.remove('is-selected'); o.setAttribute('aria-selected','false'); });
        opt.classList.add('is-selected');
        opt.setAttribute('aria-selected','true');
        this.updateValue();
      }
    }

    updateValue() {
      if (this.isMultiple) {
        const values = this.options.filter(o => o.classList.contains('is-selected')).map(o => o.textContent);
        this.valueNode.textContent = values.join(', ') || 'Selectați...';
      } else {
        const selected = this.options.find(o => o.classList.contains('is-selected'));
        this.valueNode.textContent = selected ? selected.textContent : 'Selectați...';
      }
    }

    focusOption(idx) {
      if (idx < 0 || idx >= this.options.length) return;
      this.activeIndex = idx;
      this.scrollToOption(idx);
      this.clearActive();
      const el = this.options[idx];
      el.classList.add('is-active');
      el.focus?.();
      this.list.setAttribute('aria-activedescendant', `option-${idx}`);
    }

    focusNext() { let next = this.activeIndex + 1; if (next >= this.options.length) next = 0; this.focusOption(next); }
    focusPrev() { let prev = this.activeIndex - 1; if (prev < 0) prev = this.options.length - 1; this.focusOption(prev); }
    chooseActive() { if (this.activeIndex >= 0) this.selectIndex(this.activeIndex); if (!this.isMultiple) this.closeDropdown(); }

    clearActive() { this.options.forEach(o => o.classList.remove('is-active')); }

    scrollToOption(idx) {
      const el = this.options[idx];
      if (!el) return;
      const parent = this.list;
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.top < parentRect.top) parent.scrollTop -= (parentRect.top - elRect.top);
      else if (elRect.bottom > parentRect.bottom) parent.scrollTop += (elRect.bottom - parentRect.bottom);
    }

    applyFilter() {
      const q = this.filterText;
      let firstShown = -1;
      this.options.forEach((opt, i) => {
        const txt = opt.textContent.trim().toLowerCase();
        const match = q === '' || txt.indexOf(q) !== -1;
        opt.style.display = match ? '' : 'none';
        if (match && firstShown === -1) firstShown = i;
      });
      if (firstShown >= 0) this.focusOption(firstShown);
    }

    reposition() {
      const rect = this.root.getBoundingClientRect();
      const dd = this.dropdown;
      dd.style.left = '';
      dd.style.right = '';
      dd.style.maxWidth = '';
      const vpW = window.innerWidth;
      const ddRect = dd.getBoundingClientRect();
      if (ddRect.right > vpW) {
        const overflow = ddRect.right - vpW + 8;
        dd.style.left = `-${overflow}px`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-select]').forEach(el => new CustomSelect(el));
  });

})();
