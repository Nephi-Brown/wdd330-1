// js/home.js
// One script for Home, Movies page, and TV page
// - Home: Trending / Movies / TV sections (no pagination)
// - Movies page: Filters, Genre scroller, Pagination (15 per page)
// - TV page:     Filters, Genre scroller, Pagination (15 per page)

import {
  loadHeaderFooter,
  renderSkeletonCards,
  bindCollapsible,
  revealStaggered
} from './utils.mjs';
import { tmdb, toMediaList } from './api.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------------- Shared card template ---------------- */
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

/* =======================================================
   HOME PAGE (index.html) – simple sections (no pagination)
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
  revealStaggered(el);
}

async function loadMoviesHome(){
  const id = 'movies-grid';
  // Only run this "home" loader if we're on index.html (avoid clashing with full Movies page)
  if (!document.getElementById(id) || !location.pathname.toLowerCase().endsWith('index.html')) return;
  renderSkeletonCards(id, 6);
  const data = await tmdb('movie/popular', { page: 1 });
  const raw  = (data.results || []).slice(0, 15);
  const list = await toMediaList(raw, 'movie');
  const el = document.getElementById(id);
  el.innerHTML = list.map(mediaCard).join('');
  revealStaggered(el);
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
  revealStaggered(el);
}

/* =======================================================
   MOVIES PAGE – filters + genres + pagination (15/page)
======================================================= */
const moviesState = {
  source: [],
  view:   [],
  currentPage: 1,
  pageSize: 15,
  selectedGenres: new Set()
};

function ensureMoviesUI() {
  // If #movies-grid exists we assume page has markup; otherwise build it
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
        <form id="filter-form" class="ct-filterbar">
          <fieldset class="ct-filter-group">
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
  return grid;
}

// Query either page-specific or generic controls (to support both HTML variants)
const MSEL = {
  sort: () => $('#movies-sort-by') || $('#sort-by'),
  scroller: () => $('#movies-genre-scroller') || $('#genre-scroller'),
  applyBtn: () => $('#movies-apply') || $('#apply-filters'),
  clearBtn: () => $('#movies-clear') || $('#clear-filters'),
  pager: () => $('#movies-pagination')
};

function renderMoviesGenreScroller(map) {
  const scroller = MSEL.scroller();
  if (!scroller) return;
  const names = Object.values(map).sort((a,b)=>a.localeCompare(b));

  scroller.innerHTML = names.map(n =>
    `<button class="genre-chip" type="button" data-name="${n}" aria-pressed="${moviesState.selectedGenres.has(n)}">${n}</button>`
  ).join('');

  // Click + keyboard toggle, no submit
  const toggleChip = (btn) => {
    const n = btn.dataset.name;
    const on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!on));
    if (on) moviesState.selectedGenres.delete(n); else moviesState.selectedGenres.add(n);
  };

  $$('.genre-chip', scroller).forEach(btn => {
    btn.addEventListener('click', () => toggleChip(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleChip(btn);
      }
    });
  });
}

function sortList(list, sort) {
  const byTitle = (a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'});
  const byYear  = (a,b)=>(parseInt(b.year||0)-parseInt(a.year||0));
  const byRate  = (a,b)=>(parseFloat(b.rating||0)-parseFloat(a.rating||0));
  switch(sort){
    case 'rating-desc': return list.slice().sort(byRate);
    case 'year-desc':   return list.slice().sort(byYear);
    case 'year-asc':    return list.slice().sort((a,b)=>-byYear(a,b));
    case 'title-asc':   return list.slice().sort(byTitle);
    case 'title-desc':  return list.slice().sort((a,b)=>-byTitle(a,b));
    default:            return list; // popularity order
  }
}

function applyMoviesFilterSort() {
  const sortSel = MSEL.sort();
  const sort = sortSel?.value || 'pop-desc';
  const genres = Array.from(moviesState.selectedGenres);

  let next = moviesState.source.filter(i => {
    if (!genres.length) return true;
    const g = i.genres || [];
    // OR logic: keep if ANY selected genre is present
    return genres.some(n => g.includes(n));
  });

  moviesState.view = sortList(next, sort);
  moviesState.currentPage = 1;
  renderMoviesPage();
}

function renderMoviesPage() {
  const grid = $('#movies-grid');
  if (!grid) return;

  const totalPages = Math.ceil(moviesState.view.length / moviesState.pageSize) || 1;
  const start = (moviesState.currentPage - 1) * moviesState.pageSize;
  const pageItems = moviesState.view.slice(start, start + moviesState.pageSize);

  grid.innerHTML = pageItems.length ? pageItems.map(mediaCard).join('') : `<p class="meta">No results found.</p>`;
  revealStaggered(grid);

  const pager = MSEL.pager();
  if (pager) {
    pager.innerHTML = `
      <button class="btn btn--ghost" id="movies-prev" ${moviesState.currentPage===1?'disabled':''}>Prev</button>
      <span>Page ${moviesState.currentPage} of ${totalPages}</span>
      <button class="btn btn--ghost" id="movies-next" ${moviesState.currentPage===totalPages?'disabled':''}>Next</button>
    `;
    $('#movies-prev')?.addEventListener('click', () => { moviesState.currentPage--; renderMoviesPage(); });
    $('#movies-next')?.addEventListener('click', () => { moviesState.currentPage++; renderMoviesPage(); });
  }
}

async function initMoviesPage(){
  if (!location.pathname.toLowerCase().endsWith('movies.html')) return;
  const grid = ensureMoviesUI();
  renderSkeletonCards('movies-grid', 8);

  try {
    const [popular, genreList] = await Promise.all([
      tmdb('movie/popular', { page: 1 }),
      tmdb('genre/movie/list')
    ]);
    const genresMap = {};
    (genreList.genres || []).forEach(g => genresMap[g.id] = g.name);

    const raw = (popular.results || []);
    moviesState.source = await toMediaList(raw, 'movie');
    moviesState.view   = moviesState.source.slice();

    renderMoviesGenreScroller(genresMap);
    applyMoviesFilterSort();

    // controls – support both ID schemes
    MSEL.applyBtn()?.addEventListener('click', applyMoviesFilterSort);
    MSEL.clearBtn()?.addEventListener('click', () => {
      moviesState.selectedGenres.clear();
      const s = MSEL.sort();
      if (s) s.value = 'pop-desc';
      renderMoviesGenreScroller(genresMap);
      applyMoviesFilterSort();
    });
    MSEL.sort()?.addEventListener('change', applyMoviesFilterSort);
  } catch (e) {
    console.error('Movies load error:', e);
    grid.innerHTML = `<p class="meta">Failed to load movies.</p>`;
  }
}

/* =======================================================
   TV PAGE – filters + genres + pagination (15/page)
======================================================= */
const tvState = {
  source: [],
  view:   [],
  currentPage: 1,
  pageSize: 15,
  selectedGenres: new Set()
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
        <form id="filter-form" class="ct-filterbar">
          <fieldset class="ct-filter-group">
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
  return grid;
}

const TVSEL = {
  sort: () => $('#tv-sort-by') || $('#sort-by'),
  scroller: () => $('#tv-genre-scroller') || $('#genre-scroller'),
  applyBtn: () => $('#tv-apply') || $('#apply-filters'),
  clearBtn: () => $('#tv-clear') || $('#clear-filters'),
  pager: () => $('#tv-pagination')
};

function renderTVGenreScroller(map) {
  const scroller = TVSEL.scroller();
  if (!scroller) return;
  const names = Object.values(map).sort((a,b)=>a.localeCompare(b));

  scroller.innerHTML = names.map(n =>
    `<button class="genre-chip" type="button" data-name="${n}" aria-pressed="${tvState.selectedGenres.has(n)}">${n}</button>`
  ).join('');

  const toggleChip = (btn) => {
    const n = btn.dataset.name;
    const on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!on));
    if (on) tvState.selectedGenres.delete(n); else tvState.selectedGenres.add(n);
  };

  $$('.genre-chip', scroller).forEach(btn => {
    btn.addEventListener('click', () => toggleChip(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleChip(btn);
      }
    });
  });
}

function applyTVFilterSort() {
  const sortSel = TVSEL.sort();
  const sort = sortSel?.value || 'pop-desc';
  const genres = Array.from(tvState.selectedGenres);

  let next = tvState.source.filter(i => {
    if (!genres.length) return true;
    const g = i.genres || [];
    // OR logic: keep if ANY selected genre is present
    return genres.some(n => g.includes(n));
  });

  tvState.view = sortList(next, sort);
  tvState.currentPage = 1;
  renderTVPage();
}

function renderTVPage() {
  const grid = $('#tv-grid');
  if (!grid) return;

  const totalPages = Math.ceil(tvState.view.length / tvState.pageSize) || 1;
  const start = (tvState.currentPage - 1) * tvState.pageSize;
  const pageItems = tvState.view.slice(start, start + tvState.pageSize);

  grid.innerHTML = pageItems.length ? pageItems.map(mediaCard).join('') : `<p class="meta">No results found.</p>`;
  revealStaggered(grid);

  const pager = TVSEL.pager();
  if (pager) {
    pager.innerHTML = `
      <button class="btn btn--ghost" id="tv-prev" ${tvState.currentPage===1?'disabled':''}>Prev</button>
      <span>Page ${tvState.currentPage} of ${totalPages}</span>
      <button class="btn btn--ghost" id="tv-next" ${tvState.currentPage===totalPages?'disabled':''}>Next</button>
    `;
    $('#tv-prev')?.addEventListener('click', () => { tvState.currentPage--; renderTVPage(); });
    $('#tv-next')?.addEventListener('click', () => { tvState.currentPage++; renderTVPage(); });
  }
}

async function initTVPage(){
  if (!location.pathname.toLowerCase().endsWith('tv.html')) return;
  const grid = ensureTVUI();
  renderSkeletonCards('tv-grid', 8);

  try {
    const [popular, genreList] = await Promise.all([
      tmdb('tv/popular', { page: 1 }),
      tmdb('genre/tv/list')
    ]);
    const genresMap = {};
    (genreList.genres || []).forEach(g => genresMap[g.id] = g.name);

    const raw = (popular.results || []);
    tvState.source = await toMediaList(raw, 'tv');
    tvState.view   = tvState.source.slice();

    renderTVGenreScroller(genresMap);
    applyTVFilterSort();

    // controls – support both ID schemes
    TVSEL.applyBtn()?.addEventListener('click', applyTVFilterSort);
    TVSEL.clearBtn()?.addEventListener('click', () => {
      tvState.selectedGenres.clear();
      const s = TVSEL.sort();
      if (s) s.value = 'pop-desc';
      renderTVGenreScroller(genresMap);
      applyTVFilterSort();
    });
    TVSEL.sort()?.addEventListener('change', applyTVFilterSort);
  } catch (e) {
    console.error('TV load error:', e);
    grid.innerHTML = `<p class="meta">Failed to load TV shows.</p>`;
  }
}

/* =======================================================
   BOOTSTRAP
======================================================= */
(async function(){
  await loadHeaderFooter();

  // Home (index) sections
  await loadTrendingHome();
  await loadMoviesHome();
  await loadTVHome();

  // Dedicated pages
  await initMoviesPage();
  await initTVPage();
})();
