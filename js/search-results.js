// js/search-results.js
// Search results with filters, AND/OR genre toggle, 15/page pagination,
// skeletons, staggered reveal, robust scroll-to-top + re-primed reveals.

import {
  loadHeaderFooter,
  renderSkeletonCards,
  bindCollapsible,
  revealStaggered
} from './utils.mjs';
import { tmdb, toMediaList, getGenreMap } from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const getParam = (k) => new URLSearchParams(location.search).get(k) || '';

/* ---------------- Scroll — robust ---------------- */
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

/* ------------- Reveal re-prime helpers ------------- */
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

/* ---------------- Card template ---------------- */
function mediaCard(i) {
  const g = i.genres?.length ? ` (${i.genres.join(', ')})` : '';
  const meta = `${i.year || '—'} — ${i.typeLabel}${g}`;
  return `
    <a class="card" href="../details.html?id=${i.id}&type=${i.type}">
      <div class="card__media">
        <img class="card__img" src="${i.poster}" alt="${i.title}">
      </div>
      <div class="card__body">
        <h3>${i.title}</h3>
        <p class="meta">${meta}</p>
        ${i.rating ? `<span class="badge">★ ${i.rating}</span>` : ''}
      </div>
    </a>`;
}

/* ---------------- Search helpers ---------------- */
function normalizeTerm(raw) { return raw.trim(); }
function isYear(term) { return /^\d{4}$/.test(term); }

function findGenreIds(term, genreMap) {
  const t = term.toLowerCase();
  return Object.entries(genreMap)
    .filter(([, name]) => name.toLowerCase().includes(t))
    .map(([id]) => id);
}

async function searchByYear(year) {
  const [m, t] = await Promise.all([
    tmdb('discover/movie', { sort_by: 'popularity.desc', primary_release_year: year, page: 1 }),
    tmdb('discover/tv',    { sort_by: 'popularity.desc', first_air_date_year: year, page: 1 })
  ]);
  return [...(m.results || []), ...(t.results || [])];
}
async function searchByGenre(term) {
  const [movieMap, tvMap] = await Promise.all([ getGenreMap('movie'), getGenreMap('tv') ]);
  const movieIds = findGenreIds(term, movieMap).join(',');
  const tvIds    = findGenreIds(term, tvMap).join(',');

  const [m, t] = await Promise.all([
    movieIds ? tmdb('discover/movie', { with_genres: movieIds, sort_by: 'popularity.desc', page: 1 }) : { results: [] },
    tvIds    ? tmdb('discover/tv',    { with_genres: tvIds,    sort_by: 'popularity.desc', page: 1 }) : { results: [] }
  ]);
  return [...(m.results || []), ...(t.results || [])];
}
async function searchByText(q) {
  const data = await tmdb('search/multi', { query: q, include_adult: 'false', page: 1 });
  const raw = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  const t = q.toLowerCase();
  return raw.filter(r => {
    const name = (r.title || r.name || '').toLowerCase();
    const year = (r.release_date || r.first_air_date || '').slice(0, 4);
    return name.includes(t) || year === q;
  });
}

/* ----------- State: results, filters, paging ----------- */
let sourceList = [];   // normalized list from API (mixed)
let viewList   = [];   // filtered/sorted

const selectedGenres = new Set(); // names
const pageState = { page: 1, pageSize: 15 };
let genreMode = 'AND';            // <<< NEW: 'AND' | 'OR'

function getSelectedGenres() { return Array.from(selectedGenres); }

/* AND/OR genre matcher */
function matchesGenres(itemGenres, selected, mode) {
  if (!selected.length) return true;
  const g = Array.isArray(itemGenres) ? itemGenres : [];
  if (!g.length) return false;
  const gLower   = g.map(x => String(x).toLowerCase().trim());
  const selLower = selected.map(s => String(s).toLowerCase().trim());
  return mode === 'AND'
    ? selLower.every(s => gLower.includes(s))
    : selLower.some(s => gLower.includes(s));
}

/* ---- Genre scroller (from loaded cards only) ---- */
function renderGenreScrollerFromList(list) {
  const scroller = $('#genre-scroller');
  if (!scroller) return;

  const nameSet = new Set();
  list.forEach(i => (i.genres || []).forEach(g => nameSet.add(g)));
  const genres = Array.from(nameSet).sort((a,b) => a.localeCompare(b));

  scroller.innerHTML = genres.map(name =>
    `<button class="genre-chip" type="button" data-name="${name}" aria-pressed="${selectedGenres.has(name) ? 'true' : 'false'}">${name}</button>`
  ).join('');

  $$('.genre-chip', scroller).forEach(btn => {
    const toggle = () => {
      const name = btn.getAttribute('data-name');
      const on = btn.getAttribute('aria-pressed') === 'true';
      if (on) {
        selectedGenres.delete(name);
        btn.setAttribute('aria-pressed', 'false');
      } else {
        selectedGenres.add(name);
        btn.setAttribute('aria-pressed', 'true');
      }
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  });
}

/* ---- Apply filters/sort (uses AND/OR mode) ---- */
function applyFilterSort() {
  const movieOn = $('#filter-movie')?.checked ?? true;
  const tvOn    = $('#filter-tv')?.checked ?? true;
  const sortBy  = $('#sort-by')?.value || 'pop-desc';
  // read genre mode radios if present
  const andEl = document.getElementById('search-mode-and');
  const orEl  = document.getElementById('search-mode-or');
  if (andEl || orEl) {
    genreMode = (andEl?.checked ? 'AND' : (orEl?.checked ? 'OR' : genreMode));
  }

  const genreNames = getSelectedGenres();

  // Filter
  let next = sourceList.filter(i => {
    if (i.type === 'movie' && !movieOn) return false;
    if (i.type === 'tv' && !tvOn) return false;
    return matchesGenres(i.genres, genreNames, genreMode);
  });

  // Sort
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  const byYear  = (a, b) => (parseInt(b.year || 0) - parseInt(a.year || 0)); // desc default
  const byRate  = (a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
  switch (sortBy) {
    case 'rating-desc': next.sort(byRate); break;
    case 'year-desc':   next.sort(byYear); break;
    case 'year-asc':    next.sort((a,b) => -byYear(a,b)); break;
    case 'title-asc':   next.sort(byTitle); break;
    case 'title-desc':  next.sort((a,b) => -byTitle(a,b)); break;
    default: break; // popularity order as-is
  }

  viewList = next;
  pageState.page = 1; // reset to first page on filter/sort changes
  renderList();
}

/* ---- Pagination rendering ---- */
function ensurePaginationMount() {
  let mount = $('#search-pagination');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'search-pagination';
    mount.className = 'ct-pagination';
    mount.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:1rem;margin-top:1rem;';
    const section = $('#search-grid')?.parentElement || $('main');
    section?.appendChild(mount);
  }
  return mount;
}

function renderPagination() {
  const total = viewList.length;
  const { page, pageSize } = pageState;
  const start = (page - 1) * pageSize;
  const hasPrev = page > 1;
  const hasNext = (start + pageSize) < total;

  const mount = ensurePaginationMount();
  mount.innerHTML = `
    <button id="search-prev" class="btn btn--ghost" ${hasPrev ? '' : 'disabled'}>Prev</button>
    <span>${total ? (Math.min(total, start + 1) + '–' + Math.min(total, start + pageSize)) : '0–0'} of ${total}</span>
    <button id="search-next" class="btn btn--ghost" ${hasNext ? '' : 'disabled'}>Next</button>
  `;

  const go = (n) => {
    if (!n) return;
    smartScrollTop();
    pageState.page = n;
    renderList();
  };

  $('#search-prev')?.addEventListener('click', () => { if (pageState.page > 1) go(pageState.page - 1); });
  $('#search-next')?.addEventListener('click', () => {
    const newStart = pageState.page * pageState.pageSize;
    if (newStart < total) go(pageState.page + 1);
  });
}

/* ---- List render (paged) ---- */
function renderList() {
  const grid = $('#search-grid');
  if (!grid) return;
  const { page, pageSize } = pageState;
  const start = (page - 1) * pageSize;
  const slice = viewList.slice(start, start + pageSize);

  grid.innerHTML = slice.length
    ? slice.map(mediaCard).join('')
    : `<p class="meta">No results. Adjust your filters or try another query.</p>`;
  const sub = $('#results-sub');
  if (sub) sub.textContent = `${viewList.length} result${viewList.length === 1 ? '' : 's'}`;

  // re-prime + multi-reveal
  primeCards(grid);
  triggerReveals(grid);

  renderPagination();
}

/* ----------------- Main search flow ----------------- */
async function runSearch() {
  await loadHeaderFooter();
  bindCollapsible('#filter-toggle', '#filter-panel');

  const qRaw = getParam('q') || getParam('query');
  const q = normalizeTerm(qRaw);

  const title = $('#results-title');
  if (title) title.textContent = q ? `Results for “${q}”` : 'Search';
  const grid  = $('#search-grid');
  const sub   = $('#results-sub');

  // If your HTML doesn't already include the AND/OR UI, inject it:
  const filterForm = document.getElementById('filter-form') || document.querySelector('#filter-panel form');
  if (filterForm && !document.getElementById('search-mode-and')) {
    const modeFieldset = document.createElement('fieldset');
    modeFieldset.className = 'ct-filter-group';
    modeFieldset.setAttribute('aria-label', 'Genre matching mode');
    modeFieldset.style.display = 'flex';
    modeFieldset.style.alignItems = 'center';
    modeFieldset.style.gap = '.5rem';
    modeFieldset.style.flexWrap = 'wrap';
    modeFieldset.innerHTML = `
      <label class="ct-sortlabel" for="search-genre-mode">Match:</label>
      <div class="ct-segment">
        <input type="radio" id="search-mode-and" name="search-genre-mode" value="AND" checked>
        <label for="search-mode-and" class="btn btn--ghost">All (AND)</label>
        <input type="radio" id="search-mode-or"  name="search-genre-mode" value="OR">
        <label for="search-mode-or" class="btn btn--ghost">Any (OR)</label>
      </div>
    `;
    // Insert it just before the genre scroller if present, else before actions
    const scroller = document.getElementById('genre-scroller');
    const actions  = document.getElementById('apply-filters')?.closest('.ct-filter-actions');
    if (scroller?.parentElement) {
      scroller.parentElement.insertBefore(modeFieldset, scroller);
    } else if (actions?.parentElement) {
      actions.parentElement.insertBefore(modeFieldset, actions);
    } else {
      filterForm.appendChild(modeFieldset);
    }
  }

  if (!q) {
    if (sub) sub.textContent = 'Try searching for a title, genre, or year.';
    if (grid) grid.innerHTML = '';
    return;
  }

  renderSkeletonCards('search-grid', 8);

  try {
    let raw = [];
    if (isYear(q)) {
      raw = await searchByYear(q);
    } else {
      const genreHits = await searchByGenre(q);
      raw = genreHits.length ? genreHits : await searchByText(q);
    }

    sourceList = await toMediaList(raw.slice(0, 200)); // normalize more; paginate locally
    viewList = [...sourceList];

    // Build dynamic genre scroller from loaded cards
    renderGenreScrollerFromList(sourceList);

    // Wire AND/OR mode changes
    document.getElementById('search-mode-and')?.addEventListener('change', () => applyFilterSort());
    document.getElementById('search-mode-or')?.addEventListener('change', () => applyFilterSort());

    // Initial render
    pageState.page = 1;
    renderList();

    // Wire filter controls
    $('#apply-filters')?.addEventListener('click', applyFilterSort);
    $('#clear-filters')?.addEventListener('click', () => {
      const m = $('#filter-movie'); const t = $('#filter-tv'); const s = $('#sort-by');
      if (m) m.checked = true;
      if (t) t.checked = true;
      if (s) s.value = 'pop-desc';
      // reset mode to AND
      const andEl = document.getElementById('search-mode-and');
      const orEl  = document.getElementById('search-mode-or');
      if (andEl) andEl.checked = true;
      if (orEl)  orEl.checked  = false;
      genreMode = 'AND';
      selectedGenres.clear();
      renderGenreScrollerFromList(sourceList); // reset chips
      applyFilterSort();
    });

    // Optional: live changes
    ['filter-movie', 'filter-tv', 'sort-by'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('change', applyFilterSort);
    });
  } catch (err) {
    console.error('Search error:', err);
    if (sub) sub.textContent = '';
    if (grid) grid.innerHTML = `<p class="meta">Something went wrong while searching. Please try again.</p>`;
  }
}
runSearch();
