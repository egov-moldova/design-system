(() => {
  const MENU_ICONS = [
    'assets/icons/sprite.svg#icon-shield',
    'assets/icons/sprite.svg#icon-business',
    'assets/icons/sprite.svg#icon-settings',
    'assets/icons/sprite.svg#icon-edit',
    'assets/icons/sprite.svg#icon-rotate-arrow',
    'assets/icons/sprite.svg#icon-qr-code',
  ];

  const LONG_MENU_LABEL =
    'This is a very long menu option that will likely not fit within a single line and should truncate with an ellipsis';

  function optIndex(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  function fillSelectionList(ul) {
    const count = parseInt(ul.getAttribute('data-option-count') || '6', 10);
    const sel = optIndex(ul.getAttribute('data-selected-option'));
    const hov = optIndex(ul.getAttribute('data-hover-option'));
    const dis = optIndex(ul.getAttribute('data-disabled-option'));
    const longIx = optIndex(ul.getAttribute('data-long-label-option'));
    const longText = ul.getAttribute('data-long-label-text') || LONG_MENU_LABEL;

    ul.replaceChildren();
    for (let i = 1; i <= count; i += 1) {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');

      const isSel = sel === i;
      const isHov = hov === i;
      const isDis = dis === i;
      const isLong = longIx === i;

      let cls = 'menu__item';
      if (isSel) cls += ' menu__item--selected';
      if (isHov) cls += ' menu__item--hover';
      if (isDis) cls += ' menu__item--disabled';
      if (isLong) cls += ' menu__item--multiline';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls.trim();
      btn.setAttribute('role', 'option');
      btn.setAttribute('tabindex', '-1');
      if (isDis) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }
      btn.setAttribute('aria-selected', isSel ? 'true' : 'false');

      if (isLong) {
        btn.innerHTML = `<span class="menu__label menu__label--multiline">${longText}</span>
          <span class="menu__check" aria-hidden="true"></span>`;
      } else {
        btn.innerHTML = `<span class="menu__label">Option ${i}</span>
          <span class="menu__check" aria-hidden="true"></span>`;
      }
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function fillContextualList(ul) {
    const count = parseInt(ul.getAttribute('data-option-count') || '6', 10);
    const cur = optIndex(ul.getAttribute('data-current-option'));
    const hov = optIndex(ul.getAttribute('data-hover-option'));
    const pressed = optIndex(ul.getAttribute('data-pressed-option'));
    const focus = optIndex(ul.getAttribute('data-focus-option'));
    const dis = optIndex(ul.getAttribute('data-disabled-option'));
    const longIx = optIndex(ul.getAttribute('data-long-label-option'));
    const longText = ul.getAttribute('data-long-label-text') || LONG_MENU_LABEL;

    ul.replaceChildren();
    for (let i = 1; i <= count; i += 1) {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');

      const isCur = cur === i;
      const isHov = hov === i;
      const isPressed = pressed === i;
      const isFocus = focus === i;
      const isDis = dis === i;
      const isLong = longIx === i;

      let cls = 'menu__item';
      if (isCur) cls += ' menu__item--current';
      if (isHov) cls += ' menu__item--hover';
      if (isPressed) cls += ' menu__item--pressed-demo';
      if (isFocus) cls += ' menu__item--focus-visible-demo';
      if (isDis) cls += ' menu__item--disabled';
      if (isLong) cls += ' menu__item--multiline';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls.trim();
      btn.setAttribute('role', 'menuitem');
      if (isDis) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }
      if (isLong) {
        btn.innerHTML = `<span class="menu__label menu__label--multiline">${longText}</span>
        <span class="menu__check" aria-hidden="true"></span>`;
      } else {
        btn.innerHTML = `<span class="menu__label">Option ${i}</span>
        <span class="menu__check" aria-hidden="true"></span>`;
      }
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  const LONG_HEADING =
    'This is a very long heading that will likely not fit within a single line container';

  function fillContextualLongHeading(ul) {
    ul.replaceChildren();
    appendMenuPlainRange(ul, 1, 3);
    appendListDivider(ul);
    const secLi = document.createElement('li');
    secLi.className = 'menu__section-label menu-doc-edge-heading';
    secLi.setAttribute('role', 'presentation');
    secLi.innerHTML = `<span class="menu__section-label-text">${LONG_HEADING}</span>`;
    ul.appendChild(secLi);
    appendMenuPlainRange(ul, 4, 6);
  }

  function appendMenuPlainRange(ul, from, to) {
    for (let i = from; i <= to; i += 1) {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      li.innerHTML = `
        <button type="button" class="menu__item" role="menuitem">
          <span class="menu__label">Option ${i}</span>
          <span class="menu__check" aria-hidden="true"></span>
        </button>`;
      ul.appendChild(li);
    }
  }

  function appendMenuIcon6(ul) {
    MENU_ICONS.forEach((href, idx) => {
      const i = idx + 1;
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      li.innerHTML = `
        <button type="button" class="menu__item" role="menuitem">
          <span class="menu__leading" aria-hidden="true">
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="${href}"></use>
            </svg>
          </span>
          <span class="menu__label">Option ${i}</span>
          <span class="menu__check" aria-hidden="true"></span>
        </button>`;
      ul.appendChild(li);
    });
  }

  function appendCheckbox6(ul) {
    for (let i = 1; i <= 6; i += 1) {
      const id = `menu-doc-var-cb-${i}`;
      const li = document.createElement('li');
      li.innerHTML = `
        <label class="menu__item menu__item--control checkbox checkbox--medium" for="${id}">
          <input type="checkbox" class="checkbox-input" id="${id}" name="menu-doc-var-cb" value="opt${i}" />
          <span class="checkbox-custom" aria-hidden="true"></span>
          <span class="menu__label">Option ${i}</span>
        </label>`;
      ul.appendChild(li);
    }
  }

  function appendRadio6(ul) {
    for (let i = 1; i <= 6; i += 1) {
      const id = `menu-doc-var-radio-${i}`;
      const checked = i === 2 ? ' checked' : '';
      const li = document.createElement('li');
      li.innerHTML = `
        <label class="menu__item menu__item--control radio radio--medium" for="${id}">
          <input type="radio" class="radio-input" id="${id}" name="menu-doc-var-radio-group" value="opt${i}"${checked} />
          <span class="radio-custom" aria-hidden="true"></span>
          <span class="menu__label">Option ${i}</span>
        </label>`;
      ul.appendChild(li);
    }
  }

  function appendListDivider(ul) {
    const divLi = document.createElement('li');
    divLi.className = 'menu__list-divider';
    divLi.setAttribute('role', 'separator');
    divLi.innerHTML =
      '<hr class="separator separator--horizontal separator--thin separator--subtle" />';
    ul.appendChild(divLi);
  }

  function appendSegmentedPlain6(ul) {
    appendMenuPlainRange(ul, 1, 3);
    appendListDivider(ul);
    appendMenuPlainRange(ul, 4, 6);
  }

  function appendSegHeading(ul) {
    appendMenuPlainRange(ul, 1, 3);
    appendListDivider(ul);
    const secLi = document.createElement('li');
    secLi.className = 'menu__section-label';
    secLi.setAttribute('role', 'presentation');
    secLi.innerHTML =
      '<span class="menu__section-label-text">Section Heading</span>';
    ul.appendChild(secLi);
    appendMenuPlainRange(ul, 4, 6);
  }

  function appendListbox6Pointer(ul) {
    for (let i = 1; i <= 6; i += 1) {
      const selected = i === 2;
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = selected
        ? 'menu__item menu__item--selected'
        : 'menu__item';
      btn.setAttribute('role', 'option');
      btn.setAttribute('tabindex', '-1');
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.innerHTML = `<span class="menu__label">Option ${i}</span>`;
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function fillLists() {
    document.querySelectorAll('[data-menu-doc-fill]').forEach((ul) => {
      const kind = ul.getAttribute('data-menu-doc-fill');
      switch (kind) {
        case 'selection-list':
          fillSelectionList(ul);
          return;
        case 'contextual-list':
          fillContextualList(ul);
          return;
        case 'contextual-edge-heading':
          fillContextualLongHeading(ul);
          return;
        case 'menu-plain-6':
          ul.replaceChildren();
          appendMenuPlainRange(ul, 1, 6);
          break;
        case 'menu-icon-6':
          ul.replaceChildren();
          appendMenuIcon6(ul);
          break;
        case 'checkbox-6':
          ul.replaceChildren();
          appendCheckbox6(ul);
          break;
        case 'radio-6':
          ul.replaceChildren();
          appendRadio6(ul);
          break;
        case 'menu-segmented-6':
          ul.replaceChildren();
          appendSegmentedPlain6(ul);
          break;
        case 'menu-seg-heading':
          ul.replaceChildren();
          appendSegHeading(ul);
          break;
        case 'listbox-6-pointer':
          ul.replaceChildren();
          appendListbox6Pointer(ul);
          break;
        default:
          break;
      }
    });
  }

  function wireListboxPointerDemo() {
    document
      .querySelectorAll('[data-menu-doc-fill="listbox-6-pointer"]')
      .forEach((ul) => {
        ul.addEventListener('click', (e) => {
          const row = e.target.closest('.menu__item');
          if (!row || !ul.contains(row)) return;
          ul.querySelectorAll('.menu__item').forEach((item) => {
            item.classList.remove('menu__item--selected');
            item.setAttribute('aria-selected', 'false');
          });
          row.classList.add('menu__item--selected');
          row.setAttribute('aria-selected', 'true');
        });
      });
  }

  function run() {
    fillLists();
    wireListboxPointerDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
