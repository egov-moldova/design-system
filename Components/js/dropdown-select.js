
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
      this.docStaticHover = root.dataset.docStaticHover === 'true';
      this.docStaticFocus = root.dataset.docStaticFocus === 'true';
      this.docOpenDefault = root.dataset.docOpenDefault === 'true';

      
      this.isMultiple = root.dataset.multiple === "true";
      this.isSearchable = root.dataset.searchable === "true";
      this.isRequired =
        root.dataset.required === "true" ||
        (this.list && this.list.getAttribute("aria-required") === "true");

      this.init();
    }

    init() {
      if (this.root.getAttribute('aria-disabled') === 'true') {
        this.control.setAttribute('aria-disabled', 'true');
        this.control.setAttribute('tabindex', '-1');
        return;
      }

      if (!this.root.id) {
        window.__customSelectSeq = (window.__customSelectSeq || 0) + 1;
        this.root.id = 'custom-select-' + window.__customSelectSeq;
      }

      if (this.root.dataset.required === "true") {
        this.list.setAttribute("aria-required", "true");
      }
      if (this.isRequired) {
        this.control.setAttribute("aria-required", "true");
      }

      if (!this.list.id) {
        this.list.id = `${this.root.id}-listbox`;
      }
      this.control.setAttribute("aria-controls", this.list.id);

      this.options.forEach((opt) => this.wrapOptionStructure(opt));

      this.options.forEach((opt, i) => {
        if (!opt.id) opt.id = this.root.id + '-opt-' + i;
      });

      this.wireSearchField();

      
      this.control.setAttribute('aria-haspopup', 'listbox');
      this.control.setAttribute('aria-expanded', 'false');
      this.options.forEach((opt, i) => {
        opt.setAttribute('role', 'option');
        const sel = opt.classList.contains('is-selected');
        opt.setAttribute('aria-selected', sel ? 'true' : 'false');
        opt.dataset.index = i;
      });

      const preset = this.root.dataset.selectDefaultValue;
      if (preset) {
        const idx = this.options.findIndex(
          (o) => o.getAttribute('data-value') === preset
        );
        if (idx !== -1) {
          this.selectIndex(idx);
        }
      }

      
      this.control.addEventListener('mouseenter', () => {
        this.control.classList.add('select-control--state-hover');
      });
      this.control.addEventListener('mouseleave', () => {
        if (!this.docStaticHover) {
          this.control.classList.remove('select-control--state-hover');
        }
      });
      this.control.addEventListener('focus', () => {
        this.control.classList.add('select-control--state-focus');
      });
      this.control.addEventListener('blur', () => {
        if (!this.docStaticFocus) {
          this.control.classList.remove('select-control--state-focus');
        }
      });

      
      this.control.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });

      
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

      
      this.list.addEventListener('keydown', (e) => {
        if ([KEY.DOWN, KEY.UP, KEY.ENTER, KEY.ESC, KEY.HOME, KEY.END].includes(e.key)) {
          e.preventDefault();
        }
        switch (e.key) {
          case KEY.DOWN: this.focusNext(); break;
          case KEY.UP: this.focusPrev(); break;
          case KEY.ENTER: this.chooseActive(); break;
          case KEY.ESC:
            this.closeDropdown(true);
            this.control.focus({ preventScroll: true });
            break;
          case KEY.HOME: this.focusOption(0); break;
          case KEY.END: this.focusOption(this.options.length - 1); break;
        }
      });

      
      this.list.addEventListener('click', (e) => {
        const li = e.target.closest('.select-option');
        if (!li) return;
        this.selectIndex(Number(li.dataset.index));
        if (!this.isMultiple) {
          this.closeDropdown(true);
          this.control.focus({ preventScroll: true });
        }
      });

      
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

      
      document.addEventListener('click', (e) => {
        if (!this.open) return;
        if (!this.root.contains(e.target)) this.closeDropdown(true);
      });

      
      window.addEventListener('resize', () => { if (this.open) this.reposition(); });
      window.addEventListener('scroll', () => { if (this.open) this.reposition(); }, true);

      this.updateValue();
      if (this.docOpenDefault) {
        this.openDropdown({ skipFocus: true });
      }
    }

    wireSearchField() {
      if (!this.isSearchable || !this.searchInput) return;
      const input = this.searchInput;
      if (!input.id) {
        const sid = `${this.root.id}-search`;
        input.id = sid;
        input.setAttribute('name', sid);
      }
      const wrapper = input.closest('.select-search-wrapper');
      const hasLabel = Array.from(wrapper.querySelectorAll('label')).some((l) => l.htmlFor === input.id);
      if (!wrapper || hasLabel) return;
      const lab = document.createElement('label');
      lab.htmlFor = input.id;
      lab.className = 'sr-only';
      lab.textContent = input.getAttribute('aria-label') || 'Căutare în listă';
      input.removeAttribute('aria-label');
      wrapper.insertBefore(lab, input);
      if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
    }

    wrapOptionStructure(opt) {
      if (opt.querySelector('.select-option__label')) return;
      const t = opt.textContent.trim();
      opt.textContent = '';
      const label = document.createElement('span');
      label.className = 'select-option__label';
      label.textContent = t;
      const check = document.createElement('span');
      check.className = 'select-option__check';
      check.setAttribute('aria-hidden', 'true');
      check.setAttribute('aria-hidden', 'true');
      opt.appendChild(label);
      opt.appendChild(check);
    }

    optionLabelText(opt) {
      const label = opt.querySelector('.select-option__label');
      return (label ? label.textContent : opt.textContent).trim();
    }

    toggle() { this.open ? this.closeDropdown() : this.openDropdown(); }

    openDropdown(options = {}) {
      const skipFocus = options.skipFocus === true;
      if (this.open) return;
      this.dropdown.hidden = false;
      this.control.setAttribute('aria-expanded', 'true');
      this.open = true;
      if (!skipFocus) {
        if (this.isSearchable && this.searchInput) {
          this.searchInput.focus();
          this.searchInput.select();
        } else {
          this.list.focus();
        }
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
      this.list.removeAttribute('aria-activedescendant');
      if (!keepFocus) this.control.focus({ preventScroll: true });
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
      const phAttr = this.root.getAttribute('data-placeholder');
      const placeholder = phAttr === null ? 'Selectați...' : phAttr;
      if (this.isMultiple) {
        const values = this.options.filter(o => o.classList.contains('is-selected')).map(o => this.optionLabelText(o));
        const text = values.join(', ') || placeholder;
        this.valueNode.textContent = text;
        this.valueNode.classList.toggle('is-placeholder', values.length === 0);
      } else {
        const selected = this.options.find(o => o.classList.contains('is-selected'));
        const text = selected ? this.optionLabelText(selected) : placeholder;
        this.valueNode.textContent = text;
        this.valueNode.classList.toggle('is-placeholder', !selected);
      }
      this.syncRequiredState();
    }

    syncRequiredState() {
      if (!this.isRequired) return;
      const selected = this.options.some((o) =>
        o.classList.contains("is-selected")
      );
      this.control.setAttribute("aria-invalid", selected ? "false" : "true");
    }

    focusOption(idx) {
      if (idx < 0 || idx >= this.options.length) return;
      this.activeIndex = idx;
      this.scrollToOption(idx);
      this.clearActive();
      const el = this.options[idx];
      el.classList.add('is-active');
      el.focus?.();
      this.list.setAttribute('aria-activedescendant', el.id);
    }

    focusNext() { let next = this.activeIndex + 1; if (next >= this.options.length) next = 0; this.focusOption(next); }
    focusPrev() { let prev = this.activeIndex - 1; if (prev < 0) prev = this.options.length - 1; this.focusOption(prev); }
    chooseActive() {
      if (this.activeIndex >= 0) this.selectIndex(this.activeIndex);
      if (!this.isMultiple) {
        this.closeDropdown(true);
        this.control.focus({ preventScroll: true });
      }
    }

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
        const txt = this.optionLabelText(opt).toLowerCase();
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

  function initSelectDocNativeDemos() {
    document.querySelectorAll('[data-select-doc-native]').forEach((shell) => {
      const btn = shell.querySelector('.select-control');
      const menu = shell.querySelector('.select-doc-native-menu');
      if (!btn || !menu) return;

      shell.removeAttribute('aria-hidden');

      let isOpen = true;

      function apply() {
        menu.hidden = !isOpen;
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        shell.classList.toggle('select-doc-native-shell--collapsed', !isOpen);
      }

      apply();
      btn.setAttribute('tabindex', '0');
      if (!btn.hasAttribute('aria-haspopup')) {
        btn.setAttribute('aria-haspopup', 'listbox');
      }
      menu.setAttribute('role', 'listbox');

      function syncNativeSelectionAria() {
        menu.querySelectorAll('.select-doc-native-option').forEach((o) => {
          if (!o.hasAttribute('role')) o.setAttribute('role', 'option');
          o.setAttribute(
            'aria-selected',
            o.classList.contains('is-selected') ? 'true' : 'false'
          );
        });
      }

      syncNativeSelectionAria();

      const opts = [...menu.querySelectorAll('.select-doc-native-option')];
      opts.forEach((o) => o.setAttribute('tabindex', '-1'));

      function focusOptionAt(index) {
        if (index < 0 || index >= opts.length) return;
        opts.forEach((o, j) => {
          o.setAttribute('tabindex', j === index ? '0' : '-1');
        });
        opts[index].focus({ preventScroll: true });
      }

      function currentOptionIndex() {
        const ai = opts.indexOf(document.activeElement);
        if (ai >= 0) return ai;
        const sel = opts.findIndex((o) => o.classList.contains('is-selected'));
        return sel >= 0 ? sel : 0;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasClosed = !isOpen;
        isOpen = !isOpen;
        apply();
        if (!isOpen) {
          opts.forEach((o) => o.setAttribute('tabindex', '-1'));
          return;
        }
        if (wasClosed) {
          requestAnimationFrame(() => {
            const sel = opts.findIndex((o) => o.classList.contains('is-selected'));
            focusOptionAt(sel >= 0 ? sel : 0);
          });
        }
      });

      btn.addEventListener('keydown', (e) => {
        if (isOpen) return;
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        isOpen = true;
        apply();
        requestAnimationFrame(() => {
          const sel = opts.findIndex((o) => o.classList.contains('is-selected'));
          if (e.key === 'ArrowUp') {
            focusOptionAt(sel >= 0 ? sel : opts.length - 1);
          } else {
            focusOptionAt(sel >= 0 ? sel : 0);
          }
        });
      });

      menu.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        let i = currentOptionIndex();
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            focusOptionAt(Math.min(opts.length - 1, i + 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            focusOptionAt(Math.max(0, i - 1));
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            opts[i]?.click();
            break;
          case 'Home':
            e.preventDefault();
            focusOptionAt(0);
            break;
          case 'End':
            e.preventDefault();
            focusOptionAt(opts.length - 1);
            break;
          default:
            break;
        }
      });

      menu.querySelectorAll('.select-doc-native-option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.querySelectorAll('.select-doc-native-option').forEach((o) => {
            o.classList.remove('is-selected');
          });
          opt.classList.add('is-selected');
          menu.querySelectorAll('.select-doc-native-option').forEach((o) => {
            const mark = o.querySelector('.select-doc-native-option__mark');
            if (mark) {
              mark.textContent = o.classList.contains('is-selected') ? '\u2713' : '';
            }
          });
          const valEl = opt.querySelector('.select-doc-native-option__text');
          const label = valEl ? valEl.textContent.trim() : opt.textContent.trim();
          const valueNode = btn.querySelector('.select-value');
          if (valueNode) valueNode.textContent = label;
          isOpen = false;
          apply();
          syncNativeSelectionAria();
          opts.forEach((o) => o.setAttribute('tabindex', '-1'));
          btn.focus({ preventScroll: true });
        });
      });

      document.addEventListener('click', (e) => {
        if (!isOpen) return;
        if (!shell.contains(e.target)) {
          isOpen = false;
          apply();
          opts.forEach((o) => o.setAttribute('tabindex', '-1'));
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !isOpen) return;
        if (!shell.contains(document.activeElement)) return;
        isOpen = false;
        apply();
        opts.forEach((o) => o.setAttribute('tabindex', '-1'));
        btn.focus({ preventScroll: true });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-select]').forEach(el => new CustomSelect(el));
    initSelectDocNativeDemos();
  });

})();
