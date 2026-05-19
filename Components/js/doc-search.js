(function () {
  const INDEX_PATH = 'data/doc-search-index.json';
  const MAX_HITS = 20;
  const MAX_DATALIST = 48;
  const DEBOUNCE_MS = 120;

  const indexUrl = new URL(INDEX_PATH, window.location.href).href;

  let indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(indexUrl)
        .then((r) => {
          if (!r.ok) throw new Error('doc-search: ' + r.status);
          return r.json();
        })
        .then((data) => data.entries || []);
    }
    return indexPromise;
  }

  function normalizeQuery(raw) {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/^\.+/, '');
  }

  function scoreEntry(query, entry) {
    if (!query) return 0;
    const q = query;
    const t = entry.q.toLowerCase();
    const title = (entry.title || '').toLowerCase();
    const snip = (entry.snippet || '').toLowerCase();
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;
    if (title.includes(q)) return 40;
    if (snip.includes(q)) return 20;
    return 0;
  }

  function filterEntries(entries, query) {
    const q = normalizeQuery(query);
    if (!q) return [];
    const ranked = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const s = scoreEntry(q, e);
      if (s > 0) ranked.push({ e, s });
    }
    ranked.sort((a, b) => b.s - a.s || a.e.q.localeCompare(b.e.q));
    return ranked.slice(0, MAX_HITS).map((x) => x.e);
  }

  function prefixForDatalist(entries, query) {
    const q = normalizeQuery(query);
    if (!q) return entries.slice(0, MAX_DATALIST);
    const starts = [];
    const rest = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.q.toLowerCase().startsWith(q)) starts.push(e);
      else if (e.q.toLowerCase().includes(q)) rest.push(e);
    }
    return [...starts, ...rest].slice(0, MAX_DATALIST);
  }

  function fillDatalist(datalist, entries) {
    if (!datalist) return;
    datalist.innerHTML = '';
    for (let i = 0; i < entries.length; i++) {
      const o = document.createElement('option');
      o.value = entries[i].q;
      datalist.appendChild(o);
    }
  }

  function closeSearchModals() {
    const api = window.__modal;
    if (!api || typeof api.close !== 'function') return;
    ['#search-modal', '#search-modal-mobile'].forEach((sel) => {
      const o = document.querySelector(sel);
      if (o && o.classList.contains('is-active')) api.close(sel);
    });
  }

  function goToHit(hit) {
    if (!hit || !hit.url) return;
    const u = new URL(hit.url, window.location.href);
    const cur = new URL(window.location.href);
    const samePage =
      u.pathname === cur.pathname &&
      u.origin === cur.origin &&
      u.search === cur.search;

    if (samePage) {
      closeSearchModals();
      window.location.hash = u.hash || '';
      return;
    }
    window.location.assign(u.pathname + u.search + u.hash);
  }

  function renderHits(hitsEl, entries, activeIndex) {
    if (!hitsEl) return;
    hitsEl.innerHTML = '';
    if (!entries.length) {
      hitsEl.hidden = true;
      return;
    }
    hitsEl.hidden = false;
    for (let i = 0; i < entries.length; i++) {
      const hit = entries[i];
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');

      const a = document.createElement('a');
      a.className = 'doc-search__hit';
      a.href = hit.url;
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
      if (i === activeIndex) a.classList.add('is-active');

      const qSpan = document.createElement('span');
      qSpan.className = 'doc-search__hit-q';
      qSpan.textContent = '.' + hit.q;

      const meta = document.createElement('span');
      meta.className = 'doc-search__hit-meta';
      meta.textContent = [hit.url, hit.snippet].filter(Boolean).join(' — ');

      a.appendChild(qSpan);
      a.appendChild(meta);

      a.addEventListener('click', (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
        ev.preventDefault();
        goToHit(hit);
      });

      li.appendChild(a);
      hitsEl.appendChild(li);
    }
  }

  function mountSearch(root, allEntries) {
    const input = root.querySelector('[data-doc-search]');
    const hitsEl = root.querySelector('[data-doc-search-hits]');
    const emptyEl = root.querySelector('[data-doc-search-empty]');
    const listAttr = input && input.getAttribute('list');
    const datalist = listAttr ? document.getElementById(listAttr) : null;

    if (!input || !hitsEl) return;

    let debounceTimer = null;
    let shown = [];
    let activeIndex = -1;

    function setEmpty(visible) {
      if (!emptyEl) return;
      emptyEl.hidden = !visible;
    }

    function applyState(query) {
      const q = normalizeQuery(query);
      if (!q) {
        shown = [];
        activeIndex = -1;
        hitsEl.hidden = true;
        hitsEl.innerHTML = '';
        setEmpty(false);
        fillDatalist(datalist, prefixForDatalist(allEntries, ''));
        return;
      }

      shown = filterEntries(allEntries, q);
      activeIndex = shown.length ? 0 : -1;
      fillDatalist(datalist, prefixForDatalist(allEntries, q));

      if (!shown.length) {
        hitsEl.hidden = true;
        hitsEl.innerHTML = '';
        setEmpty(true);
        return;
      }

      setEmpty(false);
      renderHits(hitsEl, shown, activeIndex);
    }

    function scheduleApply() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => applyState(input.value), DEBOUNCE_MS);
    }

    input.addEventListener('input', scheduleApply);
    input.addEventListener('focus', () => {
      loadIndex().catch(() => {});
      if (normalizeQuery(input.value)) applyState(input.value);
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        if (!shown.length) return;
        ev.preventDefault();
        activeIndex = Math.min(activeIndex + 1, shown.length - 1);
        renderHits(hitsEl, shown, activeIndex);
        const active = hitsEl.querySelector('.doc-search__hit.is-active');
        active?.scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'ArrowUp') {
        if (!shown.length) return;
        ev.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderHits(hitsEl, shown, activeIndex);
        const active = hitsEl.querySelector('.doc-search__hit.is-active');
        active?.scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        if (!shown.length || activeIndex < 0) return;
        ev.preventDefault();
        goToHit(shown[activeIndex]);
      }
    });

    hitsEl.addEventListener('mousemove', (ev) => {
      const link = ev.target.closest('.doc-search__hit');
      if (!link) return;
      const items = [...hitsEl.querySelectorAll('.doc-search__hit')];
      const idx = items.indexOf(link);
      if (idx >= 0 && idx !== activeIndex) {
        activeIndex = idx;
        renderHits(hitsEl, shown, activeIndex);
      }
    });
  }

  function init(entries) {
    document.querySelectorAll('.doc-search').forEach((root) => mountSearch(root, entries));
  }

  function prefetchOnSearchOpen() {
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest('[data-open]');
        if (!btn) return;
        const sel = btn.getAttribute('data-open');
        if (sel !== '#search-modal' && sel !== '#search-modal-mobile') return;
        loadIndex().catch(() => {});
      },
      true
    );
  }

  function focusSearchInputOnOpen() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open]');
      if (!btn) return;
      const sel = btn.getAttribute('data-open');
      if (sel !== '#search-modal' && sel !== '#search-modal-mobile') return;
      window.setTimeout(() => {
        const overlay = document.querySelector(sel);
        const inp = overlay && overlay.querySelector('[data-doc-search]');
        if (inp && overlay.classList.contains('is-active')) inp.focus();
      }, 0);
    });
  }

  function boot() {
    prefetchOnSearchOpen();
    focusSearchInputOnOpen();
    loadIndex()
      .then(init)
      .catch((err) => {
        console.error(err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
