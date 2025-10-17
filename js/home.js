// js/home.js
// - Home sections (no pagination)
// - Movies & TV pages: unlimited paging (15/page), filters w/ AND/OR genre toggle,
//   glassy filterbar compatible, robust scroll-to-top, re-prime + triple reveal.

import {
  loadHeaderFooter,
  renderSkeletonCards,
  bindCollapsible,
  revealStaggered
} from './utils.mjs';
import { tmdb, toMediaList } from './api.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* --------------------------------------
   Scroll — robust, header-aware, cross-browser
--------------------------------------- */
function getHeaderOffset() {
  const header = document.querySelector('header, #main-head');
  if (!header) return 0;
  const cs = getComputedStyle(header);
  const fixedLike = cs.position === 'fixed' || cs.position === 'sticky';
  return fixedLike ? header.offsetHeight : 0;
}
function smartScrollTop() {
  const targetY = Math.max(0, 0 - getHeaderOffset() - 6);
  try { window.scrollTo({ top: targetY, behavior: 'smooth' }); }
  catch { window.scrollTo(0, targetY); }
  requestAnimationFrame(() => {
    try { window.scrollTo({ top: targetY, behavior: 'smooth' }); }
    catch { window.scrollTo(0, targetY); }
  });
  setTimeout(() => { window.scrollTo(0, targetY); }, 380);
}

/* --------------------------------------
   Reveal re-prime helpers (safe)
--------------------------------------- */
function primeCards(scope) {
  const grid = typeof scope === 'string' ? document.getElementById(scope) : scope;
  if (!grid) return;
  $$('.card', grid).forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px) scale(0.98)';
    card.classList.remove('is-visible', 'reveal-in', 'io-seen');
  });
}
function triggerReveals(scope) {
  const grid = typeof scope === 'string' ? document.getElementById(scope) : scope;
  if (!grid) return;
  try { revealStaggered(grid); } catch {}
  requestAnimationFrame(() => { try { revealStaggered(grid); } catch {} });
  setTimeout(() => { try { revealStaggered(grid); } catch {} }, 380);
}

/* --------------------------------------
   AND/OR fieldset injection (ensures it exists)
--------------------------------------- */
function injectModeFieldset({ prefix, form, beforeEl }) {
  const andId = `${prefix}-mode-and`;
  if (document.getElementById(andId)) return; // already present

  const fs = document.createElement('fieldset');
  fs.className = 'ct-filter-group';
  fs.setAttribute('aria-label', 'Genre matching mode');
  fs.innerHTML = `
    <label class="ct-sortlabel">Match:</label>
    <div class="ct-segment ct-segment--pill">
      <input type="radio" id="${prefix}-mode-and" name="${prefix}-genre-mode" value="AND" checked>
      <label for="${prefix}-mode-and" class="btn btn--ghost ct-pill">All (AND)</label>
      <input type="radio" id="${prefix}-mode-or" name="${prefix}-genre-mode" value="OR">
      <label for="${prefix}-mode-or" class="btn btn--ghost ct-pill">Any (OR)</label>
    </div>
  `;
  if (beforeEl?.parentElement) {
    beforeEl.parentElement.insertBefore(fs, beforeEl);
  } else {
    form.appendChild(fs);
  }
}
function wireModeChange(prefix, onChange) {
  document.getElementById(`${prefix}-mode-and`)?.addEventListener('change', onChange);
  document.getElementById(`${prefix}-mode-or`)?.addEventListener('change', onChange);
}

/* --------------------------------------
   Shared card template + pager mount
--------------------------------------- */
function mediaCard(item){
  const genreText = item.genres && item.genres.length ? ` (${item.genres.join(', ')})` : '';
  const metaLine = `${item.year || '—'} — ${item.typeLabel}${genreText}`;

  return `
  <a class="card" href="details.html?id=${item.id}&type=${item.type}">
    <div class="card__media">
      <img class="card__img" src="${item.poster}" alt="${item.title}">
    </div>
    <div class="card__body">
      <h3>${item.title}</h3>
      <p class="meta">${metaLine}</p>
      ${item.rating ? `<span class="badge">★ ${item.rating}</span>` : ''}
    </div>
  </a>`;
}

function ensurePagerMount(pagerId, gridId) {
  let mount = document.getElementById(pagerId);
  if (!mount) {
    const grid = document.getElementById(gridId);
    const section = grid?.parentElement || document.querySelector('main') || document.body;
    mount = document.createElement('div');
    mount.id = pagerId;
    mount.className = 'ct-pagination';
    mount.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.5rem 1rem;margin-top:1rem;';
    section.appendChild(mount);
  }
  return mount;
}

/* =======================================================
   HOME PAGE (index.html) – simple sections
======================================================= */
async function loadTrendingHome(){
  const id = 'trending-grid';
  if (!document.getElementById(id)) return;
  renderSkeletonCards(id, 6);
  const data = await tmdb('trending/all/day');
  const raw = (data.results || [])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 15);
  const list = await toMediaList(raw);
  const el = document.getElementById(id);
  el.innerHTML = list.map(mediaCard).join('');
  primeCards(el);
  triggerReveals(el);
}
async function loadMoviesHome(){
  const id = 'movies-grid';
  if (!document.getElementById(id) || !location.pathname.toLowerCase().endsWith('index.html')) return;
  renderSkeletonCards(id, 6);
  const data = await tmdb('movie/popular', { page: 1 });
  const raw  = (data.results || []).slice(0, 15);
  const list = await toMediaList(raw, 'movie');
  const el = document.getElementById(id);
  el.innerHTML = list.map(mediaCard).join('');
  primeCards(el);
  triggerReveals(el);
}
async function loadTVHome(){
  const id = 'tv-grid';
  if (!document.getElementById(id) || !location.pathname.toLowerCase().endsWith('index.html')) return;
  renderSkeletonCards(id, 6);
  const data = await tmdb('tv/popular', { page: 1 });
  const raw  = (data.results || []).slice(0, 15);
  const list = await toMediaList(raw, 'tv');
  const el = document.getElementById(id);
  el.innerHTML = list.map(mediaCard).join('');
  primeCards(el);
  triggerReveals(el);
}

/* =======================================================
   Unlimited-paging core (Movies & TV)
======================================================= */
function makeInfiniteState(media) {
  return {
    media,               // 'movie' | 'tv'
    buffer: [],          // normalized items fetched so far
    view: [],            // filtered/sorted view of buffer
    page: 1,
    pageSize: 15,
    selectedGenres: new Set(),
    genreMode: 'AND',    // 'AND' | 'OR'
    sort: 'pop-desc',
    nextApiPage: 1,      // next TMDB page to fetch (their pages are 20 items)
    apiExhausted: false
  };
}

/* Fetch more results into buffer */
async function fetchMore(state) {
  if (state.apiExhausted) return false;
  const endpoint = state.media === 'tv' ? 'tv/popular' : 'movie/popular';
  const apiPage = state.nextApiPage;
  const res = await tmdb(endpoint, { page: apiPage });
  const results = res?.results || [];
  if (!results.length) { state.apiExhausted = true; return false; }
  const normalized = await toMediaList(results, state.media);
  state.buffer.push(...normalized);
  state.nextApiPage += 1;
  return true;
}

/* AND/OR genre matcher */
function matchesGenres(itemGenres, selected, mode) {
  if (!selected.length) return true;
  const g = Array.isArray(itemGenres) ? itemGenres : [];
  if (!g.length) return false;
  const gLower = g.map(x => String(x).toLowerCase().trim());
  const selLower = selected.map(s => String(s).toLowerCase().trim());
  return mode === 'AND'
    ? selLower.every(s => gLower.includes(s))
    : selLower.some(s => gLower.includes(s));
}

/* Build view with current filters/sort */
function buildView(state) {
  const selected = Array.from(state.selectedGenres || []);
  let list = state.buffer.filter(i => matchesGenres(i.genres, selected, state.genreMode));

  const byTitle = (a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'});
  const byYear  = (a,b)=>(parseInt(b.year||0)-parseInt(a.year||0));
  const byRate  = (a,b)=>(parseFloat(b.rating||0)-parseFloat(a.rating||0));
  switch (state.sort) {
    case 'rating-desc': list.sort(byRate); break;
    case 'year-desc':   list.sort(byYear); break;
    case 'year-asc':    list.sort((a,b)=>-byYear(a,b)); break;
    case 'title-asc':   list.sort(byTitle); break;
    case 'title-desc':  list.sort((a,b)=>-byTitle(a,b)); break;
    default: break; // keep API popularity order
  }
  state.view = list;
}

/* Ensure enough items for a given page (fetch as needed) */
async function ensureViewForPage(state, targetPage) {
  const needed = targetPage * state.pageSize;
  while (state.view.length < needed && !state.apiExhausted) {
    const got = await fetchMore(state);
    if (!got) break;
    buildView(state);
  }
}

/* =======================================================
   Movies page
======================================================= */
const movies = makeInfiniteState('movie');

const MSEL = {
  sort:     () => $('#movies-sort-by') || $('#sort-by'),
  scroller: () => $('#movies-genre-scroller') || $('#genre-scroller'),
  apply:    () => $('#movies-apply') || $('#apply-filters'),
  clear:    () => $('#movies-clear') || $('#clear-filters'),
};

function ensureMoviesUI() {
  let grid = $('#movies-grid');
  if (!grid) {
    const main = $('main') || document.body;
    const sec = document.createElement('section');
    sec.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;">Movies</h2>
        <button id="filter-toggle" class="btn btn--ghost" aria-expanded="false" aria-controls="filter-panel" type="button">Filters & Sort</button>
      </div>
      <div id="filter-panel" class="ct-collapsible" hidden>
        <form id="filter-form" class="ct-filterbar" aria-label="Filters and sorting for Movies">
          <fieldset class="ct-filter-group" aria-label="Sort by">
            <label class="ct-sortlabel" for="movies-sort-by">Sort:</label>
            <select id="movies-sort-by">
              <option value="pop-desc">Popularity (desc)</option>
              <option value="rating-desc">Rating (desc)</option>
              <option value="year-desc">Year (new → old)</option>
              <option value="year-asc">Year (old → new)</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="title-desc">Title (Z–A)</option>
            </select>
          </fieldset>
          <div class="genre-scroller" id="movies-genre-scroller"></div>
          <div class="ct-filter-actions">
            <button id="movies-apply" class="btn btn--primary" type="button">Apply</button>
            <button id="movies-clear" class="btn btn--ghost" type="button">Clear</button>
          </div>
        </form>
      </div>
      <div id="movies-grid" class="ct-grid ct-grid--3" style="margin-top:12px;"></div>
      <div id="movies-pagination" class="ct-pagination" style="display:flex;justify-content:center;align-items:center;gap:1rem;margin-top:1rem;"></div>
    `;
    main.appendChild(sec);
    grid = $('#movies-grid');
  }
  bindCollapsible('#filter-toggle', '#filter-panel');

  // Ensure AND/OR exists even if HTML was prebuilt
  const mForm = document.getElementById('filter-form') || document.querySelector('#filter-panel form');
  injectModeFieldset({
    prefix: 'movies',
    form: mForm,
    beforeEl: document.getElementById('movies-genre-scroller') || document.getElementById('genre-scroller')
  });

  return grid;
}

function renderMoviesGenres(map) {
  const scroller = MSEL.scroller();
  if (!scroller) return;
  const names = Object.values(map).sort((a, b) => a.localeCompare(b));
  scroller.innerHTML = names.map(n =>
    `<button class="genre-chip" type="button" data-name="${n}" aria-pressed="${movies.selectedGenres.has(n)}">${n}</button>`
  ).join('');
  $$('.genre-chip', scroller).forEach(btn => {
    const toggle = () => {
      const n = btn.dataset.name;
      const on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!on));
      if (on) movies.selectedGenres.delete(n); else movies.selectedGenres.add(n);
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  });
}

function renderPager(state, pagerIdPrefix, onChange) {
  const mount = ensurePagerMount(`${pagerIdPrefix}-pagination`, `${pagerIdPrefix}-grid`);
  const c = state.page;
  const nums = [];
  for (let p = Math.max(1, c - 3); p <= c + 3; p++) nums.push(p);

  const makeBtn = (id, label, disabled=false) =>
    `<button class="btn btn--ghost" id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`;

  const numBtns = nums.map(p =>
    `<button class="btn ${p===c?'btn--primary':'btn--ghost'}" data-page="${p}">${p}</button>`
  ).join('');

  mount.innerHTML = [
    makeBtn(`${pagerIdPrefix}-prev`, 'Prev', c <= 1),
    makeBtn(`${pagerIdPrefix}-jump-left`, '…'),
    numBtns,
    makeBtn(`${pagerIdPrefix}-jump-right`, '…'),
    makeBtn(`${pagerIdPrefix}-next`, 'Next')
  ].join('');

  const go = (n) => {
    if (!n || n < 1) return;
    smartScrollTop();
    onChange(n);
    const grid = document.getElementById(`${pagerIdPrefix}-grid`);
    primeCards(grid);
    triggerReveals(grid);
  };

  document.getElementById(`${pagerIdPrefix}-prev`)?.addEventListener('click', () => go(c - 1));
  document.getElementById(`${pagerIdPrefix}-next`)?.addEventListener('click', () => go(c + 1));

  document.getElementById(`${pagerIdPrefix}-jump-left`)?.addEventListener('click', () => {
    const val = prompt('Go to page…', String(Math.max(1, c - 10)));
    const n = Math.max(1, parseInt(val || '1', 10) || 1);
    go(n);
  });
  document.getElementById(`${pagerIdPrefix}-jump-right`)?.addEventListener('click', () => {
    const val = prompt('Go to page…', String(c + 10));
    const n = Math.max(1, parseInt(val || String(c + 1), 10) || (c + 1));
    go(n);
  });

  mount.querySelectorAll('button[data-page]')?.forEach(btn => {
    btn.addEventListener('click', () => go(parseInt(btn.getAttribute('data-page'), 10)));
  });
}

async function renderMovies() {
  const grid = $('#movies-grid'); if (!grid) return;

  await ensureViewForPage(movies, movies.page);

  let start = (movies.page - 1) * movies.pageSize;
  if (movies.view.length <= start && !movies.apiExhausted) {
    await ensureViewForPage(movies, movies.page);
  }

  start = (movies.page - 1) * movies.pageSize;
  const slice = movies.view.slice(start, start + movies.pageSize);

  if (!slice.length && movies.page > 1) {
    movies.page -= 1;
    return renderMovies();
  }

  grid.innerHTML = slice.length ? slice.map(mediaCard).join('') : `<p class="meta">No results found.</p>`;
  primeCards(grid);
  triggerReveals(grid);

  renderPager(movies, 'movies', async (newPage) => {
    movies.page = newPage;
    await renderMovies();
  });
}

async function applyMovies() {
  // read genre mode radios
  const andEl = document.getElementById('movies-mode-and');
  const orEl  = document.getElementById('movies-mode-or');
  movies.genreMode = (andEl?.checked ? 'AND' : (orEl?.checked ? 'OR' : movies.genreMode));

  movies.sort = MSEL.sort()?.value || 'pop-desc';
  buildView(movies);
  movies.page = 1;
  await ensureViewForPage(movies, movies.page);
  await renderMovies();
}

async function initMoviesPage(){
  if (!location.pathname.toLowerCase().endsWith('movies.html')) return;
  ensureMoviesUI();
  renderSkeletonCards('movies-grid', 8);
  try {
    await fetchMore(movies); // preload first API page
    buildView(movies);

    const genreList = await tmdb('genre/movie/list');
    const gmap = {}; (genreList.genres || []).forEach(g => gmap[g.id] = g.name);
    renderMoviesGenres(gmap);

    await renderMovies();

    // Controls
    MSEL.apply()?.addEventListener('click', () => applyMovies());
    MSEL.clear()?.addEventListener('click', async () => {
      movies.selectedGenres.clear();
      const s = MSEL.sort(); if (s) s.value = 'pop-desc';
      $$('.genre-chip', MSEL.scroller()).forEach(b => b.setAttribute('aria-pressed','false'));
      await applyMovies();
    });
    MSEL.sort()?.addEventListener('change', () => applyMovies());
    wireModeChange('movies', () => applyMovies());
  } catch (e) {
    console.error('Movies load error:', e);
    $('#movies-grid').innerHTML = `<p class="meta">Failed to load movies.</p>`;
  }
}

/* =======================================================
   TV page
======================================================= */
const tv = makeInfiniteState('tv');

const TVSEL = {
  sort:     () => $('#tv-sort-by') || $('#sort-by'),
  scroller: () => $('#tv-genre-scroller') || $('#genre-scroller'),
  apply:    () => $('#tv-apply') || $('#apply-filters'),
  clear:    () => $('#tv-clear') || $('#clear-filters'),
};

function ensureTVUI() {
  let grid = $('#tv-grid');
  if (!grid) {
    const main = $('main') || document.body;
    const sec = document.createElement('section');
    sec.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;">TV Shows</h2>
        <button id="filter-toggle" class="btn btn--ghost" aria-expanded="false" aria-controls="filter-panel" type="button">Filters & Sort</button>
      </div>
      <div id="filter-panel" class="ct-collapsible" hidden>
        <form id="filter-form" class="ct-filterbar" aria-label="Filters and sorting for TV">
          <fieldset class="ct-filter-group" aria-label="Sort by">
            <label class="ct-sortlabel" for="tv-sort-by">Sort:</label>
            <select id="tv-sort-by">
              <option value="pop-desc">Popularity (desc)</option>
              <option value="rating-desc">Rating (desc)</option>
              <option value="year-desc">Year (new → old)</option>
              <option value="year-asc">Year (old → new)</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="title-desc">Title (Z–A)</option>
            </select>
          </fieldset>
          <div class="genre-scroller" id="tv-genre-scroller"></div>
          <div class="ct-filter-actions">
            <button id="tv-apply" class="btn btn--primary" type="button">Apply</button>
            <button id="tv-clear" class="btn btn--ghost" type="button">Clear</button>
          </div>
        </form>
      </div>
      <div id="tv-grid" class="ct-grid ct-grid--3" style="margin-top:12px;"></div>
      <div id="tv-pagination" class="ct-pagination" style="display:flex;justify-content:center;align-items:center;gap:1rem;margin-top:1rem;"></div>
    `;
    main.appendChild(sec);
    grid = $('#tv-grid');
  }
  bindCollapsible('#filter-toggle', '#filter-panel');

  const tForm = document.getElementById('filter-form') || document.querySelector('#filter-panel form');
  injectModeFieldset({
    prefix: 'tv',
    form: tForm,
    beforeEl: document.getElementById('tv-genre-scroller') || document.getElementById('genre-scroller')
  });

  return grid;
}

function renderTVGenres(map) {
  const scroller = TVSEL.scroller();
  if (!scroller) return;
  const names = Object.values(map).sort((a,b)=>a.localeCompare(b));
  scroller.innerHTML = names.map(n =>
    `<button class="genre-chip" type="button" data-name="${n}" aria-pressed="${tv.selectedGenres.has(n)}">${n}</button>`
  ).join('');
  $$('.genre-chip', scroller).forEach(btn => {
    const toggle = () => {
      const n = btn.dataset.name;
      const on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!on));
      if (on) tv.selectedGenres.delete(n); else tv.selectedGenres.add(n);
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  });
}

function renderTVPager(onChange) {
  renderPager(tv, 'tv', onChange);
}

async function renderTV() {
  const grid = $('#tv-grid'); if (!grid) return;

  await ensureViewForPage(tv, tv.page);

  let start = (tv.page - 1) * tv.pageSize;
  if (tv.view.length <= start && !tv.apiExhausted) {
    await ensureViewForPage(tv, tv.page);
  }

  start = (tv.page - 1) * tv.pageSize;
  const slice = tv.view.slice(start, start + tv.pageSize);

  if (!slice.length && tv.page > 1) {
    tv.page -= 1;
    return renderTV();
  }

  grid.innerHTML = slice.length ? slice.map(mediaCard).join('') : `<p class="meta">No results found.</p>`;
  primeCards(grid);
  triggerReveals(grid);

  renderTVPager(async (newPage) => {
    tv.page = newPage;
    await renderTV();
  });
}

async function applyTV() {
  const andEl = document.getElementById('tv-mode-and');
  const orEl  = document.getElementById('tv-mode-or');
  tv.genreMode = (andEl?.checked ? 'AND' : (orEl?.checked ? 'OR' : tv.genreMode));

  tv.sort = TVSEL.sort()?.value || 'pop-desc';
  buildView(tv);
  tv.page = 1;
  await ensureViewForPage(tv, tv.page);
  await renderTV();
}

async function initTVPage(){
  if (!location.pathname.toLowerCase().endsWith('tv.html')) return;
  ensureTVUI();
  renderSkeletonCards('tv-grid', 8);
  try {
    await fetchMore(tv);
    buildView(tv);

    const genreList = await tmdb('genre/tv/list');
    const gmap = {}; (genreList.genres || []).forEach(g => gmap[g.id] = g.name);
    renderTVGenres(gmap);

    await renderTV();

    TVSEL.apply()?.addEventListener('click', () => applyTV());
    TVSEL.clear()?.addEventListener('click', async () => {
      tv.selectedGenres.clear();
      const s = TVSEL.sort(); if (s) s.value = 'pop-desc';
      $$('.genre-chip', TVSEL.scroller()).forEach(b => b.setAttribute('aria-pressed','false'));
      await applyTV();
    });
    TVSEL.sort()?.addEventListener('change', () => applyTV());
    wireModeChange('tv', () => applyTV());
  } catch (e) {
    console.error('TV load error:', e);
    $('#tv-grid').innerHTML = `<p class="meta">Failed to load TV shows.</p>`;
  }
}

/* =======================================================
   BOOTSTRAP
======================================================= */
(async function(){
  await loadHeaderFooter();

  await loadTrendingHome();
  await loadMoviesHome();
  await loadTVHome();

  await initMoviesPage();
  await initTVPage();
})();
