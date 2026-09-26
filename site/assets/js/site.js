// South Africa Property: header state, menu, strip controls, gallery lightbox,
// and residence index filters. No dependencies; every feature is optional and
// the pages work without it.

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // A modal dialog that restores focus to whatever opened it and locks the page
  // scroll while open.
  function modal(dialog, { onClose } = {}) {
    let opener = null;
    let active = false;
    const finish = () => {
      if (!active) return;
      active = false;
      document.documentElement.style.overflow = '';
      onClose?.();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
    };
    // Escape closes the dialog natively; its close event arrives a task later.
    dialog.addEventListener('close', finish);
    return {
      open(from = document.activeElement) {
        opener = from;
        active = true;
        document.documentElement.style.overflow = 'hidden';
        dialog.showModal();
      },
      close() {
        if (dialog.open) dialog.close();
        finish();
      },
    };
  }

  // ------------------------------------------------------------- header
  const header = $('[data-header]');
  if (header) {
    const update = () => header.toggleAttribute('data-scrolled', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  // --------------------------------------------------------------- menu
  const menu = $('[data-menu]');
  if (menu) {
    const m = modal(menu);
    $$('[data-menu-open]').forEach((b) => b.addEventListener('click', () => m.open(b)));
    $$('[data-menu-close]', menu).forEach((b) => b.addEventListener('click', () => m.close()));
  }

  // -------------------------------------------------------------- strip
  $$('[data-strip]').forEach((track) => {
    const section = track.closest('section');
    const controls = $('[data-strip-controls]', section);
    const prev = $('[data-strip-prev]', section);
    const next = $('[data-strip-next]', section);
    if (!controls || !prev || !next) return;
    const step = () => (track.firstElementChild?.getBoundingClientRect().width ?? 300) + 24;
    const sync = () => {
      const overflow = track.scrollWidth > track.clientWidth + 4;
      controls.hidden = !overflow;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    const behavior = reduceMotion ? 'auto' : 'smooth';
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  // ----------------------------------------------------------- lightbox
  const lightbox = $('[data-lightbox]');
  const dataEl = $('#gallery-data');
  if (lightbox && dataEl) {
    const items = JSON.parse(dataEl.textContent);
    const pictureEl = $('[data-lightbox-picture]', lightbox);
    const indexEl = $('[data-lightbox-index]', lightbox);
    const creditEl = $('[data-lightbox-credit]', lightbox);
    const postEl = $('[data-lightbox-post]', lightbox);
    const stage = $('[data-lightbox-stage]', lightbox);
    const lb = modal(lightbox);
    let index = 0;

    const render = () => {
      const item = items[index];
      pictureEl.innerHTML = '';
      for (const [type, set] of [['image/avif', item.avif], ['image/webp', item.webp]]) {
        const s = document.createElement('source');
        s.type = type;
        s.srcset = set;
        s.sizes = '100vw';
        pictureEl.append(s);
      }
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.width = item.width;
      img.height = item.height;
      img.decoding = 'async';
      pictureEl.append(img);
      indexEl.textContent = String(index + 1);
      creditEl.textContent = item.credit || '';
      if (item.post) postEl.href = item.post;
      // Warm the neighbours so paging feels immediate.
      for (const n of [index - 1, index + 1]) {
        const it = items[(n + items.length) % items.length];
        const pre = new Image();
        pre.sizes = '100vw';
        pre.srcset = it.webp;
      }
    };
    const go = (i) => {
      index = (i + items.length) % items.length;
      render();
    };

    $$('[data-lightbox-open]').forEach((el) =>
      el.addEventListener('click', () => {
        go(Number(el.dataset.lightboxOpen) || 0);
        lb.open(el);
        $('[data-lightbox-close]', lightbox).focus();
      }),
    );
    $('[data-lightbox-close]', lightbox).addEventListener('click', () => lb.close());
    $('[data-lightbox-prev]', lightbox)?.addEventListener('click', () => go(index - 1));
    $('[data-lightbox-next]', lightbox)?.addEventListener('click', () => go(index + 1));
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(items.length - 1); }
    });
    stage.addEventListener('click', (e) => {
      if (e.target === stage) lb.close();
    });
    let startX = null;
    stage.addEventListener('pointerdown', (e) => { startX = e.pointerType === 'mouse' ? null : e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    });
  }

  // ------------------------------------------------------------- filters
  const bar = $('[data-filter-bar]');
  const results = $('[data-results]');
  if (bar && results) {
    $('[data-filters]').hidden = false;
    const cards = $$('[data-card]', results);
    const controls = $('[data-filter-controls]');
    const home = controls.parentElement;
    const sheet = $('[data-filter-sheet]');
    const sheetBody = $('[data-filter-sheet-body]');
    const emptyEl = $('[data-empty]');
    const countEl = $('[data-result-count]');
    const countShort = $('[data-result-count-short]');
    const activeEl = $('[data-filter-active]');
    const KEYS = ['status', 'province', 'city', 'area', 'type', 'beds', 'max', 'sort'];

    const read = () => {
      const p = new URLSearchParams(location.search);
      return Object.fromEntries(KEYS.map((k) => [k, p.get(k) ?? '']));
    };

    const controlFor = (k) => $$(`[data-filter="${k}"]`);

    const setControls = (state) => {
      for (const k of KEYS) {
        const els = controlFor(k);
        if (!els.length) continue;
        if (els[0].type === 'radio') {
          const match = els.find((r) => r.value === state[k]) ?? els.find((r) => r.value === '');
          if (match) match.checked = true;
          state[k] = match?.value ?? '';
        } else {
          const sel = els[0];
          const ok = [...sel.options].some((o) => o.value === state[k]);
          sel.value = ok ? state[k] : '';
          state[k] = sel.value;
        }
      }
      // Cities follow the province; areas follow the city.
      const cascade = (childKey, parentKey, attr) => {
        const [child] = controlFor(childKey);
        if (!child) return;
        const parent = state[parentKey];
        for (const o of child.options) {
          if (!o.value) continue;
          const visible = !parent || o.dataset[attr] === parent;
          o.hidden = !visible;
          o.disabled = !visible;
        }
        if (child.selectedOptions[0]?.disabled) {
          child.value = '';
          state[childKey] = '';
        }
      };
      cascade('city', 'province', 'province');
      cascade('area', 'city', 'city');
      return state;
    };

    const collect = () => {
      const state = Object.fromEntries(KEYS.map((k) => [k, '']));
      for (const k of KEYS) {
        const els = controlFor(k);
        if (!els.length) continue;
        state[k] = els[0].type === 'radio' ? (els.find((r) => r.checked)?.value ?? '') : els[0].value;
      }
      return state;
    };

    const apply = (state) => {
      let shown = 0;
      for (const li of cards) {
        const d = li.firstElementChild.dataset;
        const ok =
          (!state.status || d.status === state.status) &&
          (!state.province || d.province === state.province) &&
          (!state.city || d.city === state.city) &&
          (!state.area || d.area === state.area) &&
          (!state.type || d.type === state.type) &&
          (!state.beds || (Number(d.beds) >= Number(state.beds))) &&
          (!state.max || (d.price && Number(d.price) <= Number(state.max)));
        li.hidden = !ok;
        if (ok) shown++;
      }
      const sorted = [...cards].sort((a, b) => {
        const A = a.firstElementChild.dataset;
        const B = b.firstElementChild.dataset;
        if (state.sort === 'price-desc' || state.sort === 'price-asc') {
          const pa = A.price ? Number(A.price) : null;
          const pb = B.price ? Number(B.price) : null;
          if (pa == null && pb == null) return String(B.date).localeCompare(String(A.date));
          if (pa == null) return 1;
          if (pb == null) return -1;
          return state.sort === 'price-desc' ? pb - pa : pa - pb;
        }
        return String(B.date).localeCompare(String(A.date));
      });
      results.append(...sorted);
      const label = `${shown} ${shown === 1 ? 'residence' : 'residences'}`;
      countEl.textContent = label;
      if (countShort) countShort.textContent = label;
      emptyEl.hidden = shown > 0;
      const active = KEYS.filter((k) => k !== 'sort' && state[k]).length;
      $$('[data-filter-clear]').forEach((b) => { if (!b.closest('[data-empty]') && !b.closest('[data-filter-sheet]')) b.hidden = active === 0; });
      if (activeEl) activeEl.textContent = active ? `(${active})` : '';
    };

    const write = (state, push) => {
      const p = new URLSearchParams();
      for (const k of KEYS) if (state[k]) p.set(k, state[k]);
      const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
      if (url !== `${location.pathname}${location.search}`) history[push ? 'pushState' : 'replaceState'](state, '', url);
    };

    const fromUrl = () => apply(setControls(read()));

    bar.addEventListener('change', () => {
      const state = setControls(collect());
      apply(state);
      write(state, true);
    });
    const clear = () => {
      const state = setControls(Object.fromEntries(KEYS.map((k) => [k, ''])));
      apply(state);
      write(state, true);
    };
    $$('[data-filter-clear]').forEach((b) => b.addEventListener('click', clear));
    window.addEventListener('popstate', fromUrl);

    if (sheet) {
      const s = modal(sheet, { onClose: () => home.prepend(controls) });
      $('[data-filter-open]').addEventListener('click', (e) => {
        sheetBody.append(controls);
        s.open(e.currentTarget);
      });
      $$('[data-filter-sheet-close]', sheet).forEach((b) => b.addEventListener('click', () => s.close()));
      // Controls inside the sheet still drive the same filters.
      sheet.addEventListener('change', () => bar.dispatchEvent(new Event('change')));
    }

    fromUrl();
  }
})();
